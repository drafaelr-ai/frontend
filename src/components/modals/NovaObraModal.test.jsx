import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NovaObraModal from './NovaObraModal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';

jest.mock('../../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('NovaObraModal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('cadastra a obra e atualiza o dashboard', async () => {
        const obra = { id: 31, nome: 'Residencial Lago', cliente: 'Cliente Teste' };
        fetchWithAuth.mockResolvedValue({ ok: true, json: async () => obra });
        const onSaved = jest.fn();
        const onClose = jest.fn();

        render(<NovaObraModal isOpen onSaved={onSaved} onClose={onClose} />);

        fireEvent.change(screen.getByLabelText('Nome da obra *'), { target: { value: obra.nome } });
        fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: obra.cliente } });
        fireEvent.click(screen.getByRole('button', { name: /Cadastrar obra/i }));

        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringMatching(/\/obras$/),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ nome: obra.nome, cliente: obra.cliente }),
            })
        ));
        expect(onSaved).toHaveBeenCalledWith(obra);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
