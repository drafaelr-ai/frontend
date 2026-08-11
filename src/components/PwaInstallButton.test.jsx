import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PwaInstallButton from './PwaInstallButton';

describe('PwaInstallButton no desktop', () => {
    it('usa o instalador nativo quando o navegador oferece o prompt', async () => {
        const prompt = jest.fn();
        const event = new Event('beforeinstallprompt');
        Object.defineProperty(event, 'prompt', { value: prompt });
        Object.defineProperty(event, 'userChoice', {
            value: Promise.resolve({ outcome: 'accepted' }),
        });
        window.dispatchEvent(event);

        render(<PwaInstallButton variant="header" desktopOnly />);
        fireEvent.click(screen.getByRole('button', { name: 'Instalar no computador' }));

        await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    });

    it('mostra instruções quando o prompt nativo não está disponível', () => {
        render(<PwaInstallButton variant="header" desktopOnly />);
        fireEvent.click(screen.getByRole('button', { name: 'Instalar no computador' }));

        expect(screen.getByRole('dialog', { name: 'Instalar Obraly no computador' })).toBeInTheDocument();
        expect(screen.getByText(/janela própria/)).toBeInTheDocument();
    });
});
