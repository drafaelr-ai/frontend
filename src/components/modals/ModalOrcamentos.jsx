import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';

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

    const handleDownloadAnexo = (anexoId, filename) => {
        window.open(`${API_URL}/anexos/${anexoId}`, '_blank');
    };

    const orcamentosFiltrados = orcamentos.filter(orc => {
        if (filtro === 'Todos') return true;
        return orc.status === filtro;
    });

    const getStatusColor = (status) => {
        switch(status) {
            case 'Aprovado': return '#28a745';
            case 'Rejeitado': return '#dc3545';
            case 'Pendente': return '#ffc107';
            default: return '#6c757d';
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
        <Modal onClose={onClose} customWidth="900px">
            <h2>💰 Solicitações de Compra</h2>
            <p style={{ marginBottom: '20px', color: 'var(--cor-texto-secundario)' }}>
                {obraNome}
            </p>

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
                            border: `2px solid ${filtro === statusFiltro ? 'var(--cor-primaria)' : '#ddd'}`,
                            borderRadius: '20px',
                            background: filtro === statusFiltro ? 'var(--cor-primaria)' : 'white',
                            color: filtro === statusFiltro ? 'white' : 'var(--cor-texto)',
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
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '15px',
                background: '#f8f9fa'
            }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p>⏳ Carregando orçamentos...</p>
                    </div>
                ) : error ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--cor-vermelho)'
                    }}>
                        <p>❌ {error}</p>
                        <button
                            onClick={carregarOrcamentos}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: 'var(--cor-primaria)',
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
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        <p>📋 Nenhuma solicitação {filtro !== 'Todos' ? filtro.toLowerCase() : ''} encontrado.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {orcamentosFiltrados.map(orc => (
                            <div
                                key={orc.id}
                                style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: `2px solid ${getStatusColor(orc.status)}20`,
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
                                            color: 'var(--cor-primaria)',
                                            fontSize: '1.1em'
                                        }}>
                                            {orc.descricao}
                                        </h3>
                                        {orc.servico_nome && (
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.85em',
                                                color: '#6c757d'
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
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Fornecedor:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.fornecedor || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Valor:
                                        </strong>
                                        <p style={{
                                            margin: '2px 0 0 0',
                                            color: 'var(--cor-primaria)',
                                            fontWeight: 'bold',
                                            fontSize: '1.1em'
                                        }}>
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            }).format(orc.valor)}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Tipo:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.tipo}
                                        </p>
                                    </div>
                                    {orc.dados_pagamento && (
                                        <div>
                                            <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
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
                                        background: '#f8f9fa',
                                        borderRadius: '5px',
                                        borderLeft: '3px solid var(--cor-primaria)'
                                    }}>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
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
                                            color: '#6c757d',
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
                                                        background: '#e7f3ff',
                                                        border: '1px solid #0066cc',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85em',
                                                        color: '#0066cc',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#0066cc';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = '#e7f3ff';
                                                        e.currentTarget.style.color = '#0066cc';
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

            {/* Footer */}
            <div style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '0.9em', color: '#6c757d' }}>
                    <strong>Resumo:</strong> {contadores.total} solicitação(ões) •
                    ✅ {contadores.aprovados} aprovado(s) •
                    ❌ {contadores.rejeitados} rejeitado(s) •
                    ⏳ {contadores.pendentes} pendente(s)
                </div>
                <button
                    onClick={onClose}
                    className="cancel-btn"
                >
                    Fechar
                </button>
            </div>
        </Modal>
    );
};

export default ModalOrcamentos;
