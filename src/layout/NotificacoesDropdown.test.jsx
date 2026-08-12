import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificacoesDropdown from './NotificacoesDropdown';
import { fetchWithAuth } from '../auth/fetchWithAuth';

jest.mock('../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../auth/tokenStorage', () => ({ setToken: jest.fn() }));
jest.mock('../utils/notify', () => ({ confirmDialog: jest.fn() }));

const resp = (data, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(data) });

const apiFake = (url) => {
    if (url.includes('/telegram/status')) {
        return resp({
            configurado: true, vinculado: false, bot: 'Obraly_bot',
            tipos: null, categorias: { mencoes: 'Menções e comentários' },
        });
    }
    if (url.includes('/telegram/vincular')) {
        return resp({ link: 'https://t.me/Obraly_bot?start=ABC123', bot: 'Obraly_bot' });
    }
    if (url.includes('/notificacoes/count')) return resp({ count: 0 });
    return resp([]);
};

describe('NotificacoesDropdown — vínculo do Telegram', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchWithAuth.mockImplementation(apiFake);
        window.open = jest.fn();
    });

    it('no desktop oferece Telegram Web, app e comando manual (sem tg:// automático)', async () => {
        render(<NotificacoesDropdown user={{ id: 1, username: 'Diego' }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Notificações' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Conectar' }));

        // jsdom não é mobile: nada de window.open automático (o tg:// sem
        // handler era exatamente o erro visto no desktop sem o app).
        const web = await screen.findByRole('link', { name: 'Telegram Web' });
        expect(window.open).not.toHaveBeenCalled();

        expect(web).toHaveAttribute('href',
            `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent('tg://resolve?domain=Obraly_bot&start=ABC123')}`);
        expect(screen.getByRole('link', { name: 'Tenho o app instalado' }))
            .toHaveAttribute('href', 'https://t.me/Obraly_bot?start=ABC123');
        expect(screen.getByText('/start ABC123')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Já dei Start — confirmar' })).toBeInTheDocument();
    });
});
