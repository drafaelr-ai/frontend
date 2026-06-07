import { notify } from '../utils/notify';
import { getToken, removeToken } from './tokenStorage';

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

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 422) {
        await removeToken('token_admin');
        await removeToken('user_admin');

        notify.warning('Sua sessão admin expirou. Faça login novamente.');

        setTimeout(() => {
            window.location.reload();
        }, 500);

        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};
