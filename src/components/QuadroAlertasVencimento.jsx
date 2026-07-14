import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import { formatCurrency } from '../utils/format';

const QuadroAlertasVencimento = ({ obraId }) => {
    const [alertas, setAlertas] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [categoriaExpandida, setCategoriaExpandida] = useState(null);

    useEffect(() => {
        carregarAlertas();
    }, [obraId]);

    const carregarAlertas = async () => {
        try {
            setIsLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/alertas-vencimento`
            );

            if (!response.ok) throw new Error('Erro ao carregar alertas');

            const data = await response.json();
            setAlertas(data);
        } catch (err) {
            logger.error('Erro ao carregar alertas:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCategoria = (categoria) => {
        setCategoriaExpandida(categoriaExpandida === categoria ? null : categoria);
    };

    if (isLoading) {
        return (
            <div className="card-full">
                <h3><i className="ti ti-layout-dashboard" aria-hidden="true" /> Status de Pagamentos</h3>
                <p>Carregando...</p>
            </div>
        );
    }

    if (!alertas) return null;

    const categorias = [
        {
            key: 'vencidos',
            titulo: 'Vencidos',
            icon: 'ti-alert-circle',
            cor: 'var(--status-danger)',
            corBg: 'var(--status-danger-bg)',
            dados: alertas.vencidos
        },
        {
            key: 'vence_hoje',
            titulo: 'Vence Hoje',
            icon: 'ti-clock',
            cor: 'var(--status-warning)',
            corBg: 'var(--status-warning-bg)',
            dados: alertas.vence_hoje
        },
        {
            key: 'vence_amanha',
            titulo: 'Vence Amanhã',
            icon: 'ti-clock-hour-4',
            cor: 'var(--status-warning)',
            corBg: 'var(--status-warning-bg)',
            dados: alertas.vence_amanha
        },
        {
            key: 'vence_7_dias',
            titulo: 'Próximos 7 dias',
            icon: 'ti-calendar-week',
            cor: 'var(--status-purple-text)',
            corBg: 'var(--status-purple-bg)',
            dados: alertas.vence_7_dias
        },
        {
            key: 'futuros',
            titulo: 'Futuros (+7d)',
            icon: 'ti-calendar-event',
            cor: 'var(--status-success)',
            corBg: 'var(--status-success-bg)',
            dados: alertas.futuros
        }
    ];

    return (
        <div className="cf-section" style={{ marginBottom: '24px' }}>
            <div className="cf-section-header">
                <div className="cf-section-title"><i className="ti ti-layout-dashboard" aria-hidden="true" /> Quadro Informativo - Cronograma Financeiro</div>
            </div>

            {/* Cards de Status */}
            <div className="status-cards-grid">
                {categorias.map(categoria => (
                    <div
                        key={categoria.key}
                        className="status-card"
                        style={{
                            cursor: categoria.dados.itens?.length > 0 ? 'pointer' : 'default',
                            borderTop: `3px solid ${categoria.cor}`
                        }}
                        onClick={() => categoria.dados.itens?.length > 0 && toggleCategoria(categoria.key)}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div
                                className="status-card-icon"
                                style={{ background: categoria.corBg }}
                            >
                                <i className={`ti ${categoria.icon}`} aria-hidden="true" />
                            </div>
                            {categoria.dados.itens?.length > 0 && (
                                <span style={{
                                    fontSize: '10px',
                                    color: categoria.cor,
                                    fontWeight: '600',
                                    background: categoria.corBg,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}>
                                    Ver <i className="ti ti-arrow-right" aria-hidden="true" />
                                </span>
                            )}
                        </div>
                        <div className="status-card-label">{categoria.titulo}</div>
                        <div className="status-card-value">{formatCurrency(categoria.dados.valor_total)}</div>
                        <div className="status-card-count">
                            {categoria.dados.quantidade} {categoria.dados.quantidade === 1 ? 'item' : 'itens'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lista Expandida de Itens */}
            {categoriaExpandida && (
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    backgroundColor: 'var(--surface-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '16px' }}>
                        <i className={`ti ${categorias.find(c => c.key === categoriaExpandida)?.icon ?? 'ti-info-circle'}`} aria-hidden="true" /> {categorias.find(c => c.key === categoriaExpandida)?.titulo} - Detalhes
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {alertas[categoriaExpandida]?.itens?.map((item, index) => (
                            <div key={index} className="cf-pagamento-futuro-item">
                                <div className="cf-pagamento-futuro-icon">
                                    {item.tipo === 'Parcela'
                                        ? <i className="ti ti-package" aria-hidden="true" />
                                        : <i className="ti ti-credit-card" aria-hidden="true" />}
                                </div>
                                <div className="cf-pagamento-futuro-info">
                                    <div className="cf-pagamento-futuro-desc">{item.descricao}</div>
                                    <div className="cf-pagamento-futuro-meta">
                                        {item.fornecedor || 'Sem fornecedor'} · {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                                <div className="cf-pagamento-futuro-valor">{formatCurrency(item.valor)}</div>
                                <span className={`cf-badge ${item.tipo === 'Parcela' ? 'cf-badge-purple' : 'cf-badge-info'}`}>
                                    {item.tipo}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setCategoriaExpandida(null)}
                        className="cf-btn cf-btn-outline"
                        style={{ marginTop: '16px' }}
                    >
                        <i className="ti ti-arrow-left" aria-hidden="true" /> Fechar detalhes
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuadroAlertasVencimento;
