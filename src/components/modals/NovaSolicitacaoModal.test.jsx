import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NovaSolicitacaoModal from './NovaSolicitacaoModal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';

jest.mock('../../screens/Solicitacoes/solicitacoesApi', () => ({
    solicitacoesApi: {
        criar: jest.fn(),
        editar: jest.fn(),
    },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('NovaSolicitacaoModal em modo de edição', () => {
    beforeEach(() => jest.clearAllMocks());

    it('carrega os dados atuais e salva pelo endpoint de edição', async () => {
        const onSaved = jest.fn();
        solicitacoesApi.editar.mockResolvedValue({ id: 11, status: 'Aberta' });

        render(
            <NovaSolicitacaoModal
                isOpen
                obras={[{ id: 1, nome: 'Alphaville' }]}
                onClose={jest.fn()}
                onSaved={onSaved}
                solicitacao={{
                    id: 11,
                    obra_id: 1,
                    obra_nome: 'Alphaville',
                    tipo: 'Equipamentos',
                    data_necessidade: '2026-08-20',
                    observacao: 'Locação diária',
                    itens: [{
                        id: 91,
                        descricao: 'Placa vibratória',
                        quantidade: 15,
                        unidade: 'diária',
                        observacao: 'Entregar cedo',
                    }],
                }}
            />
        );

        expect(screen.getByRole('heading', { name: 'Editar solicitação #11' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Placa vibratória')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Entregar cedo')).toBeInTheDocument();

        fireEvent.change(screen.getByDisplayValue('15'), { target: { value: '18' } });
        fireEvent.change(screen.getByDisplayValue('Entregar cedo'), { target: { value: 'Entregar às 7h' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

        await waitFor(() => expect(solicitacoesApi.editar).toHaveBeenCalledWith(11, expect.objectContaining({
            obra_id: '1',
            tipo: 'Equipamentos',
            itens: [expect.objectContaining({
                descricao: 'Placa vibratória',
                quantidade: '18',
                unidade: 'diária',
                observacao: 'Entregar às 7h',
            })],
        })));
        expect(solicitacoesApi.criar).not.toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalledWith({ id: 11, status: 'Aberta' });
    });
});
