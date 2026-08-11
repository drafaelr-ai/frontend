export const INSTALL_PROMPT_STATE_EVENT = 'obraly:pwa-install-state';

let deferredPrompt = null;
let installed = false;

function isStandalone() {
    if (typeof window === 'undefined') return false;
    return window.navigator.standalone === true
        || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function snapshot() {
    return {
        available: Boolean(deferredPrompt),
        installed: installed || isStandalone(),
    };
}

function emitState() {
    window.dispatchEvent(new CustomEvent(INSTALL_PROMPT_STATE_EVENT, {
        detail: snapshot(),
    }));
}

if (typeof window !== 'undefined' && !window.__obralyInstallPromptCapture) {
    window.__obralyInstallPromptCapture = true;
    installed = isStandalone();

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        emitState();
    });

    window.addEventListener('appinstalled', () => {
        installed = true;
        deferredPrompt = null;
        emitState();
    });
}

export function getInstallPromptState() {
    return snapshot();
}

export async function promptInstall() {
    if (!deferredPrompt) return { outcome: 'unavailable' };

    const prompt = deferredPrompt;
    deferredPrompt = null;
    emitState();
    await prompt.prompt();
    return prompt.userChoice;
}
