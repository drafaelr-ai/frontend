const _MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** R$ 2.640,00 (2 casas). */
export function brl(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** R$ 44.180 (sem casas) — usado nos KPIs. */
export function brlShort(v) {
    const n = Math.round(Number(v) || 0);
    return 'R$ ' + n.toLocaleString('pt-BR');
}

/** '2026-06-05' | ISO -> '05/06/2026'. */
export function dataBR(iso) {
    if (!iso) return '—';
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
}

/** 'ABC1D23' -> 'ABC-1D23'. */
export function placaBR(placa) {
    if (!placa) return '—';
    const p = String(placa).toUpperCase();
    return p.length === 7 ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

/** '2026-06' -> 'Junho / 2026'. */
export function competenciaLabel(comp) {
    if (!comp) return '—';
    const [y, m] = comp.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${_MESES[idx] || m} / ${y}`;
}

/** Competência atual 'YYYY-MM'. */
export function competenciaAtual() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Últimas N competências (mais recente primeiro) como [{value,label}]. */
export function opcoesCompetencia(n = 12) {
    const out = [];
    const d = new Date();
    for (let i = 0; i < n; i++) {
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        out.push({ value, label: competenciaLabel(value) });
        d.setMonth(d.getMonth() - 1);
    }
    return out;
}

/** Iniciais p/ avatar. */
export function iniciais(nome) {
    if (!nome) return '?';
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/** '2.640,00' | 2640 -> 2640.00 (number). null se vazio. */
export function moedaParaNumero(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    let s = String(v).replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
}

export const TIPOS_VEICULO = [
    { value: 'carro', label: 'Carro' },
    { value: 'caminhonete', label: 'Caminhonete' },
    { value: 'caminhao', label: 'Caminhão' },
    { value: 'moto', label: 'Moto' },
    { value: 'maquina', label: 'Máquina' },
    { value: 'outro', label: 'Outro' },
];

export const COMBUSTIVEIS = [
    { value: 'flex', label: 'Flex' },
    { value: 'gasolina', label: 'Gasolina' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'etanol', label: 'Etanol' },
    { value: 'gnv', label: 'GNV' },
    { value: 'eletrico', label: 'Elétrico' },
];

export const TIPOS_DOCUMENTO = [
    { value: 'crlv', label: 'CRLV' },
    { value: 'seguro', label: 'Seguro' },
    { value: 'ipva', label: 'IPVA' },
    { value: 'licenciamento', label: 'Licenciamento' },
    { value: 'outro', label: 'Outro' },
];

export function tipoVeiculoLabel(v) {
    return (TIPOS_VEICULO.find(t => t.value === v) || {}).label || v || '—';
}

export function tipoDocLabel(v) {
    return (TIPOS_DOCUMENTO.find(t => t.value === v) || {}).label || v || '—';
}

export function statusVeiculoBadge(status) {
    switch (status) {
        case 'ativo': return { cls: 'frota-b-success', label: 'Ativo' };
        case 'em_manutencao': return { cls: 'frota-b-warning', label: 'Em manutenção' };
        case 'vendido': return { cls: 'frota-b-neutral', label: 'Vendido' };
        case 'inativo': return { cls: 'frota-b-neutral', label: 'Inativo' };
        default: return { cls: 'frota-b-neutral', label: status || '—' };
    }
}

export function vencimentoBadge(status) {
    switch (status) {
        case 'vencido': case 'vencida': return { cls: 'frota-b-danger', label: 'Vencido' };
        case 'a_vencer': return { cls: 'frota-b-warning', label: 'Vence em breve' };
        case 'ok': return { cls: 'frota-b-success', label: 'Em dia' };
        default: return null;
    }
}
