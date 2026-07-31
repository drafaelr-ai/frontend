// Detecção de plataforma para as adaptações do mobile.css.
//
// platform-ios: Safari/WebView do iPhone e iPad (iPadOS se anuncia como Mac,
// por isso o teste extra de toque). As regras de safe area usam env(), que
// vale 0 fora do iOS — mas o escopo por classe impede qualquer efeito
// colateral no desktop e no WebView do app Android publicado.
//
// platform-standalone: rodando instalado na tela de início (sem barra do
// navegador) — usado pelo fluxo de instalação para não se oferecer de novo.

export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
    return window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;
}

function keepFocusedFieldVisible() {
    // Teclado do iOS cobre o campo focado em formulários longos (ex.:
    // InserirPagamentoModal). Centraliza o campo depois que o teclado abre.
    document.addEventListener('focusin', (event) => {
        const el = event.target;
        if (!el || !el.matches || !el.matches('input, select, textarea')) return;
        window.setTimeout(() => {
            if (document.activeElement === el) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }, 300);
    });
}

export function setupPlatform() {
    if (isIOS()) {
        document.body.classList.add('platform-ios');
        keepFocusedFieldVisible();
    }
    if (isStandalone()) {
        document.body.classList.add('platform-standalone');
    }
}
