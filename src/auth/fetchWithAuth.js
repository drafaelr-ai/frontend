import { notify } from '../utils/notify';
import { getToken, removeToken } from './tokenStorage';

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

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 422) {
        await removeToken('token');
        await removeToken('user');

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
