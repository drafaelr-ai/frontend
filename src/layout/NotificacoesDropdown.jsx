import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { logger } from '../utils/logger';
import { confirmDialog } from '../utils/notify';

const NotificacoesDropdown = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notificacoes, setNotificacoes] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Buscar contador de notificações não lidas
    const fetchCount = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/notificacoes/count`);
            if (response.ok) {
                const data = await response.json();
                setCount(data.count);
            }
        } catch (err) {
            logger.error('Erro ao buscar contador de notificações:', err);
        }
    };

    // Buscar notificações
    const fetchNotificacoes = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`${API_URL}/notificacoes?limite=20`);
            if (response.ok) {
                const data = await response.json();
                setNotificacoes(data);
            }
        } catch (err) {
            logger.error('Erro ao buscar notificações:', err);
        } finally {
            setLoading(false);
        }
    };

    // Marcar como lida/não lida
    const toggleLida = async (notifId, lida) => {
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/${notifId}/lida`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lida: !lida })
            });
            setNotificacoes(prev => prev.map(n =>
                n.id === notifId ? { ...n, lida: !lida } : n
            ));
            setCount(prev => lida ? prev + 1 : Math.max(0, prev - 1));
        } catch (err) {
            logger.error('Erro ao marcar notificação:', err);
        }
    };

    // Limpar lidas
    const limparLidas = async () => {
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/limpar-lidas`, { method: 'DELETE' });
            setNotificacoes(prev => prev.filter(n => !n.lida));
        } catch (err) {
            logger.error('Erro ao limpar notificações:', err);
        }
    };

    // Limpar TODAS as notificações
    const limparTodas = async () => {
        if (!await confirmDialog('Limpar TODAS as notificações?', { confirmText: 'Limpar tudo' })) return;
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/limpar-todas`, { method: 'DELETE' });
            setNotificacoes([]);
            setCount(0);
            setIsOpen(false);
        } catch (err) {
            logger.error('Erro ao limpar todas notificações:', err);
        }
    };

    // Marcar todas como lidas
    const marcarTodasLidas = async () => {
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/marcar-todas-lidas`, { method: 'POST' });
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setCount(0);
        } catch (err) {
            logger.error('Erro ao marcar todas como lidas:', err);
        }
    };

    // Polling para atualizar contador a cada 30 segundos
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Buscar notificações quando abrir dropdown
    useEffect(() => {
        if (isOpen) {
            fetchNotificacoes();
        }
    }, [isOpen]);

    // Formatar data relativa
    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR');
    };

    // Ícone por tipo
    const getIconByType = (tipo) => {
        switch(tipo) {
            case 'servico_criado': return '🔧';
            case 'pagamento_inserido': return '💰';
            case 'orcamento_aprovado': return '✅';
            case 'orcamento_pendente': return '⏳';
            case 'orcamento_rejeitado': return '❌';
            case 'boleto_vencido': return '🔴';
            case 'boleto_hoje': return '🟡';
            case 'boleto_3dias': return '🟠';
            case 'boleto_7dias': return '🔵';
            default: return '🔔';
        }
    };

    return (
        <div className="notificacoes-container" style={{ position: 'relative' }}>
            <button
                className="notif-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.3em',
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                }}
                title="Notificações"
            >
                🔔
                {count > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.6em',
                        fontWeight: 'bold',
                        padding: '2px 5px',
                        borderRadius: '10px',
                        minWidth: '16px',
                        textAlign: 'center'
                    }}>
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Overlay para fechar */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '10px',
                        width: '380px',
                        maxHeight: '450px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 5px 40px rgba(0,0,0,0.25)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div style={{
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '10px',
                                fontSize: '1em'
                            }}>
                                🔔 Notificações
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {count > 0 && (
                                    <button
                                        onClick={marcarTodasLidas}
                                        style={{
                                            background: '#e0f2fe',
                                            border: '1px solid #7dd3fc',
                                            borderRadius: '4px',
                                            color: '#0369a1',
                                            cursor: 'pointer',
                                            fontSize: '0.75em',
                                            padding: '4px 8px'
                                        }}
                                        title="Marcar todas como lidas"
                                    >
                                        ✓ Marcar lidas
                                    </button>
                                )}
                                <button
                                    onClick={limparLidas}
                                    style={{
                                        background: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        color: '#4b5563',
                                        cursor: 'pointer',
                                        fontSize: '0.75em',
                                        padding: '4px 8px'
                                    }}
                                    title="Limpar notificações lidas"
                                >
                                    🗑️ Limpar lidas
                                </button>
                                <button
                                    onClick={limparTodas}
                                    style={{
                                        background: '#fee2e2',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '4px',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                        fontSize: '0.75em',
                                        padding: '4px 8px',
                                        fontWeight: '600'
                                    }}
                                    title="Limpar TODAS as notificações"
                                >
                                    🗑️ Limpar TODAS
                                </button>
                            </div>
                        </div>

                        {/* Lista de notificações */}
                        <div style={{
                            overflowY: 'auto',
                            flex: 1,
                            maxHeight: '320px'
                        }}>
                            {loading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                                    Carregando...
                                </div>
                            ) : notificacoes.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                                    <div style={{ fontSize: '2em', marginBottom: '10px' }}>🔔</div>
                                    Nenhuma notificação
                                </div>
                            ) : (
                                notificacoes.map(notif => (
                                    <div
                                        key={notif.id}
                                        style={{
                                            padding: '12px 15px',
                                            borderBottom: '1px solid #f1f5f9',
                                            backgroundColor: notif.lida ? 'white' : '#eff6ff',
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'flex-start',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.3em' }}>
                                            {getIconByType(notif.tipo)}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: notif.lida ? '400' : '600',
                                                color: '#1e293b',
                                                fontSize: '0.9em',
                                                marginBottom: '2px',
                                                lineHeight: '1.3'
                                            }}>
                                                {notif.titulo}
                                            </div>
                                            {notif.mensagem && (
                                                <div style={{
                                                    color: '#64748b',
                                                    fontSize: '0.8em',
                                                    lineHeight: '1.4',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {notif.mensagem}
                                                </div>
                                            )}
                                            <div style={{
                                                color: '#94a3b8',
                                                fontSize: '0.75em',
                                                marginTop: '4px',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '4px',
                                                alignItems: 'center'
                                            }}>
                                                <span>{formatRelativeTime(notif.created_at)}</span>
                                                {notif.obra_nome && (
                                                    <span style={{
                                                        backgroundColor: '#e0f2fe',
                                                        color: '#0369a1',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {notif.obra_nome}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLida(notif.id, notif.lida);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: notif.lida ? '#94a3b8' : '#3b82f6',
                                                fontSize: '0.9em'
                                            }}
                                            title={notif.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                                        >
                                            {notif.lida ? '○' : '●'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificacoesDropdown;
