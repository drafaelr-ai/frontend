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
            resumo: { por_status: { em_andamento: 1, concluido: 0 }, restricoes_abertas: 1, confiabilidade: 50 },
            obras: [{ id: 1, nome: 'Obra Aurora', cliente: 'Cliente A', planejamento: { total: 1, por_status: { concluido: 0 }, restricoes_abertas: 1 } }],
            atividades: [{ id: 9, obra_id: 1, obra_nome: 'Obra Aurora', titulo: 'Concretagem', etapa_nome: 'Estrutura', responsavel: 'Carlos', data_inicio: '2026-08-03', data_fim: '2026-08-04', status: 'em_andamento', percentual_conclusao: 30 }],
        });
        render(<GlobalPlanejamento onOpenWork={onOpenWork} />);
        expect(await screen.findByRole('heading', { name: 'Painel de planejamento' })).toBeInTheDocument();
        expect(await screen.findByText('Concretagem')).toBeInTheDocument();
        expect(screen.getAllByText('Obra Aurora').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByText('Concretagem').closest('button'));
        expect(onOpenWork).toHaveBeenCalledWith(1, 9);

        fireEvent.change(screen.getByLabelText('Buscar em todas as obras'), { target: { value: 'inexistente' } });
        expect(screen.getByText('Nenhuma atividade encontrada')).toBeInTheDocument();
    });
});
