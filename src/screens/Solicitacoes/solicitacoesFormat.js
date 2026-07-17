/** R$ 2.640,00 (2 casas). */
export function brl(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** '2026-06-05' | ISO -> '05/06/2026'. */
export function dataBR(iso) {
    if (!iso) return '—';
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
}

/** ISO datetime (UTC) -> '05/06/2026 14:32' no fuso local. */
export function dataHoraBR(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return dataBR(iso); }
}

/** Iniciais p/ avatar. */
export function iniciais(nome) {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export const TIPOS_SOLICITACAO = [
    { value: 'Material', label: 'Material' },
    { value: 'Equipamentos', label: 'Equipamentos' },
    { value: 'Mão de Obra', label: 'Mão de Obra' },
    { value: 'Despesa', label: 'Despesa' },
];

export const STATUS_SOLICITACAO = [
    'Aberta', 'Em cotação', 'Aguardando aprovação', 'Aprovada', 'Rejeitada', 'Cancelada',
];

export function statusBadge(status) {
    switch (status) {
        case 'Aberta':                return { cls: 'solc-b-info',    icon: 'ti-file-plus',  label: 'Aberta' };
        case 'Em cotação':            return { cls: 'solc-b-info',    icon: 'ti-search',     label: 'Em cotação' };
        case 'Aguardando aprovação':  return { cls: 'solc-b-warning', icon: 'ti-clock',      label: 'Aguardando aprovação' };
        case 'Aprovada':              return { cls: 'solc-b-success', icon: 'ti-check',      label: 'Aprovada' };
        case 'Rejeitada':             return { cls: 'solc-b-danger',  icon: 'ti-x',          label: 'Rejeitada' };
        case 'Cancelada':             return { cls: 'solc-b-neutral', icon: 'ti-ban',        label: 'Cancelada' };
        default:                      return { cls: 'solc-b-neutral', icon: 'ti-help',       label: status || '—' };
    }
}

/** Resumo dos itens p/ a listagem: '50 sc Cimento CP-II (+2)'. */
export function resumoItens(itens, qtdItens) {
    if (Array.isArray(itens) && itens.length) {
        const i = itens[0];
        const extra = itens.length > 1 ? ` (+${itens.length - 1})` : '';
        return `${i.quantidade ?? ''} ${i.unidade || ''} ${i.descricao}`.trim() + extra;
    }
    return qtdItens ? `${qtdItens} item(ns)` : '—';
}
