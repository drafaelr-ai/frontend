import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { formatCurrency } from '../../utils/format';

const ModalWhatsAppCronograma = ({ obraNome, pagamentosFuturos, pagamentosParcelados, onClose }) => {
    const hoje = new Date();
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
                linhas.push(`  • ${p.descricao} — ${formatCurrency(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }
        if (aVencer.length > 0) {
            linhas.push(`\n⏰ *A VENCER (${aVencer.length})*`);
            aVencer.forEach(p => {
                linhas.push(`  • ${p.descricao} — ${formatCurrency(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }
        if (parcelas.length > 0) {
            linhas.push(`\n📦 *PARCELAS (${parcelas.length})*`);
            parcelas.forEach(p => {
                linhas.push(`  • ${p.descricao} — ${formatCurrency(p.valor)} | Venc: ${formatDate(p.data_vencimento)}`);
                if (p.pix) linhas.push(`    🔑 PIX: ${p.pix}`);
                if (p.codigo_barras) linhas.push(`    📋 Cód: ${p.codigo_barras}`);
            });
        }

        linhas.push(`\n─────────────────────────`);
        linhas.push(`💰 *TOTAL SELECIONADO: ${formatCurrency(totalSelecionado)}*`);
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Compartilhar no WhatsApp"
            subtitle={obraNome}
            width="large"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="m-btn-primary"
                        onClick={compartilhar}
                        disabled={selecionados.size === 0}
                    >
                        <i className="ti ti-brand-whatsapp" aria-hidden="true"></i>
                        Compartilhar ({selecionados.size})
                    </button>
                </>
            }
        >
            {/* Toolbar: selecionar todos + contagem + total */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) 0 var(--space-3)',
                borderBottom: '0.5px solid var(--border-subtle)',
                marginBottom: 'var(--space-3)',
            }}>
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                    color: 'var(--text-secondary)',
                }}>
                    <input
                        type="checkbox"
                        checked={selecionados.size === todosPendentes.length}
                        onChange={toggleTodos}
                    />
                    {selecionados.size === todosPendentes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </label>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    {selecionados.size} de {todosPendentes.length}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--brand-primary)' }}>
                    {formatCurrency(totalSelecionado)}
                </span>
            </div>

            {/* Lista de itens */}
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {todosPendentes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        Nenhum pagamento pendente encontrado.
                    </div>
                ) : todosPendentes.map(item => (
                    <label key={item.key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                        padding: 'var(--space-2) var(--space-1)',
                        cursor: 'pointer',
                        borderBottom: '0.5px solid var(--border-subtle)',
                        background: selecionados.has(item.key) ? 'var(--status-success-bg)' : 'var(--surface-card)',
                    }}
                        onMouseEnter={e => {
                            if (!selecionados.has(item.key)) e.currentTarget.style.background = 'var(--surface-muted)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = selecionados.has(item.key) ? 'var(--status-success-bg)' : 'var(--surface-card)';
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selecionados.has(item.key)}
                            onChange={() => toggleItem(item.key)}
                            style={{ marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
                                    padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)',
                                    background: item.vencido ? 'var(--status-danger-bg)' : item.tipo === '📦 Parcela' ? 'var(--status-purple-bg)' : 'var(--status-warning-bg)',
                                    color: item.vencido ? 'var(--status-danger-text)' : item.tipo === '📦 Parcela' ? 'var(--status-purple-text)' : 'var(--status-warning-text)',
                                }}>{item.tipo}</span>
                                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{item.descricao}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 'var(--weight-medium)', color: item.vencido ? 'var(--status-danger)' : 'var(--status-success-text)' }}>
                                    {formatCurrency(item.valor)}
                                </span>
                                <span>{formatDate(item.data_vencimento)}</span>
                                {item.pix && <span>{item.pix}</span>}
                                {item.codigo_barras && <span>{item.codigo_barras.substring(0, 20)}…</span>}
                            </div>
                        </div>
                    </label>
                ))}
            </div>
        </Modal>
    );
};

export default React.memo(ModalWhatsAppCronograma);
