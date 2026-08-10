import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SolicitacoesList from './SolicitacoesList';
import { solicitacoesApi } from './solicitacoesApi';

jest.mock('./solicitacoesApi', () => ({
    solicitacoesApi: {
        listar: jest.fn(),
    },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock('../../components/modals/NovaSolicitacaoModal', () => () => null);
jest.mock('./SolicitacaoDetalhe', () => ({ iniciarAtendimento }) => (
    <div>{iniciarAtendimento ? 'Confirmação de atendimento aberta' : 'Detalhe aberto'}</div>
));

describe('SolicitacoesList', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        solicitacoesApi.listar.mockResolvedValue([{
            id: 9,
            obra_id: 2,
            obra_nome: '2F',
            resumo: 'Luva látex (+6)',
            tipo: 'Material',
            solicitante_nome: 'daniel',
            data_criacao: '2026-08-06T09:39:00',
            data_necessidade: '2026-08-06',
            qtd_cotacoes: 1,
            status: 'Aprovada',
            pode_atender: true,
        }]);
    });

    it('deixa claro que o botão é uma ação e dá baixa no histórico', async () => {
        render(<SolicitacoesList obras={[{ id: 2, nome: '2F' }]} user={{ id: 1 }} />);

        const action = await screen.findByRole('button', { name: 'Marcar solicitação #9 como atendida' });
        expect(action).toHaveTextContent('Marcar como atendida');
        expect(screen.getByRole('columnheader', { name: 'Dias solicitado' })).toBeInTheDocument();

        fireEvent.click(action);

        expect(await screen.findByText('Confirmação de atendimento aberta')).toBeInTheDocument();
    });
});
