import { notify } from '../utils/notify';
import { getToken, removeToken } from './tokenStorage';
import { noticeNetworkFailure, NETWORK_ERROR_MESSAGE } from './networkNotice';
import { SESSION_EXPIRED_FLAG } from './fetchWithAuth';

export const fetchWithAuthAdmin = async (url, options = {}) => {
    const token = await getToken('token_admin');

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
        if (err && err.name === 'AbortError') throw err;
        noticeNetworkFailure();
        throw new Error(NETWORK_ERROR_MESSAGE);
    }

    if (response.status === 401 || response.status === 422) {
        await removeToken('token_admin');
        await removeToken('user_admin');

        try { sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1'); } catch {}

        notify.warning('Sua sessão admin expirou. Faça login novamente.');

        setTimeout(() => {
            window.location.reload();
        }, 500);

        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};
