import { logger } from '../utils/logger';

// Registra somente em produção. O service worker mantém em cache apenas os
// arquivos estáticos do app; respostas autenticadas continuam sempre na rede.
export function registerServiceWorker() {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        const serviceWorkerUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

        navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/' })
            .then((registration) => {
                // Verifica atualizações periodicamente sem interromper o trabalho
                // de quem estiver com o sistema aberto.
                window.setInterval(() => {
                    registration.update().catch(() => {});
                }, 60 * 60 * 1000);
            })
            .catch((error) => {
                logger.warn('Não foi possível registrar o modo instalável do Obraly.', error);
            });
    }, { once: true });
}
