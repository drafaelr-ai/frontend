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

/** Dias corridos entre duas datas civis, sem oscilação por fuso horário. */
export function diasDesdeSolicitacao(inicio, fim = new Date()) {
    const partes = (valor) => {
        if (!valor) return null;
        if (valor instanceof Date) {
            return [valor.getFullYear(), valor.getMonth() + 1, valor.getDate()];
        }
        const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    };

    const de = partes(inicio);
    const ate = partes(fim);
    if (!de || !ate) return null;

    const inicioUtc = Date.UTC(de[0], de[1] - 1, de[2]);
    const fimUtc = Date.UTC(ate[0], ate[1] - 1, ate[2]);
    return Math.max(0, Math.floor((fimUtc - inicioUtc) / 86400000));
}

export function textoDiasSolicitado(inicio, fim = new Date()) {
    const dias = diasDesdeSolicitacao(inicio, fim);
    if (dias == null) return '—';
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
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
    'Aberta', 'Em cotação', 'Aguardando aprovação', 'Aprovada', 'Rejeitada', 'Cancelada', 'Atendida',
];

/** Status da lista de compras — 'Atendida' vive só no histórico. */
export const STATUS_ATIVOS = STATUS_SOLICITACAO.filter(s => s !== 'Atendida');

export function statusBadge(status) {
    switch (status) {
        case 'Aberta':                return { cls: 'solc-b-info',    icon: 'ti-file-plus',  label: 'Aberta' };
        case 'Em cotação':            return { cls: 'solc-b-info',    icon: 'ti-search',     label: 'Em cotação' };
        case 'Aguardando aprovação':  return { cls: 'solc-b-warning', icon: 'ti-clock',      label: 'Aguardando aprovação' };
        case 'Aprovada':              return { cls: 'solc-b-success', icon: 'ti-check',      label: 'Aprovada' };
        case 'Atendida':              return { cls: 'solc-b-success', icon: 'ti-package',    label: 'Atendida' };
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
