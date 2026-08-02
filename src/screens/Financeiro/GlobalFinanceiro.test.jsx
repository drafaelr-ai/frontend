import React from 'react';
import { render, screen } from '@testing-library/react';
import GlobalFinanceiro from './GlobalFinanceiro';
import { fetchWithAuth } from '../../auth/fetchWithAuth';


jest.mock('../../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../Dashboard/components/DashboardHeader', () => () => <div data-testid="dashboard-header" />);
jest.mock('../../utils/notify', () => ({ notify: { error: jest.fn() } }));

describe('GlobalFinanceiro', () => {
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
});
