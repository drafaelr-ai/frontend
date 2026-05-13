import { notify } from '../utils/notify';

export const fetchWithAuthAdmin = async (url, options = {}) => {
    const token = localStorage.getItem('token_admin');

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
        localStorage.removeItem('token_admin');
        localStorage.removeItem('user_admin');

        notify.warning('Sua sessão admin expirou. Faça login novamente.');

        setTimeout(() => {
            window.location.reload();
        }, 500);

        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};
