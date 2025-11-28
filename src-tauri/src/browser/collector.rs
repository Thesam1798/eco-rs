//! Metrics collector for web pages using CDP.

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use chromiumoxide::browser::Browser;
use chromiumoxide::cdp::browser_protocol::network::EnableParams as NetworkEnable;
use chromiumoxide::cdp::browser_protocol::network::{EventLoadingFinished, EventRequestWillBeSent};
use chromiumoxide::Page;
use futures::StreamExt;

use crate::domain::PageMetrics;
use crate::errors::BrowserError;

/// Collects page metrics following the `EcoIndex` protocol.
pub struct MetricsCollector<'a> {
    browser: &'a Browser,
}

impl<'a> MetricsCollector<'a> {
    /// Creates a new collector for the given browser.
    #[must_use]
    pub const fn new(browser: &'a Browser) -> Self {
        Self { browser }
    }

    /// Collects metrics from a URL following the `EcoIndex` protocol.
    ///
    /// Protocol:
    /// 1. Open page at 1920x1080
    /// 2. Wait 3 seconds
    /// 3. Scroll to bottom
    /// 4. Wait 3 seconds
    /// 5. Collect metrics
    ///
    /// # Errors
    ///
    /// Returns an error if navigation or metric collection fails.
    pub async fn collect(&self, url: &str) -> Result<PageMetrics, BrowserError> {
        let page = self
            .browser
            .new_page("about:blank")
            .await
            .map_err(|e| BrowserError::PageCreationFailed(e.to_string()))?;

        page.execute(NetworkEnable::default())
            .await
            .map_err(|e| BrowserError::CdpError(e.to_string()))?;

        let request_count = Arc::new(AtomicU32::new(0));
        let total_size = Arc::new(AtomicU64::new(0));

        let req_counter = Arc::clone(&request_count);
        let size_counter = Arc::clone(&total_size);

        let mut request_events = page
            .event_listener::<EventRequestWillBeSent>()
            .await
            .map_err(|e| BrowserError::CdpError(e.to_string()))?;

        let mut finished_events = page
            .event_listener::<EventLoadingFinished>()
            .await
            .map_err(|e| BrowserError::CdpError(e.to_string()))?;

        let req_handle = tokio::spawn(async move {
            while (request_events.next().await).is_some() {
                req_counter.fetch_add(1, Ordering::Relaxed);
            }
        });

        let size_handle = tokio::spawn(async move {
            while let Some(event) = finished_events.next().await {
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                size_counter.fetch_add(event.encoded_data_length as u64, Ordering::Relaxed);
            }
        });

        page.goto(url)
            .await
            .map_err(|e| BrowserError::NavigationFailed(e.to_string()))?;

        tokio::time::sleep(Duration::from_secs(3)).await;

        self.scroll_to_bottom(&page).await?;

        tokio::time::sleep(Duration::from_secs(3)).await;

        let dom_count = self.count_dom_elements(&page).await?;
        let html_size = self.get_html_size(&page).await?;

        req_handle.abort();
        size_handle.abort();

        let requests = request_count.load(Ordering::Relaxed);
        let size_bytes = total_size.load(Ordering::Relaxed) + html_size;
        #[allow(clippy::cast_precision_loss)]
        let size_kb = size_bytes as f64 / 1024.0;

        let _ = page.close().await;

        Ok(PageMetrics::new(dom_count, requests, size_kb))
    }

    async fn scroll_to_bottom(&self, page: &Page) -> Result<(), BrowserError> {
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            .await
            .map_err(|e| BrowserError::JavaScriptError(e.to_string()))?;
        Ok(())
    }

    async fn count_dom_elements(&self, page: &Page) -> Result<u32, BrowserError> {
        let result = page
            .evaluate(
                r"
                (() => {
                    let count = 0;
                    const allElements = document.querySelectorAll('*');
                    for (const el of allElements) {
                        if (!el.closest('svg') || el.tagName.toLowerCase() === 'svg') {
                            count++;
                        }
                    }
                    return count;
                })()
            ",
            )
            .await
            .map_err(|e| BrowserError::JavaScriptError(e.to_string()))?;

        result
            .into_value::<u32>()
            .map_err(|e| BrowserError::JavaScriptError(e.to_string()))
    }

    async fn get_html_size(&self, page: &Page) -> Result<u64, BrowserError> {
        let result = page
            .evaluate("new Blob([document.documentElement.outerHTML]).size")
            .await
            .map_err(|e| BrowserError::JavaScriptError(e.to_string()))?;

        result
            .into_value::<u64>()
            .map_err(|e| BrowserError::JavaScriptError(e.to_string()))
    }
}
