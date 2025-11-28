/**
 * Lighthouse Configuration
 *
 * Configuration for Lighthouse analysis following the `EcoIndex` protocol.
 */

import type { Flags, Config } from 'lighthouse';

/**
 * Configuration Lighthouse pour analyse `EcoIndex`.
 * Reproduit le protocole officiel `EcoIndex`.
 */
export function createLighthouseConfig(chromePath: string): {
  flags: Flags;
  config: Config;
} {
  const flags: Flags = {
    // Chrome path
    chromePath,

    // Mode headless
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
    ],

    // Viewport EcoIndex standard
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },

    // Pas de throttling réseau (mesure réelle)
    throttlingMethod: 'provided',

    // Format de sortie
    output: 'json',

    // Désactiver les logs console
    logLevel: 'silent',

    // Port CDP (0 = automatique)
    port: 0,
  };

  const config: Config = {
    extends: 'lighthouse:default',

    plugins: ['lighthouse-plugin-ecoindex'],

    settings: {
      // Catégories à analyser
      onlyCategories: [
        'performance',
        'accessibility',
        'best-practices',
        'seo',
        'lighthouse-plugin-ecoindex',
      ],

      // Throttling CPU désactivé pour EcoIndex
      throttling: {
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
        rttMs: 0,
        throughputKbps: 0,
      },

      // Pas d'émulation mobile
      formFactor: 'desktop',

      // Délais EcoIndex (le plugin gère les 3s + scroll + 3s)
      maxWaitForFcp: 30000,
      maxWaitForLoad: 45000,
    },
  };

  return { flags, config };
}
