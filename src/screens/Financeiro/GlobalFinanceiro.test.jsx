import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GlobalFinanceiro from './GlobalFinanceiro';
import { fetchWithAuth } from '../../auth/fetchWithAuth';


jest.mock('../../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../Dashboard/components/DashboardHeader', () => () => <div data-testid="dashboard-header" />);
jest.mock('../../utils/notify', () => ({ notify: { error: jest.fn(), success: jest.fn() } }));

describe('GlobalFinanceiro', () => {
    beforeEach(() => {
        fetchWithAuth.mockReset();
    });

    it('consolida os valores e preserva os atalhos financeiros por obra', async () => {
        fetchWithAuth
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 2, nome: 'Alphaville', cliente: 'PB' }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    sumarios: {
                        orcamento_total: 2786888.31,
                        valores_pagos: 3474129.05,
                        liberado_pagamento: 203996.08,
                        despesas_extras: 153687.95,
                    },
                }),
            });

        render(<GlobalFinanceiro />);

        expect(await screen.findByRole('heading', { name: 'Painel financeiro' })).toBeInTheDocument();
        expect(await screen.findByText('Alphaville')).toBeInTheDocument();
        expect(screen.getAllByText('R$ 3.474.129,05')).toHaveLength(2);
        expect(screen.getByRole('button', { name: /Cronograma/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Boletos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Caixa/i })).toBeInTheDocument();
    });

    it('mantém obras arquivadas no financeiro mesmo quando o detalhe não carrega', async () => {
        fetchWithAuth.mockImplementation(async url => {
            if (url.endsWith('/obras?mostrar_concluidas=true&incluir_arquivadas=true')) {
                return {
                    ok: true,
                    json: async () => [
                        { id: 2, nome: 'Alphaville', cliente: 'PB' },
                        {
                            id: 9,
                            nome: 'Obra Histórica',
                            cliente: 'Cliente antigo',
                            arquivada: true,
                            orcamento_total: 5000,
                            total_pago: 4200,
                            liberado_pagamento: 300,
                            despesas_extras: 100,
                        },
                    ],
                };
            }
            if (url.endsWith('/obras/2')) {
                return { ok: true, json: async () => ({ sumarios: {} }) };
            }
            if (url.endsWith('/obras/9')) {
                return { ok: false, json: async () => ({ erro: 'Obra arquivada' }) };
            }
            throw new Error(`URL não simulada: ${url}`);
        });

        render(<GlobalFinanceiro />);

        expect(await screen.findByText('Obra Histórica')).toBeInTheDocument();
        expect(screen.getByText('Arquivada')).toBeInTheDocument();
        expect(screen.getAllByText('R$ 4.200,00')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: /Novo lançamento/i }));
        expect(screen.queryByRole('option', { name: /Obra Histórica/i })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Alphaville/i })).toBeInTheDocument();
    });

    it('cria lançamento vinculado ao orçamento na obra selecionada', async () => {
        fetchWithAuth.mockImplementation(async (url, options = {}) => {
            if (url.endsWith('/obras?mostrar_concluidas=true&incluir_arquivadas=true')) {
                return { ok: true, json: async () => [{ id: 2, nome: 'Alphaville', cliente: 'PB' }] };
            }
            if (url.endsWith('/obras/2/orcamento-eng/itens-lista')) {
                return { ok: true, json: async () => [{ id: 91, nome_completo: '01.01 - Fundação' }] };
            }
            if (url.endsWith('/obras/2/inserir-pagamento') && options.method === 'POST') {
                return { ok: true, json: async () => ({ id: 501 }) };
            }
            if (url.endsWith('/obras/2')) {
                return {
                    ok: true,
                    json: async () => ({ sumarios: { orcamento_total: 1000, valores_pagos: 0 } }),
                };
            }
            throw new Error(`URL não simulada: ${url}`);
        });

        render(<GlobalFinanceiro />);

        await screen.findByText('Alphaville');
        fireEvent.click(screen.getByRole('button', { name: /Novo lançamento/i }));
        fireEvent.change(screen.getByLabelText('Obra'), { target: { value: '2' } });
        expect(await screen.findByRole('option', { name: '01.01 - Fundação' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Concreto da fundação' } });
        fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: '1250.50' } });
        fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Pago' } });
        fireEvent.change(screen.getByLabelText('Vincular ao item do orçamento'), { target: { value: '91' } });
        fireEvent.click(screen.getByRole('button', { name: /Salvar e Fechar/i }));

        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringMatching(/\/obras\/2\/inserir-pagamento$/),
            expect.objectContaining({ method: 'POST' }),
        ));
        const postCall = fetchWithAuth.mock.calls.find(([url, options]) =>
            url.endsWith('/obras/2/inserir-pagamento') && options?.method === 'POST'
        );
        expect(JSON.parse(postCall[1].body)).toEqual(expect.objectContaining({
            descricao: 'Concreto da fundação',
            valor: 1250.5,
            status: 'Pago',
            tipo_forma_pagamento: 'avista',
            orcamento_item_id: 91,
        }));
    });

    it('exige a seleção da obra antes de enviar o lançamento', async () => {
        fetchWithAuth.mockImplementation(async (url, options = {}) => {
            if (url.endsWith('/obras?mostrar_concluidas=true&incluir_arquivadas=true')) {
                return { ok: true, json: async () => [{ id: 2, nome: 'Alphaville', cliente: 'PB' }] };
            }
            if (url.endsWith('/obras/2')) {
                return { ok: true, json: async () => ({ sumarios: {} }) };
            }
            if (options.method === 'POST') {
                throw new Error('O POST não deveria ser chamado sem obra.');
            }
            throw new Error(`URL não simulada: ${url}`);
        });

        render(<GlobalFinanceiro />);

        await screen.findByText('Alphaville');
        fireEvent.click(screen.getByRole('button', { name: /Novo lançamento/i }));
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Sem obra' } });
        fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: /Salvar e Fechar/i }));

        await waitFor(() => expect(screen.getByLabelText('Obra')).toBeInvalid());
        expect(fetchWithAuth.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    });

    it('envia um parcelamento para a obra selecionada sem perder o vínculo do orçamento', async () => {
        fetchWithAuth.mockImplementation(async (url, options = {}) => {
            if (url.endsWith('/obras?mostrar_concluidas=true&incluir_arquivadas=true')) {
                return { ok: true, json: async () => [{ id: 7, nome: 'Reserva', cliente: 'PB' }] };
            }
            if (url.endsWith('/obras/7/orcamento-eng/itens-lista')) {
                return { ok: true, json: async () => [{ id: 73, nome_completo: '03.02 - Esquadrias' }] };
            }
            if (url.endsWith('/obras/7/inserir-pagamento') && options.method === 'POST') {
                return { ok: true, json: async () => ({ pagamento_parcelado: { id: 811 } }) };
            }
            if (url.endsWith('/obras/7')) {
                return { ok: true, json: async () => ({ sumarios: {} }) };
            }
            throw new Error(`URL não simulada: ${url}`);
        });

        render(<GlobalFinanceiro />);

        await screen.findByText('Reserva');
        fireEvent.click(screen.getByRole('button', { name: /Novo lançamento/i }));
        fireEvent.change(screen.getByLabelText('Obra'), { target: { value: '7' } });
        await screen.findByRole('option', { name: '03.02 - Esquadrias' });
        fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Esquadrias parceladas' } });
        fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: '3000' } });
        fireEvent.click(screen.getByLabelText('Parcelado'));
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '3' } });
        fireEvent.change(screen.getByLabelText('Vincular ao item do orçamento'), { target: { value: '73' } });
        fireEvent.click(screen.getByRole('button', { name: /Salvar e Fechar/i }));

        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith(
            expect.stringMatching(/\/obras\/7\/inserir-pagamento$/),
            expect.objectContaining({ method: 'POST' }),
        ));
        const postCall = fetchWithAuth.mock.calls.find(([url, options]) =>
            url.endsWith('/obras/7/inserir-pagamento') && options?.method === 'POST'
        );
        expect(JSON.parse(postCall[1].body)).toEqual(expect.objectContaining({
            tipo_forma_pagamento: 'parcelado',
            numero_parcelas: 3,
            periodicidade: 'Mensal',
            status: 'A Pagar',
            orcamento_item_id: 73,
        }));
    });
});
