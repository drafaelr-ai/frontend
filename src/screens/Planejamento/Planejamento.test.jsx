import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Planejamento from './index';
import { planejamentoApi } from './planejamentoApi';


jest.mock('./planejamentoApi', () => ({
    planejamentoApi: {
        listActivities: jest.fn(),
        getActivity: jest.fn(),
        getBudget: jest.fn(),
        getSchedules: jest.fn(),
        getClosings: jest.fn(),
        createActivity: jest.fn(),
        updateActivity: jest.fn(),
        deleteActivity: jest.fn(),
        importBudget: jest.fn(),
        importSpreadsheet: jest.fn(),
        addProgress: jest.fn(),
        addRestriction: jest.fn(),
        resolveRestriction: jest.fn(),
        closeWeek: jest.fn(),
    },
}));
jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
    confirmDialog: jest.fn().mockResolvedValue(true),
}));

const today = new Date().toISOString().slice(0, 10);
const activity = {
    id: 10,
    obra_id: 1,
    titulo: 'Concretagem da laje',
    etapa_nome: 'Estrutura',
    origem: 'orcamento',
    orcamento_codigo: '02.01',
    orcamento_item_id: 31,
    cronograma_id: 5,
    status: 'impedido',
    prioridade: 'alta',
    responsavel: 'Carlos',
    equipe: 'Equipe A',
    data_inicio: today,
    data_fim: today,
    quantidade_planejada: 100,
    quantidade_executada: 25,
    percentual_conclusao: 25,
    unidade: 'm2',
    versao: 2,
    apontamentos: [],
    restricoes_abertas: 1,
    restricoes: [{ id: 77, tipo: 'material', descricao: 'Aguardando concreto', status: 'aberta' }],
};
const queueActivity = {
    ...activity,
    id: 11,
    titulo: 'Revisar projeto executivo',
    origem: 'manual',
    orcamento_item_id: null,
    status: 'a_planejar',
    data_inicio: null,
    data_fim: null,
    restricoes: [],
    restricoes_abertas: 0,
};

function configureApi() {
    planejamentoApi.listActivities.mockResolvedValue({
        itens: [activity, queueActivity],
        resumo: {
            total: 2,
            por_status: { a_planejar: 1, pronto: 0, em_andamento: 0, impedido: 1, concluido: 0 },
            restricoes_abertas: 1,
            confiabilidade: 0,
        },
    });
    planejamentoApi.getActivity.mockResolvedValue(activity);
    planejamentoApi.getBudget.mockResolvedValue({
        etapas: [{ id: 2, nome: 'Estrutura', itens: [{ id: 32, codigo: '02.02', descricao: 'Armação', quantidade: 10, unidade: 'kg' }] }],
    });
    planejamentoApi.getSchedules.mockResolvedValue([{ id: 5, servico_nome: 'Cronograma principal' }]);
    planejamentoApi.getClosings.mockResolvedValue([]);
    planejamentoApi.createActivity.mockResolvedValue({ id: 90 });
    planejamentoApi.importBudget.mockResolvedValue({ criados: [{ id: 91 }], ignorados: [] });
    planejamentoApi.addProgress.mockResolvedValue({ atividade: { ...activity, quantidade_executada: 30, percentual_conclusao: 30 } });
    planejamentoApi.resolveRestriction.mockResolvedValue({ atividade: { ...activity, status: 'em_andamento', restricoes: [] } });
}

describe('Planejamento', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.history.replaceState(null, '', '/');
        configureApi();
    });

    it('carrega em paralelo e alterna entre as telas principais', async () => {
        render(<Planejamento obraId={1} obraNome="Residencial Aurora" user={{ role: 'administrador' }} />);
        expect(await screen.findByRole('heading', { name: 'Residencial Aurora' })).toBeInTheDocument();
        expect(screen.getByText('Concretagem da laje')).toBeInTheDocument();
        expect(planejamentoApi.listActivities).toHaveBeenCalledWith(1, { limit: 200 });
        expect(planejamentoApi.getBudget).toHaveBeenCalledWith(1);
        expect(planejamentoApi.getSchedules).toHaveBeenCalledWith(1);

        fireEvent.click(screen.getByRole('tab', { name: 'Semana' }));
        expect(screen.getByRole('button', { name: 'Fechar semana' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Mês' }));
        expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /A planejar/ }));
        expect(screen.getByText('Revisar projeto executivo')).toBeInTheDocument();
    });

    it('cria atividade manual e importa um item do orçamento', async () => {
        render(<Planejamento obraId={1} obraNome="Residencial Aurora" user={{ role: 'master' }} />);
        await screen.findByText('Concretagem da laje');

        fireEvent.click(screen.getByRole('button', { name: /Nova atividade/ }));
        fireEvent.change(screen.getByLabelText('Atividade *'), { target: { value: 'Limpeza final' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar atividade' }));
        await waitFor(() => expect(planejamentoApi.createActivity).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Limpeza final' })));

        fireEvent.click(screen.getByRole('button', { name: /Importar/ }));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Importar 1 item/ }));
        await waitFor(() => expect(planejamentoApi.importBudget).toHaveBeenCalledWith(1, expect.objectContaining({ item_ids: [32] })));
    });

    it('abre detalhes, aponta produção e resolve impedimento', async () => {
        render(<Planejamento obraId={1} obraNome="Residencial Aurora" user={{ role: 'comum' }} />);
        const cardTitle = await screen.findByText('Concretagem da laje');
        fireEvent.click(cardTitle.closest('button'));
        expect(screen.getByRole('heading', { name: 'Concretagem da laje' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Apontar produção/ }));
        fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
        await waitFor(() => expect(planejamentoApi.addProgress).toHaveBeenCalledWith(10, expect.objectContaining({ quantidade: '5' })));

        fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
        await waitFor(() => expect(planejamentoApi.resolveRestriction).toHaveBeenCalledWith(77));
        expect(screen.queryByText('Excluir atividade')).not.toBeInTheDocument();
    });

    it('abre diretamente a atividade indicada pelo painel global', async () => {
        window.history.replaceState(null, '', '/?obra=1&page=planejamento&atividade=10');
        render(
            <Planejamento
                obraId={1}
                obraNome="Residencial Aurora"
                user={{ role: 'administrador' }}
                initialActivityId="10"
            />
        );

        expect(await screen.findByLabelText('Detalhes de Concretagem da laje')).toBeInTheDocument();
        expect(planejamentoApi.getActivity).toHaveBeenCalledWith(10);

        fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhes' }));
        expect(new URLSearchParams(window.location.search).has('atividade')).toBe(false);
    });
});
