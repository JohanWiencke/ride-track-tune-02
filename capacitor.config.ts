import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.30870381cb304f3786597c4b05d9f477',
  appName: 'ride-track-tune',
  webDir: 'dist',
  server: {
    url: 'https://30870381-cb30-4f37-8659-7c4b05d9f477.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    }
  }
};

export default config;