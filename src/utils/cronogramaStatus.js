// Status do cronograma físico (prazo x execução), compartilhado entre
// CronogramaObra, EtapaCard, EtapasGrid, WeeklyView, GanttCronograma e CronogramaNew.
// Centralizado aqui porque a mesma lógica já foi duplicada 6x independentemente
// e teve o mesmo bug de fronteira de data corrigido em só algumas cópias.

// Diferença (planejado - executado), em pontos percentuais, a partir da qual
// um serviço ainda dentro do prazo já é sinalizado como "Atenção".
const LIMITE_ATENCAO_PP = 15;

export function calcularPlanejadoHoje(servico) {
    if (!servico.data_inicio || !servico.data_fim_prevista) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const start = new Date(servico.data_inicio + 'T00:00:00');
    const end = new Date(servico.data_fim_prevista + 'T00:00:00');
    if (hoje < start) return 0;
    if (hoje >= end) return 100;
    const total = end - start;
    const passed = hoje - start;
    return Math.round((passed / total) * 100);
}

export function getCronogramaStatusKey(servico) {
    const pct = servico.percentual_conclusao || 0;
    if (pct >= 100) return 'concluido';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = servico.data_fim_prevista ? new Date(servico.data_fim_prevista + 'T00:00:00') : null;
    if (dataFim && hoje >= dataFim) return 'atrasado';

    const planejadoHoje = calcularPlanejadoHoje(servico);
    if (planejadoHoje != null && (planejadoHoje - pct) >= LIMITE_ATENCAO_PP) return 'atencao';

    if (servico.data_inicio_real || pct > 0) return 'em_andamento';
    return 'a_iniciar';
}
