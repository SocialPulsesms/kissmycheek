import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kissmycheek.app',
  appName: 'Kiss My Cheek',
  webDir: 'public',
  backgroundColor: '#050507',
  server: {
    // Production live server endpoint for mobile clients (override with CAP_SERVER_URL for dev)
    url: process.env.CAP_SERVER_URL || 'https://kissmycheek.org',
    cleartext: true,
    allowNavigation: [
      'kissmycheek.org',
      '*.kissmycheek.org',
      '*.daily.co',
      'kissmycheek.daily.co',
      'flutterwave.com',
      '*.flutterwave.com',
      'checkout.flutterwave.com',
      '*.ravepay.co'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#050507'
  },
  ios: {
    allowsLinkPreview: false,
    backgroundColor: '#050507'
  }
};

export default config;
