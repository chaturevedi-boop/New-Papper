import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailynewsservice.app',
  appName: 'Daily News Service',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
