import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kissmycheek.app',
  appName: 'Kiss My Cheek',
  webDir: 'public',
  server: {
    // Production live server endpoint for mobile clients (override with CAP_SERVER_URL for dev)
    url: process.env.CAP_SERVER_URL || 'https://kissmycheek.org',
    cleartext: true,
    allowNavigation: [
      'kissmycheek.org',
      '*.kissmycheek.org',
      'flutterwave.com',
      '*.flutterwave.com',
      'checkout.flutterwave.com',
      '*.ravepay.co'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  },
  ios: {
    allowsLinkPreview: false
  }
};

export default config;
