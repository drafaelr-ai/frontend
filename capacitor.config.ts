import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.obraly.app',
  appName: 'Obraly Pro',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'obraly-api.fly.dev',
      'obraly-admin-api.fly.dev',
      'patrimonio-api-elara.fly.dev'
    ]
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#001560'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#001560',
      spinnerColor: '#FFFFFF'
    }
  }
};

export default config;
