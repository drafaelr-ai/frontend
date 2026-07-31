import { logger } from '../utils/logger';

// Registra somente em produção. O service worker mantém em cache apenas os
// arquivos estáticos do app; respostas autenticadas continuam sempre na rede.
//
// Quando uma versão nova fica pronta (worker em "waiting"), disparamos o
// evento 'obraly:sw-update' — o UpdateToast mostra o aviso e só aplica a
// atualização quando o usuário aceitar (ver applyUpdate).

const UPDATE_EVENT = 'obraly:sw-update';

function announceUpdate(registration) {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: registration }));
}

function watchForWaiting(registration) {
    // Já havia uma versão esperando quando a página abriu.
    if (registration.waiting && navigator.serviceWorker.controller) {
        announceUpdate(registration);
    }

    registration.addEventListener('updatefound', () => {
        const incoming = registration.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', () => {
            // "installed" com um controller ativo = atualização (e não o
            // primeiro registro), pronta e aguardando o aceite do usuário.
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
                announceUpdate(registration);
            }
        });
    });
}

export function registerServiceWorker() {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        const serviceWorkerUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

        navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/' })
            .then((registration) => {
                watchForWaiting(registration);
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

// Aceite do usuário no aviso de nova versão: promove o worker em waiting e
// recarrega quando ele assumir o controle.
export function applyUpdate(registration) {
    const waiting = registration && registration.waiting;
    if (!waiting) {
        window.location.reload();
        return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    }, { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
}

export { UPDATE_EVENT };
