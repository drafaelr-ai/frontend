import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { setToken as storeToken } from '../auth/tokenStorage';
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
        case 'solicitacao_atendida': return { icon: 'ti-package',      bg: 'var(--status-success-bg)',  color: 'var(--status-success-text)' };
        case 'solicitacao_mencao':   return { icon: 'ti-at',           bg: 'var(--status-info-bg)',     color: 'var(--status-info-text)'    };
        case 'solicitacao_comentario': return { icon: 'ti-message-circle', bg: 'var(--status-neutral-bg)', color: 'var(--status-neutral-text)' };
        case 'solicitacao_devolvida': return { icon: 'ti-arrow-back-up', bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' };
        default:                    return { icon: 'ti-bell',           bg: 'var(--status-neutral-bg)',  color: 'var(--status-neutral-text)' };
    }
};

const NotificacoesDropdown = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notificacoes, setNotificacoes] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    // Telegram: null = ainda não consultado; { configurado, vinculado, ... }
    const [tg, setTg] = useState(null);
    const [tgLink, setTgLink] = useState(null);
    const [tgBusy, setTgBusy] = useState(false);
    const [tgErro, setTgErro] = useState(null);
    const [tgPrefsOpen, setTgPrefsOpen] = useState(false);

    const fetchTelegram = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/telegram/status`);
            if (response.ok) setTg(await response.json());
        } catch (err) {
            logger.error('Erro ao consultar status do Telegram:', err);
        }
    };

    const vincularTelegram = async () => {
        setTgBusy(true);
        setTgErro(null);
        try {
            const response = await fetchWithAuth(`${API_URL}/telegram/vincular`, { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.erro || 'Erro ao gerar o link do bot.');
            setTgLink(data.link);
            window.open(data.link, '_blank', 'noopener');
        } catch (err) {
            setTgErro(err.message);
        } finally {
            setTgBusy(false);
        }
    };

    const confirmarTelegram = async () => {
        setTgBusy(true);
        setTgErro(null);
        try {
            const response = await fetchWithAuth(`${API_URL}/telegram/confirmar`, { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.erro || 'Não foi possível confirmar o vínculo.');
            setTgLink(null);
            setTg(prev => ({ ...prev, vinculado: true, chat_nome: data.chat_nome }));
        } catch (err) {
            setTgErro(err.message);
        } finally {
            setTgBusy(false);
        }
    };

    // Clique na notificação abre o item citado: solicitações vão direto ao
    // detalhe (?solicitacao=), o resto cai na home da obra (?obra=). Mesmo
    // mecanismo do push nativo: grava o módulo e recarrega com o deep-link.
    const destinoNotificacao = (n) => {
        if (n.item_type === 'solicitacao_compra' && n.item_id) {
            return { modulo: 'solicitacoes', caminho: `/?solicitacao=${n.item_id}` };
        }
        if (n.obra_id) {
            return { modulo: 'obras', caminho: `/?obra=${n.obra_id}` };
        }
        return null;
    };

    const abrirNotificacao = async (notif) => {
        const destino = destinoNotificacao(notif);
        if (!destino) return;
        if (!notif.lida) {
            try {
                await fetchWithAuth(`${API_URL}/notificacoes/${notif.id}/lida`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lida: true })
                });
            } catch (err) {
                logger.warn('Não foi possível marcar como lida antes de abrir:', err);
            }
        }
        await storeToken('selectedModule', destino.modulo);
        window.location.assign(destino.caminho);
    };

    // tipos null = todas as categorias marcadas
    const tgCategoriaAtiva = (key) => tg?.tipos == null || tg.tipos.includes(key);

    const alternarCategoria = async (key) => {
        const todas = Object.keys(tg?.categorias || {});
        const atuais = tg?.tipos == null ? todas : tg.tipos;
        const novos = atuais.includes(key) ? atuais.filter(k => k !== key) : [...atuais, key];
        const tipos = novos.length === todas.length ? null : novos;
        setTg(prev => ({ ...prev, tipos }));   // otimista — o backend confirma
        setTgErro(null);
        try {
            const response = await fetchWithAuth(`${API_URL}/telegram/preferencias`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipos }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.erro || 'Erro ao salvar preferências.');
            setTg(prev => ({ ...prev, tipos: data.tipos }));
        } catch (err) {
            setTgErro(err.message);
            fetchTelegram();   // desfaz o otimismo com o estado real
        }
    };

    const desvincularTelegram = async () => {
        if (!await confirmDialog('Parar de receber as notificações no Telegram?', { confirmText: 'Desvincular' })) return;
        try {
            await fetchWithAuth(`${API_URL}/telegram/vincular`, { method: 'DELETE' });
            setTg(prev => ({ ...prev, vinculado: false, chat_nome: null }));
            setTgLink(null);
        } catch (err) {
            logger.error('Erro ao desvincular Telegram:', err);
        }
    };

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
        const handleNativeNotification = () => fetchCount();
        window.addEventListener('obraly:native-notification', handleNativeNotification);
        return () => {
            clearInterval(interval);
            window.removeEventListener('obraly:native-notification', handleNativeNotification);
        };
    }, []);

    // Busca lista ao abrir (status do Telegram só na primeira abertura)
    useEffect(() => {
        if (isOpen) {
            fetchNotificacoes();
            if (tg == null) fetchTelegram();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                    const clicavel = Boolean(destinoNotificacao(notif));
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`nd-item${notif.lida ? '' : ' nd-item--unread'}${clicavel ? ' nd-item--link' : ''}`}
                                            onClick={clicavel ? () => abrirNotificacao(notif) : undefined}
                                            title={clicavel ? 'Abrir' : undefined}
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

                        {tg?.configurado && (
                            <div className="nd-telegram">
                                {tg.vinculado ? (
                                    <>
                                        <div className="nd-telegram-row">
                                            <i className="ti ti-brand-telegram" aria-hidden="true"></i>
                                            <span className="nd-telegram-txt">
                                                Telegram conectado{tg.chat_nome ? ` (${tg.chat_nome})` : ''}
                                            </span>
                                            <button className="nd-action-btn" onClick={() => setTgPrefsOpen(o => !o)}>
                                                {tgPrefsOpen ? 'Fechar' : 'O que recebo'}
                                            </button>
                                            <button className="nd-action-btn danger" onClick={desvincularTelegram}>
                                                Desvincular
                                            </button>
                                        </div>
                                        {tgPrefsOpen && (
                                            <div className="nd-telegram-prefs">
                                                {Object.entries(tg.categorias || {}).map(([key, label]) => (
                                                    <label key={key} className="nd-telegram-pref">
                                                        <input
                                                            type="checkbox"
                                                            checked={tgCategoriaAtiva(key)}
                                                            onChange={() => alternarCategoria(key)}
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                                <div className="nd-telegram-pref-hint">
                                                    Vale só para o Telegram — o sino continua recebendo tudo.
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : tgLink ? (
                                    <>
                                        <div className="nd-telegram-row">
                                            <i className="ti ti-brand-telegram" aria-hidden="true"></i>
                                            <span className="nd-telegram-txt">
                                                Toque em <b>Iniciar</b> no bot e confirme aqui.
                                            </span>
                                            <a className="nd-action-btn" href={tgLink} target="_blank" rel="noopener noreferrer">
                                                Abrir bot
                                            </a>
                                            <button className="nd-action-btn nd-telegram-cta" onClick={confirmarTelegram} disabled={tgBusy}>
                                                {tgBusy ? 'Confirmando…' : 'Já dei Start — confirmar'}
                                            </button>
                                        </div>
                                        <div className="nd-telegram-manual">
                                            Sem o Telegram neste computador? No celular, procure{' '}
                                            <b>@{tg.bot}</b> e envie <code>{`/start ${tgLink.split('start=')[1]}`}</code>
                                            <button
                                                className="nd-action-btn"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(`/start ${tgLink.split('start=')[1]}`)
                                                        .then(() => setTgErro(null))
                                                        .catch(() => {});
                                                }}
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="nd-telegram-row">
                                        <i className="ti ti-brand-telegram" aria-hidden="true"></i>
                                        <span className="nd-telegram-txt">
                                            Receba estas notificações também no Telegram.
                                        </span>
                                        <button className="nd-action-btn nd-telegram-cta" onClick={vincularTelegram} disabled={tgBusy}>
                                            {tgBusy ? 'Gerando link…' : 'Conectar'}
                                        </button>
                                    </div>
                                )}
                                {tgErro && <div className="nd-telegram-erro">{tgErro}</div>}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificacoesDropdown;
