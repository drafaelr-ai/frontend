/**
 * Tradução do ícone guardado na categoria do módulo administrativo para uma
 * classe do Tabler Icons.
 *
 * O banco do admin guarda `categoria.icone` como texto livre e as categorias
 * padrão antigas foram semeadas com emoji (ver
 * `backend/services_admin/categorias_service.py`). A convenção do projeto
 * (docs/CONVENCOES.md) proíbe emoji na interface, então o mapa abaixo traduz os
 * valores legados. Valores que já são classes Tabler (`ti-...`) passam direto,
 * de modo que a tela funciona com bancos antigos e novos sem migração de dados.
 */

export const ICONE_CATEGORIA_PADRAO = 'ti-cash';

const POR_EMOJI = {
    // Despesas
    '🏛': 'ti-building-bank',       // IPTU
    '🏢': 'ti-building-community',  // Condomínio
    '⚡': 'ti-bulb',                // Energia
    '💧': 'ti-droplet',             // Água
    '🔥': 'ti-flame',               // Gás
    '📡': 'ti-wifi',                // Internet/TV
    '🛡': 'ti-shield-check',        // Seguro
    '🔧': 'ti-tool',                // Manutenção
    '🧹': 'ti-sparkles',            // Limpeza
    '🌳': 'ti-shovel',              // Jardinagem
    '👷': 'ti-hard-hat',            // Empregados
    '🧽': 'ti-user',                // Diarista
    '📋': 'ti-clipboard-list',      // Taxa Extra
    '🏗': 'ti-bricks',              // Reforma
    '📦': 'ti-package',             // Outras Despesas
    // Receitas
    '🏠': 'ti-home',                // Aluguel
    '💵': 'ti-cash-banknote',       // Reembolso
    '🤝': 'ti-shopping-cart',       // Venda
    '💰': 'ti-coins',               // Outras Receitas
    // Outros valores já vistos em telas antigas
    '🧾': 'ti-receipt',
    '📄': 'ti-file-description',
    '🚗': 'ti-truck',
    '📅': 'ti-calendar',
};

/**
 * @param {unknown} valor valor cru vindo de `categoria.icone` / `categoria_icone`
 * @returns {string} classe do Tabler Icons (sempre sem o prefixo `ti `)
 */
export function iconeCategoria(valor) {
    if (typeof valor !== 'string') return ICONE_CATEGORIA_PADRAO;
    const bruto = valor.trim();
    if (!bruto) return ICONE_CATEGORIA_PADRAO;
    if (bruto.startsWith('ti-')) return bruto;
    // Muitos emoji vêm com o seletor de variação U+FE0F ('🏛️' vs '🏛').
    const semVariacao = bruto.replace(/️/g, '');
    return POR_EMOJI[bruto] || POR_EMOJI[semVariacao] || ICONE_CATEGORIA_PADRAO;
}

export default iconeCategoria;
