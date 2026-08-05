import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { API_URL } from '../config';
import { setToken as storeToken } from '../auth/tokenStorage';
import { logger } from '../utils/logger';

const CHANNEL_ID = 'obraly_alertas';
let listenerHandles = [];
let registeredToken = null;

export const isNativePushAvailable = () => Capacitor.isNativePlatform();

const removeListeners = async (handles) => {
    await Promise.all(handles.map(handle => handle.remove().catch(() => {})));
};

const clearListeners = async () => {
    const handles = listenerHandles;
    listenerHandles = [];
    await removeListeners(handles);
};

const request = async (authToken, path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            ...options.headers,
        },
    });
    if (!response.ok) {
        throw new Error(`Falha ao sincronizar push (${response.status})`);
    }
    return response;
};

const syncDeviceToken = async (authToken, token) => {
    registeredToken = token;
    await request(authToken, '/notificacoes/dispositivos', {
        method: 'POST',
        body: JSON.stringify({ token, plataforma: Capacitor.getPlatform() }),
    });
};

const openNotification = async (authToken, action) => {
    const data = action?.notification?.data || {};
    const notificationId = Number(data.notificacao_id);
    if (Number.isInteger(notificationId) && notificationId > 0) {
        try {
            await request(authToken, `/notificacoes/${notificationId}/lida`, {
                method: 'PATCH',
                body: JSON.stringify({ lida: true }),
            });
        } catch (error) {
            logger.warn('Não foi possível marcar o aviso como lido:', error);
        }
    }

    const moduleId = data.modulo || 'obras';
    await storeToken('selectedModule', moduleId);
    window.location.assign(data.caminho || '/');
};

export const initializeNativePush = async (authToken) => {
    if (!isNativePushAvailable() || !authToken) return () => {};

    await clearListeners();

    const previousHandles = listenerHandles;
    listenerHandles = [];
    await removeListeners(previousHandles);

    const currentHandles = await Promise.all([
        PushNotifications.addListener('registration', ({ value }) => {
            syncDeviceToken(authToken, value).catch(error => {
                logger.error('Falha ao cadastrar este aparelho para notificações:', error);
            });
        }),
        PushNotifications.addListener('registrationError', error => {
            logger.error('Falha ao registrar notificações nativas:', error);
        }),
        PushNotifications.addListener('pushNotificationReceived', notification => {
            window.dispatchEvent(new CustomEvent('obraly:native-notification', {
                detail: notification,
            }));
        }),
        PushNotifications.addListener('pushNotificationActionPerformed', action => {
            openNotification(authToken, action).catch(error => {
                logger.error('Falha ao abrir a notificação:', error);
            });
        }),
    ]);
    listenerHandles = currentHandles;

    if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
            id: CHANNEL_ID,
            name: 'Alertas do Obraly',
            description: 'Pagamentos, vencimentos, solicitações e atualizações das obras.',
            importance: 4,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#0B5CFF',
        });
    }

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
        permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
        logger.warn('Permissão de notificações não concedida neste aparelho.');
        await removeListeners(currentHandles);
        if (listenerHandles === currentHandles) listenerHandles = [];
        return () => {};
    }

    await PushNotifications.register();
    return async () => {
        await removeListeners(currentHandles);
        if (listenerHandles === currentHandles) listenerHandles = [];
    };
};

export const deactivateNativePush = async (authToken) => {
    if (!isNativePushAvailable()) return;

    if (authToken && registeredToken) {
        try {
            await request(authToken, '/notificacoes/dispositivos', {
                method: 'DELETE',
                body: JSON.stringify({ token: registeredToken }),
            });
        } catch (error) {
            logger.warn('Não foi possível remover o vínculo remoto do aparelho:', error);
        }
    }

    try {
        await PushNotifications.unregister();
    } catch (error) {
        logger.warn('Não foi possível remover o token nativo local:', error);
    }
    registeredToken = null;
    await clearListeners();
};
