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
    // Só habilita o inspetor remoto (chrome://inspect) em build de desenvolvimento —
    // uma release/APK de produção com isso em true permite ler DOM/JS (incl. token
    // em memória) de qualquer pessoa com acesso físico ao aparelho.
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
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
