import { notify } from '../utils/notify';
import { getToken, removeToken } from './tokenStorage';
import { noticeNetworkFailure, NETWORK_ERROR_MESSAGE } from './networkNotice';

// Marca lida pelo LoginScreen após o reload: mostra "sessão expirada" de
// forma neutra em vez de deixar a pessoa cair no login sem explicação.
export const SESSION_EXPIRED_FLAG = 'obraly_sessao_expirada';

export const fetchWithAuth = async (url, options = {}) => {
    const token = await getToken('token');

    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (err) {
        // Timeout deliberado (fetchWithAuthTimeout) segue seu próprio fluxo.
        if (err && err.name === 'AbortError') throw err;
        noticeNetworkFailure();
        throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (response.status === 401 || response.status === 422) {
        await removeToken('token');
        await removeToken('user');
        // Também o módulo salvo: sessão expirada deve voltar limpa pro
        // seletor — senão o próximo login (inclusive de OUTRO usuário no
        // mesmo aparelho) herda o módulo e cai direto dentro dele.
        await removeToken('selectedModule');

        try { sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1'); } catch {}

        notify.warning('⏰ Sua sessão expirou por inatividade.\n\nPor favor, faça login novamente para continuar.');

        setTimeout(() => {
            window.location.reload();
        }, 500);

        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};

export const fetchWithAuthTimeout = async (url, options = {}, timeoutMs = 30000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetchWithAuth(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};
