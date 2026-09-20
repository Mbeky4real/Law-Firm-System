import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tz.co.molaw.molms',
  appName: 'MOLMS',
  webDir: 'www',
  server: {
    url: 'https://admin.molaw.co.tz',
    cleartext: false
  }
};

export default config;
