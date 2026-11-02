/**
 * Paleta dos gráficos.
 *
 * Os valores moram em styles/tokens.css como `--chart-1..16`; aqui ficam
 * só as SEQUÊNCIAS, porque duas telas foram escritas em momentos
 * diferentes e cada uma tem a sua ordem. Mantive as duas como estavam
 * para nenhum gráfico trocar de cor na refatoração.
 *
 * `var()` resolve em atributo de SVG (`stroke=`, `fill=`) — o
 * DashboardObra já depende disso em produção, com `fill={item.color}`
 * recebendo `var(--module-obras)`. O que NÃO resolve é `<canvas>`
 * (medido: `ctx.fillStyle = 'var(--x)'` cai para preto). Se algum
 * gráfico for para canvas, ele precisa de valor literal, não daqui.
 */

const chart = n => `var(--chart-${n})`;

/** Ordem usada pelo BI (BiModule). */
export const CHART_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map(chart);

/** Ordem usada pelo donut de materiais do DashboardObra. */
export const CHART_COLORS_MATERIAIS =
    [5, 4, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(chart);

/** Grade e eixo. */
export const CHART_GRID = 'var(--surface-muted)';
export const CHART_AXIS = 'var(--status-neutral)';

export default CHART_COLORS;
