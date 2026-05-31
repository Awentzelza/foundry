import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.awentzel.foundry',
  appName: 'Foundry',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0d0a08',
  },
  android: {
    backgroundColor: '#0d0a08',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
