jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
    },
}));

jest.mock('@capacitor/push-notifications', () => ({
    PushNotifications: (() => {
        const listeners = {};
        return {
            __listeners: listeners,
            addListener: jest.fn((event, callback) => {
                listeners[event] = callback;
                return Promise.resolve({ remove: jest.fn(() => Promise.resolve()) });
            }),
            checkPermissions: jest.fn(() => Promise.resolve({ receive: 'prompt' })),
            requestPermissions: jest.fn(() => Promise.resolve({ receive: 'granted' })),
            register: jest.fn(() => Promise.resolve()),
            unregister: jest.fn(() => Promise.resolve()),
            createChannel: jest.fn(() => Promise.resolve()),
        };
    })(),
}));

jest.mock('../auth/tokenStorage', () => ({ setToken: jest.fn(() => Promise.resolve()) }));

import { deactivateNativePush, initializeNativePush } from './nativePush';
import { PushNotifications } from '@capacitor/push-notifications';

describe('nativePush', () => {
    beforeEach(() => {
        Object.keys(PushNotifications.__listeners).forEach(key => {
            delete PushNotifications.__listeners[key];
        });
        PushNotifications.addListener.mockImplementation((event, callback) => {
            PushNotifications.__listeners[event] = callback;
            return Promise.resolve({ remove: jest.fn(() => Promise.resolve()) });
        });
        PushNotifications.checkPermissions.mockResolvedValue({ receive: 'prompt' });
        PushNotifications.requestPermissions.mockResolvedValue({ receive: 'granted' });
        PushNotifications.register.mockResolvedValue();
        PushNotifications.unregister.mockResolvedValue();
        PushNotifications.createChannel.mockResolvedValue();
        global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
    });

    afterEach(async () => {
        await deactivateNativePush('jwt-teste');
        jest.clearAllMocks();
    });

    test('pede permissão, cria canal e sincroniza o token com autenticação', async () => {
        await initializeNativePush('jwt-teste');

        expect(PushNotifications.createChannel).toHaveBeenCalledWith(expect.objectContaining({
            id: 'obraly_alertas',
            importance: 4,
        }));
        expect(PushNotifications.requestPermissions).toHaveBeenCalled();
        expect(PushNotifications.register).toHaveBeenCalled();

        PushNotifications.__listeners.registration({ value: 'fcm-' + 'A'.repeat(120) });
        await Promise.resolve();
        await Promise.resolve();

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/notificacoes/dispositivos'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ Authorization: 'Bearer jwt-teste' }),
            }),
        );
    });

    test('remove o vínculo e o token FCM no logout', async () => {
        await initializeNativePush('jwt-teste');
        PushNotifications.__listeners.registration({ value: 'fcm-' + 'B'.repeat(120) });
        await Promise.resolve();
        await Promise.resolve();

        await deactivateNativePush('jwt-teste');

        expect(global.fetch).toHaveBeenLastCalledWith(
            expect.stringContaining('/notificacoes/dispositivos'),
            expect.objectContaining({ method: 'DELETE' }),
        );
        expect(PushNotifications.unregister).toHaveBeenCalled();
    });
});
