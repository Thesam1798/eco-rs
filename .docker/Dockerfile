# =============================================================================
# CI Runner Image for Tauri + Angular Project
# Pre-installs: Node.js 22, pnpm 9, Rust stable (with rustfmt + clippy),
#               and all Tauri/WebKit system dependencies
# =============================================================================

FROM ubuntu:22.04

LABEL org.opencontainers.image.source="https://github.com/Thesam1798/eco-rs"
LABEL org.opencontainers.image.description="CI runner for EcoIndex Analyzer (Tauri + Angular)"
LABEL org.opencontainers.image.licenses="MIT"

# Versions - update these to rebuild with new versions
ARG NODE_VERSION=22
ARG PNPM_VERSION=9
ARG RUST_VERSION=stable

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Configure Rust environment
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH="/usr/local/cargo/bin:$PATH"

# =============================================================================
# Install system dependencies
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    build-essential \
    pkg-config \
    # Tauri/WebKit dependencies
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libfuse2 \
    # Additional tools
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    # SSL for Rust/Cargo
    libssl-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# =============================================================================
# Install Node.js
# =============================================================================
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# =============================================================================
# Install pnpm via corepack
# =============================================================================
RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

# =============================================================================
# Install Rust
# =============================================================================
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    --default-toolchain ${RUST_VERSION} \
    --profile minimal \
    --component rustfmt \
    --component clippy \
    && rustup show

# =============================================================================
# Verify installations
# =============================================================================
RUN echo "=== Verification ===" \
    && node --version \
    && pnpm --version \
    && rustc --version \
    && cargo --version \
    && rustfmt --version \
    && cargo clippy --version \
    && echo "=== All tools installed successfully ==="

# Default working directory
WORKDIR /workspace

# Default command
CMD ["bash"]
