const _MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** R$ 2.640,00 (2 casas). */
export function brl(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** R$ 44.180 (sem casas) — usado nos KPIs, fiel ao preview. */
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

/** '2026-06' -> 'Junho / 2026'. */
export function competenciaLabel(comp) {
    if (!comp) return '—';
    const [y, m] = comp.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${_MESES[idx] || m} / ${y}`;
}

/** '05/2026' curto p/ tabelas. */
export function competenciaCurta(comp) {
    if (!comp) return '—';
    const [y, m] = comp.split('-');
    return `${m}/${y}`;
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
