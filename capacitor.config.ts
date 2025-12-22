import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cleansky.ai',
  appName: 'CleanSky AI',
  webDir: 'dist', // Assumes Vite build output
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      permissionType: 'location'
    }
  }
};

export default config;