import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NovaSolicitacaoModal from './NovaSolicitacaoModal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';

jest.mock('../../screens/Solicitacoes/solicitacoesApi', () => ({
    solicitacoesApi: {
        criar: jest.fn(),
        editar: jest.fn(),
        lerPedido: jest.fn(),
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

    it('lê Excel/PDF e preenche somente os campos úteis dos itens', async () => {
        solicitacoesApi.lerPedido.mockResolvedValue({
            arquivo: 'materiais.xlsx',
            quantidade_itens: 2,
            avisos: [],
            itens: [
                {
                    descricao: 'Caixa sifonada',
                    quantidade: 3,
                    unidade: 'pç',
                    observacao: 'Categoria: PVC Acessórios | Especificação: 150 x 150 x 50 mm',
                },
                {
                    descricao: 'Tubo rígido c/ ponta lisa',
                    quantidade: 10.51,
                    unidade: 'm',
                    observacao: 'Categoria: PVC Esgoto | Especificação: 50 mm - 2"',
                },
            ],
        });

        render(
            <NovaSolicitacaoModal
                isOpen
                obras={[{ id: 1, nome: 'Alphaville' }]}
                onClose={jest.fn()}
                onSaved={jest.fn()}
            />
        );

        const input = document.querySelector('input[accept*=".xlsx"]');
        const arquivo = new File(['pedido'], 'materiais.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        fireEvent.change(input, { target: { files: [arquivo] } });

        await waitFor(() => expect(solicitacoesApi.lerPedido).toHaveBeenCalledWith(arquivo));
        expect(await screen.findByDisplayValue('Caixa sifonada')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10.51')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Categoria: PVC Esgoto | Especificação: 50 mm - 2"')).toBeInTheDocument();
        expect(screen.getByText(/2 item\(ns\) preenchido\(s\) de materiais\.xlsx/)).toBeInTheDocument();
    });
});
