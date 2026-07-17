import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { logger } from '../utils/logger';
import { confirmDialog } from '../utils/notify';
import './NotificacoesDropdown.css';

const getNotifMeta = (tipo) => {
    switch (tipo) {
        case 'servico_criado':      return { icon: 'ti-tool',           bg: 'var(--status-neutral-bg)',  color: 'var(--status-neutral-text)' };
        case 'pagamento_inserido':  return { icon: 'ti-cash',           bg: 'var(--status-success-bg)',  color: 'var(--status-success-text)' };
        case 'orcamento_aprovado':  return { icon: 'ti-check',          bg: 'var(--status-success-bg)',  color: 'var(--status-success-text)' };
        case 'orcamento_pendente':  return { icon: 'ti-clock',          bg: 'var(--status-warning-bg)',  color: 'var(--status-warning-text)' };
        case 'orcamento_rejeitado': return { icon: 'ti-x',              bg: 'var(--status-danger-bg)',   color: 'var(--status-danger-text)'  };
        case 'boleto_vencido':      return { icon: 'ti-alert-triangle', bg: 'var(--status-danger-bg)',   color: 'var(--status-danger-text)'  };
        case 'boleto_hoje':         return { icon: 'ti-alert-triangle', bg: 'var(--status-warning-bg)',  color: 'var(--status-warning-text)' };
        case 'boleto_3dias':        return { icon: 'ti-receipt',        bg: 'var(--status-warning-bg)',  color: 'var(--status-warning-text)' };
        case 'boleto_7dias':        return { icon: 'ti-receipt',        bg: 'var(--status-info-bg)',     color: 'var(--status-info-text)'    };
        case 'solicitacao_criada':  return { icon: 'ti-shopping-cart',  bg: 'var(--status-info-bg)',     color: 'var(--status-info-text)'    };
        case 'solicitacao_aguardando_aprovacao': return { icon: 'ti-clock', bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' };
        case 'solicitacao_aprovada': return { icon: 'ti-check',         bg: 'var(--status-success-bg)',  color: 'var(--status-success-text)' };
        case 'solicitacao_rejeitada': return { icon: 'ti-x',            bg: 'var(--status-danger-bg)',   color: 'var(--status-danger-text)'  };
        default:                    return { icon: 'ti-bell',           bg: 'var(--status-neutral-bg)',  color: 'var(--status-neutral-text)' };
    }
};

const NotificacoesDropdown = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notificacoes, setNotificacoes] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

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

    const limparLidas = async () => {
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/limpar-lidas`, { method: 'DELETE' });
            setNotificacoes(prev => prev.filter(n => !n.lida));
        } catch (err) {
            logger.error('Erro ao limpar notificações:', err);
        }
    };

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

    const marcarTodasLidas = async () => {
        try {
            await fetchWithAuth(`${API_URL}/notificacoes/marcar-todas-lidas`, { method: 'POST' });
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setCount(0);
        } catch (err) {
            logger.error('Erro ao marcar todas como lidas:', err);
        }
    };

    // Polling a cada 30s
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Busca lista ao abrir
    useEffect(() => {
        if (isOpen) fetchNotificacoes();
    }, [isOpen]);

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

    return (
        <div className="nd-container">
            <button
                className="nd-bell"
                onClick={() => setIsOpen(!isOpen)}
                title="Notificações"
                aria-label="Notificações"
            >
                <i className="ti ti-bell" aria-hidden="true"></i>
                {count > 0 && (
                    <span className="nd-badge">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="nd-overlay" onClick={() => setIsOpen(false)} />

                    <div className="nd-panel">
                        <div className="nd-header">
                            <span className="nd-header-title">Notificações</span>
                            <div className="nd-header-actions">
                                {count > 0 && (
                                    <button
                                        className="nd-action-btn"
                                        onClick={marcarTodasLidas}
                                        title="Marcar todas como lidas"
                                    >
                                        Marcar todas como lidas
                                    </button>
                                )}
                                <button
                                    className="nd-action-btn"
                                    onClick={limparLidas}
                                    title="Limpar notificações lidas"
                                >
                                    Limpar lidas
                                </button>
                                <button
                                    className="nd-action-btn danger"
                                    onClick={limparTodas}
                                    title="Limpar TODAS as notificações"
                                >
                                    Limpar todas
                                </button>
                            </div>
                        </div>

                        <div className="nd-list">
                            {loading ? (
                                <div className="nd-loading">Carregando...</div>
                            ) : notificacoes.length === 0 ? (
                                <div className="nd-empty">Nenhuma notificação</div>
                            ) : (
                                notificacoes.map(notif => {
                                    const { icon, bg, color } = getNotifMeta(notif.tipo);
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`nd-item${notif.lida ? '' : ' nd-item--unread'}`}
                                        >
                                            <div
                                                className="nd-icon"
                                                style={{ background: bg, color }}
                                            >
                                                <i className={`ti ${icon}`} aria-hidden="true"></i>
                                            </div>
                                            <div className="nd-text">
                                                <div className="nd-text-main">{notif.titulo}</div>
                                                {notif.mensagem && (
                                                    <div className="nd-text-meta">{notif.mensagem}</div>
                                                )}
                                                <div className="nd-text-meta">
                                                    <span>{formatRelativeTime(notif.created_at)}</span>
                                                    {notif.obra_nome && (
                                                        <span className="nd-obra-tag">{notif.obra_nome}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                className={`nd-toggle-btn${notif.lida ? '' : ' nd-toggle-btn--unread'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleLida(notif.id, notif.lida);
                                                }}
                                                title={notif.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                                                aria-label={notif.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                                            >
                                                <i className={`ti ${notif.lida ? 'ti-circle' : 'ti-circle-filled'}`} aria-hidden="true"></i>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificacoesDropdown;
