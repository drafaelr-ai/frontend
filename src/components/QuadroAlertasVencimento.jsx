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
                <h3>📊 Status de Pagamentos</h3>
                <p>Carregando...</p>
            </div>
        );
    }

    if (!alertas) return null;

    const categorias = [
        {
            key: 'vencidos',
            titulo: 'Vencidos',
            icon: '🔴',
            cor: 'var(--cor-vermelho)',
            corLight: 'var(--cor-vermelho-light)',
            corBg: 'var(--cor-vermelho-bg)',
            dados: alertas.vencidos
        },
        {
            key: 'vence_hoje',
            titulo: 'Vence Hoje',
            icon: '🟡',
            cor: 'var(--cor-warning)',
            corLight: 'var(--cor-warning-light)',
            corBg: 'var(--cor-warning-bg)',
            dados: alertas.vence_hoje
        },
        {
            key: 'vence_amanha',
            titulo: 'Vence Amanhã',
            icon: '🟠',
            cor: 'var(--cor-info)',
            corLight: 'var(--cor-info-light)',
            corBg: 'var(--cor-info-bg)',
            dados: alertas.vence_amanha
        },
        {
            key: 'vence_7_dias',
            titulo: 'Próximos 7 dias',
            icon: '🔵',
            cor: 'var(--cor-purple)',
            corLight: 'var(--cor-purple-light)',
            corBg: 'var(--cor-purple-bg)',
            dados: alertas.vence_7_dias
        },
        {
            key: 'futuros',
            titulo: 'Futuros (+7d)',
            icon: '📅',
            cor: 'var(--cor-acento)',
            corLight: 'var(--cor-acento-light)',
            corBg: 'var(--cor-acento-bg)',
            dados: alertas.futuros
        }
    ];

    return (
        <div className="cf-section" style={{ marginBottom: '24px' }}>
            <div className="cf-section-header">
                <div className="cf-section-title">📊 Quadro Informativo - Cronograma Financeiro</div>
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
                                {categoria.icon}
                            </div>
                            {categoria.dados.itens?.length > 0 && (
                                <span style={{
                                    fontSize: '10px',
                                    color: categoria.cor,
                                    fontWeight: '600',
                                    background: categoria.corBg,
                                    padding: '3px 8px',
                                    borderRadius: '12px'
                                }}>
                                    Ver →
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
                    backgroundColor: 'var(--cor-fundo-secundario)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${categorias.find(c => c.key === categoriaExpandida)?.corLight}`
                }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--cor-texto)', fontSize: '16px' }}>
                        {categorias.find(c => c.key === categoriaExpandida)?.icon} {categorias.find(c => c.key === categoriaExpandida)?.titulo} - Detalhes
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {alertas[categoriaExpandida]?.itens?.map((item, index) => (
                            <div key={index} className="cf-pagamento-futuro-item">
                                <div className="cf-pagamento-futuro-icon">
                                    {item.tipo === 'Parcela' ? '📦' : '💳'}
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
                        ← Fechar detalhes
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuadroAlertasVencimento;
