import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SolicitacaoDetalhe from './SolicitacaoDetalhe';
import { solicitacoesApi } from './solicitacoesApi';

jest.mock('./solicitacoesApi', () => ({
    solicitacoesApi: {
        detalhe: jest.fn(), atender: jest.fn(), exportar: jest.fn(), arquivoCotacao: jest.fn(),
    },
}));

jest.mock('./ComentariosSolicitacao', () => () => null);
jest.mock('../../components/modals/CotacaoSolicitacaoModal', () => () => null);
jest.mock('../../components/modals/NovaSolicitacaoModal', () => ({ isOpen }) => (
    isOpen ? <div role="dialog" aria-label="Formulário de edição" /> : null
));
jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
    confirmDialog: jest.fn(),
}));

describe('SolicitacaoDetalhe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.URL.createObjectURL = jest.fn(() => 'blob:pedido');
        window.URL.revokeObjectURL = jest.fn();
        window.open = jest.fn();
        HTMLAnchorElement.prototype.click = jest.fn();
    });

    it('mostra a edição autorizada e abre o formulário', async () => {
        solicitacoesApi.detalhe.mockResolvedValue({
            id: 11,
            obra_id: 1,
            obra_nome: 'Alphaville',
            solicitante_nome: 'Diego',
            data_criacao: '2026-08-10T10:20:00',
            data_necessidade: null,
            tipo: 'Equipamentos',
            status: 'Aberta',
            observacao: null,
            itens: [{ id: 1, descricao: 'Placa vibratória', quantidade: 15, unidade: 'diária' }],
            cotacoes: [],
            pode_editar: true,
            pode_cancelar: true,
            token_publico: 'token-publico',
        });

        render(
            <SolicitacaoDetalhe
                solicitacaoId={11}
                user={{ id: 3, role: 'master' }}
                obras={[{ id: 1, nome: 'Alphaville' }]}
                onVoltar={jest.fn()}
            />
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

        expect(screen.getByRole('dialog', { name: 'Formulário de edição' })).toBeInTheDocument();
    });

    it('exige e envia a data informada na baixa', async () => {
        solicitacoesApi.detalhe.mockResolvedValue({
            id: 3,
            obra_id: 5,
            obra_nome: 'Igaratá 5c',
            solicitante_nome: 'Diego',
            data_criacao: '2026-08-04T08:26:00',
            data_necessidade: '2026-08-03',
            tipo: 'Mão de Obra',
            status: 'Aprovada',
            itens: [{ id: 1, descricao: 'Sondagem de solo', quantidade: 3, unidade: 'furos' }],
            cotacoes: [],
            pode_atender: true,
            token_publico: 'token-publico',
        });
        solicitacoesApi.atender.mockResolvedValue({ id: 3, status: 'Atendida' });

        render(
            <SolicitacaoDetalhe
                solicitacaoId={3}
                user={{ id: 3, role: 'master' }}
                obras={[{ id: 5, nome: 'Igaratá 5c' }]}
                iniciarAtendimento
                onVoltar={jest.fn()}
            />
        );

        const dateInput = await screen.findByLabelText('Data em que foi atendida *');
        fireEvent.change(dateInput, { target: { value: '2026-08-09' } });
        expect(screen.getByText('5 dias')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar atendimento' }));

        await waitFor(() => expect(solicitacoesApi.atender).toHaveBeenCalledWith(3, {
            data_atendimento: '2026-08-09',
            observacao: '',
        }));
    });

    it('exporta a solicitação em Excel e PDF para envio ao fornecedor', async () => {
        solicitacoesApi.detalhe.mockResolvedValue({
            id: 11,
            obra_id: 1,
            obra_nome: 'Alphaville',
            solicitante_nome: 'Diego',
            data_criacao: '2026-08-10T10:20:00',
            tipo: 'Material',
            status: 'Aberta',
            itens: [{ id: 1, descricao: 'Caixa sifonada', quantidade: 3, unidade: 'pç' }],
            cotacoes: [],
            token_publico: 'token-publico',
        });
        solicitacoesApi.exportar.mockImplementation((id, formato) => Promise.resolve({
            blob: new Blob([formato]),
            nome: `solicitacao_${id}.${formato}`,
        }));

        render(
            <SolicitacaoDetalhe
                solicitacaoId={11}
                user={{ id: 3, role: 'master' }}
                obras={[{ id: 1, nome: 'Alphaville' }]}
                onVoltar={jest.fn()}
            />
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Excel' }));
        await waitFor(() => expect(solicitacoesApi.exportar).toHaveBeenCalledWith(11, 'xlsx'));
        fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
        await waitFor(() => expect(solicitacoesApi.exportar).toHaveBeenCalledWith(11, 'pdf'));
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });

    it('mostra e abre separadamente todos os anexos da mesma cotação', async () => {
        solicitacoesApi.detalhe.mockResolvedValue({
            id: 18,
            obra_id: 1,
            obra_nome: 'Alphaville',
            solicitante_nome: 'Diego',
            data_criacao: '2026-08-18T10:20:00',
            tipo: 'Material',
            status: 'Em cotação',
            itens: [{ id: 1, descricao: 'Tubos', quantidade: 10, unidade: 'm' }],
            cotacoes: [{
                id: 91,
                fornecedor: 'Fornecedor Dois PDFs',
                valor_total: 1500,
                tem_arquivo: true,
                quantidade_arquivos: 2,
                arquivos: [
                    { indice: 0, nome: 'orcamento-parte-1.pdf' },
                    { indice: 1, nome: 'orcamento-parte-2.pdf' },
                ],
                criado_por_id: 3,
            }],
            token_publico: 'token-publico',
        });
        solicitacoesApi.arquivoCotacao
            .mockResolvedValueOnce({ url: 'https://storage/parte-1' })
            .mockResolvedValueOnce({ url: 'https://storage/parte-2' });

        render(
            <SolicitacaoDetalhe
                solicitacaoId={18}
                user={{ id: 3, role: 'master' }}
                obras={[{ id: 1, nome: 'Alphaville' }]}
                onVoltar={jest.fn()}
            />
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Anexo 1' }));
        await waitFor(() => expect(solicitacoesApi.arquivoCotacao).toHaveBeenCalledWith(18, 91, 0));
        fireEvent.click(screen.getByRole('button', { name: 'Anexo 2' }));
        await waitFor(() => expect(solicitacoesApi.arquivoCotacao).toHaveBeenCalledWith(18, 91, 1));
        expect(window.open).toHaveBeenNthCalledWith(1, 'https://storage/parte-1', '_blank', 'noopener');
        expect(window.open).toHaveBeenNthCalledWith(2, 'https://storage/parte-2', '_blank', 'noopener');
    });
});
