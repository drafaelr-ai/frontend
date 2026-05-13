import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { formatCurrency } from '../../utils/format';

const ModalOrcamentos = ({ onClose, obraId, obraNome }) => {
    const [orcamentos, setOrcamentos] = useState([]);
    const [filtro, setFiltro] = useState('Todos');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        carregarOrcamentos();
    }, [obraId]);

    const carregarOrcamentos = () => {
        setIsLoading(true);
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/orcamentos`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao carregar solicitações'); });
                }
                return res.json();
            })
            .then(data => {
                setOrcamentos(data);
            })
            .catch(err => {
                logger.error('Erro ao carregar solicitações:', err);
                setError(err.message);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    // BUG: window.open sem fetchWithAuth — mesmo padrão de VisualizarNotaFiscalModal. Catalogado em NOTAS_REFACTOR.md
    const handleDownloadAnexo = (anexoId, filename) => {
        window.open(`${API_URL}/anexos/${anexoId}`, '_blank');
    };

    const orcamentosFiltrados = orcamentos.filter(orc => {
        if (filtro === 'Todos') return true;
        return orc.status === filtro;
    });

    const getStatusColor = (status) => {
        switch(status) {
            case 'Aprovado': return 'var(--status-success)';
            case 'Rejeitado': return 'var(--status-danger)';
            case 'Pendente': return 'var(--status-warning)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusBorder = (status) => {
        switch(status) {
            case 'Aprovado': return 'var(--status-success)';
            case 'Rejeitado': return 'var(--status-danger)';
            case 'Pendente': return 'var(--status-warning)';
            default: return 'var(--border-default)';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Aprovado': return '✅';
            case 'Rejeitado': return '❌';
            case 'Pendente': return '⏳';
            default: return '📋';
        }
    };

    const contadores = {
        total: orcamentos.length,
        aprovados: orcamentos.filter(o => o.status === 'Aprovado').length,
        rejeitados: orcamentos.filter(o => o.status === 'Rejeitado').length,
        pendentes: orcamentos.filter(o => o.status === 'Pendente').length
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Solicitações de Compra"
            subtitle={obraNome}
            width="xlarge"
            scrollBody={true}
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
            }
        >
            {/* Filtros */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '25px',
                flexWrap: 'wrap'
            }}>
                {['Todos', 'Aprovado', 'Rejeitado', 'Pendente'].map(statusFiltro => (
                    <button
                        key={statusFiltro}
                        onClick={() => setFiltro(statusFiltro)}
                        style={{
                            padding: '8px 16px',
                            border: `2px solid ${filtro === statusFiltro ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                            borderRadius: '20px',
                            background: filtro === statusFiltro ? 'var(--brand-primary)' : 'var(--surface-card)',
                            color: filtro === statusFiltro ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            fontWeight: filtro === statusFiltro ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                        }}
                    >
                        {statusFiltro}
                        {statusFiltro === 'Todos' && ` (${contadores.total})`}
                        {statusFiltro === 'Aprovado' && ` (${contadores.aprovados})`}
                        {statusFiltro === 'Rejeitado' && ` (${contadores.rejeitados})`}
                        {statusFiltro === 'Pendente' && ` (${contadores.pendentes})`}
                    </button>
                ))}
            </div>

            {/* Conteúdo */}
            <div style={{
                maxHeight: '500px',
                overflowY: 'auto',
                border: `1px solid var(--border-default)`,
                borderRadius: '8px',
                padding: '15px',
                background: 'var(--surface-subtle)'
            }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p>⏳ Carregando orçamentos...</p>
                    </div>
                ) : error ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--status-danger)'
                    }}>
                        <p>❌ {error}</p>
                        <button
                            onClick={carregarOrcamentos}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: 'var(--brand-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : orcamentosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <p>📋 Nenhuma solicitação {filtro !== 'Todos' ? filtro.toLowerCase() : ''} encontrado.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {orcamentosFiltrados.map(orc => (
                            <div
                                key={orc.id}
                                style={{
                                    background: 'var(--surface-card)',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: `0.5px solid ${getStatusBorder(orc.status)}`,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                {/* Header com status */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <h3 style={{
                                            margin: '0 0 5px 0',
                                            color: 'var(--brand-primary)',
                                            fontSize: '1.1em'
                                        }}>
                                            {orc.descricao}
                                        </h3>
                                        {orc.servico_nome && (
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.85em',
                                                color: 'var(--text-muted)'
                                            }}>
                                                🔗 Serviço: {orc.servico_nome}
                                            </p>
                                        )}
                                    </div>
                                    <span style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        background: getStatusColor(orc.status),
                                        color: 'white',
                                        fontSize: '0.9em',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getStatusIcon(orc.status)} {orc.status}
                                    </span>
                                </div>

                                {/* Informações */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                            Fornecedor:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.fornecedor || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                            Valor:
                                        </strong>
                                        <p style={{
                                            margin: '2px 0 0 0',
                                            color: 'var(--brand-primary)',
                                            fontWeight: 'bold',
                                            fontSize: '1.1em'
                                        }}>
                                            {formatCurrency(orc.valor)}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                            Tipo:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.tipo}
                                        </p>
                                    </div>
                                    {orc.dados_pagamento && (
                                        <div>
                                            <strong style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                Pagamento:
                                            </strong>
                                            <p style={{ margin: '2px 0 0 0' }}>
                                                {orc.dados_pagamento}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Observações */}
                                {orc.observacoes && (
                                    <div style={{
                                        marginBottom: '15px',
                                        padding: '10px',
                                        background: 'var(--surface-subtle)',
                                        borderRadius: '5px',
                                        borderLeft: `3px solid var(--brand-primary)`
                                    }}>
                                        <strong style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                            Observações:
                                        </strong>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                                            {orc.observacoes}
                                        </p>
                                    </div>
                                )}

                                {/* Anexos */}
                                {orc.anexos && orc.anexos.length > 0 && (
                                    <div>
                                        <strong style={{
                                            fontSize: '0.9em',
                                            color: 'var(--text-muted)',
                                            display: 'block',
                                            marginBottom: '8px'
                                        }}>
                                            📎 Anexos ({orc.anexos.length}):
                                        </strong>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px'
                                        }}>
                                            {orc.anexos.map(anexo => (
                                                <button
                                                    key={anexo.id}
                                                    onClick={() => handleDownloadAnexo(anexo.id, anexo.filename)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'var(--status-info-bg)',
                                                        border: `1px solid var(--status-info)`,
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85em',
                                                        color: 'var(--status-info)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--status-info)';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'var(--status-info-bg)';
                                                        e.currentTarget.style.color = 'var(--status-info)';
                                                    }}
                                                >
                                                    <span>📄</span>
                                                    {anexo.filename}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resumo */}
            <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'var(--surface-subtle)',
                borderRadius: '8px'
            }}>
                <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
                    <strong>Resumo:</strong> {contadores.total} solicitação(ões) •
                    ✅ {contadores.aprovados} aprovado(s) •
                    ❌ {contadores.rejeitados} rejeitado(s) •
                    ⏳ {contadores.pendentes} pendente(s)
                </div>
            </div>
        </Modal>
    );
};

export default ModalOrcamentos;
