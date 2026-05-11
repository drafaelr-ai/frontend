import React, { useState } from 'react';

const ModalWhatsAppCronograma = ({ obraNome, pagamentosFuturos, pagamentosParcelados, onClose }) => {
    const hoje = new Date();
    const formatVal = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

    const todosPendentes = [
        ...pagamentosFuturos
            .filter(p => p.status === 'Previsto')
            .map(p => ({
                key: `futuro-${p.id}`,
                tipo: new Date(p.data_vencimento + 'T00:00:00') < hoje ? '🚨 Vencido' : '⏰ A Vencer',
                descricao: p.descricao,
                valor: p.valor,
                data_vencimento: p.data_vencimento,
                pix: p.pix,
                codigo_barras: p.codigo_barras,
                vencido: new Date(p.data_vencimento + 'T00:00:00') < hoje,
            })),
        ...pagamentosParcelados.filter(pp => pp.status !== 'Concluído').map(pp => {
            const proxima = (pp.parcelas || [])
                .filter(parc => parc.status === 'Previsto')
                .sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''))
                [0];
            if (!proxima) return null;
            const totalParcelas = pp.numero_parcelas || pp.qtd_parcelas || '?';
            const numDisplay = proxima.numero_parcela === 0
                ? 'Entrada'
                : (pp.tem_entrada ? (proxima.numero_parcela + 1) : (proxima.numero_parcela || '?'));
            return {
                key: `parcela-${proxima.id}`,
                tipo: '📦 Parcela',
                descricao: `${pp.descricao} (${numDisplay}/${totalParcelas})`,
                valor: proxima.valor_parcela || proxima.valor || 0,
                data_vencimento: proxima.data_vencimento,
                pix: pp.pix,
                codigo_barras: proxima.codigo_barras || pp.codigo_barras,
                vencido: proxima.data_vencimento && new Date(proxima.data_vencimento + 'T00:00:00') < hoje,
            };
        }).filter(Boolean),
    ].sort((a, b) => {
        if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
        return (a.data_vencimento || '').localeCompare(b.data_vencimento || '');
    });

    const [selecionados, setSelecionados] = useState(() => new Set(todosPendentes.map(p => p.key)));

    const toggleItem = (key) => {
        setSelecionados(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleTodos = () => {
        if (selecionados.size === todosPendentes.length) setSelecionados(new Set());
        else setSelecionados(new Set(todosPendentes.map(p => p.key)));
    };

    const itensSelecionados = todosPendentes.filter(p => selecionados.has(p.key));
    const totalSelecionado = itensSelecionados.reduce((a, p) => a + (p.valor || 0), 0);

    const compartilhar = () => {
        const linhas = [];
        linhas.push(`📋 *CRONOGRAMA FINANCEIRO - OBRALY*`);
        linhas.push(`🏗️ Obra: *${obraNome}*`);
        linhas.push(`📅 Gerado em: ${hoje.toLocaleDateString('pt-BR')}`);
        linhas.push(`─────────────────────────`);

        const vencidos = itensSelecionados.filter(p => p.vencido);
        const aVencer = itensSelecionados.filter(p => !p.vencido && p.tipo !== '📦 Parcela');
        const parcelas = itensSelecionados.filter(p => p.tipo === '📦 Parcela');

        if (vencidos.length > 0) {
            linhas.push(`\n🚨 *VENCIDOS (${vencidos.length})*`);
            vencidos.forEach(p => {
                linhas.push(`  • ${p.descricao} — ${formatVal(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }
        if (aVencer.length > 0) {
            linhas.push(`\n⏰ *A VENCER (${aVencer.length})*`);
            aVencer.forEach(p => {
                linhas.push(`  • ${p.descricao} — ${formatVal(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }
        if (parcelas.length > 0) {
            linhas.push(`\n📦 *PARCELAS (${parcelas.length})*`);
            parcelas.forEach(p => {
                linhas.push(`  • ${p.descricao} — ${formatVal(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }

        linhas.push(`\n─────────────────────────`);
        linhas.push(`💰 *TOTAL SELECIONADO: ${formatVal(totalSelecionado)}*`);
        linhas.push(`_Gerado pelo Obraly_`);

        const url = `https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px',
                maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 64px rgba(0,0,0,0.35)'
            }}>
                {/* Header */}
                <div style={{ padding: '18px 24px', background: '#075E54', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: 700 }}>💬 Compartilhar no WhatsApp</h2>
                        <p style={{ margin: '2px 0 0', color: '#a7f3d0', fontSize: '13px' }}>Selecione os pagamentos que deseja incluir</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        <input type="checkbox"
                            checked={selecionados.size === todosPendentes.length}
                            onChange={toggleTodos}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {selecionados.size === todosPendentes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </label>
                    <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280' }}>
                        {selecionados.size} de {todosPendentes.length} selecionados
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#075E54' }}>
                        {formatVal(totalSelecionado)}
                    </span>
                </div>

                {/* Lista de itens */}
                <div style={{ overflow: 'auto', flex: 1, padding: '8px 0' }}>
                    {todosPendentes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            Nenhum pagamento pendente encontrado.
                        </div>
                    ) : todosPendentes.map(item => (
                        <label key={item.key} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 24px',
                            cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s',
                            background: selecionados.has(item.key) ? '#f0fdf4' : '#fff',
                        }}
                            onMouseEnter={e => { if (!selecionados.has(item.key)) e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = selecionados.has(item.key) ? '#f0fdf4' : '#fff'; }}
                        >
                            <input type="checkbox"
                                checked={selecionados.has(item.key)}
                                onChange={() => toggleItem(item.key)}
                                style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                                        background: item.vencido ? '#fee2e2' : item.tipo === '📦 Parcela' ? '#ede9fe' : '#fef3c7',
                                        color: item.vencido ? '#991b1b' : item.tipo === '📦 Parcela' ? '#6d28d9' : '#92400e',
                                    }}>{item.tipo}</span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.descricao}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, color: item.vencido ? '#dc2626' : '#059669' }}>{formatVal(item.valor)}</span>
                                    <span>📅 {formatDate(item.data_vencimento)}</span>
                                    {item.pix && <span>🔑 {item.pix}</span>}
                                    {item.codigo_barras && <span>📋 {item.codigo_barras.substring(0, 20)}…</span>}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={compartilhar}
                        disabled={selecionados.size === 0}
                        style={{
                            padding: '10px 24px', borderRadius: '8px', border: 'none',
                            background: selecionados.size === 0 ? '#9ca3af' : '#25D366',
                            color: '#fff', fontWeight: 700, cursor: selecionados.size === 0 ? 'not-allowed' : 'pointer', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        💬 Compartilhar ({selecionados.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalWhatsAppCronograma;
