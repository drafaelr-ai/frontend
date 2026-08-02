import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GlobalPlanejamento from './GlobalPlanejamento';
import { planejamentoApi } from './planejamentoApi';


jest.mock('./planejamentoApi', () => ({ planejamentoApi: { getPanel: jest.fn() } }));
jest.mock('../Dashboard/components/DashboardHeader', () => () => <div data-testid="dashboard-header" />);
jest.mock('../../utils/notify', () => ({ notify: { error: jest.fn() } }));

describe('GlobalPlanejamento', () => {
    it('consolida obras, atividades e permite filtrar', async () => {
        const onOpenWork = jest.fn();
        planejamentoApi.getPanel.mockResolvedValue({
            resumo: { total: 1, por_status: { em_andamento: 1, concluido: 0 }, restricoes_abertas: 1, confiabilidade: 50 },
            obras: [{ id: 1, nome: 'Obra Aurora', cliente: 'Cliente A', planejamento: { total: 1, por_status: { concluido: 0 }, restricoes_abertas: 1 } }],
            atividades: [{
                id: 9,
                obra_id: 1,
                obra_nome: 'Obra Aurora',
                titulo: 'Concretagem',
                etapa_nome: 'Estrutura',
                responsavel: 'Carlos',
                prioridade: 'alta',
                data_inicio: '2026-08-03',
                data_fim: '2026-08-04',
                status: 'impedido',
                percentual_conclusao: 30,
                restricoes: [{ id: 44, tipo: 'material', descricao: 'Concreto ainda não entregue', status: 'aberta', responsavel: 'Marina', data_limite: '2026-08-02' }],
            }],
        });
        render(<GlobalPlanejamento onOpenWork={onOpenWork} />);
        expect(await screen.findByRole('heading', { name: 'Visão geral das obras' })).toBeInTheDocument();
        expect(await screen.findByText('Concretagem')).toBeInTheDocument();
        expect(screen.getAllByText('Obra Aurora').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByText('Concretagem').closest('button'));
        expect(onOpenWork).toHaveBeenCalledWith(1, 9);

        fireEvent.click(screen.getByRole('button', { name: 'Ver impedimentos em aberto' }));
        expect(screen.getByRole('dialog', { name: 'Impedimentos em aberto' })).toBeInTheDocument();
        expect(screen.getByText('Concreto ainda não entregue')).toBeInTheDocument();
        expect(screen.getByText('Marina')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Abrir atividade/i }));
        expect(onOpenWork).toHaveBeenLastCalledWith(1, 9);

        fireEvent.change(screen.getByLabelText('Buscar em todas as obras'), { target: { value: 'inexistente' } });
        expect(screen.getByText('Nenhuma atividade encontrada')).toBeInTheDocument();
    });
});
