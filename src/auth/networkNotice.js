import { notify } from '../utils/notify';

// Falha de fetch por rede nunca pode virar erro cru nem tela vazia.
// Um único aviso claro, com trava pra não empilhar toast a cada request
// que falhar em sequência (telas disparam vários fetches em paralelo).
let lastNoticeAt = 0;

export function noticeNetworkFailure() {
    const now = Date.now();
    if (now - lastNoticeAt < 8000) return;
    lastNoticeAt = now;
    if (!navigator.onLine) {
        notify.warning('Sem conexão com a internet. Verifique o sinal e tente novamente.');
    } else {
        notify.warning('Não foi possível falar com o servidor. Tente novamente em instantes.');
    }
}

export const NETWORK_ERROR_MESSAGE = 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
