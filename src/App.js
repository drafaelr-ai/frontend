import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import './App.css';

// Imports do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// MUDANÇA 1: Import do componente DiarioObras
import DiarioObras from './components/DiarioObras';

// MUDANÇA 2: Import do componente CronogramaObra
import CronogramaObra from './components/CronogramaObra';

// NOVO: Import do Dashboard com gráficos
import DashboardObra from './components/DashboardObra';
import './components/DashboardObra.css';

// Import para compressão de imagens
import { compressImages } from './utils/imageCompression';

// 🆕 MÓDULO BI - Import do Business Intelligence Dashboard
// NOTA: Coloque o arquivo BiModule.js na pasta src/
import { BiDashboard } from './BiModule';

// 🆕 MÓDULO ORÇAMENTO DE ENGENHARIA
import OrcamentoEngenharia from './components/OrcamentoEngenharia';
import AgendaDemandas from './components/AgendaDemandas';

// Registrar os componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// --- CONFIGURAÇÃO INICIAL ---
const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para exibir a prioridade
const PrioridadeBadge = ({ prioridade }) => {
    let p = parseInt(prioridade, 10) || 0;
    if (p === 0) {
        return <span style={{ color: '#aaa', fontSize: '0.9em' }}>-</span>;
    }
    
    let color = '#6c757d'; // 1-2 (Baixa)
    if (p === 3) color = '#007bff'; // 3 (Média)
    if (p === 4) color = '#ffc107'; // 4 (Alta)
    if (p === 5) color = '#dc3545'; // 5 (Urgente)

    const style = {
        backgroundColor: color,
        color: 'white',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '10px',
        textAlign: 'center'
    };
    return <span style={style}>{p}</span>;
};


// Helper para formatar BRL
const formatCurrency = (value) => {
    if (typeof value !== 'number') { value = 0; }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para pegar a data de hoje (para novos lançamentos)
const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
    return todayWithOffset.toISOString().split('T')[0];
};

// --- COMPONENTE SIDEBAR ---

// --- COMPONENTE DE NOTIFICAÇÕES ---
const NotificacoesDropdown = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notificacoes, setNotificacoes] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Buscar contador de notificações não lidas
    const fetchCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/notificacoes/count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCount(data.count);
            }
        } catch (err) {
            console.error('Erro ao buscar contador de notificações:', err);
        }
    };
    
    // Buscar notificações
    const fetchNotificacoes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/notificacoes?limite=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotificacoes(data);
            }
        } catch (err) {
            console.error('Erro ao buscar notificações:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Marcar como lida/não lida
    const toggleLida = async (notifId, lida) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notificacoes/${notifId}/lida`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lida: !lida })
            });
            // Atualizar localmente
            setNotificacoes(prev => prev.map(n => 
                n.id === notifId ? { ...n, lida: !lida } : n
            ));
            setCount(prev => lida ? prev + 1 : Math.max(0, prev - 1));
        } catch (err) {
            console.error('Erro ao marcar notificação:', err);
        }
    };
    
    // Limpar lidas
    const limparLidas = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notificacoes/limpar-lidas`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotificacoes(prev => prev.filter(n => !n.lida));
        } catch (err) {
            console.error('Erro ao limpar notificações:', err);
        }
    };

    // Limpar todas as notificações
    const limparTodas = async () => {
        if (!window.confirm('Limpar TODAS as notificações?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notificacoes/limpar-todas`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotificacoes([]);
            setCount(0);
        } catch (err) {
            console.error('Erro ao limpar todas notificações:', err);
        }
    };
    
    // Marcar todas como lidas
    const marcarTodasLidas = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notificacoes/marcar-todas-lidas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setCount(0);
        } catch (err) {
            console.error('Erro ao marcar todas como lidas:', err);
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
            case 'servico_criado': return '🛠️';
            case 'pagamento_inserido': return '💰';
            case 'orcamento_aprovado': return '✅';
            case 'orcamento_pendente': return '📋';
            case 'orcamento_rejeitado': return '❌';
            case 'boleto_vencido': return '🚨';
            case 'boleto_hoje': return '⚠️';
            case 'boleto_3dias': return '📄';
            case 'boleto_7dias': return '📄';
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
                    
                    {/* Dropdown - aparece ABAIXO do sino, alinhado à direita */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '10px',
                        width: '320px',
                        maxHeight: '400px',
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
                            padding: '15px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                🔔 Notificações
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {count > 0 && (
                                    <button
                                        onClick={marcarTodasLidas}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#3b82f6',
                                            cursor: 'pointer',
                                            fontSize: '0.8em'
                                        }}
                                        title="Marcar todas como lidas"
                                    >
                                        ✓ Todas
                                    </button>
                                )}
                                <button
                                    onClick={limparLidas}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '0.8em'
                                    }}
                                    title="Limpar notificações lidas"
                                >
                                    🗑️ Lidas
                                </button>
                                <button
                                    onClick={limparTodas}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.8em'
                                    }}
                                    title="Limpar TODAS as notificações"
                                >
                                    🗑️ Todas
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
                                    <div style={{ fontSize: '2em', marginBottom: '10px' }}>🔕</div>
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

// ==============================================================================
// NAVEGAÇÃO ESTILO WINDOWS - Barra de Menus no Topo
// ==============================================================================
const WindowsNavBar = ({ 
    user, 
    currentPage, 
    setCurrentPage, 
    obraSelecionada, 
    setObraSelecionada,
    obras,
    onLogout 
}) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = React.useRef(null);

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // Estrutura do menu estilo Windows
    const menuStructure = [
        {
            id: 'obra',
            label: 'Obra',
            items: [
                { id: 'home', label: 'Início', icon: '🏠', shortcut: 'Alt+I' },
                { id: 'obras', label: 'Minhas Obras', icon: '🏗️', shortcut: 'Alt+O' },
                { type: 'separator' },
                { id: 'exportar', label: 'Exportar Relatório...', icon: '📤', shortcut: 'Ctrl+E' },
                { type: 'separator' },
                { id: 'sair', label: 'Sair', icon: '🚪', shortcut: 'Alt+F4', action: 'logout' },
            ]
        },
        {
            id: 'financeiro',
            label: 'Financeiro',
            items: [
                { id: 'financeiro', label: 'Cronograma Financeiro', icon: '💰', shortcut: 'F2' },
                { id: 'boletos', label: 'Gestão de Boletos', icon: '📄', shortcut: 'F3' },
                { id: 'caixa', label: 'Caixa de Obra', icon: '🏦', shortcut: 'F4' },
                { type: 'separator' },
                { id: 'pagamento', label: 'Novo Pagamento...', icon: '💳', shortcut: 'Ctrl+P' },
            ]
        },
        {
            id: 'cronograma',
            label: 'Cronograma',
            items: [
                { id: 'cronograma-obra', label: 'Cronograma de Obras', icon: '📅', shortcut: 'F5' },
                { type: 'separator' },
                { id: 'novo-servico', label: 'Novo Serviço...', icon: '➕' },
            ]
        },
        {
            id: 'documentos',
            label: 'Documentos',
            items: [
                { id: 'diario', label: 'Diário de Obras', icon: '📔', shortcut: 'F6' },
                { id: 'orcamentos', label: 'Solicitações', icon: '📋', shortcut: 'F7', adminOnly: true },
                { id: 'relatorios', label: 'Relatórios', icon: '📊', shortcut: 'F8' },
            ]
        },
        {
            id: 'ferramentas',
            label: 'Ferramentas',
            items: [
                { id: 'usuarios', label: 'Gerenciar Usuários', icon: '👥', masterOnly: true },
                { type: 'separator' },
                { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
            ]
        },
        {
            id: 'ajuda',
            label: 'Ajuda',
            items: [
                { id: 'tutorial', label: 'Tutorial', icon: '📖' },
                { id: 'atalhos', label: 'Atalhos de Teclado', icon: '⌨️' },
                { type: 'separator' },
                { id: 'sobre', label: 'Sobre o Obraly', icon: 'ℹ️' },
            ]
        },
    ];

    // Barra de ferramentas rápidas
    const toolbarItems = [
        { id: 'home', icon: '🏠', label: 'Início' },
        { id: 'orcamento-eng', icon: '📋', label: 'Orçamento' },
        { id: 'financeiro', icon: '💰', label: 'Financeiro' },
        { id: 'cronograma-obra', icon: '📅', label: 'Cronograma' },
        { id: 'boletos', icon: '📄', label: 'Boletos' },
        { id: 'relatorios', icon: '📊', label: 'Relatórios' },
        { id: 'diario', icon: '📔', label: 'Diário' },
        { id: 'caixa', icon: '🏦', label: 'Caixa' },
        { id: 'agenda', icon: '📅', label: 'Agenda' },
    ];

    const handleMenuClick = (menuId) => {
        setActiveMenu(activeMenu === menuId ? null : menuId);
    };

    const handleItemClick = (item) => {
        if (item.type === 'separator') return;
        
        if (item.action === 'logout') {
            onLogout();
            return;
        }
        
        if (item.id === 'obras') {
            setObraSelecionada(null);
        }
        
        setCurrentPage(item.id);
        setActiveMenu(null);
    };

    const handleMouseEnter = (menuId) => {
        if (activeMenu !== null) {
            setActiveMenu(menuId);
        }
    };

    const handleObraChange = (e) => {
        const obraId = parseInt(e.target.value);
        if (obraId === 0) {
            setObraSelecionada(null);
            setCurrentPage('obras');
        } else {
            const obra = obras.find(o => o.id === obraId);
            if (obra) {
                setObraSelecionada(obra);
                setCurrentPage('home');
            }
        }
    };

    const canShowItem = (item) => {
        if (item.adminOnly && user.role !== 'administrador' && user.role !== 'master') return false;
        if (item.masterOnly && user.role !== 'master') return false;
        return true;
    };

    return (
        <>
            {/* === BARRA DE TÍTULO === */}
            <div className="windows-title-bar">
                <div className="title-bar-left">
                    <span className="title-bar-logo">🏗️</span>
                    <span className="title-bar-name">Obraly</span>
                    {obraSelecionada && (
                        <>
                            <span className="title-bar-separator">—</span>
                            <span className="title-bar-obra">{obraSelecionada.nome}</span>
                        </>
                    )}
                </div>
                <div className="title-bar-right">
                    <NotificacoesDropdown user={user} />
                    <div className="title-bar-user">
                        <span className="user-avatar-mini">
                            {user.nome ? user.nome.charAt(0).toUpperCase() : '?'}
                        </span>
                        <span className="user-name-mini">{user.nome || 'Usuário'}</span>
                        <span className="user-role-badge">
                            {user.role === 'master' ? '👑' : user.role === 'administrador' ? '⭐' : '👤'}
                        </span>
                    </div>
                </div>
            </div>

            {/* === BARRA DE MENUS === */}
            <div className="windows-menu-bar" ref={menuRef}>
                <div className="menu-bar-left">
                    {menuStructure.map(menu => (
                        <div key={menu.id} className="menu-dropdown-container">
                            <button
                                className={`menu-bar-item ${activeMenu === menu.id ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMenuClick(menu.id); }}
                                onTouchEnd={(e) => { e.preventDefault(); handleMenuClick(menu.id); }}
                                onMouseEnter={() => handleMouseEnter(menu.id)}
                            >
                                {menu.label}
                            </button>
                            
                            {activeMenu === menu.id && (
                                <>
                                    {/* Overlay para fechar menu no mobile */}
                                    <div 
                                        className="menu-overlay-mobile"
                                        onClick={() => setActiveMenu(null)}
                                        onTouchEnd={(e) => { e.preventDefault(); setActiveMenu(null); }}
                                    />
                                    <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                        {menu.items.map((item, idx) => {
                                            if (!canShowItem(item)) return null;
                                            
                                            return item.type === 'separator' ? (
                                                <div key={idx} className="menu-separator" />
                                            ) : (
                                                <button
                                                    key={item.id}
                                                    className={`menu-dropdown-item ${currentPage === item.id ? 'active' : ''}`}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleItemClick(item); }}
                                                    onTouchEnd={(e) => { e.preventDefault(); handleItemClick(item); }}
                                                >
                                                    <span className="menu-item-left">
                                                        <span className="menu-item-icon">{item.icon}</span>
                                                        <span className="menu-item-label">{item.label}</span>
                                                    </span>
                                                    {item.shortcut && (
                                                        <span className="menu-item-shortcut">{item.shortcut}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="menu-bar-right">
                    <select
                        className="obra-selector"
                        value={obraSelecionada?.id || 0}
                        onChange={handleObraChange}
                    >
                        <option value={0}>📂 Selecionar Obra...</option>
                        {(obras || []).map(obra => (
                            <option key={obra.id} value={obra.id}>
                                {obra.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* === BARRA DE FERRAMENTAS === */}
            {obraSelecionada && (
                <div className="windows-toolbar">
                    <div className="toolbar-items">
                        {toolbarItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                                {idx === 4 && <div className="toolbar-separator" />}
                                <button
                                    className={`toolbar-btn ${currentPage === item.id ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(item.id)}
                                    title={item.label}
                                >
                                    <span className="toolbar-icon">{item.icon}</span>
                                    <span className="toolbar-label">{item.label}</span>
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <div className="toolbar-actions">
                            <button
                                className="toolbar-action-btn primary"
                                onClick={() => setCurrentPage('pagamento')}
                            >
                                💳 Novo Pagamento
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Backdrop para fechar menu */}
            {activeMenu && (
                <div 
                    className="menu-backdrop"
                    onClick={() => setActiveMenu(null)}
                />
            )}
        </>
    );
};

// CSS da Navegação Windows
const WindowsNavStyles = () => (
    <style>{`
        /* === LAYOUT WINDOWS === */
        .app-layout-windows {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: #f1f5f9;
        }
        
        .main-content-windows {
            flex: 1;
            padding: 20px;
            overflow-x: hidden;
            overflow-y: auto;
        }
        
        /* === BARRA DE TÍTULO === */
        .windows-title-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%);
            color: #fff;
            font-size: 13px;
            user-select: none;
        }
        
        .title-bar-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .title-bar-logo {
            font-size: 20px;
        }
        
        .title-bar-name {
            font-weight: 700;
            font-size: 15px;
            letter-spacing: 0.5px;
        }
        
        .title-bar-separator {
            opacity: 0.5;
        }
        
        .title-bar-obra {
            opacity: 0.9;
            font-weight: 500;
        }
        
        .title-bar-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .title-bar-user {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
        }
        
        .user-avatar-mini {
            width: 24px;
            height: 24px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
        }
        
        .user-name-mini {
            font-size: 12px;
            font-weight: 500;
        }
        
        .user-role-badge {
            font-size: 12px;
        }
        
        /* === BARRA DE MENUS === */
        .windows-menu-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 8px;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
            z-index: 1000;
        }
        
        .menu-bar-left {
            display: flex;
            align-items: center;
        }
        
        .menu-dropdown-container {
            position: relative;
        }
        
        .menu-bar-item {
            padding: 8px 14px;
            background: transparent;
            border: none;
            font-size: 13px;
            color: #334155;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.15s;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            user-select: none;
        }
        
        .menu-bar-item:hover,
        .menu-bar-item.active {
            background: #e2e8f0;
        }
        
        .menu-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            min-width: 240px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            padding: 6px 0;
            z-index: 1001;
            animation: dropdownFadeIn 0.15s ease;
        }
        
        .menu-overlay-mobile {
            display: none;
        }
        
        @media (max-width: 768px) {
            .menu-overlay-mobile {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.3);
                z-index: 9998;
            }
        }
        
        @keyframes dropdownFadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .menu-dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 10px 14px;
            background: transparent;
            border: none;
            font-size: 13px;
            color: #334155;
            cursor: pointer;
            text-align: left;
            transition: all 0.1s;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            user-select: none;
        }
        
        .menu-dropdown-item:hover {
            background: #f1f5f9;
        }
        
        .menu-dropdown-item.active {
            background: #eff6ff;
            color: #1d4ed8;
        }
        
        .menu-item-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .menu-item-icon {
            width: 20px;
            text-align: center;
            font-size: 14px;
        }
        
        .menu-item-shortcut {
            font-size: 11px;
            color: #94a3b8;
            font-family: 'SF Mono', 'Consolas', monospace;
        }
        
        .menu-separator {
            height: 1px;
            background: #e2e8f0;
            margin: 6px 12px;
        }
        
        .menu-bar-right {
            padding: 6px 0;
        }
        
        .obra-selector {
            padding: 6px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13px;
            background: #fff;
            cursor: pointer;
            min-width: 200px;
            color: #334155;
        }
        
        .obra-selector:hover {
            border-color: #cbd5e1;
        }
        
        .obra-selector:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .menu-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999;
        }
        
        /* === BARRA DE FERRAMENTAS === */
        .windows-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .toolbar-items {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .toolbar-separator {
            width: 1px;
            height: 28px;
            background: #e2e8f0;
            margin: 0 8px;
        }
        
        .toolbar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 8px 14px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
        }
        
        .toolbar-btn:hover {
            background: #fff;
            border-color: #e2e8f0;
        }
        
        .toolbar-btn.active {
            background: #dbeafe;
            border-color: #93c5fd;
        }
        
        .toolbar-icon {
            font-size: 20px;
        }
        
        .toolbar-label {
            font-size: 10px;
            color: #64748b;
            font-weight: 500;
        }
        
        .toolbar-btn.active .toolbar-label {
            color: #1d4ed8;
        }
        
        .toolbar-actions {
            display: flex;
            gap: 8px;
        }
        
        .toolbar-action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }
        
        .toolbar-action-btn.primary {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: #fff;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        
        .toolbar-action-btn.primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
        }
        
        /* === BARRA DE STATUS === */
        .windows-status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 16px;
            background: #1e40af;
            color: #fff;
            font-size: 11px;
        }
        
        .status-bar-left,
        .status-bar-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .status-bar-item {
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.9;
        }
        
        /* === RESPONSIVO === */
        @media (max-width: 1024px) {
            .toolbar-label {
                display: none;
            }
            
            .toolbar-btn {
                padding: 8px 10px;
            }
            
            .obra-selector {
                min-width: 150px;
            }
        }
        
        @media (max-width: 768px) {
            .windows-title-bar {
                padding: 6px 12px;
            }
            
            .title-bar-obra {
                display: none;
            }
            
            .title-bar-separator {
                display: none;
            }
            
            .user-name-mini {
                display: none;
            }
            
            .windows-menu-bar {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            .menu-bar-item {
                padding: 10px 12px;
                font-size: 13px;
                white-space: nowrap;
                min-height: 44px; /* Área de toque mínima para mobile */
            }
            
            .menu-dropdown {
                position: fixed;
                top: 120px; /* Abaixo da barra de navegação */
                left: 10px;
                right: 10px;
                bottom: auto;
                max-height: 60vh;
                overflow-y: auto;
                min-width: auto;
                width: calc(100% - 20px);
                z-index: 9999;
                border-radius: 12px;
                box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            }
            
            .menu-dropdown-item {
                padding: 14px 16px;
                min-height: 48px; /* Área de toque maior no mobile */
                font-size: 15px;
            }
            
            .menu-separator {
                margin: 8px 0;
            }
            
            .obra-selector {
                min-width: 120px;
                font-size: 12px;
            }
            
            .windows-toolbar {
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .toolbar-items {
                flex-wrap: wrap;
            }
            
            .toolbar-actions {
                width: 100%;
                justify-content: center;
            }
            
            .main-content-windows {
                padding: 12px;
            }
        }
    `}</style>
);

const Sidebar = ({ 
    user, 
    currentPage, 
    setCurrentPage, 
    obraSelecionada, 
    setObraSelecionada,
    onLogout,
    isCollapsed,
    setIsCollapsed 
}) => {
    // Menu items - só aparece quando obra está selecionada
    const menuItems = [
        { id: 'home', icon: '🏠', label: 'Início', shortLabel: 'Início' },
        { id: 'orcamento-eng', icon: '📐', label: 'Orçamento de Engenharia', shortLabel: 'Orçamento' },
        { id: 'cronograma-obra', icon: '📅', label: 'Cronograma de Obras', shortLabel: 'Cronograma' },
        { id: 'financeiro', icon: '💰', label: 'Cronograma Financeiro', shortLabel: 'Financeiro' },
        { id: 'boletos', icon: '📄', label: 'Gestão de Boletos', shortLabel: 'Boletos' },
        { id: 'relatorios', icon: '📊', label: 'Relatórios', shortLabel: 'Relatórios' },
        { id: 'orcamentos', icon: '📋', label: 'Solicitações', shortLabel: 'Solicitações', adminOnly: true },
        { id: 'diario', icon: '📔', label: 'Diário de Obras', shortLabel: 'Diário' },
        { id: 'caixa', icon: '🏦', label: 'Caixa de Obra', shortLabel: 'Caixa' },
    ];

    const bottomItems = [
        { id: 'obras', icon: '🏗️', label: 'Minhas Obras', shortLabel: 'Obras' },
        { id: 'usuarios', icon: '👥', label: 'Gerenciar Usuários', shortLabel: 'Usuários', masterOnly: true },
    ];

    const handleItemClick = (item) => {
        if (item.id === 'obras') {
            setObraSelecionada(null);
        }
        // Usar navigateTo para atualizar histórico do browser
        if (typeof window.navigateTo === 'function') {
            window.navigateTo(item.id, item.id !== 'obras' ? obraSelecionada?.id : null);
        } else {
            setCurrentPage(item.id);
        }
    };

    return (
        <>
            {/* Overlay para mobile */}
            {!isCollapsed && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
            
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Logo/Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span className="logo-icon">🏗️</span>
                        {!isCollapsed && <span className="logo-text">OBRALY</span>}
                    </div>
                    <button 
                        className="sidebar-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                </div>

                {/* Obra Selecionada */}
                {obraSelecionada && (
                    <div className="sidebar-obra-info">
                        <div className="obra-badge">
                            <span className="obra-icon">📍</span>
                            {!isCollapsed && (
                                <div className="obra-details">
                                    <span className="obra-nome">{obraSelecionada.nome}</span>
                                    <span className="obra-cliente">{obraSelecionada.cliente || 'N/A'}</span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <button 
                                className="trocar-obra-btn"
                                onClick={() => {
                                    setObraSelecionada(null);
                                    setCurrentPage('obras');
                                }}
                                title="Trocar obra"
                            >
                                ↻
                            </button>
                        )}
                    </div>
                )}

                {/* Menu Principal */}
                <nav className="sidebar-nav">
                    <ul className="sidebar-menu">
                        {menuItems.map(item => {
                            // Verificar permissões
                            if (item.adminOnly && user.role !== 'administrador' && user.role !== 'master') {
                                return null;
                            }
                            
                            const isActive = currentPage === item.id;
                            
                            return (
                                <li key={item.id}>
                                    <button
                                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                                        onClick={() => handleItemClick(item)}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <span className="item-icon">{item.icon}</span>
                                        {!isCollapsed && <span className="item-label">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Separador */}
                    <div className="sidebar-divider"></div>

                    {/* Menu Inferior */}
                    <ul className="sidebar-menu bottom">
                        {bottomItems.map(item => {
                            if (item.masterOnly && user.role !== 'master') {
                                return null;
                            }
                            
                            // Mostrar "Minhas Obras" apenas quando há obra selecionada
                            if (item.id === 'obras' && !obraSelecionada) {
                                return null;
                            }
                            
                            const isActive = currentPage === item.id;
                            
                            return (
                                <li key={item.id}>
                                    <button
                                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                                        onClick={() => handleItemClick(item)}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <span className="item-icon">{item.icon}</span>
                                        {!isCollapsed && <span className="item-label">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer com usuário */}
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.nome ? user.nome.charAt(0).toUpperCase() : '?'}
                        </div>
                        {!isCollapsed && (
                            <div className="user-details">
                                <span className="user-name">{user.nome || 'Usuário'}</span>
                                <span className="user-role">
                                    {user.role === 'master' ? '👑 Master' : 
                                     user.role === 'administrador' ? '⭐ Admin' : '👤 Usuário'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <NotificacoesDropdown user={user} />
                        <button 
                            className="logout-btn"
                            onClick={onLogout}
                            title="Sair"
                        >
                            {isCollapsed ? '🚪' : '🚪 Sair'}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

// CSS da Sidebar (inline para facilitar)
const SidebarStyles = () => (
    <style>{`
        /* === LAYOUT COM SIDEBAR === */
        .app-layout {
            display: flex;
            min-height: 100vh;
            background: #f5f7fa;
        }
        
        .main-content {
            flex: 1;
            margin-left: 260px;
            padding: 20px;
            transition: margin-left 0.3s ease;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .main-content.sidebar-collapsed {
            margin-left: 70px;
        }
        
        /* === SIDEBAR === */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 260px;
            height: 100vh;
            background: linear-gradient(180deg, #1a1f36 0%, #252b42 100%);
            color: white;
            display: flex;
            flex-direction: column;
            z-index: 1000;
            transition: width 0.3s ease;
            box-shadow: 4px 0 15px rgba(0,0,0,0.1);
        }
        
        .sidebar.collapsed {
            width: 70px;
        }
        
        /* Header da Sidebar */
        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            font-size: 28px;
        }
        
        .logo-text {
            font-size: 22px;
            font-weight: 700;
            background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: 2px;
        }
        
        .sidebar-toggle {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .sidebar-toggle:hover {
            background: rgba(255,255,255,0.2);
        }
        
        /* Obra Info */
        .sidebar-obra-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            background: rgba(0,217,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .obra-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }
        
        .obra-icon {
            font-size: 18px;
        }
        
        .obra-details {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        
        .obra-nome {
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #00d9ff;
        }
        
        .obra-cliente {
            font-size: 11px;
            opacity: 0.7;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .trocar-obra-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        
        .trocar-obra-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: rotate(180deg);
        }
        
        /* Navegação */
        .sidebar-nav {
            flex: 1;
            overflow-y: auto;
            padding: 15px 0;
        }
        
        .sidebar-menu {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: calc(100% - 20px);
            margin: 4px 10px;
            padding: 12px 15px;
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        
        .sidebar-item:hover:not(.disabled) {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .sidebar-item.active {
            background: linear-gradient(135deg, #00d9ff 0%, #00b8d9 100%);
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,217,255,0.3);
        }
        
        .sidebar-item.disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        
        .item-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
            flex-shrink: 0;
        }
        
        .item-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .sidebar-divider {
            height: 1px;
            background: rgba(255,255,255,0.1);
            margin: 15px 20px;
        }
        
        /* Footer */
        .sidebar-footer {
            padding: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.2);
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            color: #1a1f36;
            flex-shrink: 0;
        }
        
        .user-details {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        
        .user-name {
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .user-role {
            font-size: 11px;
            opacity: 0.7;
        }
        
        .logout-btn {
            width: 100%;
            padding: 10px;
            background: rgba(220,53,69,0.2);
            border: 1px solid rgba(220,53,69,0.3);
            color: #ff6b6b;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        
        .logout-btn:hover {
            background: rgba(220,53,69,0.3);
            border-color: rgba(220,53,69,0.5);
        }
        
        /* Collapsed state */
        .sidebar.collapsed .sidebar-header {
            justify-content: center;
            padding: 20px 10px;
        }
        
        .sidebar.collapsed .sidebar-obra-info {
            justify-content: center;
            padding: 15px 10px;
        }
        
        .sidebar.collapsed .sidebar-item {
            justify-content: center;
            padding: 12px;
            margin: 4px 8px;
            width: calc(100% - 16px);
        }
        
        .sidebar.collapsed .user-info {
            justify-content: center;
        }
        
        .sidebar.collapsed .logout-btn {
            padding: 10px;
            font-size: 18px;
        }
        
        /* Overlay para mobile */
        .sidebar-overlay {
            display: none;
        }
        
        /* === MOBILE === */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                width: 280px;
            }
            
            .sidebar:not(.collapsed) {
                transform: translateX(0);
            }
            
            .sidebar.collapsed {
                transform: translateX(-100%);
            }
            
            .sidebar-overlay {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            }
            
            .main-content {
                margin-left: 0 !important;
            }
            
            .mobile-header {
                display: flex !important;
                position: sticky;
                top: 0;
                background: #1a1f36;
                color: white;
                padding: 15px 20px;
                margin: -20px -20px 20px -20px;
                align-items: center;
                justify-content: space-between;
                z-index: 100;
            }
            
            .mobile-menu-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }
            
            .mobile-logo {
                font-size: 18px;
                font-weight: 700;
                background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .mobile-obra-badge {
                font-size: 12px;
                background: rgba(0,217,255,0.2);
                padding: 5px 10px;
                border-radius: 12px;
                color: #00d9ff;
                max-width: 120px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
        
        @media (min-width: 769px) {
            .mobile-header {
                display: none !important;
            }
        }
    `}</style>
);


// --- HELPER DA API (ATUALIZADO PARA FORMDATA) ---
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Mostrar alerta antes de recarregar
        alert('⏰ Sua sessão expirou por inatividade.\n\nPor favor, faça login novamente para continuar.');
        
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};


// --- CONTEXTO DE AUTENTICAÇÃO ---
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// --- COMPONENTE DE LOGIN ---
const LoginScreen = () => {
    const { login } = useAuth(); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido'); });
            }
            return res.json();
        })
        .then(data => {
            login(data); 
        })
        .catch(err => {
            console.error("Erro no login:", err);
            setError(err.message || "Credenciais inválidas. Verifique seu usuário e senha.");
            setIsLoading(false);
        });
    };

    return (
        <div className="login-screen">
            {/* Overlay para profundidade */}
            <div className="overlay"></div>
            
            {/* Elementos flutuantes decorativos */}
            <div className="floating-shape circle-1"></div>
            <div className="floating-shape square-1"></div>
            <div className="floating-shape triangle-1"></div>
            
            {/* Card de login */}
            <div className="login-card">
                <h1 style={{
                    color: '#4f46e5',
                    textAlign: 'center',
                    fontSize: '2.5em',
                    marginBottom: '30px',
                    fontWeight: '700',
                    margin: '0 0 30px 0'
                }}>
                    Obraly
                </h1>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ 
                            padding: '12px', 
                            fontSize: '1em', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                        onBlur={(e) => e.target.style.borderColor = '#ccc'}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ 
                            padding: '12px', 
                            fontSize: '1em', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                        onBlur={(e) => e.target.style.borderColor = '#ccc'}
                        required
                    />
                    <button 
                        type="submit" 
                        style={{ 
                            padding: '12px', 
                            fontSize: '1em', 
                            background: '#4f46e5', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontWeight: '600'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4338ca'}
                        onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                    {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

// Gráfico de Pizza
const GastosPorSegmentoChart = ({ data }) => {
    if (!data || Object.keys(data).length === 0) {
        return <p style={{textAlign: 'center', padding: '20px'}}>Sem dados para exibir no gráfico.</p>;
    }

    const chartData = {
        labels: Object.keys(data),
        datasets: [
            {
                label: 'Valor Gasto (R$)',
                data: Object.values(data),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)', // Vermelho (Material)
                    'rgba(54, 162, 235, 0.7)', // Azul (Mão de Obra)
                    'rgba(255, 206, 86, 0.7)', // Amarelo (Serviço)
                    'rgba(75, 192, 192, 0.7)', // Verde (Equipamentos)
                    'rgba(153, 102, 255, 0.7)', // Roxo
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
    };

    return (
        <div style={{ position: 'relative', height: '350px' }}>
            <Pie data={chartData} options={options} />
        </div>
    );
};
// ---------------------------------


// --- COMPONENTE: ETAPAS E SERVIÇOS (Card para Home) ---
// ============================================
// COMPONENTE: SERVIÇOS - KANBAN/LISTA RESPONSIVO
// Desktop: 3 colunas Kanban | Mobile: Tabs com lista
// ============================================
const ServicosKanbanView = ({ servicos, onViewServico, onAddServico, onNavigateToCronograma }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Em Andamento');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    // Detectar mudança de tamanho de tela
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Helper para pegar valores orçados
    const getValorMO = (s) => parseFloat(s.valor_mo || s.valor_global_mao_de_obra || 0);
    const getValorMaterial = (s) => parseFloat(s.valor_material || s.valor_global_material || 0);
    const getValorTotal = (s) => getValorMO(s) + getValorMaterial(s);
    
    // Valores comprometidos do Cronograma Financeiro (lançamentos vinculados)
    const getValorComprometidoMO = (s) => parseFloat(s.total_gastos_vinculados_mo || 0);
    const getValorComprometidoMat = (s) => parseFloat(s.total_gastos_vinculados_mat || 0);
    const getValorComprometido = (s) => getValorComprometidoMO(s) + getValorComprometidoMat(s);
    
    // Calcular valor pago de um serviço (inclui parcelas pagas do CF)
    const getValorPago = (s) => {
        const pagamentos = s.pagamentos || [];
        return pagamentos.reduce((sum, p) => sum + (p.valor_pago || 0), 0);
    };
    
    // Calcular progresso (% pago vs orçado)
    const getProgresso = (s) => {
        const total = getValorTotal(s);
        const pago = getValorPago(s);
        return total > 0 ? Math.round((pago / total) * 100) : 0;
    };
    
    // Calcular % comprometido (inclui pendentes)
    const getProgressoComprometido = (s) => {
        const total = getValorTotal(s);
        const comprometido = getValorComprometido(s);
        return total > 0 ? Math.min(100, Math.round((comprometido / total) * 100)) : 0;
    };
    
    // Verificar se tem pagamentos do CF vinculados
    const temPagamentosCF = (s) => {
        const pagamentos = s.pagamentos || [];
        return pagamentos.some(p => p.is_parcela) || getValorComprometido(s) > 0;
    };
    
    // Marcar/desmarcar serviço como concluído
    const handleMarcarConcluido = async (servicoId, concluido) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/servicos/${servicoId}/concluir`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ concluido })
            });
            
            if (response.ok) {
                // Recarregar dados - chamar função de refresh se disponível
                window.location.reload();
            } else {
                const data = await response.json();
                alert(data.erro || 'Erro ao atualizar serviço');
            }
        } catch (error) {
            console.error('Erro ao marcar como concluído:', error);
            alert('Erro ao atualizar serviço');
        }
    };
    
    // Determinar status baseado no campo concluido OU progresso de pagamento
    const getStatus = (s) => {
        // Primeiro verifica se foi marcado manualmente como concluído
        if (s.concluido) return 'Concluído';
        if (s.status) return s.status;
        const progresso = getProgresso(s);
        // Só marca como concluído automaticamente se 100% pago
        if (progresso >= 100) return 'Concluído';
        if (progresso > 0) return 'Em Andamento';
        return 'A Iniciar';
    };
    
    // Categorizar serviços
    const servicosPorStatus = {
        'A Iniciar': servicos.filter(s => getStatus(s) === 'A Iniciar'),
        'Em Andamento': servicos.filter(s => getStatus(s) === 'Em Andamento'),
        'Concluído': servicos.filter(s => getStatus(s) === 'Concluído')
    };
    
    // Totais
    const totalMO = servicos.reduce((sum, s) => sum + getValorMO(s), 0);
    const totalMaterial = servicos.reduce((sum, s) => sum + getValorMaterial(s), 0);
    const totalGeral = totalMO + totalMaterial;
    const totalPago = servicos.reduce((sum, s) => sum + getValorPago(s), 0);
    const totalComprometido = servicos.reduce((sum, s) => sum + getValorComprometido(s), 0);
    
    // Config de status
    const statusConfig = {
        'A Iniciar': { icon: '📋', cor: '#94a3b8', corLight: '#f1f5f9', label: 'A Iniciar' },
        'Em Andamento': { icon: '🔨', cor: '#f59e0b', corLight: '#fffbeb', label: 'Em Andamento' },
        'Concluído': { icon: '✅', cor: '#10b981', corLight: '#f0fdf4', label: 'Concluído' }
    };
    
    // Card de Serviço
    const ServicoCard = ({ servico, compact = false }) => {
        const status = getStatus(servico);
        const config = statusConfig[status];
        const valorTotal = getValorTotal(servico);
        const valorPago = getValorPago(servico);
        const valorComprometido = getValorComprometido(servico);
        const progresso = getProgresso(servico);
        const hasCF = temPagamentosCF(servico);
        const restante = Math.max(0, valorTotal - valorPago);
        
        return (
            <div 
                onClick={() => onViewServico(servico)}
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: compact ? '12px' : '14px',
                    marginBottom: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid var(--cor-borda)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    display: compact ? 'flex' : 'block',
                    alignItems: compact ? 'center' : 'stretch',
                    gap: compact ? '12px' : '0'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                }}
            >
                {/* Barra lateral de status */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: config.cor,
                    borderRadius: '12px 0 0 12px'
                }} />
                
                {compact ? (
                    // Layout Mobile Compacto
                    <>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: config.corLight,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0,
                            marginLeft: '8px',
                            position: 'relative'
                        }}>
                            {config.icon}
                            {hasCF && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: 'var(--cor-primaria)',
                                    color: 'white',
                                    fontSize: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700'
                                }} title="Pagamentos do Cronograma Financeiro vinculados">
                                    📅
                                </span>
                            )}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: 'var(--cor-texto)',
                                marginBottom: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {servico.nome}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    flex: 1,
                                    height: '4px',
                                    background: 'var(--cor-borda)',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${progresso}%`,
                                        height: '100%',
                                        background: config.cor,
                                        borderRadius: '2px'
                                    }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--cor-texto-muted)', minWidth: '32px' }}>
                                    {progresso}%
                                </span>
                            </div>
                        </div>
                        
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--cor-texto)' }}>
                                {formatCurrency(valorTotal).replace('R$', '').trim()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--cor-acento)' }}>
                                {formatCurrency(valorPago).replace('R$', '').trim()} pago
                            </div>
                        </div>
                        
                        <div style={{ color: 'var(--cor-borda)', fontSize: '18px' }}>›</div>
                    </>
                ) : (
                    // Layout Desktop Completo
                    <div style={{ paddingLeft: '10px' }}>
                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: config.corLight,
                                color: config.cor,
                                border: `1px solid ${config.cor}`
                            }}>
                                {config.icon} {config.label}
                            </span>
                            {getValorMO(servico) > 0 && (
                                <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    background: 'var(--cor-info-bg)',
                                    color: 'var(--cor-info)'
                                }}>
                                    👷 MO
                                </span>
                            )}
                            {getValorMaterial(servico) > 0 && (
                                <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    background: 'var(--cor-acento-bg)',
                                    color: 'var(--cor-acento)'
                                }}>
                                    📦 MAT
                                </span>
                            )}
                            {hasCF && (
                                <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    background: 'var(--cor-primaria-bg)',
                                    color: 'var(--cor-primaria)'
                                }} title="Pagamentos do Cronograma Financeiro vinculados">
                                    📅 CF
                                </span>
                            )}
                            
                            {/* Botão Marcar como Concluído */}
                            {status !== 'Concluído' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Marcar "${servico.nome}" como concluído?`)) {
                                            handleMarcarConcluido(servico.id, true);
                                        }
                                    }}
                                    style={{
                                        marginLeft: 'auto',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        background: '#f0fdf4',
                                        color: '#10b981',
                                        border: '1px solid #10b981',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Marcar serviço como concluído"
                                >
                                    ✓ Concluir
                                </button>
                            )}
                            {status === 'Concluído' && servico.concluido && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Desmarcar "${servico.nome}" como concluído?`)) {
                                            handleMarcarConcluido(servico.id, false);
                                        }
                                    }}
                                    style={{
                                        marginLeft: 'auto',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        background: '#fef2f2',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Desmarcar como concluído"
                                >
                                    ✗ Reabrir
                                </button>
                            )}
                        </div>
                        
                        {/* Título */}
                        <h4 style={{ 
                            margin: '0 0 4px', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: 'var(--cor-texto)'
                        }}>
                            {servico.nome}
                        </h4>
                        
                        {/* Responsável */}
                        {servico.responsavel && (
                            <p style={{ 
                                margin: '0 0 10px', 
                                fontSize: '12px', 
                                color: 'var(--cor-texto-secundario)'
                            }}>
                                👤 {servico.responsavel}
                            </p>
                        )}
                        
                        {/* Valores */}
                        <div style={{
                            background: 'var(--cor-fundo-secundario)',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)' }}>Orçado</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cor-texto)' }}>
                                    {formatCurrency(valorTotal)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)' }}>Pago</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cor-acento)' }}>
                                    {formatCurrency(valorPago)}
                                </span>
                            </div>
                            {restante > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)' }}>Restante</span>
                                    <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--cor-warning)' }}>
                                        {formatCurrency(restante)}
                                    </span>
                                </div>
                            )}
                            
                            {/* Barra de Progresso */}
                            <div style={{
                                height: '6px',
                                background: 'var(--cor-borda)',
                                borderRadius: '3px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${progresso}%`,
                                    height: '100%',
                                    background: config.cor,
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ 
                                textAlign: 'right', 
                                fontSize: '10px', 
                                color: 'var(--cor-texto-muted)',
                                marginTop: '4px'
                            }}>
                                {progresso}% pago
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    // Coluna Kanban (Desktop)
    const ColunaKanban = ({ status, servicos: listaServicos }) => {
        const config = statusConfig[status];
        return (
            <div style={{
                background: 'var(--cor-fundo-secundario)',
                borderRadius: '14px',
                padding: '14px',
                flex: 1,
                minWidth: '280px',
                maxHeight: '500px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header da Coluna */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    padding: '0 4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{config.icon}</span>
                        <h3 style={{ 
                            margin: 0, 
                            fontSize: '13px', 
                            fontWeight: '700',
                            color: 'var(--cor-texto)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {config.label}
                        </h3>
                        <span style={{
                            background: config.cor,
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600'
                        }}>
                            {listaServicos.length}
                        </span>
                    </div>
                </div>
                
                {/* Lista de Cards */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}>
                    {listaServicos.length > 0 ? (
                        listaServicos.map(servico => (
                            <ServicoCard key={servico.id} servico={servico} />
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px 10px',
                            color: 'var(--cor-texto-muted)',
                            fontSize: '13px'
                        }}>
                            Nenhum serviço
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="card" style={{ marginTop: '20px' }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: isCollapsed ? 0 : '20px',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <h2 style={{ 
                    fontSize: '1.4em', 
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    🔧 Etapas e Serviços
                    <span style={{ 
                        fontSize: '0.55em', 
                        backgroundColor: 'var(--cor-primaria)', 
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px'
                    }}>
                        {servicos.length}
                    </span>
                </h2>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={onAddServico}
                        className="cf-btn cf-btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                        + Adicionar
                    </button>
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="cf-btn cf-btn-outline"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                        {isCollapsed ? '▼ Expandir' : '▲ Recolher'}
                    </button>
                </div>
            </div>
            
            {!isCollapsed && (
                <>
                    {servicos.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '40px', 
                            color: 'var(--cor-texto-muted)',
                            backgroundColor: 'var(--cor-fundo-secundario)',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontSize: '3em', marginBottom: '10px' }}>📋</div>
                            <p>Nenhum serviço cadastrado</p>
                            <button 
                                onClick={onAddServico}
                                className="cf-btn cf-btn-primary"
                                style={{ marginTop: '15px' }}
                            >
                                + Adicionar Serviço
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* MOBILE: Tabs + Lista */}
                            {isMobile ? (
                                <>
                                    {/* Tabs */}
                                    <div style={{
                                        display: 'flex',
                                        background: 'var(--cor-fundo-secundario)',
                                        borderRadius: '12px',
                                        padding: '4px',
                                        marginBottom: '16px'
                                    }}>
                                        {['A Iniciar', 'Em Andamento', 'Concluído'].map(status => {
                                            const config = statusConfig[status];
                                            const count = servicosPorStatus[status].length;
                                            const isActive = activeTab === status;
                                            
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => setActiveTab(status)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 8px',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        background: isActive ? 'white' : 'transparent',
                                                        color: isActive ? config.cor : 'var(--cor-texto-muted)',
                                                        fontWeight: '600',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                                                    }}
                                                >
                                                    <span>{config.icon}</span>
                                                    <span>{status.split(' ')[0]}</span>
                                                    <span style={{
                                                        background: isActive ? config.cor : 'var(--cor-borda)',
                                                        color: isActive ? 'white' : 'var(--cor-texto-secundario)',
                                                        padding: '1px 6px',
                                                        borderRadius: '8px',
                                                        fontSize: '10px'
                                                    }}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Lista de Cards */}
                                    <div>
                                        {servicosPorStatus[activeTab].length > 0 ? (
                                            servicosPorStatus[activeTab].map(servico => (
                                                <ServicoCard key={servico.id} servico={servico} compact={true} />
                                            ))
                                        ) : (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '40px 20px',
                                                color: 'var(--cor-texto-muted)'
                                            }}>
                                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                                                <div>Nenhum serviço nesta categoria</div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* DESKTOP: Kanban 3 Colunas */
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '16px',
                                    marginBottom: '20px'
                                }}>
                                    <ColunaKanban status="A Iniciar" servicos={servicosPorStatus['A Iniciar']} />
                                    <ColunaKanban status="Em Andamento" servicos={servicosPorStatus['Em Andamento']} />
                                    <ColunaKanban status="Concluído" servicos={servicosPorStatus['Concluído']} />
                                </div>
                            )}
                            
                            {/* Resumo Financeiro */}
                            <div style={{ 
                                marginTop: '20px', 
                                padding: '16px',
                                backgroundColor: 'var(--cor-fundo-secundario)',
                                borderRadius: '12px',
                                border: '1px solid var(--cor-borda)'
                            }}>
                                <div style={{ 
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    flexWrap: 'wrap',
                                    gap: '15px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: '600' }}>Total MO</div>
                                        <div style={{ fontWeight: '700', color: 'var(--cor-info)', fontSize: '15px' }}>
                                            {formatCurrency(totalMO)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: '600' }}>Total Material</div>
                                        <div style={{ fontWeight: '700', color: 'var(--cor-acento)', fontSize: '15px' }}>
                                            {formatCurrency(totalMaterial)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: '600' }}>Total Pago</div>
                                        <div style={{ fontWeight: '700', color: 'var(--cor-purple)', fontSize: '15px' }}>
                                            {formatCurrency(totalPago)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: '600' }}>Restante</div>
                                        <div style={{ fontWeight: '700', color: 'var(--cor-warning)', fontSize: '15px' }}>
                                            {formatCurrency(totalGeral - totalPago)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: '600' }}>Total Geral</div>
                                        <div style={{ fontWeight: '700', fontSize: '17px', color: 'var(--cor-texto)' }}>
                                            {formatCurrency(totalGeral)}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Barra de Progresso Geral */}
                                {totalGeral > 0 && (
                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{
                                            height: '8px',
                                            background: 'var(--cor-borda)',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, Math.round((totalPago / totalGeral) * 100))}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, var(--cor-acento), var(--cor-acento-light))',
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <div style={{ 
                                            textAlign: 'center', 
                                            fontSize: '11px', 
                                            color: 'var(--cor-texto-secundario)',
                                            marginTop: '4px'
                                        }}>
                                            {Math.round((totalPago / totalGeral) * 100)}% pago
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {totalGeral === 0 && (
                                <div style={{ 
                                    marginTop: '10px', 
                                    padding: '12px', 
                                    backgroundColor: 'var(--cor-warning-bg)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    color: 'var(--cor-warning)',
                                    border: '1px solid var(--cor-warning-light)'
                                }}>
                                    ⚠️ Os serviços não possuem valores cadastrados. 
                                    <button 
                                        onClick={onNavigateToCronograma}
                                        style={{ 
                                            marginLeft: '10px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--cor-primaria)',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Editar serviços
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// Manter EtapasServicosCard como alias para compatibilidade
const EtapasServicosCard = ServicosKanbanView;


// --- COMPONENTE: HISTÓRICO DE PAGAMENTOS (Card para Home) ---
const HistoricoPagamentosCard = ({ itemsPagos, itemsAPagar, user, onDeleteItem, fetchObraData, obraId }) => {
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [editandoItem, setEditandoItem] = useState(null);
    const [servicos, setServicos] = useState([]);
    const [loadingServicos, setLoadingServicos] = useState(false);
    const ITENS_INICIAIS = 10;
    
    const pagamentosExibidos = mostrarTodos ? itemsPagos : itemsPagos.slice(0, ITENS_INICIAIS);
    const totalPago = itemsPagos.reduce((sum, item) => sum + (item.valor_pago || item.valor_total || 0), 0);
    const totalPendente = itemsAPagar.reduce((sum, item) => sum + ((item.valor_total || 0) - (item.valor_pago || 0)), 0);
    
    const isAdmin = user && (user.role === 'administrador' || user.role === 'master');
    const isMaster = user && user.role === 'master';
    
    // Buscar serviços quando abrir modal de edição
    const fetchServicos = async () => {
        if (!obraId) return;
        setLoadingServicos(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`);
            if (response.ok) {
                const data = await response.json();
                setServicos(data);
            }
        } catch (err) {
            console.error('Erro ao buscar serviços:', err);
        } finally {
            setLoadingServicos(false);
        }
    };
    
    // Abrir modal de edição
    const handleEditarItem = (item) => {
        setEditandoItem({
            ...item,
            servico_id: item.servico_id || ''
        });
        fetchServicos();
    };
    
    // Salvar edição (vincular serviço)
    const handleSalvarEdicao = async () => {
        if (!editandoItem) return;
        
        try {
            const strId = String(editandoItem.id);
            let endpoint = '';
            let numericId = strId;
            let method = 'PATCH';
            let body = {
                servico_id: editandoItem.servico_id || null
            };
            
            // Extrair ID numérico
            if (strId.startsWith('lanc-')) {
                numericId = strId.replace('lanc-', '');
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            } else if (strId.startsWith('serv-pag-')) {
                numericId = strId.replace('serv-pag-', '');
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
            } else if (editandoItem.tipo_registro === 'lancamento') {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            } else if (editandoItem.tipo_registro === 'pagamento_servico') {
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
            } else if (editandoItem.tipo_registro === 'boleto') {
                const boletoId = editandoItem.boleto_id || strId.replace('boleto-', '');
                endpoint = `${API_URL}/obras/${obraId}/boletos/${boletoId}`;
                method = 'PUT';
                body = { vinculado_servico_id: editandoItem.servico_id || null };
            } else if (editandoItem.tipo_registro === 'parcela_individual') {
                // CORREÇÃO: Parcela individual - atualizar o PagamentoParcelado pai
                const pagParceladoId = editandoItem.pagamento_parcelado_id;
                if (pagParceladoId) {
                    endpoint = `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagParceladoId}`;
                    method = 'PUT';
                    body = { 
                        servico_id: editandoItem.servico_id || null,
                        segmento: editandoItem.tipo === 'Mão de Obra' ? 'Mão de Obra' : 'Material'
                    };
                } else {
                    throw new Error('ID do pagamento parcelado não encontrado');
                }
            } else {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            }
            
            const response = await fetchWithAuth(endpoint, {
                method: method,
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                alert('Pagamento atualizado com sucesso!');
                setEditandoItem(null);
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao atualizar');
            }
        } catch (err) {
            console.error('Erro ao salvar edição:', err);
            alert(`Erro ao salvar: ${err.message}`);
        }
    };
    
    // Função para exportar CSV
    const exportarCSV = () => {
        if (itemsPagos.length === 0) {
            alert('Nenhum pagamento para exportar');
            return;
        }
        
        // Cabeçalho CSV
        const headers = ['Data', 'Descrição', 'Fornecedor', 'Serviço', 'Valor', 'Status'];
        
        // Linhas de dados
        const rows = itemsPagos.map(item => {
            const data = item.data_vencimento || item.data || '';
            const dataFormatada = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            const valor = (item.valor_pago || item.valor_total || 0).toFixed(2).replace('.', ',');
            
            return [
                dataFormatada,
                `"${(item.descricao || '').replace(/"/g, '""')}"`,
                `"${(item.fornecedor || '-').replace(/"/g, '""')}"`,
                `"${(item.servico_nome || '-').replace(/"/g, '""')}"`,
                `"R$ ${valor}"`,
                'Pago'
            ].join(';');
        });
        
        // Adicionar linha de total
        const totalFormatado = totalPago.toFixed(2).replace('.', ',');
        rows.push('');
        rows.push(`;;;"TOTAL";"R$ ${totalFormatado}";`);
        
        // Montar CSV
        const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historico_pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Função para reverter parcela paga (voltar para pendente)
    const handleRevertParcela = async (item) => {
        if (!window.confirm(`Deseja reverter o pagamento "${item.descricao}"?\n\nA parcela voltará ao status "Pendente".`)) return;
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${item.pagamento_parcelado_id}/parcelas/${item.parcela_id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'Pendente',
                        data_pagamento: null
                    })
                }
            );
            
            if (response.ok) {
                alert('Pagamento revertido com sucesso!');
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao reverter pagamento');
            }
        } catch (err) {
            console.error('Erro ao reverter parcela:', err);
            alert(`Erro ao reverter: ${err.message}`);
        }
    };
    
    const handleDelete = async (item) => {
        if (!window.confirm(`Deseja excluir "${item.descricao}"?`)) return;
        
        try {
            let endpoint = '';
            
            // Extrair ID numérico (remover prefixos como "lanc-", "serv-pag-")
            const extractNumericId = (id) => {
                const strId = String(id);
                if (strId.startsWith('lanc-')) return strId.replace('lanc-', '');
                if (strId.startsWith('serv-pag-')) return strId.replace('serv-pag-', '');
                if (strId.startsWith('parcela-')) return null; // Parcelas não podem ser deletadas
                return strId;
            };
            
            const numericId = extractNumericId(item.id);
            
            if (!numericId) {
                alert('Parcelas de pagamentos parcelados não podem ser excluídas individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            }
            
            // Determinar qual endpoint usar baseado no tipo de registro
            if (item.tipo_registro === 'lancamento') {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            } else if (item.tipo_registro === 'pagamento_servico') {
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
            } else if (item.tipo_registro === 'parcela_individual') {
                alert('Parcelas de pagamentos parcelados não podem ser excluídas individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            } else {
                // Tentar identificar pelo prefixo do ID
                if (String(item.id).startsWith('serv-pag-')) {
                    endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
                } else {
                    endpoint = `${API_URL}/lancamentos/${numericId}`;
                }
            }
            
            console.log('Deletando:', endpoint);
            const response = await fetchWithAuth(endpoint, { method: 'DELETE' });
            
            if (response.ok) {
                alert('Item excluído com sucesso!');
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao excluir');
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
            alert(`Erro ao excluir: ${err.message}`);
        }
    };
    
    // Helper para verificar se é parcela
    const isParcela = (item) => {
        return item.tipo_registro === 'parcela_individual' || String(item.id).startsWith('parcela-');
    };
    
    // Helper para extrair dados para NotaFiscal
    const getNotaFiscalData = (item) => {
        const strId = String(item.id);
        let numericId = strId;
        let itemType = 'lancamento';
        
        if (strId.startsWith('lanc-')) {
            numericId = strId.replace('lanc-', '');
            itemType = 'lancamento';
        } else if (strId.startsWith('serv-pag-')) {
            numericId = strId.replace('serv-pag-', '');
            itemType = 'pagamento_servico';
        } else if (strId.startsWith('parcela-') || item.tipo_registro === 'parcela_individual') {
            numericId = item.parcela_id || strId.replace('parcela-', '');
            itemType = 'parcela_individual';
        } else if (item.tipo_registro === 'pagamento_servico') {
            itemType = 'pagamento_servico';
        }
        
        return { numericId: parseInt(numericId), itemType };
    };
    
    return (
        <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ 
                fontSize: '1.5em', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                💰 Histórico de Pagamentos
                <span style={{ 
                    fontSize: '0.6em', 
                    backgroundColor: '#4CAF50', 
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px'
                }}>
                    {itemsPagos.length} pagos
                </span>
                {itemsPagos.length > 0 && (
                    <button
                        onClick={exportarCSV}
                        style={{
                            marginLeft: 'auto',
                            padding: '6px 12px',
                            fontSize: '0.55em',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '500'
                        }}
                        title="Exportar histórico para CSV"
                    >
                        📥 Exportar CSV
                    </button>
                )}
            </h2>
            
            {/* Legenda de Tipos */}
            {itemsPagos.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    marginBottom: '16px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--cor-fundo-secundario)',
                    borderRadius: '8px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#6366f1',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Mão de Obra</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#10b981',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Material</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#f59e0b',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Equipamento</span>
                    </div>
                </div>
            )}
            
            {itemsPagos.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '30px', 
                    color: '#999',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '2em', marginBottom: '10px' }}>📋</div>
                    <p>Nenhum pagamento registrado</p>
                </div>
            ) : (
                <>
                    <div className="tabela-scroll-container" style={{ maxHeight: mostrarTodos ? '600px' : '400px', overflowY: 'auto' }}>
                        <table className="tabela-pagamentos" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Fornecedor</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th style={{width: '50px', textAlign: 'center'}}>NF</th>
                                    {isAdmin && <th style={{width: '50px'}}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosExibidos.map((item, idx) => {
                                    // Determinar cor baseada no tipo
                                    const getTipoColor = () => {
                                        const tipo = item.tipo || item.tipo_pagamento || '';
                                        const tipoLower = tipo.toLowerCase();
                                        if (tipoLower.includes('mão') || tipoLower.includes('mao') || tipoLower === 'mao_de_obra') return '#6366f1'; // Indigo
                                        if (tipoLower.includes('material')) return '#10b981'; // Verde
                                        if (tipoLower.includes('equipamento')) return '#f59e0b'; // Laranja
                                        return '#94a3b8'; // Cinza padrão
                                    };
                                    const tipoColor = getTipoColor();
                                    
                                    return (
                                    <tr key={item.id || idx} style={{ position: 'relative' }}>
                                        <td style={{ position: 'relative', paddingLeft: '16px' }}>
                                            {/* Indicador colorido */}
                                            <span style={{
                                                position: 'absolute',
                                                left: '0',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '4px',
                                                height: '70%',
                                                borderRadius: '2px',
                                                backgroundColor: tipoColor
                                            }}></span>
                                            {new Date((item.data_vencimento || item.data) + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{item.descricao}</div>
                                            {item.servico_nome && (
                                                <div style={{ fontSize: '0.85em', color: '#666' }}>
                                                    Serviço: {item.servico_nome}
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.fornecedor || '-'}</td>
                                        <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                            {formatCurrency(item.valor_pago || item.valor_total || 0)}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                fontSize: '0.8em'
                                            }}>
                                                ✓ Pago
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            {/* Nota Fiscal - para todos os tipos incluindo parcelas */}
                                            {obraId && (() => {
                                                const { numericId, itemType } = getNotaFiscalData(item);
                                                
                                                return (
                                                    <NotaFiscalIcon 
                                                        item={{ ...item, id: numericId }}
                                                        itemType={itemType}
                                                        obraId={obraId}
                                                        onNotaAdded={() => fetchObraData && obraId && fetchObraData(obraId)}
                                                    />
                                                );
                                            })()}
                                        </td>
                                        {isAdmin && (
                                            <td style={{textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                {/* Botão de editar (vincular serviço) */}
                                                <button 
                                                    onClick={() => handleEditarItem(item)}
                                                    style={{ 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        cursor: 'pointer', 
                                                        fontSize: '1.1em', 
                                                        padding: '3px', 
                                                        color: '#1976d2' 
                                                    }}
                                                    title="Editar / Vincular a serviço"
                                                >
                                                    ✏️
                                                </button>
                                                {isParcela(item) ? (
                                                    /* Para parcelas: botão de reverter pagamento (admin e master) */
                                                    <button 
                                                        onClick={() => handleRevertParcela(item)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: 'pointer', 
                                                            fontSize: '1.1em', 
                                                            padding: '3px', 
                                                            color: '#ff9800' 
                                                        }}
                                                        title="Reverter pagamento (voltar para Pendente)"
                                                    >
                                                        ↩️
                                                    </button>
                                                ) : (
                                                    /* Para outros itens: botão de excluir */
                                                    <button 
                                                        onClick={() => handleDelete(item)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: 'pointer', 
                                                            fontSize: '1.1em', 
                                                            padding: '3px', 
                                                            color: '#dc3545' 
                                                        }}
                                                        title="Excluir"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {itemsPagos.length > ITENS_INICIAIS && (
                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <button 
                                onClick={() => setMostrarTodos(!mostrarTodos)}
                                className="voltar-btn"
                            >
                                {mostrarTodos 
                                    ? '↑ Mostrar menos' 
                                    : `Ver todos os ${itemsPagos.length} pagamentos →`
                                }
                            </button>
                        </div>
                    )}
                    
                    {/* Resumo de totais */}
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '15px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap',
                        gap: '15px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Pago</div>
                            <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.2em' }}>
                                {formatCurrency(totalPago)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85em', color: '#666' }}>Pendente</div>
                            <div style={{ fontWeight: 'bold', color: '#f57c00', fontSize: '1.2em' }}>
                                {formatCurrency(totalPendente)}
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            {/* Modal de Edição - Vincular Serviço */}
            {editandoItem && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }} onClick={() => setEditandoItem(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '25px',
                        width: '90%',
                        maxWidth: '450px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            ✏️ Editar Pagamento
                        </h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em' }}>Descrição:</label>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', marginTop: '3px' }}>
                                {editandoItem.descricao}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em' }}>Valor:</label>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', marginTop: '3px', color: '#2e7d32' }}>
                                {formatCurrency(editandoItem.valor_pago || editandoItem.valor_total || 0)}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em', display: 'block', marginBottom: '8px' }}>
                                🔗 Vincular a Serviço:
                            </label>
                            {loadingServicos ? (
                                <div style={{ color: '#666' }}>Carregando serviços...</div>
                            ) : (
                                <select
                                    value={editandoItem.servico_id || ''}
                                    onChange={(e) => setEditandoItem({...editandoItem, servico_id: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '1em'
                                    }}
                                >
                                    <option value="">-- Nenhum serviço (Geral) --</option>
                                    {servicos.map(s => (
                                        <option key={s.id} value={s.id}>{s.nome}</option>
                                    ))}
                                </select>
                            )}
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                💡 Vincular a um serviço faz o valor contar no orçamento do serviço
                            </small>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditandoItem(null)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarEdicao}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                💾 Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- COMPONENTES DE MODAL (Existentes) ---
const Modal = ({ children, onClose, customWidth }) => (
    <div className="modal-overlay" onClick={onClose} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '10px',
        overflowY: 'auto'
    }}>
        <div 
            className="modal-content" 
            style={{ 
                maxWidth: customWidth || '500px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '12px',
                position: 'relative',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

// <--- MUDANÇA: Modal de Edição (com valor_total e valor_pago) -->
const EditLancamentoModal = ({ lancamento, onClose, onSave, servicos }) => {
    const [formData, setFormData] = useState({});
    
    useEffect(() => {
         if (lancamento) {
             const initialData = { ...lancamento };
             if (initialData.data) {
                 try {
                     initialData.data = new Date(initialData.data + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     console.error("Erro ao formatar data para edição:", e);
                     initialData.data = '';
                 }
             }
             // Formatar data_vencimento
             if (initialData.data_vencimento) {
                 try {
                     initialData.data_vencimento = new Date(initialData.data_vencimento + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     console.error("Erro ao formatar data_vencimento para edição:", e);
                     initialData.data_vencimento = '';
                 }
             } else {
                 initialData.data_vencimento = initialData.data || ''; // Fallback para data normal
             }
             initialData.servico_id = initialData.servico_id ? parseInt(initialData.servico_id, 10) : '';
             initialData.prioridade = initialData.prioridade ? parseInt(initialData.prioridade, 10) : 0; 
             initialData.fornecedor = initialData.fornecedor || ''; 

             setFormData(initialData);
         } else {
             setFormData({});
         }
     }, [lancamento]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        let finalValue = value;
        
        if (name === 'valor_total' || name === 'valor_pago') { // <-- MUDANÇA
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'servico_id') {
            finalValue = value ? parseInt(value, 10) : ''; 
        }
        if (name === 'prioridade') {
            finalValue = value ? parseInt(value, 10) : 0;
        }
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        const dataToSend = {
            ...formData,
            servico_id: formData.servico_id || null,
            prioridade: parseInt(formData.prioridade, 10) || 0,
            fornecedor: formData.fornecedor || null 
        };
        onSave(dataToSend); 
    };
    
    if (!lancamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Lançamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data do Registro</label>
                    <input type="date" name="data" value={formData.data || ''} onChange={handleChange} required />
                </div>
                
                <div className="form-group">
                    <label>Data de Vencimento ⚠️</label>
                    <input type="date" name="data_vencimento" value={formData.data_vencimento || ''} onChange={handleChange} required />
                </div>
                
                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                
                {/* <-- MUDANÇA: valor -> valor_total --> */}
                <div className="form-group"><label>Valor Total (R$)</label>
                    <input type="number" step="0.01" name="valor_total" value={formData.valor_total || 0} onChange={handleChange} required />
                </div>
                {/* <-- MUDANÇA: Novo campo valor_pago --> */}
                <div className="form-group"><label>Valor Já Pago (R$)</label>
                    <input type="number" step="0.01" name="valor_pago" value={formData.valor_pago || 0} onChange={handleChange} required />
                </div>

                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select name="servico_id" value={formData.servico_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {(servicos || []).map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Prioridade</label>
                    <select name="prioridade" value={formData.prioridade || 0} onChange={handleChange}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Material</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                <div className="form-group"><label>Status</label><select name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required><option>A Pagar</option><option>Pago</option></select></div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
            </form>
        </Modal>
    );
};

// <--- MUDANÇA: Modal de Serviço (com valor_total e valor_pago) -->
const ServicoDetailsModal = ({ servico, onClose, onSave, fetchObraData, obraId }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    
     useEffect(() => {
         if (servico) {
             setFormData({
                 ...servico,
                 valor_global_mao_de_obra: servico.valor_global_mao_de_obra || 0,
                 valor_global_material: servico.valor_global_material || 0, 
             });
         } else {
             setFormData({});
         }
     }, [servico]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        const finalValue = (name === 'valor_global_mao_de_obra' || name === 'valor_global_material') 
            ? parseFloat(value) || 0 
            : value; 
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };

    const handleDeletarPagamento = async (pagamentoId) => {
        if (!window.confirm('Deseja excluir este pagamento?')) return;
        
        try {
            const response = await fetchWithAuth(`${API_URL}/servicos/${servico.id}/pagamentos/${pagamentoId}`, { method: 'DELETE' });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao deletar');
            }
            
            alert('Pagamento excluído com sucesso!');
            if (fetchObraData && obraId) { 
                fetchObraData(obraId); 
                onClose(); 
            } else { 
                window.location.reload(); 
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro ao deletar: ' + error.message);
        }
    };

    const handleDeletarServico = () => {
        fetchWithAuth(`${API_URL}/servicos/${servico.id}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) throw new Error('Erro ao deletar'); return res.json(); })
        .then(() => {
             if (fetchObraData && obraId) { fetchObraData(obraId); onClose(); } 
             else { window.location.reload(); }
        })
        .catch(error => console.error('Erro:', error));
    };

    if (!servico) return null;
    
    // Separar pagamentos do serviço (PagamentoServico) dos lancamentos vinculados
    const pagamentosServico = (servico.pagamentos || []).filter(p => !p.is_lancamento && !p.is_parcela);
    const lancamentosEParcelas = (servico.pagamentos || []).filter(p => p.is_lancamento || p.is_parcela);
    
    // Calcula totais pagos (inclui todos: PagamentoServico, lancamentos e parcelas)
    const totalPagoMO = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'mao_de_obra')
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        
    // Comprometido: PagamentoServico + total_gastos_vinculados (evita duplicar lancamentos)
    const totalGastoMO = pagamentosServico
        .filter(p => p.tipo_pagamento === 'mao_de_obra')
        .reduce((sum, p) => sum + (p.valor_total || 0), 0) + (servico.total_gastos_vinculados_mo || 0);

    const totalPagoMat = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'material')
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        
    const totalGastoMat = pagamentosServico
        .filter(p => p.tipo_pagamento === 'material')
        .reduce((sum, p) => sum + (p.valor_total || 0), 0) + (servico.total_gastos_vinculados_mat || 0);


    return (
        <Modal onClose={onClose} customWidth="650px">
            {!isEditing ? (
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>{servico.nome}</h2>
                        {(user.role === 'administrador' || user.role === 'master') && (
                            <button onClick={handleDeletarServico} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: '#dc3545', padding: '5px' }} title="Excluir Serviço" > 🗑️ </button>
                        )}
                    </div>
                    <p><strong>Responsável:</strong> {servico.responsavel || 'N/A'}</p>
                    <p><strong>Valor Orçado (Mão de Obra):</strong> {formatCurrency(servico.valor_global_mao_de_obra)} (Comprometido: {formatCurrency(totalGastoMO)} | Pago: {formatCurrency(totalPagoMO)})</p>
                    <p><strong>Valor Orçado (Material):</strong> {formatCurrency(servico.valor_global_material)} (Comprometido: {formatCurrency(totalGastoMat)} | Pago: {formatCurrency(totalPagoMat)})</p>
                    <p><strong>Chave PIX:</strong> {servico.pix || 'N/A'}</p>
                    <hr />
                    <h3>Histórico de Pagamentos (do Serviço)</h3>
                    
                    {/* Legenda de Tipos */}
                    {servico.pagamentos && servico.pagamentos.length > 0 && (
                        <div style={{ 
                            display: 'flex', 
                            gap: '20px', 
                            marginBottom: '12px',
                            padding: '10px 12px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '6px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ 
                                    width: '12px', 
                                    height: '12px', 
                                    borderRadius: '3px', 
                                    backgroundColor: '#6366f1',
                                    display: 'inline-block'
                                }}></span>
                                <span style={{ fontSize: '12px', color: '#334155' }}>Mão de Obra</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ 
                                    width: '12px', 
                                    height: '12px', 
                                    borderRadius: '3px', 
                                    backgroundColor: '#10b981',
                                    display: 'inline-block'
                                }}></span>
                                <span style={{ fontSize: '12px', color: '#334155' }}>Material</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="tabela-scroll-container" style={{maxHeight: '250px', overflowX: 'auto'}}> 
                        <table className="tabela-pagamentos" style={{width: '100%', minWidth: '500px'}}>
                            <thead>
                                <tr>
                                    <th style={{minWidth: '85px'}}>Data</th>
                                    <th style={{minWidth: '80px'}}>Tipo</th>
                                    <th style={{minWidth: '80px'}}>Fornecedor</th>
                                    <th style={{minWidth: '110px', textAlign: 'right'}}>Valor Total</th>
                                    <th style={{minWidth: '110px', textAlign: 'right'}}>Valor Pago</th>
                                    {(user.role === 'administrador' || user.role === 'master') && <th style={{width: '50px'}}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {servico.pagamentos && servico.pagamentos.length > 0 ? (
                                    servico.pagamentos.map((pag) => {
                                        const tipoColor = pag.tipo_pagamento === 'mao_de_obra' ? '#6366f1' : '#10b981';
                                        return (
                                        <tr key={pag.id || pag.parcela_id}>
                                            <td style={{whiteSpace: 'nowrap', position: 'relative', paddingLeft: '14px'}}>
                                                <span style={{
                                                    position: 'absolute',
                                                    left: '0',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: '4px',
                                                    height: '60%',
                                                    borderRadius: '2px',
                                                    backgroundColor: tipoColor
                                                }}></span>
                                                {pag.data ? new Date(pag.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                            <td style={{fontSize: '0.85em'}}>{pag.tipo_pagamento === 'mao_de_obra' ? 'Mão de Obra' : 'Material'}</td>
                                            <td style={{fontSize: '0.85em'}}>{pag.fornecedor || '-'}</td>
                                            <td style={{textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500'}}>{formatCurrency(pag.valor_total)}</td>
                                            <td style={{textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500', color: '#2e7d32'}}>{formatCurrency(pag.valor_pago)}</td>
                                            
                                            {(user.role === 'administrador' || user.role === 'master') && (
                                                <td style={{textAlign: 'center'}}>
                                                    {!pag.is_parcela && (
                                                        <button onClick={() => handleDeletarPagamento(pag.id)} className="acao-icon-btn delete-btn" title="Excluir Pagamento" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '3px', color: '#dc3545' }} > 🗑️ </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                        );
                                    })
                                 ) : (
                                    <tr>
                                        <td colSpan={user.role === 'administrador' ? 6 : 5} style={{textAlign: 'center', padding: '20px', color: '#999'}}>Nenhum pagamento registrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <div className="form-actions" style={{marginTop: '20px'}}>
                            <button type="button" onClick={() => setIsEditing(true)} className="submit-btn"> Editar Serviço </button>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <h2>Editar Serviço</h2>
                    <div className="form-group"><label>Descrição</label><input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" value={formData.responsavel || ''} onChange={handleChange} /></div>
                    <div className="form-group">
                        <label>Valor Orçado - Mão de Obra (R$)</label>
                        <input type="number" step="0.01" name="valor_global_mao_de_obra" value={formData.valor_global_mao_de_obra || ''} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Valor Orçado - Material (R$)</label>
                        <input type="number" step="0.01" name="valor_global_material" value={formData.valor_global_material || ''} onChange={handleChange} />
                    </div>
                    
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                    <div className="form-actions"><button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
                </form>
            )}
        </Modal>
    );
};


// --- MODAIS DE ADMINISTRAÇÃO ---
const UserPermissionsModal = ({ userToEdit, allObras, onClose, onSave }) => {
    // ... (código inalterado)
    const [selectedObraIds, setSelectedObraIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (userToEdit) {
            fetchWithAuth(`${API_URL}/admin/users/${userToEdit.id}/permissions`)
                .then(res => res.json())
                .then(data => {
                    setSelectedObraIds(new Set(data.obra_ids));
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Erro ao buscar permissões:", err);
                    setIsLoading(false);
                });
        }
    }, [userToEdit]);
    const handleCheckboxChange = (obraId) => {
        setSelectedObraIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(obraId)) {
                newSet.delete(obraId);
            } else {
                newSet.add(obraId);
            }
            return newSet;
        });
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const obra_ids = Array.from(selectedObraIds);
        onSave(userToEdit.id, obra_ids);
    };
    if (isLoading) {
        return <Modal onClose={onClose}><div className="loading-screen">Carregando permissões...</div></Modal>;
    }
    return (
        <Modal onClose={onClose}>
            <h2>Editar Permissões: {userToEdit.username}</h2>
            <p>Nível: <strong>{userToEdit.role}</strong></p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Selecione as obras que este usuário pode ver:</label>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
                        {allObras.length > 0 ? allObras.map(obra => (
                            <div key={obra.id}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selectedObraIds.has(obra.id)}
                                        onChange={() => handleCheckboxChange(obra.id)}
                                    />
                                    {obra.nome}
                                </label>
                            </div>
                        )) : <p>Nenhuma obra cadastrada para atribuir.</p>}
                    </div>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Permissões</button>
                </div>
            </form>
        </Modal>
    );
};

const AdminPanelModal = ({ allObras, onClose }) => {
    // ... (código inalterado)
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userToEdit, setUserToEdit] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('comum');
    const [changingRole, setChangingRole] = useState(null); // ID do usuário tendo role alterado
    
    const fetchUsers = () => {
        setIsLoading(true);
        fetchWithAuth(`${API_URL}/admin/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Erro ao buscar usuários:", err);
                setError("Falha ao carregar usuários.");
                setIsLoading(false);
            });
    };
    // ... (depois da função handleCreateUser)

    const handleChangeRole = async (userId, novoRole) => {
        if (!window.confirm(`Deseja alterar o nível deste usuário para "${novoRole}"?`)) {
            return;
        }
        
        setChangingRole(userId);
        setError(null);
        
        try {
            const response = await fetchWithAuth(`${API_URL}/admin/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: novoRole })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.erro || 'Erro ao alterar nível');
            }
            
            const data = await response.json();
            
            // Atualizar localmente
            setUsers(prevUsers => prevUsers.map(u => 
                u.id === userId ? { ...u, role: novoRole } : u
            ));
            
        } catch (err) {
            console.error("Erro ao alterar nível:", err);
            setError(err.message);
        } finally {
            setChangingRole(null);
        }
    };

    const handleDeleteUser = (user) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.username}? Esta ação não pode ser desfeita.`)) {
            return;
        }
        
        setError(null);
        
        fetchWithAuth(`${API_URL}/admin/users/${user.id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') });
            return res.json();
        })
        .then(() => {
            // Remove o usuário da lista no frontend
            setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        })
        .catch(err => {
            console.error("Erro ao deletar usuário:", err);
            setError(err.message);
        });
    };
    useEffect(() => {
        fetchUsers();
    }, []);
    const handleCreateUser = (e) => {
        e.preventDefault();
        setError(null);
        fetchWithAuth(`${API_URL}/admin/users`, {
            method: 'POST',
            body: JSON.stringify({
                username: newUsername,
                password: newPassword,
                role: newRole
            })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') });
            return res.json();
        })
        .then(newUser => {
            setUsers(prevUsers => [...prevUsers, newUser]);
            setNewUsername('');
            setNewPassword('');
            setNewRole('comum');
        })
        .catch(err => {
            console.error("Erro ao criar usuário:", err);
            setError(err.message);
        });
    };
    const handleSavePermissions = (userId, obra_ids) => {
        fetchWithAuth(`${API_URL}/admin/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ obra_ids })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro ao salvar') });
            return res.json();
        })
        .then(() => {
            setUserToEdit(null); 
        })
        .catch(err => {
            console.error("Erro ao salvar permissões:", err);
            setError(err.message); 
        });
    };
    
    const getRoleBadge = (role) => {
        const styles = {
            master: { bg: '#fef3c7', color: '#92400e', icon: '👑' },
            administrador: { bg: '#dbeafe', color: '#1e40af', icon: '⭐' },
            comum: { bg: '#f3f4f6', color: '#374151', icon: '👤' }
        };
        const s = styles[role] || styles.comum;
        return (
            <span style={{
                backgroundColor: s.bg,
                color: s.color,
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.85em',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {s.icon} {role}
            </span>
        );
    };
    
    return (
        <Modal onClose={onClose} customWidth="800px">
            {userToEdit && (
                <UserPermissionsModal
                    userToEdit={userToEdit}
                    allObras={allObras}
                    onClose={() => setUserToEdit(null)}
                    onSave={handleSavePermissions}
                />
            )}
            <div style={{opacity: userToEdit ? 0.1 : 1}}>
                <h2>Painel de Administração</h2>
                <div className="card-full" style={{ background: '#f8f9fa' }}>
                    <h3>Criar Novo Usuário</h3>
                    <form onSubmit={handleCreateUser} className="form-add-obra">
                        <input
                            type="text"
                            placeholder="Usuário (ou e-mail)"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Senha Temporária"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                        >
                            <option value="comum">👤 Operador (comum)</option>
                            <option value="administrador">⭐ Administrador</option>
                            <option value="master">👑 Master</option>
                        </select>
                        <button type="submit" className="submit-btn" style={{flexGrow: 0}}>Criar</button>
                    </form>
                    {error && <p style={{ color: 'red', fontSize: '0.9em' }}>{error}</p>}
                </div>
                <h3 style={{marginTop: '30px'}}>Usuários Existentes</h3>
                {isLoading ? <p>Carregando usuários...</p> : (
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th style={{width: '180px'}}>Nível</th>
                                <th style={{textAlign: 'center'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.username}</td>
                                    <td>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            disabled={changingRole === user.id}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #d1d5db',
                                                backgroundColor: changingRole === user.id ? '#f3f4f6' : 'white',
                                                cursor: changingRole === user.id ? 'wait' : 'pointer',
                                                fontSize: '0.9em',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="comum">👤 Operador</option>
                                            <option value="administrador">⭐ Admin</option>
                                            <option value="master">👑 Master</option>
                                        </select>
                                    </td>
                                   <td style={{textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                        <button 
                                            className="acao-btn" 
                                            style={{backgroundColor: '#17a2b8', color: 'white'}}
                                            onClick={() => setUserToEdit(user)}
                                        >
                                            Obras
                                        </button>
                                        <button 
                                            className="acao-btn" 
                                            style={{backgroundColor: 'var(--cor-vermelho)', color: 'white'}}
                                            onClick={() => handleDeleteUser(user)}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
};
// ----------------------------------------------------

// Modal "Exportar Relatório Geral"
const ExportReportModal = ({ onClose }) => {
    // ... (código inalterado)
    const [selectedPriority, setSelectedPriority] = useState('todas');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = () => {
        setIsLoading(true);
        setError(null);

        const url = `${API_URL}/export/pdf_pendentes_todas_obras?prioridade=${selectedPriority}`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o relatório.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                
                setIsLoading(false);
                onClose();
            })
            .catch(err => {
                console.error("Erro ao gerar PDF:", err);
                setError(err.message || "Não foi possível gerar o PDF.");
                setIsLoading(false);
            });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Exportar Relatório Geral de Pendências</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
                <div className="form-group">
                    <label>Filtrar por Prioridade</label>
                    <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} required>
                        <option value="todas">Todas as Pendências</option>
                        <option value="5">Prioridade 5 (Urgente)</option>
                        <option value="4">Prioridade 4</option>
                        <option value="3">Prioridade 3 (Média)</option>
                        <option value="2">Prioridade 2</option>
                        <option value="1">Prioridade 1</option>
                        <option value="0">Prioridade 0 (Nenhuma)</option>
                    </select>
                </div>
                
                <div className="form-actions" style={{ marginTop: '30px' }}>
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>Cancelar</button>
                    <button type="submit" className="submit-btn pdf" disabled={isLoading}>
                        {isLoading ? 'Gerando...' : 'Gerar PDF'}
                    </button>
                </div>
                {error && <p style={{color: 'red', textAlign: 'center', marginTop: '10px'}}>{error}</p>}
            </form>
        </Modal>
    );
};
// ----------------------------------------------------


// Modal "Relatório do Cronograma Financeiro"
const ModalRelatorioCronograma = ({ onClose, obras }) => {
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGerarRelatorio = async () => {
        if (!obraSelecionada) {
            alert('Por favor, selecione uma obra primeiro.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraSelecionada.id}/relatorio-cronograma-pdf`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Erro ao gerar relatório do cronograma.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Cronograma_${obraSelecionada.nome.replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            alert('Relatório gerado com sucesso!');
            onClose();
        } catch (err) {
            console.error("Erro ao gerar relatório:", err);
            setError(err.message || "Não foi possível gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <h2>📊 Relatório do Cronograma Financeiro</h2>
                
                {error && (
                    <div style={{ 
                        padding: '10px', 
                        marginBottom: '15px', 
                        backgroundColor: '#ffebee', 
                        border: '1px solid #ef5350',
                        borderRadius: '5px',
                        color: '#c62828'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ marginBottom: '10px', color: '#666' }}>
                        Selecione a obra para gerar o relatório do cronograma financeiro:
                    </p>
                    
                    <div style={{ 
                        display: 'grid', 
                        gap: '10px',
                        maxHeight: '400px',
                        overflowY: 'scroll',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                    }} 
                    className="hide-scrollbar modal-lista-obras">
                        {obras.map(obra => (
                            <div
                                key={obra.id}
                                onClick={() => setObraSelecionada(obra)}
                                style={{
                                    padding: '15px',
                                    border: obraSelecionada?.id === obra.id 
                                        ? '2px solid var(--cor-primaria)' 
                                        : '1px solid #ddd',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: obraSelecionada?.id === obra.id 
                                        ? '#e3f2fd' 
                                        : 'white',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0' }}>{obra.nome}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                                            Cliente: {obra.cliente || 'N/A'}
                                        </p>
                                    </div>
                                    {obraSelecionada?.id === obra.id && (
                                        <span style={{ 
                                            fontSize: '1.5em',
                                            color: 'var(--cor-primaria)'
                                        }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose} 
                        className="voltar-btn"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleGerarRelatorio} 
                        className="submit-btn"
                        disabled={isLoading || !obraSelecionada}
                        style={{
                            opacity: (!obraSelecionada || isLoading) ? 0.6 : 1
                        }}
                    >
                        {isLoading ? '⏳ Gerando...' : '📄 Gerar Relatório PDF'}
                    </button>
                </div>

                {obraSelecionada && (
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '10px', 
                        backgroundColor: '#e8f5e9',
                        borderRadius: '5px',
                        fontSize: '0.9em',
                        color: '#2e7d32'
                    }}>
                        ✓ Obra selecionada: <strong>{obraSelecionada.nome}</strong>
                    </div>
                )}
            </div>
        </Modal>
    );
};
// ----------------------------------------------------


// Modal para Editar Prioridade
const EditPrioridadeModal = ({ item, onClose, onSave }) => {
    // ... (código inalterado)
    const [prioridade, setPrioridade] = useState(0);

    useEffect(() => {
        if (item) {
            setPrioridade(item.prioridade || 0);
        }
    }, [item]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(parseInt(prioridade, 10));
    };
    
    if (!item) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Prioridade</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Item</label>
                    <input type="text" value={item.descricao} readOnly disabled />
                </div>
                <div className="form-group">
                    <label>Prioridade</label>
                    <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Prioridade</button>
                </div>
            </form>
        </Modal>
    );
};
// ----------------------------------------------------

// Modal "Adicionar Serviço"
const AddServicoModal = ({ onClose, onSave }) => {
    // ... (código inalterado)
    const [nome, setNome] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [pix, setPix] = useState('');
    const [valorMO, setValorMO] = useState(''); 
    const [valorMaterial, setValorMaterial] = useState(''); 

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Converter valores vazios para 0
        const moValue = valorMO === '' ? 0 : parseFloat(valorMO) || 0;
        const matValue = valorMaterial === '' ? 0 : parseFloat(valorMaterial) || 0;
        
        let servicoData = {
            nome,
            responsavel: responsavel || null,
            pix: pix || null,
            valor_global_mao_de_obra: moValue,
            valor_global_material: matValue, 
        };
        
        onSave(servicoData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>Cadastrar Novo Serviço</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição do Serviço</label>
                    <input type="text" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Piscina" required />
                </div>
                <div className="form-group">
                    <label>Responsável</label>
                    <input type="text" name="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Ex: Carlos (Piscineiro)" />
                </div>
                <div className="form-group">
                    <label>Dados de Pagamento (PIX)</label>
                    <input type="text" name="pix" value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Email, Celular, etc." />
                </div>
                
                <hr />

                <div className="form-group">
                    <label>Valor Orçado - Mão de Obra (R$)</label>
                    <input type="number" step="0.01" value={valorMO} onChange={(e) => setValorMO(e.target.value)} placeholder="0,00" />
                </div>
                
                <div className="form-group">
                    <label>Valor Orçado - Material (R$)</label>
                    <input type="number" step="0.01" value={valorMaterial} onChange={(e) => setValorMaterial(e.target.value)} placeholder="0,00" />
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Serviço</button>
                </div>
            </form>
        </Modal>
    );
};

// <--- MUDANÇA: Modal "Adicionar Gasto Geral" (usa 'valor' para 'valor_total') -->
const AddLancamentoModal = ({ onClose, onSave, servicos }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString()); // NOVO campo
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState(''); 
    const [pix, setPix] = useState('');
    const [valor, setValor] = useState(''); // Este 'valor' será enviado como 'valor_total'
    const [tipo, setTipo] = useState('Material');
    // MUDANÇA 2: Status sempre será "Pago" para gastos avulsos do histórico
    const status = 'Pago';
    const [servicoId, setServicoId] = useState('');
    const [prioridade, setPrioridade] = useState(0); 

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            data,
            data_vencimento: dataVencimento, // NOVO campo
            descricao,
            fornecedor: fornecedor || null,
            pix: pix || null,
            valor: parseFloat(valor) || 0, // O handler 'handleSaveLancamento' espera 'valor'
            tipo,
            status: 'Pago', // MUDANÇA 2: Sempre "Pago"
            prioridade: parseInt(prioridade, 10) || 0,
            servico_id: servicoId ? parseInt(servicoId, 10) : null,
            is_gasto_avulso_historico: true // MUDANÇA 2: Flag para backend
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>💵 Adicionar Gasto Avulso (Pago)</h2>
            <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                Este gasto será automaticamente marcado como <strong>PAGO</strong> e adicionado ao histórico.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data do Registro</label>
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Data de Vencimento ⚠️</label>
                    <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                </div>
                <div className="form-group"><label>Descrição</label><input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" value={pix} onChange={(e) => setPix(e.target.value)} /></div>
                
                {/* O usuário insere 'valor', mas o backend salvará em 'valor_total' */}
                <div className="form-group"><label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {(servicos || []).map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Prioridade</label>
                    <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                {/* MUDANÇA 2: Campo Status removido - sempre será Pago */}
                <div style={{padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', marginBottom: '15px'}}>
                    <strong>Status: PAGO</strong> (automático)
                </div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
            </form>
        </Modal>
    );
};

// Modal "Adicionar Orçamento"
const AddOrcamentoModal = ({ onClose, onSave, servicos }) => {
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [valor, setValor] = useState('');
    const [dadosPagamento, setDadosPagamento] = useState('');
    const [tipo, setTipo] = useState('Material'); 
    const [servicoId, setServicoId] = useState(''); 
    const [observacoes, setObservacoes] = useState(''); 
    const [anexos, setAnexos] = useState([]);
    
    // NOVOS CAMPOS - Condições de Pagamento
    const [dataVencimento, setDataVencimento] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [numeroParcelas, setNumeroParcelas] = useState(1);
    const [periodicidade, setPeriodicidade] = useState('Mensal');

    const handleFileChange = (e) => {
        setAnexos(Array.from(e.target.files));
    };

    const valorParcela = numeroParcelas > 0 && valor ? (parseFloat(valor) / numeroParcelas) : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('descricao', descricao);
        formData.append('fornecedor', fornecedor || '');
        formData.append('valor', parseFloat(valor) || 0);
        formData.append('dados_pagamento', dadosPagamento || '');
        formData.append('tipo', tipo);
        formData.append('servico_id', servicoId ? parseInt(servicoId, 10) : '');
        formData.append('observacoes', observacoes || '');
        
        // NOVOS CAMPOS
        formData.append('data_vencimento', dataVencimento);
        formData.append('numero_parcelas', numeroParcelas);
        formData.append('periodicidade', periodicidade);
        
        anexos.forEach(file => {
            formData.append('anexos', file);
        });
        
        onSave(formData);
    };

    return (
        <Modal onClose={onClose} customWidth="600px">
            <h2>📋 Nova Solicitação de Compra</h2>
            <form onSubmit={handleSubmit}>
                {/* Descrição e Fornecedor */}
                <div className="form-group">
                    <label>Descrição do Item/Serviço *</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cimento CP-II 50kg (100 sacos)" required />
                </div>
                <div className="form-group">
                    <label>Fornecedor</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Casa do Construtor" />
                </div>
                
                {/* Tipo e Serviço */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Tipo *</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                            <option>Material</option>
                            <option>Mão de Obra</option>
                            <option>Serviço</option>
                            <option>Equipamentos</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Vincular ao Serviço</label>
                        <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                            <option value="">Nenhum (Geral)</option>
                            {(servicos || []).map(s => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <hr style={{margin: '20px 0'}} />
                <h4 style={{ marginBottom: '15px', color: '#666' }}>💰 Condições de Pagamento</h4>
                
                {/* Valor e Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Valor Total (R$) *</label>
                        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
                    </div>
                    <div className="form-group">
                        <label>Data 1º Vencimento *</label>
                        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                </div>
                
                {/* Parcelas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Nº de Parcelas</label>
                        <input type="number" min="1" max="60" value={numeroParcelas} onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)} />
                    </div>
                    {numeroParcelas > 1 && (
                        <div className="form-group">
                            <label>Periodicidade</label>
                            <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
                                <option value="Semanal">Semanal</option>
                                <option value="Quinzenal">Quinzenal</option>
                                <option value="Mensal">Mensal</option>
                            </select>
                        </div>
                    )}
                </div>
                
                {numeroParcelas > 1 && valor && (
                    <div style={{ 
                        backgroundColor: '#e8f5e9', 
                        padding: '10px 15px', 
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '0.95em'
                    }}>
                        💡 <strong>{numeroParcelas}x</strong> de <strong>{formatCurrency(valorParcela)}</strong> ({periodicidade.toLowerCase()})
                    </div>
                )}
                
                {/* Dados de Pagamento */}
                <div className="form-group">
                    <label>Dados de Pagamento (PIX, Conta, etc.)</label>
                    <input type="text" value={dadosPagamento} onChange={(e) => setDadosPagamento(e.target.value)} placeholder="PIX: (71) 99999-9999" />
                </div>
                
                <div className="form-group">
                    <label>Observações</label>
                    <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" placeholder="Ex: Entrega em 5 dias úteis"></textarea>
                </div>
                
                <div className="form-group">
                    <label>Anexos (Orçamentos, PDF)</label>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf"
                    />
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">📤 Enviar para Aprovação</button>
                </div>
            </form>
        </Modal>
    );
};

// MUDANÇA 3: NOVO Modal "Inserir Pagamento" - COM SUPORTE A PARCELAMENTO E BOLETO
const InserirPagamentoModal = ({ onClose, onSave, servicos, obraId }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString());
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [pix, setPix] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('Material'); // Material, Mão de Obra, Serviço
    const [status, setStatus] = useState('A Pagar'); // Pago ou A Pagar
    const [servicoId, setServicoId] = useState('');
    
    // 🆕 NOVOS ESTADOS PARA PARCELAMENTO
    const [tipoFormaPagamento, setTipoFormaPagamento] = useState('avista'); // 'avista' ou 'parcelado'
    const [meioPagamento, setMeioPagamento] = useState('PIX'); // PIX, Boleto, Transferência
    const [numeroParcelas, setNumeroParcelas] = useState('');
    const [periodicidade, setPeriodicidade] = useState('Mensal'); // Semanal, Quinzenal, Mensal
    const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(getTodayString());
    
    // 🆕 NOVOS ESTADOS PARA ENTRADA
    const [temEntrada, setTemEntrada] = useState(false);
    const [percentualEntrada, setPercentualEntrada] = useState(30);
    const [dataEntrada, setDataEntrada] = useState(getTodayString());
    
    // Estados para boletos parcelados (valores diferentes)
    const [valoresIguais, setValoresIguais] = useState(true);
    const [boletosConfig, setBoletosConfig] = useState([]);
    
    // 🆕 ESTADOS PARA "SALVAR E NOVO"
    const [contadorInseridos, setContadorInseridos] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 🆕 Cálculos de entrada e parcelas
    const valorTotal = parseFloat(valor) || 0;
    const valorEntrada = temEntrada ? (valorTotal * percentualEntrada / 100) : 0;
    const valorRestante = valorTotal - valorEntrada;
    const numParcelas = parseInt(numeroParcelas) || 1;
    const valorParcela = numParcelas > 0 ? valorRestante / numParcelas : 0;
    
    // Gerar configuração de boletos quando mudar número de parcelas
    useEffect(() => {
        if (tipoFormaPagamento === 'parcelado' && meioPagamento === 'Boleto' && numeroParcelas) {
            const dataInicial = dataPrimeiraParcela ? new Date(dataPrimeiraParcela + 'T12:00:00') : new Date();
            
            const novosBoletos = [];
            for (let i = 0; i < numParcelas; i++) {
                const dataVenc = new Date(dataInicial);
                if (periodicidade === 'Semanal') {
                    dataVenc.setDate(dataVenc.getDate() + (i * 7));
                } else if (periodicidade === 'Quinzenal') {
                    dataVenc.setDate(dataVenc.getDate() + (i * 15));
                } else {
                    dataVenc.setMonth(dataVenc.getMonth() + i);
                }
                
                novosBoletos.push({
                    numero: i + 1,
                    valor: valoresIguais ? valorParcela.toFixed(2) : (boletosConfig[i]?.valor || valorParcela.toFixed(2)),
                    data_vencimento: dataVenc.toISOString().split('T')[0],
                    codigo_barras: boletosConfig[i]?.codigo_barras || ''
                });
            }
            setBoletosConfig(novosBoletos);
        }
    }, [numeroParcelas, valor, dataPrimeiraParcela, periodicidade, meioPagamento, tipoFormaPagamento, valoresIguais, temEntrada, percentualEntrada]);
    
    // 🆕 Função para limpar campos (mantém alguns que repetem)
    const limparCamposParaNovo = () => {
        setDescricao('');
        setValor('');
        setCodigoBarras('');
        setDataVencimento(getTodayString());
        setNumeroParcelas('');
        setTemEntrada(false);
        setBoletosConfig([]);
        // Mantém: fornecedor, pix, tipo, servicoId, meioPagamento, tipoFormaPagamento, periodicidade
    };
    
    // 🆕 Mostrar toast temporário
    const mostrarToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    // Atualizar boleto específico
    const handleBoletoChange = (index, field, value) => {
        const novosBoletos = [...boletosConfig];
        novosBoletos[index] = { ...novosBoletos[index], [field]: value };
        setBoletosConfig(novosBoletos);
    };

    // Copiar código de barras
    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        alert('Código copiado!');
    };

    const handleSubmit = async (e, salvarENovo = false) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dadosPagamento = {
            data,
            data_vencimento: dataVencimento,
            descricao,
            fornecedor: fornecedor || null,
            pix: meioPagamento === 'PIX' ? pix : null,
            codigo_barras: meioPagamento === 'Boleto' && tipoFormaPagamento === 'avista' ? codigoBarras : null,
            valor: parseFloat(valor) || 0,
            tipo,
            status,
            servico_id: servicoId ? parseInt(servicoId, 10) : null,
            tipo_forma_pagamento: tipoFormaPagamento,
            meio_pagamento: meioPagamento
        };
        
        // Adicionar campos de parcelamento se aplicável
        if (tipoFormaPagamento === 'parcelado') {
            dadosPagamento.numero_parcelas = parseInt(numeroParcelas);
            dadosPagamento.periodicidade = periodicidade;
            dadosPagamento.data_primeira_parcela = dataPrimeiraParcela;
            
            // 🆕 Adicionar dados de entrada
            if (temEntrada) {
                dadosPagamento.tem_entrada = true;
                dadosPagamento.percentual_entrada = percentualEntrada;
                dadosPagamento.valor_entrada = valorEntrada;
                dadosPagamento.data_entrada = dataEntrada;
                dadosPagamento.valor_parcela = valorParcela; // Valor de cada parcela após entrada
                console.log("🔍 DEBUG ENTRADA (frontend):", {
                    temEntrada,
                    percentualEntrada,
                    valorEntrada,
                    dataEntrada,
                    valorParcela
                });
            }
            
            console.log("📤 Dados de parcelamento a enviar:", dadosPagamento);
            
            // Se for boleto parcelado, incluir configuração dos boletos
            if (meioPagamento === 'Boleto') {
                dadosPagamento.parcelas_customizadas = boletosConfig;
            }
        }
        
        try {
            await onSave(dadosPagamento, salvarENovo); // Passa flag para callback
            
            if (salvarENovo) {
                // Incrementa contador e limpa campos para próximo
                setContadorInseridos(prev => prev + 1);
                mostrarToast(`✅ Pagamento "${descricao}" inserido com sucesso!`);
                limparCamposParaNovo();
            }
            // Se não for salvarENovo, o onSave vai fechar o modal
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <h2>💳 Inserir Pagamento</h2>
            <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                Insira um novo pagamento. Você pode criar pagamentos à vista ou parcelados, e vincular a um serviço.
            </p>
            <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                </div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>
                
                <div className="form-group">
                    <label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                
                {/* 🆕 TIPO DE FORMA DE PAGAMENTO */}
                <div className="form-group">
                    <label>Forma de Pagamento</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                        <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <input 
                                type="radio" 
                                value="avista" 
                                checked={tipoFormaPagamento === 'avista'} 
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{marginRight: '8px'}}
                            />
                            À vista
                        </label>
                        <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <input 
                                type="radio" 
                                value="parcelado" 
                                checked={tipoFormaPagamento === 'parcelado'} 
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{marginRight: '8px'}}
                            />
                            Parcelado
                        </label>
                    </div>
                </div>

                {/* 🆕 MEIO DE PAGAMENTO */}
                <div className="form-group">
                    <label>Meio de Pagamento</label>
                    <select value={meioPagamento} onChange={(e) => setMeioPagamento(e.target.value)} required>
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Dinheiro">Dinheiro</option>
                    </select>
                </div>
                
                {/* 🆕 CAMPOS CONDICIONAIS PARA PARCELAMENTO */}
                {tipoFormaPagamento === 'parcelado' && (
                    <>
                        {/* 🆕 SEÇÃO DE ENTRADA */}
                        <div style={{
                            background: '#e8f5e9',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid #a5d6a7'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#2e7d32' }}>
                                    <input
                                        type="checkbox"
                                        checked={temEntrada}
                                        onChange={(e) => setTemEntrada(e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    💰 Tem entrada?
                                </label>
                            </div>
                            
                            {temEntrada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.9em' }}>Percentual de Entrada (%)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={percentualEntrada}
                                                onChange={(e) => setPercentualEntrada(parseFloat(e.target.value) || 0)}
                                                style={{ width: '80px' }}
                                            />
                                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                = {formatCurrency(valorEntrada)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.9em' }}>Data da Entrada</label>
                                        <input
                                            type="date"
                                            value={dataEntrada}
                                            onChange={(e) => setDataEntrada(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {temEntrada && valor && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px',
                                    background: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '0.9em',
                                    color: '#666'
                                }}>
                                    Valor restante para parcelar: <strong style={{ color: '#1976d2' }}>{formatCurrency(valorRestante)}</strong>
                                </div>
                            )}
                        </div>

                        {/* CONFIGURAÇÃO DAS PARCELAS */}
                        <div style={{
                            background: '#f0f8ff',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid #b3d9ff'
                        }}>
                            <h4 style={{margin: '0 0 12px 0', color: '#0066cc'}}>📦 Configuração das Parcelas</h4>
                            
                            <div className="form-group">
                                <label>Número de Parcelas {temEntrada ? '(após entrada)' : ''}</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="60" 
                                    value={numeroParcelas} 
                                    onChange={(e) => setNumeroParcelas(e.target.value)} 
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Periodicidade</label>
                                <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} required>
                                    <option value="Semanal">Semanal (7 dias)</option>
                                    <option value="Quinzenal">Quinzenal (15 dias)</option>
                                    <option value="Mensal">Mensal (30 dias)</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Data da 1ª Parcela</label>
                                <input 
                                    type="date" 
                                    value={dataPrimeiraParcela} 
                                    onChange={(e) => setDataPrimeiraParcela(e.target.value)} 
                                    required 
                                />
                            </div>
                            
                            {numeroParcelas && valor && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px',
                                    background: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '0.9em'
                                }}>
                                    <strong>Valor por parcela:</strong> {formatCurrency(valorParcela)}
                                </div>
                            )}
                        </div>

                        {/* 🆕 RESUMO DO PARCELAMENTO */}
                        {numeroParcelas && valor && (
                            <div style={{
                                background: '#fff3e0',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                border: '1px solid #ffcc80'
                            }}>
                                <h4 style={{margin: '0 0 12px 0', color: '#e65100'}}>📋 Resumo do Parcelamento</h4>
                                
                                <div style={{ fontSize: '0.95em' }}>
                                    {temEntrada && (
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            padding: '8px 0',
                                            borderBottom: '2px solid #ffcc80',
                                            marginBottom: '8px',
                                            color: '#2e7d32',
                                            fontWeight: 'bold'
                                        }}>
                                            <span>🟢 ENTRADA ({percentualEntrada}%)</span>
                                            <span>{formatCurrency(valorEntrada)} - {new Date(dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    )}
                                    
                                    {Array.from({ length: Math.min(numParcelas, 5) }, (_, i) => {
                                        const dataBase = new Date(dataPrimeiraParcela + 'T12:00:00');
                                        if (periodicidade === 'Semanal') {
                                            dataBase.setDate(dataBase.getDate() + (i * 7));
                                        } else if (periodicidade === 'Quinzenal') {
                                            dataBase.setDate(dataBase.getDate() + (i * 15));
                                        } else {
                                            dataBase.setMonth(dataBase.getMonth() + i);
                                        }
                                        return (
                                            <div key={i} style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                padding: '6px 0',
                                                borderBottom: '1px solid #ffe0b2'
                                            }}>
                                                <span>Parcela {i + 1}/{numParcelas}</span>
                                                <span>{formatCurrency(valorParcela)} - {dataBase.toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        );
                                    })}
                                    
                                    {numParcelas > 5 && (
                                        <div style={{ padding: '6px 0', color: '#999', fontStyle: 'italic' }}>
                                            ... e mais {numParcelas - 5} parcela(s)
                                        </div>
                                    )}
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        padding: '10px 0 0 0',
                                        marginTop: '8px',
                                        borderTop: '2px solid #e65100',
                                        fontWeight: 'bold',
                                        color: '#e65100'
                                    }}>
                                        <span>TOTAL ({temEntrada ? numParcelas + 1 : numParcelas} pagamentos)</span>
                                        <span>{formatCurrency(valorTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* 🆕 CONFIGURAÇÃO DE BOLETOS PARCELADOS */}
                {tipoFormaPagamento === 'parcelado' && meioPagamento === 'Boleto' && numeroParcelas && (
                    <div style={{
                        background: '#fff8e1',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid #ffcc80',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <h4 style={{margin: '0 0 12px 0', color: '#f57c00'}}>🎫 Códigos de Barras dos Boletos</h4>
                        
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={valoresIguais}
                                    onChange={(e) => setValoresIguais(e.target.checked)}
                                />
                                Valores iguais
                            </label>
                        </div>
                        
                        {boletosConfig.map((boleto, index) => (
                            <div key={index} style={{
                                background: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '5px',
                                padding: '10px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#555'
                                }}>
                                    <span>Boleto {boleto.numero}/{numeroParcelas}</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                        Venc: {new Date(boleto.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {!valoresIguais && (
                                        <div style={{ flex: '1', minWidth: '100px' }}>
                                            <label style={{ fontSize: '11px', color: '#666' }}>Valor:</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={boleto.valor}
                                                onChange={(e) => handleBoletoChange(index, 'valor', e.target.value)}
                                                style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ flex: '3', minWidth: '200px' }}>
                                        <label style={{ fontSize: '11px', color: '#666' }}>Código de Barras:</label>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="text"
                                                value={boleto.codigo_barras}
                                                onChange={(e) => handleBoletoChange(index, 'codigo_barras', e.target.value)}
                                                placeholder="Cole a linha digitável"
                                                style={{ flex: '1', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                                            />
                                            {boleto.codigo_barras && (
                                                <button
                                                    type="button"
                                                    onClick={() => copiarCodigo(boleto.codigo_barras)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        background: '#4CAF50',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Copiar código"
                                                >
                                                    📋
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* CAMPOS ORIGINAIS CONTINUAM */}
                {tipoFormaPagamento === 'avista' && (
                    <div className="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                )}
                
                {/* Campo de PIX - só aparece se meio for PIX */}
                {meioPagamento === 'PIX' && (
                    <div className="form-group">
                        <label>Chave PIX (Opcional)</label>
                        <input 
                            type="text" 
                            value={pix} 
                            onChange={(e) => setPix(e.target.value)} 
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </div>
                )}

                {/* Campo de Código de Barras - só aparece se meio for Boleto e À vista */}
                {meioPagamento === 'Boleto' && tipoFormaPagamento === 'avista' && (
                    <div className="form-group">
                        <label>Código de Barras do Boleto</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={codigoBarras} 
                                onChange={(e) => setCodigoBarras(e.target.value)} 
                                placeholder="Cole a linha digitável do boleto"
                                style={{ flex: 1 }}
                            />
                            {codigoBarras && (
                                <button
                                    type="button"
                                    onClick={() => copiarCodigo(codigoBarras)}
                                    style={{
                                        padding: '8px 15px',
                                        background: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    title="Copiar código"
                                >
                                    📋 Copiar
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="form-group">
                    <label>Tipo</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Serviço">Serviço</option>
                        <option value="Equipamentos">Equipamentos</option>
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                        <option value="Pago">Pago</option>
                        <option value="A Pagar">A Pagar</option>
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Vincular ao Serviço (Opcional)</label>
                    <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                        <option value="">Nenhum</option>
                        {(servicos || []).map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>
                        {contadorInseridos > 0 ? `Fechar (${contadorInseridos} inserido${contadorInseridos > 1 ? 's' : ''})` : 'Cancelar'}
                    </button>
                    <button 
                        type="button" 
                        onClick={(e) => handleSubmit(e, true)} 
                        className="submit-btn"
                        style={{ backgroundColor: '#17a2b8', flex: 1 }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳...' : '➕ Salvar e Novo'}
                    </button>
                    <button 
                        type="submit" 
                        className="submit-btn"
                        style={{ flex: 1 }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳...' : (tipoFormaPagamento === 'parcelado' ? '📦 Salvar e Fechar' : '💾 Salvar e Fechar')}
                    </button>
                </div>
                
                {/* 🆕 Toast de sucesso */}
                {toastMsg && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        zIndex: 10000,
                        animation: 'fadeIn 0.3s ease',
                        fontWeight: 'bold'
                    }}>
                        {toastMsg}
                    </div>
                )}
            </form>
        </Modal>
    );
};

// Modal para Editar Solicitação
const EditOrcamentoModal = ({ orcamento, onClose, onSave, servicos }) => {
    // ... (código inalterado)
    const [formData, setFormData] = useState({});
    const [existingAnexos, setExistingAnexos] = useState([]);
    const [newAnexos, setNewAnexos] = useState([]);
    const [isLoadingAnexos, setIsLoadingAnexos] = useState(false);

    useEffect(() => {
        if (orcamento) {
            setFormData({
                ...orcamento,
                servico_id: orcamento.servico_id ? parseInt(orcamento.servico_id, 10) : '',
                observacoes: orcamento.observacoes || ''
            });
            
            setIsLoadingAnexos(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setExistingAnexos(Array.isArray(data) ? data : []);
                    setIsLoadingAnexos(false);
                })
                .catch(err => {
                    console.error("Erro ao buscar anexos:", err);
                    setIsLoadingAnexos(false);
                });
        }
    }, [orcamento]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        let finalValue = value;
        if (name === 'valor') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'servico_id') {
            finalValue = value ? parseInt(value, 10) : ''; 
        }
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleFileChange = (e) => {
        setNewAnexos(Array.from(e.target.files));
    };

    const handleOpenAnexo = (anexoId) => {
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => alert(`Erro ao abrir anexo: ${err.message}`));
    };

    const handleDeleteAnexo = (anexoId, e) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        if (window.confirm("Tem certeza que deseja excluir este anexo?")) {
            fetchWithAuth(`${API_URL}/anexos/${anexoId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error('Falha ao deletar');
                    setExistingAnexos(prev => prev.filter(a => a.id !== anexoId));
                })
                .catch(err => alert(`Erro ao deletar anexo: ${err.message}`));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const data = new FormData();
        data.append('descricao', formData.descricao || '');
        data.append('fornecedor', formData.fornecedor || '');
        data.append('valor', parseFloat(formData.valor) || 0);
        data.append('dados_pagamento', formData.dados_pagamento || '');
        data.append('tipo', formData.tipo || 'Material');
        data.append('servico_id', formData.servico_id || '');
        data.append('observacoes', formData.observacoes || '');
        
        onSave(formData.id, data, newAnexos);
    };

    if (!orcamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Solicitação</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required />
                </div>
                 <div className="form-group">
                    <label>Dados de Pagamento (Opcional)</label>
                    <input type="text" name="dados_pagamento" value={formData.dados_pagamento || ''} onChange={handleChange} />
                </div>
                
                <div className="form-group">
                    <label>Observações (Opcional)</label>
                    <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows="3"></textarea>
                </div>
                
                <hr style={{margin: '20px 0'}} />

                <div className="form-group">
                    <label>Anexos Atuais</label>
                    {isLoadingAnexos ? <p>Carregando anexos...</p> : (
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                            {existingAnexos.length > 0 ? existingAnexos.map(anexo => (
                                <li key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
                                    <a 
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                        title={`Abrir ${anexo.filename}`}
                                        style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        {anexo.filename}
                                    </a>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleDeleteAnexo(anexo.id, e)}
                                        title="Excluir Anexo"
                                        style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.2em' }}
                                    >
                                        &times;
                                    </button>
                                </li>
                            )) : <p>Nenhum anexo.</p>}
                        </ul>
                    )}
                </div>

                <div className="form-group">
                    <label>Adicionar Novos Anexos</label>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf"
                    />
                </div>

                <hr style={{margin: '20px 0'}} />
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select name="servico_id" value={formData.servico_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {(servicos || []).map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Material'} onChange={handleChange} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Alterações</button>
                </div>
            </form>
        </Modal>
    );
};

// --- NOVO MODAL PARA VER ANEXOS ---
const ViewAnexosModal = ({ orcamento, onClose }) => {
    // ... (código inalterado)
    const [anexos, setAnexos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orcamento) {
            setIsLoading(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setAnexos(Array.isArray(data) ? data : []);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Erro ao buscar anexos:", err);
                    setIsLoading(false);
                });
        }
    }, [orcamento]);

    const handleOpenAnexo = (anexoId) => {
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => alert(`Erro ao abrir anexo: ${err.message}`));
    };

    if (!orcamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Anexos de: {orcamento.descricao}</h2>
            <div className="form-group" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
                {isLoading ? <p>Carregando anexos...</p> : (
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                        {anexos.length > 0 ? anexos.map(anexo => (
                            <li key={anexo.id} style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '1.1em' }}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                    title={`Abrir ${anexo.filename}`}
                                    style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    📎 {anexo.filename}
                                </a>
                            </li>
                        )) : <p>Nenhum anexo encontrado.</p>}
                    </ul>
                )}
            </div>
            <div className="form-actions" style={{marginTop: '20px'}}>
                <button type="button" onClick={onClose} className="cancel-btn" style={{width: '100%'}}>Fechar</button>
            </div>
        </Modal>
    );
};
// --- FIM DO NOVO MODAL ---


// <--- MUDANÇA: NOVO MODAL PARA PAGAMENTO PARCIAL ---
const PartialPaymentModal = ({ item, onClose, onSave }) => {
    
    // Calcula o valor que ainda falta pagar
    const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
    
    // Define o valor inicial do input como o valor restante
    const [valorAPagar, setValorAPagar] = useState(valorRestante.toFixed(2));
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        const valorFloat = parseFloat(valorAPagar);
        
        if (isNaN(valorFloat) || valorFloat <= 0) {
            setError('O valor deve ser um número positivo.');
            return;
        }
        
        // +0.01 para evitar erros de arredondamento de centavos
        if (valorFloat > (valorRestante + 0.01)) {
            setError(`O valor não pode ser maior que o restante (${formatCurrency(valorRestante)}).`);
            return;
        }
        
        // Envia o valor para a função principal
        onSave(valorFloat);
    };

    return (
        <Modal onClose={onClose}>
            <h2>Registrar Pagamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Item</label>
                    <input type="text" value={item.descricao} readOnly disabled />
                </div>
                
                <div className="form-group">
                    <label>Valor Restante</label>
                    <input 
                        type="text" 
                        value={formatCurrency(valorRestante)} 
                        readOnly 
                        disabled 
                    />
                </div>

                <div className="form-group">
                    <label>Valor a Pagar Hoje</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={valorAPagar}
                        onChange={(e) => setValorAPagar(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                
                {error && <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center' }}>{error}</p>}

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn" style={{backgroundColor: 'var(--cor-acento)'}}>
                        Registrar Pagamento
                    </button>
                </div>
            </form>
        </Modal>
    );
};
// --- FIM DO NOVO MODAL ---


// --- MODAL DE UPLOAD DE NOTA FISCAL ---
const UploadNotaFiscalModal = ({ item, obraId, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Validar tipo de arquivo (PDF, imagens)
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Tipo de arquivo inválido. Apenas PDF e imagens são permitidos.');
                return;
            }
            // Validar tamanho (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('Arquivo muito grande. Tamanho máximo: 10MB');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, selecione um arquivo');
            return;
        }

        setIsUploading(true);
        setError(null);

        // <-- CORREÇÃO: Pegar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', realItemId);
        formData.append('item_type', item.tipo_registro);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`, {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro ao fazer upload'); });
            }
            return res.json();
        })
        .then(() => {
            onSuccess();
            onClose();
        })
        .catch(err => {
            console.error("Erro ao fazer upload:", err);
            setError(err.message);
        })
        .finally(() => {
            setIsUploading(false);
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Anexar Nota Fiscal</h2>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                <strong>Item:</strong> {item.descricao}<br />
                <strong>Fornecedor:</strong> {item.fornecedor || 'N/A'}
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Selecione o arquivo (PDF ou Imagem)</label>
                    <input 
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    {file && (
                        <p style={{ marginTop: '5px', color: 'var(--cor-acento)', fontSize: '0.9em' }}>
                            ✓ Arquivo selecionado: {file.name}
                        </p>
                    )}
                </div>

                {error && <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center' }}>{error}</p>}

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isUploading}>
                        Cancelar
                    </button>
                    <button type="submit" className="submit-btn" disabled={isUploading}>
                        {isUploading ? 'Enviando...' : 'Anexar Nota Fiscal'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
// --- FIM DO MODAL DE UPLOAD DE NOTA FISCAL ---

// --- MODAL PARA VISUALIZAR NOTA FISCAL ---
const VisualizarNotaFiscalModal = ({ onClose, nota, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useAuth();
    
    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir esta nota fiscal?')) {
            return;
        }
        
        setIsDeleting(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/notas-fiscais/${nota.id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Erro ao excluir nota fiscal');
            }
            
            onDelete();
            onClose();
        } catch (error) {
            console.error('Erro ao excluir nota fiscal:', error);
            alert('Erro ao excluir nota fiscal');
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleDownload = () => {
        window.open(`${API_URL}/notas-fiscais/${nota.id}`, '_blank');
    };
    
    const isPDF = nota.mimetype === 'application/pdf';
    const isImage = nota.mimetype?.startsWith('image/');
    
    return (
        <Modal onClose={onClose} customWidth="800px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>📄 Nota Fiscal</h2>
                {(user.role === 'administrador' || user.role === 'master') && (
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                            background: 'var(--cor-vermelho)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                        }}
                    >
                        {isDeleting ? 'Excluindo...' : '🗑️ Excluir'}
                    </button>
                )}
            </div>
            
            <div style={{ 
                padding: '15px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <p style={{ margin: '5px 0' }}>
                    <strong>Arquivo:</strong> {nota.filename}
                </p>
                <p style={{ margin: '5px 0' }}>
                    <strong>Tipo:</strong> {nota.mimetype}
                </p>
            </div>
            
            <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '20px',
                maxHeight: '500px',
                overflowY: 'auto'
            }}>
                {isPDF && (
                    <iframe 
                        src={`${API_URL}/notas-fiscais/${nota.id}`}
                        style={{ 
                            width: '100%', 
                            height: '500px', 
                            border: 'none' 
                        }}
                        title="Nota Fiscal PDF"
                    />
                )}
                
                {isImage && (
                    <img 
                        src={`${API_URL}/notas-fiscais/${nota.id}`}
                        alt="Nota Fiscal"
                        style={{ 
                            width: '100%', 
                            height: 'auto',
                            display: 'block'
                        }}
                    />
                )}
                
                {!isPDF && !isImage && (
                    <div style={{ 
                        padding: '40px', 
                        textAlign: 'center',
                        color: '#666'
                    }}>
                        <p>Pré-visualização não disponível para este tipo de arquivo.</p>
                        <p>Clique em "Baixar" para visualizar o arquivo.</p>
                    </div>
                )}
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="cancel-btn">
                    Fechar
                </button>
                <button 
                    onClick={handleDownload}
                    className="submit-btn"
                    style={{ background: 'var(--cor-acento)' }}
                >
                    📥 Baixar
                </button>
            </div>
        </Modal>
    );
};

// --- COMPONENTE DE ÍCONE DE NOTA FISCAL CLICÁVEL ---
const NotaFiscalIcon = ({ item, itemType, obraId, onNotaAdded }) => {
    const [nota, setNota] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showVisualizacao, setShowVisualizacao] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = React.useRef(null);
    const { user } = useAuth();
    
    useEffect(() => {
        carregarNotaFiscal();
    }, [item.id]);
    
    const carregarNotaFiscal = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`);
            const data = await response.json();
            
            const notaDoItem = data.find(n => 
                n.item_id === item.id && n.item_type === itemType
            );
            
            setNota(notaDoItem || null);
        } catch (error) {
            console.error('Erro ao carregar nota fiscal:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Apenas arquivos PDF, PNG ou JPG são permitidos');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Tamanho máximo: 10MB');
            return;
        }
        
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', item.id);
        formData.append('item_type', itemType);
        
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Erro ao fazer upload');
            }
            
            const novaNota = await response.json();
            setNota(novaNota);
            
            if (onNotaAdded) {
                onNotaAdded();
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao anexar nota fiscal');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const handleClick = (e) => {
        e.stopPropagation();
        
        if (nota) {
            setShowVisualizacao(true);
        } else if (user.role === 'administrador' || user.role === 'master') {
            fileInputRef.current?.click();
        }
    };
    
    const canUpload = user.role === 'administrador' || user.role === 'master';
    
    if (isLoading) {
        return (
            <span style={{ 
                fontSize: '1.2em', 
                color: '#ccc',
                cursor: 'default'
            }}>
                ⏳
            </span>
        );
    }
    
    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={isUploading}
            />
            
            <span
                onClick={handleClick}
                title={
                    nota 
                        ? 'Clique para visualizar a nota fiscal' 
                        : canUpload 
                            ? 'Clique para anexar nota fiscal'
                            : 'Sem nota fiscal'
                }
                style={{
                    fontSize: '1.2em',
                    cursor: (nota || canUpload) ? 'pointer' : 'default',
                    color: nota ? 'var(--cor-acento)' : '#ccc',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    marginLeft: '8px'
                }}
                onMouseEnter={(e) => {
                    if (nota || canUpload) {
                        e.target.style.transform = 'scale(1.2)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                }}
            >
                {isUploading ? '⏳' : nota ? '📄' : canUpload ? '📎' : ''}
            </span>
            
            {showVisualizacao && nota && (
                <VisualizarNotaFiscalModal
                    nota={nota}
                    onClose={() => setShowVisualizacao(false)}
                    onDelete={() => {
                        setNota(null);
                        if (onNotaAdded) {
                            onNotaAdded();
                        }
                    }}
                />
            )}
        </>
    );
};
// --- FIM DOS COMPONENTES DE NOTAS FISCAIS ---


// --- MODAL DE ORÇAMENTOS ---
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
                console.error('Erro ao carregar solicitações:', err);
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
// --- FIM DO MODAL DE ORÇAMENTOS ---


// --- MODAL DE RELATÓRIOS ---
const RelatoriosModal = ({ onClose, obraId, obraNome }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadType, setDownloadType] = useState(null);
    const [error, setError] = useState(null);

    // NOVO: Função para baixar Relatório Financeiro (Cronograma)
    const handleDownloadRelatorioFinanceiro = () => {
        setIsDownloading(true);
        setDownloadType('financeiro');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/relatorio-cronograma-pdf`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao gerar relatório financeiro'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Cronograma_Financeiro_${obraNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                console.error("Erro ao baixar relatório financeiro:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    const handleDownloadNotasFiscais = () => {
        setIsDownloading(true);
        setDownloadType('notas');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais/export/zip`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao baixar notas fiscais'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notas_fiscais_${obraNome}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                console.error("Erro ao baixar notas fiscais:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    const handleDownloadResumoObra = () => {
        setIsDownloading(true);
        setDownloadType('resumo');
        setError(null);

        // <-- CORREÇÃO: Usar fetchWithAuth para enviar token
        fetchWithAuth(`${API_URL}/obras/${obraId}/relatorio/resumo-completo`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao gerar relatório'); });
                }
                return res.blob();
            })
            .then(blob => {
                // Criar URL temporário e abrir em nova aba
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                
                // Limpar URL após um tempo
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 1000);
            })
            .catch(err => {
                console.error("Erro ao gerar relatório:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    return (
        <Modal onClose={onClose} customWidth="500px">
            <h2>📊 Relatórios da Obra</h2>
            <p style={{ marginBottom: '25px', color: 'var(--cor-texto-secundario)' }}>
                Selecione o tipo de relatório que deseja gerar:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* NOVO: Opção 0: Relatório Financeiro (Cronograma) */}
                <button
                    onClick={handleDownloadRelatorioFinanceiro}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid #e91e63',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'financeiro' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = '#fce4ec';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📊</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: '#e91e63' }}>
                                {isDownloading && downloadType === 'financeiro' ? 'Gerando...' : 'Relatório Financeiro'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Cronograma com pagamentos futuros, parcelados e previsões
                            </p>
                        </div>
                    </div>
                </button>

                {/* Opção 1: Baixar Notas Fiscais */}
                <button
                    onClick={handleDownloadNotasFiscais}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-primaria)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'notas' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📎</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-primaria)' }}>
                                {isDownloading && downloadType === 'notas' ? 'Preparando...' : 'Baixar Notas Fiscais'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Exporta todas as notas fiscais em um arquivo ZIP
                            </p>
                        </div>
                    </div>
                </button>

                {/* Opção 2: Resumo da Obra */}
                <button
                    onClick={handleDownloadResumoObra}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-acento)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'resumo' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📄</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-acento)' }}>
                                {isDownloading && downloadType === 'resumo' ? 'Gerando...' : 'Resumo Completo da Obra'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                PDF com serviços, valores, pendências, orçamentos e gráficos
                            </p>
                        </div>
                    </div>
                </button>

                {/* Opção 3: Orçamentos */}
                <button
                    onClick={() => {
                        onClose(); // Fecha o modal de relatórios
                        // Abre o modal de orçamentos através do callback
                        if (window.abrirModalOrcamentos) {
                            window.abrirModalOrcamentos();
                        }
                    }}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid #17a2b8',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>💰</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: '#17a2b8' }}>
                                Orçamentos
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Visualize todos os orçamentos com status e anexos
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {error && (
                <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center', marginTop: '15px' }}>
                    {error}
                </p>
            )}

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
                <button onClick={onClose} className="cancel-btn" disabled={isDownloading}>
                    Fechar
                </button>
            </div>
        </Modal>
    );
};
// --- FIM DO MODAL DE RELATÓRIOS ---


// --- MODAL DE APROVAÇÃO DE SOLICITAÇÃO (SIMPLIFICADO) ---
const ModalAprovarOrcamento = ({ orcamento, onClose, onConfirmar }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAprovar = async () => {
        setIsSubmitting(true);
        try {
            await onConfirmar();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose} customWidth="450px">
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px', color: '#28a745' }}>
                    ✅ Aprovar Solicitação
                </h2>
                
                {/* Info da Solicitação */}
                <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    marginBottom: '25px',
                    border: '1px solid #e9ecef',
                    textAlign: 'left'
                }}>
                    <strong style={{ fontSize: '1.1em', display: 'block', marginBottom: '10px' }}>
                        {orcamento.descricao}
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#666' }}>
                        <span>💰 Valor: <strong style={{ color: '#28a745' }}>{formatCurrency(orcamento.valor)}</strong></span>
                        {orcamento.fornecedor && <span>🏢 Fornecedor: {orcamento.fornecedor}</span>}
                        {orcamento.tipo && <span>📦 Tipo: {orcamento.tipo}</span>}
                        {orcamento.servico_nome && <span>🔧 Serviço: {orcamento.servico_nome}</span>}
                        {orcamento.numero_parcelas > 1 && (
                            <span>📅 Parcelamento: {orcamento.numero_parcelas}x de {formatCurrency(orcamento.valor / orcamento.numero_parcelas)}</span>
                        )}
                        {orcamento.data_vencimento && (
                            <span>📆 Vencimento: {new Date(orcamento.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                    </div>
                </div>

                <p style={{ marginBottom: '20px', color: '#666' }}>
                    Ao aprovar, será criado automaticamente um <strong>pagamento futuro</strong> no cronograma financeiro.
                    {orcamento.servico_nome && (
                        <><br/><br/>O valor será somado ao orçamento do serviço <strong>"{orcamento.servico_nome}"</strong>.</>
                    )}
                </p>

                {/* Botões */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        className="cancel-btn"
                        style={{ flex: 1, padding: '14px' }}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAprovar}
                        className="submit-btn"
                        style={{ 
                            flex: 2, 
                            padding: '14px',
                            backgroundColor: '#28a745',
                            fontSize: '1.05em'
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳ Aprovando...' : '✅ Aprovar Compra'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- MODAL DE ORÇAMENTOS ---
const OrcamentosModal = ({ obraId, onClose, onSave }) => {
    const [orcamentos, setOrcamentos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);
    
    // Estado para modal de aprovação com escolha de serviço
    const [aprovandoOrcamento, setAprovandoOrcamento] = useState(null);
    
    // Estado para seleção múltipla
    const [selecionados, setSelecionados] = useState([]);
    const [aprovandoMultiplos, setAprovandoMultiplos] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [obraId]);

    const carregarDados = async () => {
        try {
            setIsLoading(true);
            const [orcRes, servRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/obras/${obraId}/orcamentos`),
                fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`)
            ]);
            
            if (!orcRes.ok || !servRes.ok) throw new Error('Erro ao carregar dados');
            
            const orcData = await orcRes.json();
            const servData = await servRes.json();
            
            setOrcamentos(Array.isArray(orcData) ? orcData : []);
            setServicos(Array.isArray(servData) ? servData : []);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAprovar = (orcamento) => {
        setAprovandoOrcamento(orcamento);
    };

    // Funções para seleção múltipla
    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) 
                ? prev.filter(x => x !== id) 
                : [...prev, id]
        );
    };

    const toggleSelecionarTodos = () => {
        const pendentes = orcamentos.filter(orc => orc.status === 'Pendente');
        if (selecionados.length === pendentes.length) {
            setSelecionados([]);
        } else {
            setSelecionados(pendentes.map(orc => orc.id));
        }
    };

    const handleAprovarSelecionados = async () => {
        if (selecionados.length === 0) {
            alert('Selecione pelo menos uma solicitação para aprovar.');
            return;
        }

        if (!window.confirm(`Confirma a aprovação de ${selecionados.length} solicitação(ões)?`)) {
            return;
        }

        setAprovandoMultiplos(true);
        let aprovados = 0;
        let erros = [];

        for (const id of selecionados) {
            try {
                const response = await fetchWithAuth(
                    `${API_URL}/orcamentos/${id}/aprovar`,
                    {
                        method: 'POST',
                        body: JSON.stringify({})
                    }
                );

                if (response.ok) {
                    aprovados++;
                } else {
                    const data = await response.json();
                    erros.push(`ID ${id}: ${data.erro || 'Erro desconhecido'}`);
                }
            } catch (err) {
                erros.push(`ID ${id}: ${err.message}`);
            }
        }

        setAprovandoMultiplos(false);
        setSelecionados([]);

        if (erros.length > 0) {
            alert(`✅ ${aprovados} aprovado(s)\n❌ ${erros.length} erro(s):\n${erros.join('\n')}`);
        } else {
            alert(`✅ ${aprovados} solicitação(ões) aprovada(s) com sucesso!`);
        }

        if (onSave) onSave();
        carregarDados();
    };

    const handleConfirmarAprovacao = async () => {
        try {
            console.log('Enviando aprovação para:', aprovandoOrcamento.id);

            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${aprovandoOrcamento.id}/aprovar`,
                {
                    method: 'POST',
                    body: JSON.stringify({})
                }
            );

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.erro || data.error || 'Erro ao aprovar solicitação');
            }

            alert(data.sucesso || '✅ Solicitação aprovada com sucesso!');
            setAprovandoOrcamento(null);
            if (onSave) onSave();
        } catch (err) {
            console.error('Erro ao aprovar:', err);
            alert(`Erro ao aprovar solicitação: ${err.message}`);
        }
    };

    const handleRejeitar = async (orcamentoId) => {
        if (!window.confirm('Confirma a rejeição deste orçamento?')) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${orcamentoId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Erro ao rejeitar solicitação');

            alert('✅ Solicitação rejeitada!');
            // OTIMIZAÇÃO: Removido carregarDados() para evitar requisições duplicadas
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // CORREÇÃO: Função para salvar novo orçamento
    const handleSaveOrcamento = async (formData) => {
        try {
            console.log("Salvando novo orçamento...");
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/orcamentos`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.erro || 'Erro ao salvar orçamento');
            }

            alert('✅ Solicitação enviada com sucesso!');
            setAddModalVisible(false);
            carregarDados(); // Recarrega a lista de orçamentos
            if (onSave) onSave(); // Notifica o Dashboard também
        } catch (err) {
            console.error("Erro ao salvar orçamento:", err);
            alert(`Erro ao salvar orçamento: ${err.message}`);
        }
    };

    // CORREÇÃO: Função para editar orçamento
    const handleEditOrcamento = async (orcamentoId, formData, newFiles) => {
        try {
            console.log("Salvando edição do orçamento:", orcamentoId);
            
            // 1. Atualizar dados do orçamento
            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${orcamentoId}`,
                {
                    method: 'PUT',
                    body: formData
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.erro || 'Erro ao salvar edição');
            }

            // 2. Upload de novos anexos (se houver)
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                const fileResponse = await fetchWithAuth(
                    `${API_URL}/orcamentos/${orcamentoId}/anexos`,
                    {
                        method: 'POST',
                        body: fileFormData
                    }
                );

                if (!fileResponse.ok) {
                    const error = await fileResponse.json();
                    throw new Error(error.erro || 'Erro ao enviar anexos');
                }
            }

            alert('✅ Solicitação atualizada com sucesso!');
            setEditingOrcamento(null);
            carregarDados(); // Recarrega a lista de orçamentos
            if (onSave) onSave(); // Notifica o Dashboard também
        } catch (err) {
            console.error("Erro ao salvar edição do orçamento:", err);
            alert(`Erro ao salvar edição: ${err.message}`);
        }
    };

    // Filtrar apenas orçamentos PENDENTES
    const orcamentosPendentes = orcamentos.filter(orc => orc.status === 'Pendente');
    const totalPendente = orcamentosPendentes.reduce((sum, orc) => sum + (orc.valor || 0), 0);

    if (isLoading) {
        return (
            <Modal onClose={onClose} customWidth="96%">
                <div style={{ maxHeight: '88vh', overflowY: 'auto' }}>
                    <h2>📋 Solicitações</h2>
                    <p style={{ textAlign: 'center', padding: '40px' }}>Carregando...</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose} customWidth="96%">
            <div style={{ maxHeight: '88vh', overflowY: 'auto' }}>
                <button onClick={onClose} className="close-modal-btn">×</button>
                <h2>📋 Solicitações Pendentes</h2>
                
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                }}>
                    <div>
                        <span style={{ fontSize: '1.1em', color: 'var(--cor-texto-secundario)' }}>
                            Total Pendente: 
                        </span>
                        <span style={{ 
                            fontSize: '1.5em', 
                            fontWeight: 'bold',
                            color: 'var(--cor-primaria)',
                            marginLeft: '10px'
                        }}>
                            {formatCurrency(totalPendente)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {selecionados.length > 0 && (
                            <button 
                                onClick={handleAprovarSelecionados}
                                disabled={aprovandoMultiplos}
                                className="acao-btn"
                                style={{ 
                                    backgroundColor: 'var(--cor-acento)', 
                                    color: 'white',
                                    opacity: aprovandoMultiplos ? 0.7 : 1
                                }}
                            >
                                {aprovandoMultiplos ? '⏳ Aprovando...' : `✓ Aprovar Selecionados (${selecionados.length})`}
                            </button>
                        )}
                        <button 
                            onClick={() => setAddModalVisible(true)}
                            className="acao-btn add-btn"
                            style={{ backgroundColor: 'var(--cor-info)' }}
                        >
                            + Nova Solicitação
                        </button>
                    </div>
                </div>

                {orcamentosPendentes.length > 0 ? (
                    <table className="tabela-pendencias">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox"
                                        checked={selecionados.length === orcamentosPendentes.length && orcamentosPendentes.length > 0}
                                        onChange={toggleSelecionarTodos}
                                        title="Selecionar todos"
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    />
                                </th>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Segmento</th>
                                <th>Serviço</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orcamentosPendentes.map(orc => (
                                <tr key={orc.id} style={{ 
                                    backgroundColor: selecionados.includes(orc.id) ? '#e8f5e9' : 'transparent'
                                }}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input 
                                            type="checkbox"
                                            checked={selecionados.includes(orc.id)}
                                            onChange={() => toggleSelecionado(orc.id)}
                                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                        />
                                    </td>
                                    <td
                                        onClick={() => setEditingOrcamento(orc)}
                                        style={{
                                            cursor: 'pointer',
                                            color: 'var(--cor-primaria)',
                                            fontWeight: '500',
                                            textDecoration: 'underline'
                                        }}
                                        title="Clique para editar"
                                    >
                                        {orc.descricao}
                                    </td>
                                    <td>{orc.fornecedor || 'N/A'}</td>
                                    <td>{orc.tipo}</td>
                                    <td>{orc.servico_nome || 'Geral'}</td>
                                    <td><strong>{formatCurrency(orc.valor)}</strong></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            {orc.anexos_count > 0 && (
                                                <button
                                                    onClick={() => setViewingAnexos(orc)}
                                                    className="acao-icon-btn"
                                                    title={`${orc.anexos_count} anexo(s)`}
                                                    style={{ fontSize: '1.3em', color: '#007bff' }}
                                                >
                                                    📎
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRejeitar(orc.id)}
                                                className="acao-btn"
                                                style={{ backgroundColor: 'var(--cor-vermelho)', color: 'white', padding: '5px 12px' }}
                                            >
                                                Rejeitar
                                            </button>
                                            <button
                                                onClick={() => handleAprovar(orc)}
                                                className="acao-btn"
                                                style={{ backgroundColor: 'var(--cor-acento)', color: 'white', padding: '5px 12px' }}
                                            >
                                                Aprovar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-secundario)' }}>
                        Nenhuma solicitação pendente.
                    </p>
                )}

                {/* Modal de Aprovação */}
                {aprovandoOrcamento && (
                    <ModalAprovarOrcamento
                        orcamento={aprovandoOrcamento}
                        onClose={() => setAprovandoOrcamento(null)}
                        onConfirmar={handleConfirmarAprovacao}
                    />
                )}

                {/* Aqui vão os outros modais (add, edit, anexos) se necessário */}
                {isAddModalVisible && (
                    <AddOrcamentoModal
                        obraId={obraId}
                        onClose={() => setAddModalVisible(false)}
                        onSave={handleSaveOrcamento}
                        servicos={servicos}
                    />
                )}

                {editingOrcamento && (
                    <EditOrcamentoModal
                        orcamento={editingOrcamento}
                        obraId={obraId}
                        onClose={() => setEditingOrcamento(null)}
                        onSave={handleEditOrcamento}
                        servicos={servicos}
                    />
                )}
            </div>
        </Modal>
    );
};
// --- FIM DO MODAL DE ORÇAMENTOS ---


// --- COMPONENTE DO DASHBOARD (Atualizado) ---
function Dashboard() {
    const { user, logout } = useAuth();
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddServicoModalVisible, setAddServicoModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingServico, setViewingServico] = useState(null);
    const [isAdminPanelVisible, setAdminPanelVisible] = useState(false);
    
    const [isExportModalVisible, setExportModalVisible] = useState(false);
    const [isRelatorioCronogramaVisible, setRelatorioCronogramaVisible] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [orcamentos, setOrcamentos] = useState([]);
    const [isAddOrcamentoModalVisible, setAddOrcamentoModalVisible] = useState(false);
    
    // NOVO: Estado para cronograma de obras (Gantt)
    const [cronogramaObras, setCronogramaObras] = useState([]);
    
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);
    
    // <--- MUDANÇA: Novo estado para o modal de pagamento -->
    const [payingItem, setPayingItem] = useState(null);
    
    const [isServicosCollapsed, setIsServicosCollapsed] = useState(false);
    const [editingServicoPrioridade, setEditingServicoPrioridade] = useState(null);
    const [filtroPendencias, setFiltroPendencias] = useState('');
    
    // <--- NOVO: Estados para Notas Fiscais -->
    const [notasFiscais, setNotasFiscais] = useState([]);
    const [uploadingNFFor, setUploadingNFFor] = useState(null);
    const isLoadingNotasFiscais = React.useRef(false); // Proteção contra múltiplas requisições
    
    // <--- NOVO: Estado para controlar meses expandidos/recolhidos -->
    const [mesesExpandidos, setMesesExpandidos] = useState({}); // Item que está recebendo upload
    
    // <--- NOVO: Estado para modal de relatórios -->
    const [isRelatoriosModalVisible, setRelatoriosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal de orçamentos -->
    const [isOrcamentosModalVisible, setOrcamentosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal do Cronograma Financeiro -->
    const [isCronogramaFinanceiroVisible, setCronogramaFinanceiroVisible] = useState(false);
    
    // MUDANÇA 2: Estado para modal do Diário de Obras
    const [isDiarioVisible, setDiarioVisible] = useState(false);
    
    // MUDANÇA 3: NOVO estado para modal de Inserir Pagamento
    const [isInserirPagamentoModalVisible, setInserirPagamentoModalVisible] = useState(false);
    
    // NOVO: Estado para modal do Caixa de Obra
    const [isCaixaObraVisible, setCaixaObraVisible] = useState(false);
    
    // NOVO: Estado para mostrar obras concluídas
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
    
    // === NOVO: Estados para Sidebar ===
    const [currentPage, setCurrentPage] = useState('obras');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // === NAVEGAÇÃO COM HISTÓRICO DO BROWSER ===
    // Função para navegar COM histórico do browser (botão voltar funciona)
    const navigateTo = (page, obraId = null) => {
        const state = { page, obraId };
        const url = obraId ? `?obra=${obraId}&page=${page}` : `?page=${page}`;
        window.history.pushState(state, '', url);
        setCurrentPage(page);
    };

    // Expor navigateTo globalmente para uso no Sidebar
    window.navigateTo = navigateTo;
    
    // Estado para controlar se a URL inicial já foi processada
    const [urlProcessada, setUrlProcessada] = useState(false);

    // Escutar botão voltar do navegador
    useEffect(() => {
        const handlePopState = (event) => {
            console.log('PopState event:', event.state);
            if (event.state) {
                setCurrentPage(event.state.page || 'obras');
                if (event.state.obraId) {
                    // fetchObraData será chamado pelo useEffect abaixo
                    const obraId = event.state.obraId;
                    setIsLoading(true);
                    fetchWithAuth(`${API_URL}/obras/${obraId}`)
                        .then(res => res.json())
                        .then(data => {
                            setObraSelecionada(data.obra || null);
                            setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                            const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                                ...serv,
                                pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                            }));
                            setServicos(servicosComPagamentosArray);
                            setSumarios(data.sumarios || null);
                            setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                            setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                        })
                        .catch(error => console.error('Erro popstate:', error))
                        .finally(() => setIsLoading(false));
                } else {
                    setObraSelecionada(null);
                }
            } else {
                // Se não tem estado, voltar para lista de obras
                setCurrentPage('obras');
                setObraSelecionada(null);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

const totalOrcamentosPendentes = useMemo(() => {
        // A variável 'orcamentos' já contém
        // apenas os orçamentos com status 'Pendente' vindos do backend.
        return (Array.isArray(orcamentos) ? orcamentos : [])
            .reduce((total, orc) => total + (orc.valor || 0), 0);
    }, [orcamentos]);

   const itemsAPagar = useMemo(() => {
    // <--- MUDANÇA: Filtros de 'A Pagar' e 'Pagos' atualizados -->
    return (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item =>
        (item.valor_total || 0) > (item.valor_pago || 0)
    )
},
[historicoUnificado]
);
    
    const itemsAPagarFiltrados = useMemo(() => {
        if (!filtroPendencias) {
            return itemsAPagar;
        }
        const lowerCaseFiltro = filtroPendencias.toLowerCase();
        return itemsAPagar.filter(item => 
            (item.descricao && item.descricao.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.fornecedor && item.fornecedor.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.tipo && item.tipo.toLowerCase().includes(lowerCaseFiltro))
        );
    }, [itemsAPagar, filtroPendencias]);

 // --- NOVO BLOCO DO CRONOGRAMA (LUGAR CORRETO) ---
    const cronogramaPagamentos = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparação de datas

        const data7Dias = new Date(hoje);
        data7Dias.setDate(hoje.getDate() + 7);

        const data30Dias = new Date(hoje);
        data30Dias.setDate(hoje.getDate() + 30);

        const totais = {
            atrasados: 0,
            hoje: 0,
            prox7dias: 0,
            prox30dias: 0,
            totalAPagar: 0
        };

        // Usa a variável 'itemsAPagar' que já foi definida ANTES
        (Array.isArray(itemsAPagar) ? itemsAPagar : []).forEach(item => {
            const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
            // Usa data_vencimento se existir, senão usa data como fallback
            const dataParaUsar = item.data_vencimento || item.data;
            const dataVencimento = new Date(dataParaUsar + 'T00:00:00'); 
            
            totais.totalAPagar += valorRestante;

            if (dataVencimento < hoje) {
                totais.atrasados += valorRestante;
            } else if (dataVencimento.getTime() === hoje.getTime()) {
                totais.hoje += valorRestante;
            } else if (dataVencimento <= data7Dias) {
                totais.prox7dias += valorRestante;
            } else if (dataVencimento <= data30Dias) {
                totais.prox30dias += valorRestante;
            }
        });

        return totais;
    }, [itemsAPagar]); // A dependência é 'itemsAPagar'
    // --- FIM DO NOVO BLOCO ---


    const itemsPagos = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => 
            (item.valor_total || 0) - (item.valor_pago || 0) < 0.01 // Totalmente pago
        ),
        [historicoUnificado]
    );
    
    // <--- NOVO: Função para agrupar pagamentos por mês -->
    const pagamentosPorMes = useMemo(() => {
        const grupos = {};
        
        itemsPagos.forEach(item => {
            const dataItem = new Date((item.data_vencimento || item.data) + 'T00:00:00');
            const mesAno = `${dataItem.getFullYear()}-${String(dataItem.getMonth() + 1).padStart(2, '0')}`;
            const mesAnoLabel = dataItem.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase()); // Capitalizar primeira letra
            
            if (!grupos[mesAno]) {
                grupos[mesAno] = {
                    label: mesAnoLabel,
                    items: [],
                    total: 0,
                    dataOrdem: dataItem // Para ordenação
                };
            }
            
            grupos[mesAno].items.push(item);
            grupos[mesAno].total += item.valor_pago || 0;
        });
        
        // Ordenar por data (mais recente primeiro)
        return Object.entries(grupos)
            .sort(([, a], [, b]) => b.dataOrdem - a.dataOrdem)
            .map(([mesAno, dados]) => ({ mesAno, ...dados }));
    }, [itemsPagos]);
    
    // <--- NOVO: Função para toggle de expandir/recolher mês -->
    const toggleMes = (mesAno) => {
        setMesesExpandidos(prev => ({
            ...prev,
            [mesAno]: !prev[mesAno]
        }));
    };


    // Efeito para buscar obras
    useEffect(() => {
        console.log("Buscando lista de obras...");
        const url = mostrarConcluidas 
            ? `${API_URL}/obras?mostrar_concluidas=true` 
            : `${API_URL}/obras`;
        fetchWithAuth(url)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => { console.log("Obras recebidas:", data); setObras(Array.isArray(data) ? data : []); })
            .catch(error => { console.error("Erro ao buscar obras:", error); setObras([]); });
    }, [mostrarConcluidas]); 
    
    // Callback para abrir modal de orçamentos
    useEffect(() => {
        window.abrirModalOrcamentos = () => {
            setOrcamentosModalVisible(true);
        };
        return () => {
            delete window.abrirModalOrcamentos;
        };
    }, []);

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        console.log(`Buscando dados da obra ID: ${obraId}`);
        fetchWithAuth(`${API_URL}/obras/${obraId}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                console.log("Dados da obra recebidos:", data);
                
                setObraSelecionada(data.obra || null);
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                    ...serv,
                    pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                }));
                setServicos(servicosComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                
                // NOVO: Buscar cronograma de obras para o Gantt
                fetchCronogramaObras(obraId);
                
                // <--- NOVO: Buscar notas fiscais (opcional) -->
                // CORREÇÃO: Tentar buscar mas não bloquear se falhar
                try {
                    fetchNotasFiscais(obraId);
                } catch (error) {
                    // Ignorar erro silenciosamente - notas fiscais são opcionais
                    console.log("Notas fiscais não disponíveis");
                }
            })
            .catch(error => { console.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); setOrcamentos([]); })
            .finally(() => setIsLoading(false));
    };
    
    // CORREÇÃO: Processar URL inicial ao montar o componente
    useEffect(() => {
        if (urlProcessada) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const obraFromUrl = urlParams.get('obra');
        
        console.log("[URL INIT] Parâmetros:", { page: pageFromUrl, obra: obraFromUrl });
        
        if (obraFromUrl) {
            const obraId = parseInt(obraFromUrl);
            if (!isNaN(obraId)) {
                console.log("[URL INIT] Carregando obra:", obraId);
                fetchObraData(obraId);
                setCurrentPage(pageFromUrl || 'home');
            }
        } else if (pageFromUrl) {
            setCurrentPage(pageFromUrl);
        }
        
        // Atualizar history state
        window.history.replaceState(
            { page: pageFromUrl || 'obras', obraId: obraFromUrl ? parseInt(obraFromUrl) : null },
            '',
            window.location.href
        );
        
        setUrlProcessada(true);
    }, [urlProcessada]);
    
    // NOVO: Função para buscar cronograma de obras (etapas para Gantt)
    const fetchCronogramaObras = async (obraId) => {
        try {
            // Buscar cronogramas da obra (CronogramaObra = serviços com cronograma)
            const response = await fetchWithAuth(`${API_URL}/cronograma/${obraId}`);
            if (!response.ok) {
                console.log("Erro ao buscar cronogramas:", response.status);
                setCronogramaObras([]);
                return;
            }
            
            const cronogramasData = await response.json();
            console.log("Cronogramas da obra (raw):", cronogramasData);
            
            if (!Array.isArray(cronogramasData) || cronogramasData.length === 0) {
                console.log("Nenhum cronograma encontrado");
                setCronogramaObras([]);
                return;
            }
            
            // Para cada cronograma, buscar as etapas
            const cronogramasComEtapas = await Promise.all(
                cronogramasData.map(async (cron) => {
                    try {
                        const etapasResp = await fetchWithAuth(`${API_URL}/cronograma/${cron.id}/etapas`);
                        let etapas = [];
                        if (etapasResp.ok) {
                            etapas = await etapasResp.json();
                        }
                        return {
                            servico_id: cron.servico_id,
                            servico_nome: cron.servico_nome || cron.nome || `Cronograma ${cron.id}`,
                            cronograma_id: cron.id,
                            etapas: Array.isArray(etapas) ? etapas : []
                        };
                    } catch (e) {
                        console.log(`Erro ao buscar etapas do cronograma ${cron.id}:`, e);
                        return {
                            servico_id: cron.servico_id,
                            servico_nome: cron.servico_nome || cron.nome || `Cronograma ${cron.id}`,
                            cronograma_id: cron.id,
                            etapas: []
                        };
                    }
                })
            );
            
            console.log("Cronogramas de obras carregados:", cronogramasComEtapas);
            setCronogramaObras(cronogramasComEtapas);
        } catch (error) {
            console.log("Erro ao buscar cronograma de obras:", error);
            setCronogramaObras([]);
        }
    };
    
    // <--- NOVO: Função para buscar notas fiscais -->
    const fetchNotasFiscais = (obraId) => {
        // Proteção contra múltiplas requisições simultâneas
        if (isLoadingNotasFiscais.current) {
            console.log("Já está carregando notas fiscais, ignorando requisição duplicada");
            return;
        }
        
        isLoadingNotasFiscais.current = true;
        
        // CORREÇÃO: Verificar se a rota existe antes de fazer a requisição
        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`)
            .then(res => {
                if (!res.ok) {
                    // Se for 404, significa que a rota não existe - ignorar silenciosamente
                    if (res.status === 404) {
                        console.log("Rota de notas fiscais não disponível (404) - ignorando");
                        throw new Error('NOT_FOUND');
                    }
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log("Notas fiscais recebidas:", data);
                setNotasFiscais(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                // CORREÇÃO: Não logar erro se for NOT_FOUND ou erro de rede
                if (error.message === 'NOT_FOUND') {
                    // Silencioso - rota não implementada ainda
                    setNotasFiscais([]);
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    // Erro de rede - não logar (evita spam no console)
                    console.warn("Notas fiscais: rota não disponível");
                    setNotasFiscais([]);
                } else {
                    // Outros erros - logar normalmente
                    console.error("Erro ao buscar notas fiscais:", error);
                    setNotasFiscais([]);
                }
            })
            .finally(() => {
                isLoadingNotasFiscais.current = false;
            });
    };
    
    // <--- NOVO: Helper para verificar se item tem nota fiscal -->
    const itemHasNotaFiscal = (item) => {
        // <-- CORREÇÃO: Usar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;
            
        return notasFiscais.some(nf => 
            nf.item_id === realItemId && nf.item_type === item.tipo_registro
        );
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => {
        // ... (código inalterado)
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, { method: 'POST', body: JSON.stringify({ nome, cliente }) })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => { setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); e.target.reset(); })
        .catch(error => console.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => console.error('Erro ao deletar obra:', error));
    };
    
    // NOVO: Função para marcar obra como concluída/reabrir
    const handleConcluirObra = (obraId, concluida) => {
        const acao = concluida ? 'reabrir' : 'concluir';
        if (!window.confirm(`Deseja ${acao} esta obra?`)) return;
        
        fetchWithAuth(`${API_URL}/obras/${obraId}/concluir`, { 
            method: 'PATCH',
            body: JSON.stringify({ concluida: !concluida })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then((data) => { 
            alert(data.sucesso);
            // Atualiza a lista de obras
            setObras(prevObras => prevObras.map(o => 
                o.id === obraId ? { ...o, concluida: !concluida } : o
            ).filter(o => mostrarConcluidas || !o.concluida));
        })
        .catch(error => { console.error('Erro ao concluir obra:', error); alert('Erro: ' + error.message); });
    };
    
    // <--- MUDANÇA: Esta função (marcar pago 100%) será chamada pelo modal de edição, não mais pelo botão -->
    const handleMarcarComoPago = (itemId) => {
        const isLancamento = String(itemId).startsWith('lanc-');
        const isServicoPag = String(itemId).startsWith('serv-pag-');
        const actualId = String(itemId).split('-').pop(); 

        let url = '';
        if (isLancamento) {
            url = `${API_URL}/lancamentos/${actualId}/pago`;
        } else if (isServicoPag) {
            url = `${API_URL}/servicos/pagamentos/${actualId}/status`;
        } else {
            return; 
        }

        console.log("Alternando status para:", itemId);
        fetchWithAuth(url, { method: 'PATCH' })
             .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
             .then(() => fetchObraData(obraSelecionada.id))
             .catch(error => console.error("Erro ao marcar como pago:", error));
    };

    const handleDeletarLancamento = (itemId) => {
         // ... (código inalterado)
         const isLancamento = String(itemId).startsWith('lanc-');
         const actualId = String(itemId).split('-').pop();
        if (isLancamento) {
            console.log("Deletando lançamento geral:", actualId);
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
                .then(() => { fetchObraData(obraSelecionada.id); })
                .catch(error => console.error('Erro ao deletar lançamento:', error));
        }
    };
    
    const handleEditLancamento = (item) => {
        if (item.tipo_registro === 'lancamento') { setEditingLancamento(item); }
    };
    
    // <--- MUDANÇA: Atualizado para enviar valor_total e valor_pago -->
    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { 
            ...updatedLancamento, 
            valor_total: parseFloat(updatedLancamento.valor_total) || 0, // <-- MUDANÇA
            valor_pago: parseFloat(updatedLancamento.valor_pago) || 0, // <-- MUDANÇA
            servico_id: updatedLancamento.servico_id || null 
        };
        // Remove 'valor' se existir por acidente
        delete dataToSend.valor;
        
        fetchWithAuth(`${API_URL}/lancamentos/${updatedLancamento.lancamento_id}`, { 
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição:", error));
    };
    
    // <--- MUDANÇA: handleSaveLancamento (o 'valor' do formulário é o 'valor_total') -->
    const handleSaveLancamento = (lancamentoData) => {
        console.log("Salvando novo lançamento:", lancamentoData);
        // O formulário envia 'valor', mas o backend espera 'valor'
        // A lógica do backend já converte 'valor' para 'valor_total' e 'valor_pago'
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar lançamento:", error));
    };
    
    // MUDANÇA 3: NOVO handler para Inserir Pagamento
    const handleInserirPagamento = async (pagamentoData) => {
        console.log("Inserindo novo pagamento:", pagamentoData);
        
        const response = await fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/inserir-pagamento`, {
            method: 'POST',
            body: JSON.stringify(pagamentoData)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.erro || 'Erro ao inserir pagamento');
        }
        
        await response.json();
        fetchObraData(obraSelecionada.id); // Atualiza dados em background
        // Não mostra alert - o modal cuida do toast
        // Não fecha modal - isso é controlado pelo callback onSave
    };

    const handleSaveServico = (servicoData) => {
        // ... (código inalterado)
        console.log("Salvando novo serviço:", servicoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/servicos`, {
            method: 'POST',
            body: JSON.stringify(servicoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddServicoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar serviço:", error));
    };

    const handleSaveEditServico = (updatedServico) => {
        // ... (código inalterado)
        const dataToSend = {
            ...updatedServico,
            valor_global_mao_de_obra: parseFloat(updatedServico.valor_global_mao_de_obra) || 0,
            valor_global_material: parseFloat(updatedServico.valor_global_material) || 0, 
            responsavel: updatedServico.responsavel || null,
            pix: updatedServico.pix || null
        };
        fetchWithAuth(`${API_URL}/servicos/${updatedServico.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setViewingServico(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição do serviço:", error));
    };

    // --- Handlers de Orçamento (inalterados) ---
    const handleSaveOrcamento = (formData) => {
        // ... (código inalterado)
        console.log("Salvando novo orçamento...");
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/orcamentos`, {
            method: 'POST',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setAddOrcamentoModalVisible(false);
            fetchObraData(obraSelecionada.id); 
        })
        .catch(error => {
            console.error("Erro ao salvar orçamento:", error);
            alert(`Erro ao salvar orçamento: ${error.message}\n\nVerifique o console para mais detalhes (F12).`);
        });
    };
    const handleSaveEditOrcamento = (orcamentoId, formData, newFiles) => {
        // ... (código inalterado)
        console.log("Salvando edição do orçamento:", orcamentoId);
        
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, {
            method: 'PUT',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                return fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/anexos`, {
                    method: 'POST',
                    body: fileFormData
                });
            }
            
            return Promise.resolve();
            
        }).then(fileRes => {
            if (fileRes && !fileRes.ok) {
                 return fileRes.json().then(err => { throw new Error(err.erro || 'Erro ao enviar anexos') });
            }
            
            setEditingOrcamento(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            console.error("Erro ao salvar edição do orçamento:", error);
            alert(`Erro ao salvar edição: ${error.message}`);
        });
    };
    const handleAprovarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/aprovar`, { method: 'POST' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao aprovar orçamento:", error));
    };
    const handleRejeitarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao rejeitar solicitação:", error));
    };

    // Handler do PDF da Obra
    const handleExportObraPDF = () => {
        // ... (código inalterado)
        if (!obraSelecionada) return;
        
        setIsExportingPDF(true);
        const url = `${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o PDF da obra.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                setIsExportingPDF(false);
            })
            .catch(err => {
                console.error("Erro ao gerar PDF da obra:", err);
                alert("Não foi possível gerar o PDF. Verifique o console para mais detalhes.");
                setIsExportingPDF(false);
            });
    };

    // Handler de Prioridade
    const handleSaveServicoPrioridade = (novaPrioridade) => {
        // ... (código inalterado)
        if (!editingServicoPrioridade) return;

        const pagamentoId = editingServicoPrioridade.pagamento_id;
        
        fetchWithAuth(`${API_URL}/servicos/pagamentos/${pagamentoId}/prioridade`, {
            method: 'PATCH',
            body: JSON.stringify({ prioridade: novaPrioridade })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setEditingServicoPrioridade(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            console.error("Erro ao salvar prioridade do serviço:", error);
            alert(`Erro ao salvar prioridade: ${error.message}`);
        });
    };

    // <--- MUDANÇA: NOVA FUNÇÃO HANDLER PARA PAGAMENTO PARCIAL ---
    const handleSavePartialPayment = (valor_a_pagar) => {
        if (!payingItem) return;

        const { tipo_registro, id } = payingItem;
        // O ID vem como "lanc-123" ou "serv-pag-456"
        const item_type = tipo_registro === 'lancamento' ? 'lancamento' : 'pagamento_servico';
        const item_id = id.split('-').pop();

        console.log(`Registrando pagamento de ${valor_a_pagar} para ${item_type} ${item_id}`);

        fetchWithAuth(`${API_URL}/pagamentos/${item_type}/${item_id}/pagar`, {
            method: 'PATCH',
            body: JSON.stringify({ valor_a_pagar })
        })
        .then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') }); }
            return res.json();
        })
        .then(() => {
            setPayingItem(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            console.error("Erro ao registrar pagamento parcial:", error);
            // Mostra o erro de validação (ex: "valor maior que o restante")
            // Precisamos garantir que o modal esteja aberto para mostrar o erro
            if (payingItem) {
                alert(`Erro: ${error.message}`);
            }
        });
    };
    // <--- FIM DA NOVA FUNÇÃO ---


    // --- RENDERIZAÇÃO ---
    
    // Função para selecionar obra e ir para cronograma financeiro
    const handleSelectObra = (obraId) => {
        fetchObraData(obraId);
        // Usar navigateTo para atualizar histórico do browser
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('home', obraId);
        } else {
            setCurrentPage('home');
        }
    };

    // === TELA INICIAL (SEM OBRA SELECIONADA) - SEM SIDEBAR ===
    if (!obraSelecionada) {
        // 🆕 Se estiver na página de BI, mostrar dashboard
        if (currentPage === 'bi') {
            return (
                <BiDashboard
                    apiUrl={API_URL}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setCurrentPage('obras')}
                />
            );
        }
        
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                {isRelatorioCronogramaVisible && <ModalRelatorioCronograma 
                    obras={obras}
                    onClose={() => setRelatorioCronogramaVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
                        {/* 🆕 Botão BI Dashboard */}
                        <button 
                            onClick={() => setCurrentPage('bi')} 
                            className="export-btn" 
                            style={{marginRight: '10px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6'}}
                        >
                            📈 BI Dashboard
                        </button>
                        
                        <button 
                            onClick={() => setRelatorioCronogramaVisible(true)} 
                            className="export-btn pdf" 
                            style={{marginRight: '10px'}}
                        >
                            📊 Relatório Financeiro
                        </button>
                        
                        {user.role === 'master' && (
                            <button onClick={() => setAdminPanelVisible(true)} className="submit-btn" style={{marginRight: '10px'}}>
                                Gerenciar Usuários
                            </button>
                        )}
                        <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                    </div>
                </header>

                {(user.role === 'administrador' || user.role === 'master') && (
                    <div className="card-full">
                        <h3>Cadastrar Nova Obra</h3>
                        <form onSubmit={handleAddObra} className="form-add-obra">
                            <input type="text" name="nome" placeholder="Nome da Obra" required />
                            <input type="text" name="cliente" placeholder="Nome do Cliente" />
                            <button type="submit" className="submit-btn">Adicionar Obra</button>
                        </form>
                    </div>
                )}
                
                {/* Toggle para mostrar obras concluídas */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginBottom: '15px',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--cor-texto-secundario)',
                        fontSize: '0.9em'
                    }}>
                        <input 
                            type="checkbox"
                            checked={mostrarConcluidas}
                            onChange={(e) => setMostrarConcluidas(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Mostrar obras concluídas
                    </label>
                </div>
                
                <div className="lista-obras">
                    {obras.length > 0 ? (
                        obras.map(obra => (
                            <div 
                                key={obra.id} 
                                className="card-obra"
                                style={{
                                    opacity: obra.concluida ? 0.7 : 1,
                                    border: obra.concluida ? '2px solid #22c55e' : undefined,
                                    position: 'relative'
                                }}
                            >
                                {obra.concluida && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        backgroundColor: '#22c55e',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75em',
                                        fontWeight: 'bold'
                                    }}>
                                        ✓ CONCLUÍDA
                                    </div>
                                )}
                                
                                {(user.role === 'administrador' || user.role === 'master') && (
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleConcluirObra(obra.id, obra.concluida); }}
                                            className="card-obra-action-btn"
                                            title={obra.concluida ? 'Reabrir Obra' : 'Marcar como Concluída'}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.1em',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                opacity: 0.7
                                            }}
                                        >
                                            {obra.concluida ? '🔄' : '✅'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeletarObra(obra.id, obra.nome); }}
                                            className="card-obra-delete-btn"
                                            title="Excluir Obra"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                                
                                <div onClick={() => handleSelectObra(obra.id)} className="card-obra-content">
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p>
                                    
                                    <div className="obra-kpi-summary">
                                        <div>
                                            <span>Orçamento Total</span>
                                            <strong style={{ color: 'var(--cor-vermelho)' }}>
                                                {formatCurrency(obra.orcamento_total || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Valores Pagos</span>
                                            <strong style={{ color: 'var(--cor-primaria)' }}>
                                                {formatCurrency(obra.total_pago || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Liberado (Fila)</span>
                                            <strong style={{ color: 'var(--cor-acento)' }}>
                                                {formatCurrency(obra.liberado_pagamento || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Despesas Extras</span>
                                            <strong style={{ color: '#9333ea' }}>
                                                {formatCurrency(obra.despesas_extras || 0)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma obra cadastrada ou você ainda não tem permissão para ver nenhuma.</p>
                    )}
                </div>
            </div>
        );
    }

    // === TELA DE LOADING ===
    if (isLoading || !sumarios) {
        return <div className="loading-screen">Carregando dados da obra...</div>;
    }

    // === LAYOUT COM NAVEGAÇÃO WINDOWS (OBRA SELECIONADA) ===
    return (
        <>
            <WindowsNavStyles />
            <div className="app-layout-windows">
                {/* Navegação Windows */}
                <WindowsNavBar 
                    user={user}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    obraSelecionada={obraSelecionada}
                    setObraSelecionada={setObraSelecionada}
                    obras={obras}
                    onLogout={logout}
                />
                
                {/* Conteúdo Principal */}
                <main className="main-content-windows">

                    {/* === PÁGINA: HOME (Dashboard + Quadro Informativo) === */}
                    {currentPage === 'home' && (
                        <div className="home-page-container">
                            {/* Header com Título + Cards de Resumo */}
                           {/* Header com Título + Cards de Resumo */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                background: '#fff',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                {/* Título */}
                                <h1 style={{ 
                                    margin: 0,
                                    fontSize: '1.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#1e293b'
                                }}>
                                    🏠 Início - {obraSelecionada.nome}
                                </h1>

                                {/* Cards de Resumo - Usando valores do backend (sumarios) */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #ef4444',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Orçamento Total</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444' }}>
                                            {formatCurrency(sumarios?.orcamento_total || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #3b82f6',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Valores Pagos</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#3b82f6' }}>
                                            {formatCurrency(sumarios?.valores_pagos || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #22c55e',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Liberado (Fila)</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e' }}>
                                            {formatCurrency(sumarios?.liberado_pagamento || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #a855f7',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Despesas Extras</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#a855f7' }}>
                                            {formatCurrency(sumarios?.despesas_extras || 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Dashboard com Gráficos */}
                            <DashboardObra 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                servicos={servicos}
                                lancamentos={lancamentos}
                                cronograma={cronogramaObras}
                            />
                            
                            {/* Quadro de Etapas e Serviços */}
                            <EtapasServicosCard 
                                servicos={servicos}
                                onViewServico={setViewingServico}
                                onAddServico={() => setAddServicoModalVisible(true)}
                                onNavigateToCronograma={() => setCurrentPage('cronograma-obra')}
                            />
                            
                            {/* Cronograma Financeiro Simplificado */}
                            <CronogramaFinanceiro 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                onClose={() => {
                                    setObraSelecionada(null);
                                    setCurrentPage('obras');
                                }}
                                embedded={true}
                                simplified={true}
                            />
                            
                            {/* Histórico de Pagamentos */}
                            <HistoricoPagamentosCard 
                                itemsPagos={itemsPagos}
                                itemsAPagar={itemsAPagar}
                                user={user}
                                fetchObraData={fetchObraData}
                                obraId={obraSelecionada.id}
                            />
                        </div>
                    )}

                    {/* === PÁGINA: CRONOGRAMA DE OBRAS (com EVM e Etapas) === */}
                    {currentPage === 'cronograma-obra' && (
                        <CronogramaObra 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: ORÇAMENTO DE ENGENHARIA === */}
                    {currentPage === 'orcamento-eng' && (
                        <OrcamentoEngenharia 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            apiUrl={API_URL}
                            onClose={() => setCurrentPage('home')}
                        />
                    )}

                    {/* === PÁGINA: CRONOGRAMA FINANCEIRO (Completo) === */}
                    {currentPage === 'financeiro' && (
                        <CronogramaFinanceiro 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => {
                                setObraSelecionada(null);
                                setCurrentPage('obras');
                            }}
                            embedded={true}
                            simplified={false}
                        />
                    )}

                    {/* === PÁGINA: INSERIR PAGAMENTO === */}
                    {currentPage === 'pagamento' && (
                        <InserirPagamentoModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            onSave={async (formData, salvarENovo = false) => {
                                await handleInserirPagamento(formData);
                                if (!salvarENovo) {
                                    setCurrentPage('home');
                                }
                            }}
                            servicos={servicos}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: RELATÓRIOS === */}
                    {currentPage === 'relatorios' && (
                        <RelatoriosModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: ORÇAMENTOS === */}
                    {currentPage === 'orcamentos' && (
                        <OrcamentosModal
                            obraId={obraSelecionada.id}
                            onClose={() => setCurrentPage('home')}
                            onSave={() => fetchObraData(obraSelecionada.id)}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: DIÁRIO DE OBRAS === */}
                    {currentPage === 'diario' && (
                        <DiarioObras 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: CAIXA DE OBRA === */}
                    {currentPage === 'caixa' && (
                        <CaixaObraModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: AGENDA DE EVENTOS === */}
                    {currentPage === 'agenda' && (
                        <AgendaDemandas
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            apiUrl={API_URL}
                        />
                    )}

                    {/* === PÁGINA: GESTÃO DE BOLETOS === */}
                    {currentPage === 'boletos' && (
                        <GestaoBoletos
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onUpdate={() => fetchObraData(obraSelecionada.id)}
                        />
                    )}

                    {/* === PÁGINA: GERENCIAR USUÁRIOS === */}
                    {currentPage === 'usuarios' && (
                        <AdminPanelModal 
                            allObras={obras}
                            onClose={() => setCurrentPage('home')} 
                            embedded={true}
                        />
                    )}

                    {/* Modais que aparecem por cima */}
                    {viewingServico && (
                        <ServicoDetailsModal
                            servico={viewingServico}
                            onClose={() => setViewingServico(null)}
                            onSave={handleSaveEditServico}
                            fetchObraData={fetchObraData}
                            obraId={obraSelecionada.id}
                        />
                    )}

                    {payingItem && (
                        <PagamentoModal
                            item={payingItem}
                            onClose={() => setPayingItem(null)}
                            onSave={handleSavePartialPayment}
                        />
                    )}

                    {editingServicoPrioridade && (
                        <PrioridadeModal
                            currentValue={editingServicoPrioridade.prioridade}
                            onClose={() => setEditingServicoPrioridade(null)}
                            onSave={handleSaveServicoPrioridade}
                        />
                    )}
                    
                    {editingLancamento && <EditLancamentoModal 
                        lancamento={editingLancamento} 
                        onClose={() => setEditingLancamento(null)} 
                        onSave={handleSaveEdit}
                    />}

                    {isAddServicoModalVisible && <AddServicoModal 
                        onClose={() => setAddServicoModalVisible(false)} 
                        onSave={handleSaveServico} 
                    />}

                    {isAddLancamentoModalVisible && <AddLancamentoModal 
                        onClose={() => setAddLancamentoModalVisible(false)} 
                        onSave={handleSaveLancamento} 
                    />}
                </main>

                {/* Barra de Status */}
                <div className="windows-status-bar">
                    <div className="status-bar-left">
                        <span className="status-bar-item">📍 {obraSelecionada.nome}</span>
                        <span className="status-bar-item">•</span>
                        <span className="status-bar-item">Página: {currentPage}</span>
                    </div>
                    <div className="status-bar-right">
                        <span className="status-bar-item">👤 {user.nome} ({user.role === 'master' ? 'Master' : user.role === 'administrador' ? 'Admin' : 'Operador'})</span>
                        <span className="status-bar-item">•</span>
                        <span className="status-bar-item">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            {/* Estilos adicionais */}
            <style>{`
                .page-top-header {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                    padding: 0 10px;
                }
                
                .page-top-header .submit-btn {
                    padding: 10px 20px;
                    font-size: 14px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.3);
                }
                
                @media (max-width: 768px) {
                    .page-top-header {
                        margin-top: 10px;
                    }
                }
            `}</style>
        </>
    );
}

// ===================================
// COMPONENTE CRONOGRAMA FINANCEIRO
// ===================================

// Modal para Cadastrar Pagamento Futuro (Único)
const CadastrarPagamentoFuturoModal = ({ onClose, onSave, obraId }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        data_vencimento: getTodayString(),
        fornecedor: '',
        pix: '',
        observacoes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>💰 Cadastrar Pagamento Futuro</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Valor:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Data de Vencimento:
                    <input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Chave PIX:
                    <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Cadastrar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};

// Modal para Editar Pagamento Futuro
const EditarPagamentoFuturoModal = ({ onClose, onSave, pagamento }) => {
    const [formData, setFormData] = useState({
        descricao: pagamento.descricao || '',
        valor: pagamento.valor || '',
        data_vencimento: pagamento.data_vencimento || getTodayString(),
        fornecedor: pagamento.fornecedor || '',
        pix: pagamento.pix || '',
        observacoes: pagamento.observacoes || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>✏️ Editar Pagamento Futuro</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Valor:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Data de Vencimento:
                    <input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Chave PIX:
                    <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Salvar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};


// ===== COMPONENTE: GESTÃO DE BOLETOS =====
const GestaoBoletos = ({ obraId, obraNome, onUpdate }) => {
    const [boletos, setBoletos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos'); // todos, Pendente, Pago, Vencido
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalPreview, setModalPreview] = useState(null);
    const [resumo, setResumo] = useState(null);
    
    // Buscar boletos
    const fetchBoletos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = filtroStatus === 'todos' 
                ? `${API_URL}/obras/${obraId}/boletos`
                : `${API_URL}/obras/${obraId}/boletos?status=${filtroStatus}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setBoletos(data);
            }
        } catch (error) {
            console.error('Erro ao buscar boletos:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Buscar resumo
    const fetchResumo = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos/resumo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setResumo(data);
            }
        } catch (error) {
            console.error('Erro ao buscar resumo:', error);
        }
    };
    
    // Verificar alertas
    const verificarAlertas = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/boletos/verificar-alertas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Erro ao verificar alertas:', error);
        }
    };
    
    useEffect(() => {
        fetchBoletos();
        fetchResumo();
        verificarAlertas();
    }, [obraId, filtroStatus]);
    
    // Marcar como pago
    const marcarPago = async (boletoId) => {
        if (!window.confirm('Confirma que este boleto foi pago?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos/${boletoId}/pagar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data_pagamento: new Date().toISOString().split('T')[0] })
            });
            
            if (response.ok) {
                fetchBoletos();
                fetchResumo();
                if (onUpdate) onUpdate(); // Atualizar tela principal
                alert('✅ Boleto marcado como pago!');
            }
        } catch (error) {
            console.error('Erro ao marcar como pago:', error);
            alert('Erro ao marcar como pago');
        }
    };
    
    // Deletar boleto
    const deletarBoleto = async (boletoId) => {
        if (!window.confirm('Tem certeza que deseja excluir este boleto?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos/${boletoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                fetchBoletos();
                fetchResumo();
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro ao excluir boleto');
        }
    };
    
    // Copiar código de barras
    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        alert('Código de barras copiado!');
    };
    
    // Ver preview do PDF
    const verPreview = async (boletoId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos/${boletoId}/arquivo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setModalPreview(data);
            } else {
                alert('Boleto não possui arquivo anexado');
            }
        } catch (error) {
            console.error('Erro ao buscar arquivo:', error);
        }
    };
    
    // Agrupar boletos por urgência
    const boletosVencidos = boletos.filter(b => b.status === 'Vencido' || (b.status === 'Pendente' && b.dias_para_vencer < 0));
    const boletosUrgentes = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer >= 0 && b.dias_para_vencer <= 3);
    const boletosProximos = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer > 3 && b.dias_para_vencer <= 7);
    const boletosNormais = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer > 7);
    const boletosPagos = boletos.filter(b => b.status === 'Pago');
    
    // Renderizar card de boleto
    const renderBoletoCard = (boleto, urgencia = 'normal') => {
        const cores = {
            vencido: { bg: '#ffebee', border: '#ef5350', badge: '#d32f2f' },
            urgente: { bg: '#fff3e0', border: '#ff9800', badge: '#f57c00' },
            proximo: { bg: '#fffde7', border: '#ffc107', badge: '#ffa000' },
            normal: { bg: '#f5f5f5', border: '#e0e0e0', badge: '#757575' },
            pago: { bg: '#e8f5e9', border: '#4caf50', badge: '#388e3c' }
        };
        const cor = cores[urgencia];
        
        return (
            <div key={boleto.id} style={{
                background: cor.bg,
                border: `2px solid ${cor.border}`,
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                            🏢 {boleto.descricao}
                        </h4>
                        {boleto.beneficiario && (
                            <span style={{ fontSize: '0.85em', color: '#666' }}>
                                Beneficiário: {boleto.beneficiario}
                            </span>
                        )}
                        {boleto.servico_nome && (
                            <div style={{ 
                                fontSize: '0.8em', 
                                color: '#1976d2', 
                                marginTop: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                🔗 Vinculado: <strong>{boleto.servico_nome}</strong>
                            </div>
                        )}
                    </div>
                    <span style={{
                        background: cor.badge,
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        fontWeight: 'bold'
                    }}>
                        {boleto.status === 'Pago' ? '✅ Pago' : 
                         boleto.dias_para_vencer < 0 ? `Vencido há ${Math.abs(boleto.dias_para_vencer)}d` :
                         boleto.dias_para_vencer === 0 ? '🚨 Vence HOJE' :
                         `${boleto.dias_para_vencer}d para vencer`}
                    </span>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ fontSize: '0.8em', color: '#666' }}>Vencimento</span>
                        <div style={{ fontWeight: 'bold' }}>
                            {new Date(boleto.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8em', color: '#666' }}>Valor</span>
                        <div style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.1em' }}>
                            {formatCurrency(boleto.valor)}
                        </div>
                    </div>
                    {boleto.data_pagamento && (
                        <div>
                            <span style={{ fontSize: '0.8em', color: '#666' }}>Pago em</span>
                            <div style={{ fontWeight: 'bold', color: '#388e3c' }}>
                                {new Date(boleto.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    )}
                </div>
                
                {boleto.codigo_barras && (
                    <div style={{
                        background: 'white',
                        padding: '10px',
                        borderRadius: '5px',
                        marginBottom: '10px',
                        fontFamily: 'monospace',
                        fontSize: '0.9em',
                        wordBreak: 'break-all'
                    }}>
                        <span style={{ fontSize: '0.8em', color: '#666', display: 'block', marginBottom: '5px' }}>
                            Código de Barras:
                        </span>
                        {boleto.codigo_barras}
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {boleto.codigo_barras && (
                        <button
                            onClick={() => copiarCodigo(boleto.codigo_barras)}
                            style={{
                                padding: '8px 15px',
                                background: '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.85em'
                            }}
                        >
                            📋 Copiar Código
                        </button>
                    )}
                    
                    {boleto.tem_pdf && (
                        <button
                            onClick={() => verPreview(boleto.id)}
                            style={{
                                padding: '8px 15px',
                                background: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.85em'
                            }}
                        >
                            👁️ Ver PDF
                        </button>
                    )}
                    
                    {boleto.status !== 'Pago' && (
                        <button
                            onClick={() => marcarPago(boleto.id)}
                            style={{
                                padding: '8px 15px',
                                background: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.85em'
                            }}
                        >
                            ✅ Marcar Pago
                        </button>
                    )}
                    
                    <button
                        onClick={() => deletarBoleto(boleto.id)}
                        style={{
                            padding: '8px 15px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                        }}
                    >
                        🗑️
                    </button>
                </div>
            </div>
        );
    };
    
    return (
        <div className="gestao-boletos">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <h2 style={{ margin: 0 }}>📄 Gestão de Boletos</h2>
                <button
                    onClick={() => setModalCadastro(true)}
                    style={{
                        padding: '10px 20px',
                        background: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    + Novo Boleto
                </button>
            </div>
            
            {/* Resumo */}
            {resumo && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <div style={{ background: '#ffebee', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85em', color: '#c62828' }}>Vencidos</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#d32f2f' }}>
                            {formatCurrency(resumo.total_vencido)}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>{resumo.quantidade_vencido} boletos</div>
                    </div>
                    
                    <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85em', color: '#e65100' }}>Pendentes</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#f57c00' }}>
                            {formatCurrency(resumo.total_pendente)}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>{resumo.quantidade_pendente} boletos</div>
                    </div>
                    
                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85em', color: '#2e7d32' }}>Pagos</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#388e3c' }}>
                            {formatCurrency(resumo.total_pago)}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>{resumo.quantidade_pago} boletos</div>
                    </div>
                </div>
            )}
            
            {/* Filtros */}
            <div style={{ marginBottom: '20px' }}>
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    style={{
                        padding: '10px 15px',
                        borderRadius: '8px',
                        border: '1px solid #ccc',
                        fontSize: '1em'
                    }}
                >
                    <option value="todos">Todos os boletos</option>
                    <option value="Pendente">Pendentes</option>
                    <option value="Vencido">Vencidos</option>
                    <option value="Pago">Pagos</option>
                </select>
            </div>
            
            {/* Lista de Boletos */}
            {loading ? (
                <p>Carregando boletos...</p>
            ) : boletos.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: '#f5f5f5',
                    borderRadius: '10px'
                }}>
                    <p style={{ fontSize: '1.1em', color: '#666' }}>
                        Nenhum boleto cadastrado
                    </p>
                    <button
                        onClick={() => setModalCadastro(true)}
                        style={{
                            padding: '10px 20px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        + Cadastrar primeiro boleto
                    </button>
                </div>
            ) : (
                <>
                    {/* Vencidos */}
                    {boletosVencidos.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#d32f2f', marginBottom: '10px' }}>
                                ❌ VENCIDOS ({boletosVencidos.length})
                            </h3>
                            {boletosVencidos.map(b => renderBoletoCard(b, 'vencido'))}
                        </div>
                    )}
                    
                    {/* Urgentes (≤3 dias) */}
                    {boletosUrgentes.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#f57c00', marginBottom: '10px' }}>
                                🚨 URGENTE - Vence em até 3 dias ({boletosUrgentes.length})
                            </h3>
                            {boletosUrgentes.map(b => renderBoletoCard(b, 'urgente'))}
                        </div>
                    )}
                    
                    {/* Próximos (4-7 dias) */}
                    {boletosProximos.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#ffa000', marginBottom: '10px' }}>
                                ⚠️ Vence em até 7 dias ({boletosProximos.length})
                            </h3>
                            {boletosProximos.map(b => renderBoletoCard(b, 'proximo'))}
                        </div>
                    )}
                    
                    {/* Normais (>7 dias) */}
                    {boletosNormais.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#666', marginBottom: '10px' }}>
                                📄 Próximos vencimentos ({boletosNormais.length})
                            </h3>
                            {boletosNormais.map(b => renderBoletoCard(b, 'normal'))}
                        </div>
                    )}
                    
                    {/* Pagos */}
                    {boletosPagos.length > 0 && filtroStatus === 'todos' && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: '#388e3c', marginBottom: '10px' }}>
                                ✅ Pagos ({boletosPagos.length})
                            </h3>
                            {boletosPagos.map(b => renderBoletoCard(b, 'pago'))}
                        </div>
                    )}
                </>
            )}
            
            {/* Modal de Cadastro */}
            {modalCadastro && (
                <CadastrarBoletoModal
                    obraId={obraId}
                    onClose={() => setModalCadastro(false)}
                    onSave={() => {
                        setModalCadastro(false);
                        fetchBoletos();
                        fetchResumo();
                        if (onUpdate) onUpdate(); // Atualizar tela principal
                    }}
                />
            )}
            
            {/* Modal de Preview do PDF */}
            {modalPreview && (
                <Modal onClose={() => setModalPreview(null)}>
                    <h2>📄 {modalPreview.arquivo_nome || 'Boleto'}</h2>
                    <div style={{ height: '70vh', marginTop: '15px', position: 'relative' }}>
                        {/* Usar object em vez de iframe para evitar disparo de impressão */}
                        <object
                            data={`data:application/pdf;base64,${modalPreview.arquivo_base64}#toolbar=1&navpanes=0&scrollbar=1`}
                            type="application/pdf"
                            style={{ width: '100%', height: '100%', border: '1px solid #ddd', borderRadius: '5px' }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                height: '100%',
                                background: '#f5f5f5',
                                borderRadius: '5px'
                            }}>
                                <p>Seu navegador não suporta visualização de PDF.</p>
                                <a 
                                    href={`data:application/pdf;base64,${modalPreview.arquivo_base64}`}
                                    download={modalPreview.arquivo_nome || 'boleto.pdf'}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#1976d2',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '5px',
                                        marginTop: '10px'
                                    }}
                                >
                                    📥 Baixar PDF
                                </a>
                            </div>
                        </object>
                    </div>
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <a 
                            href={`data:application/pdf;base64,${modalPreview.arquivo_base64}`}
                            download={modalPreview.arquivo_nome || 'boleto.pdf'}
                            style={{
                                padding: '10px 20px',
                                background: '#4caf50',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            📥 Baixar PDF
                        </a>
                        <button
                            onClick={() => setModalPreview(null)}
                            style={{
                                padding: '10px 20px',
                                background: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Modal para Cadastrar Boleto com Upload de PDF
const CadastrarBoletoModal = ({ obraId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        beneficiario: '',
        valor: '',
        data_vencimento: getTodayString(),
        codigo_barras: '',
        vinculado_servico_id: ''  // Serviço vinculado
    });
    const [arquivo, setArquivo] = useState(null);
    const [arquivoBase64, setArquivoBase64] = useState(null);
    const [extraindo, setExtraindo] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [multiplosboletos, setMultiplosBoletos] = useState(null); // Lista de boletos encontrados
    const [salvandoTodos, setSalvandoTodos] = useState(false);
    const [servicos, setServicos] = useState([]);  // Lista de serviços da obra
    
    // Carregar serviços da obra
    useEffect(() => {
        const fetchServicos = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/obras/${obraId}/servicos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setServicos(data || []);
                }
            } catch (error) {
                console.error('Erro ao carregar serviços:', error);
            }
        };
        fetchServicos();
    }, [obraId]);
    
    // Converter arquivo para Base64
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione um arquivo PDF');
            return;
        }
        
        setArquivo(file);
        setMultiplosBoletos(null); // Reset
        
        // Converter para Base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result.split(',')[1];
            setArquivoBase64(base64);
            
            // Tentar extrair dados do PDF
            await extrairDadosPDF(base64);
        };
        reader.readAsDataURL(file);
    };
    
    // Extrair dados do PDF
    const extrairDadosPDF = async (base64) => {
        try {
            setExtraindo(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos/extrair-pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ arquivo_base64: base64 })
            });
            
            if (response.ok) {
                const dados = await response.json();
                console.log('Dados extraídos:', dados);
                
                if (dados.sucesso) {
                    // Verificar se há múltiplos boletos
                    if (dados.multiplos && dados.quantidade > 1) {
                        setMultiplosBoletos(dados.boletos);
                        alert(`📄 Encontrados ${dados.quantidade} boletos neste PDF!\n\nVocê pode cadastrar todos de uma vez ou selecionar um específico.`);
                    } else {
                        // Boleto único - preencher formulário
                        const dadosExtraidos = [];
                        
                        if (dados.codigo_barras) {
                            setFormData(prev => ({ ...prev, codigo_barras: dados.codigo_barras }));
                            dadosExtraidos.push('Código de barras');
                        }
                        if (dados.valor) {
                            setFormData(prev => ({ ...prev, valor: dados.valor.toString() }));
                            dadosExtraidos.push('Valor');
                        }
                        if (dados.data_vencimento) {
                            setFormData(prev => ({ ...prev, data_vencimento: dados.data_vencimento }));
                            dadosExtraidos.push('Data de vencimento');
                        }
                        if (dados.beneficiario) {
                            setFormData(prev => ({ ...prev, beneficiario: dados.beneficiario }));
                            dadosExtraidos.push('Beneficiário');
                        }
                        
                        alert(`✅ Dados extraídos: ${dadosExtraidos.join(', ')}.\n\nConfira e complete as informações restantes.`);
                    }
                } else {
                    alert('⚠️ Não foi possível extrair dados automaticamente.\n\nPreencha os campos manualmente.');
                }
            } else {
                const erro = await response.json();
                console.error('Erro na API:', erro);
                alert('⚠️ Erro ao processar PDF. Preencha manualmente.');
            }
        } catch (error) {
            console.error('Erro ao extrair dados:', error);
            alert('⚠️ Erro de conexão. Preencha manualmente.');
        } finally {
            setExtraindo(false);
        }
    };
    
    // Cadastrar TODOS os boletos de uma vez
    const cadastrarTodosBoletos = async () => {
        // Proteção contra duplo clique
        if (salvandoTodos) return;
        if (!multiplosboletos || multiplosboletos.length === 0) return;
        
        const descricaoBase = prompt('Digite uma descrição base para os boletos:', 'Boleto');
        if (!descricaoBase) return;
        
        setSalvandoTodos(true); // Mover para antes do try para garantir
        
        try {
            const token = localStorage.getItem('token');
            let sucessos = 0;
            let erros = 0;
            
            for (let i = 0; i < multiplosboletos.length; i++) {
                const boleto = multiplosboletos[i];
                
                const payload = {
                    descricao: `${descricaoBase} - Parcela ${i + 1}/${multiplosboletos.length}`,
                    beneficiario: boleto.beneficiario || '',
                    codigo_barras: boleto.codigo_barras || '',
                    valor: boleto.valor || 0,
                    data_vencimento: boleto.data_vencimento,
                    vinculado_servico_id: formData.vinculado_servico_id ? parseInt(formData.vinculado_servico_id) : null,  // Usar serviço selecionado
                    arquivo_nome: arquivo?.name,
                    arquivo_base64: arquivoBase64
                };
                
                try {
                    const response = await fetch(`${API_URL}/obras/${obraId}/boletos`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (response.ok) {
                        sucessos++;
                    } else if (response.status === 409) {
                        // Boleto duplicado - ignorar silenciosamente
                        console.log(`Boleto ${i + 1} já existe, ignorando...`);
                    } else {
                        erros++;
                    }
                } catch {
                    erros++;
                }
            }
            
            alert(`✅ ${sucessos} boletos cadastrados com sucesso!${erros > 0 ? `\n⚠️ ${erros} falharam.` : ''}`);
            setMultiplosBoletos(null); // Limpar lista para evitar duplicação
            onSave();
            onClose();
            
        } catch (error) {
            console.error('Erro ao cadastrar boletos:', error);
            alert('Erro ao cadastrar boletos');
        } finally {
            setSalvandoTodos(false);
        }
    };
    
    // Selecionar um boleto específico da lista
    const selecionarBoleto = (boleto) => {
        setFormData({
            descricao: '',
            beneficiario: boleto.beneficiario || '',
            valor: boleto.valor ? boleto.valor.toString() : '',
            data_vencimento: boleto.data_vencimento || '',
            codigo_barras: boleto.codigo_barras || ''
        });
        setMultiplosBoletos(null); // Sair do modo múltiplos
    };
    
    // Salvar boleto
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
            alert('Preencha os campos obrigatórios');
            return;
        }
        
        try {
            setSalvando(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${API_URL}/obras/${obraId}/boletos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    valor: parseFloat(formData.valor),
                    vinculado_servico_id: formData.vinculado_servico_id ? parseInt(formData.vinculado_servico_id) : null,
                    arquivo_nome: arquivo?.name || null,
                    arquivo_base64: arquivoBase64
                })
            });
            
            if (response.ok) {
                alert('✅ Boleto cadastrado com sucesso!');
                onSave();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.erro}`);
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar boleto');
        } finally {
            setSalvando(false);
        }
    };
    
    // Copiar código
    const copiarCodigo = () => {
        if (formData.codigo_barras) {
            navigator.clipboard.writeText(formData.codigo_barras);
            alert('Código copiado!');
        }
    };
    
    return (
        <Modal onClose={onClose}>
            <h2>📄 Cadastrar Novo Boleto</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
                Faça upload do PDF do boleto para extração automática dos dados.
            </p>
            
            <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Upload de PDF */}
                <div style={{
                    border: '2px dashed #1976d2',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    background: arquivo ? '#e3f2fd' : '#f5f5f5'
                }}>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                        {extraindo ? (
                            <span>⏳ Extraindo dados do PDF...</span>
                        ) : arquivo ? (
                            <span>✅ {arquivo.name}</span>
                        ) : (
                            <span>📁 Clique para selecionar o PDF do boleto</span>
                        )}
                    </label>
                </div>
                
                {/* Confirmação de PDF carregado - sem preview para evitar impressão */}
                {arquivoBase64 && !multiplosboletos && (
                    <div style={{ 
                        marginBottom: '20px', 
                        padding: '15px',
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        border: '1px solid #90caf9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '24px' }}>✅</span>
                        <div>
                            <strong style={{ color: '#1976d2' }}>PDF carregado com sucesso!</strong>
                            <br />
                            <span style={{ fontSize: '12px', color: '#666' }}>{arquivo?.name}</span>
                        </div>
                    </div>
                )}
                
                {/* MÚLTIPLOS BOLETOS ENCONTRADOS */}
                {multiplosboletos && multiplosboletos.length > 1 && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '15px',
                        background: '#fff3e0',
                        borderRadius: '8px',
                        border: '1px solid #ffb74d'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <h3 style={{ margin: 0, color: '#e65100' }}>
                                📄 {multiplosboletos.length} Boletos Encontrados
                            </h3>
                        </div>
                        
                        {/* Dropdown de Serviço para múltiplos boletos */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>
                                Vincular todos a um Serviço:
                            </label>
                            <select
                                value={formData.vinculado_servico_id}
                                onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                                style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    marginTop: '5px',
                                    borderRadius: '5px', 
                                    border: '1px solid #ddd' 
                                }}
                            >
                                <option value="">-- Nenhum (Despesa Extra) --</option>
                                {servicos.map(servico => (
                                    <option key={servico.id} value={servico.id}>
                                        {servico.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ marginBottom: '10px' }}>
                            <button
                                type="button"
                                onClick={cadastrarTodosBoletos}
                                disabled={salvandoTodos}
                                style={{
                                    padding: '10px 20px',
                                    background: salvandoTodos ? '#ccc' : '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: salvandoTodos ? 'default' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    width: '100%'
                                }}
                            >
                                {salvandoTodos ? '⏳ Cadastrando...' : `✅ Cadastrar Todos os ${multiplosboletos.length} Boletos`}
                            </button>
                        </div>
                        
                        <p style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>
                            Ou clique em um boleto específico para cadastrá-lo individualmente:
                        </p>
                        
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {multiplosboletos.map((boleto, index) => (
                                <div
                                    key={index}
                                    onClick={() => selecionarBoleto(boleto)}
                                    style={{
                                        padding: '10px',
                                        marginBottom: '8px',
                                        background: 'white',
                                        borderRadius: '5px',
                                        border: '1px solid #ddd',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#e3f2fd'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div>
                                        <strong style={{ color: '#1976d2' }}>
                                            Parcela {index + 1}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                            Venc: {boleto.data_vencimento ? new Date(boleto.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ color: '#2e7d32', fontSize: '16px' }}>
                                            R$ {boleto.valor ? boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: '11px', color: '#999' }}>
                                            Clique para selecionar
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ 
                            marginTop: '10px', 
                            padding: '10px', 
                            background: '#e8f5e9', 
                            borderRadius: '5px',
                            fontSize: '12px',
                            color: '#2e7d32'
                        }}>
                            💡 <strong>Total:</strong> R$ {multiplosboletos.reduce((sum, b) => sum + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {multiplosboletos[0]?.beneficiario && (
                                <span> | <strong>Beneficiário:</strong> {multiplosboletos[0].beneficiario}</span>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Formulário normal (quando não há múltiplos boletos) */}
                {!multiplosboletos && (
                    <>
                <div className="form-group">
                    <label>Descrição *</label>
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Ex: Conta de Energia - CEMIG"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label>Beneficiário</label>
                    <input
                        type="text"
                        value={formData.beneficiario}
                        onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                        placeholder="Nome do beneficiário"
                    />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Valor (R$) *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Data de Vencimento *</label>
                        <input
                            type="date"
                            value={formData.data_vencimento}
                            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                            required
                        />
                    </div>
                </div>
                
                <div className="form-group">
                    <label>Código de Barras (Linha Digitável)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={formData.codigo_barras}
                            onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                            placeholder="Cole a linha digitável do boleto"
                            style={{ flex: 1 }}
                        />
                        {formData.codigo_barras && (
                            <button
                                type="button"
                                onClick={copiarCodigo}
                                style={{
                                    padding: '8px 15px',
                                    background: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                📋
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Vincular a Serviço */}
                <div className="form-group">
                    <label>Vincular a Serviço (Opcional)</label>
                    <select
                        value={formData.vinculado_servico_id}
                        onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    >
                        <option value="">-- Nenhum (Despesa Extra) --</option>
                        {servicos.map(servico => (
                            <option key={servico.id} value={servico.id}>
                                {servico.nome}
                            </option>
                        ))}
                    </select>
                    <small style={{ color: '#666', fontSize: '11px' }}>
                        💡 Boletos vinculados a serviços são somados ao orçamento. Boletos sem serviço vão para "Despesas Extras".
                    </small>
                </div>
                
                <div className="form-actions" style={{ marginTop: '20px' }}>
                    <button type="button" onClick={onClose} className="cancel-btn">
                        Cancelar
                    </button>
                    <button type="submit" className="submit-btn" disabled={salvando}>
                        {salvando ? '⏳ Salvando...' : '💾 Salvar Boleto'}
                    </button>
                </div>
                    </>
                )}
            </form>
        </Modal>
    );
};


// Modal para Cadastrar Pagamento Parcelado (com suporte a Boletos)
const CadastrarPagamentoParceladoModal = ({ onClose, onSave, obraId }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        fornecedor: '',
        servico_id: '',
        segmento: 'Material',
        valor_total: '',
        numero_parcelas: '1',
        periodicidade: 'Mensal',
        data_primeira_parcela: getTodayString(),
        observacoes: '',
        pix: '',
        forma_pagamento: 'PIX'  // PIX, Boleto, Transferência
    });
    
    const [servicos, setServicos] = useState([]);
    const [loadingServicos, setLoadingServicos] = useState(true);
    const [valoresIguais, setValoresIguais] = useState(true);
    const [parcelasCustomizadas, setParcelasCustomizadas] = useState([]);

    // Buscar serviços da obra
    useEffect(() => {
        const fetchServicos = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/obras/${obraId}/servicos-nomes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setServicos(data.servicos || []);
                }
            } catch (error) {
                console.error('Erro ao buscar serviços:', error);
            } finally {
                setLoadingServicos(false);
            }
        };
        fetchServicos();
    }, [obraId]);

    // Gerar parcelas quando mudar número ou data ou valor
    useEffect(() => {
        const numParcelas = parseInt(formData.numero_parcelas) || 1;
        const valorTotal = parseFloat(formData.valor_total) || 0;
        const valorParcela = valorTotal / numParcelas;
        const dataInicial = formData.data_primeira_parcela ? new Date(formData.data_primeira_parcela + 'T12:00:00') : new Date();
        
        const novasParcelas = [];
        for (let i = 0; i < numParcelas; i++) {
            const dataVenc = new Date(dataInicial);
            if (formData.periodicidade === 'Semanal') {
                dataVenc.setDate(dataVenc.getDate() + (i * 7));
            } else if (formData.periodicidade === 'Quinzenal') {
                dataVenc.setDate(dataVenc.getDate() + (i * 15));
            } else {
                dataVenc.setMonth(dataVenc.getMonth() + i);
            }
            
            novasParcelas.push({
                numero: i + 1,
                valor: valoresIguais ? valorParcela.toFixed(2) : (parcelasCustomizadas[i]?.valor || valorParcela.toFixed(2)),
                data_vencimento: dataVenc.toISOString().split('T')[0],
                codigo_barras: parcelasCustomizadas[i]?.codigo_barras || ''
            });
        }
        setParcelasCustomizadas(novasParcelas);
    }, [formData.numero_parcelas, formData.valor_total, formData.data_primeira_parcela, formData.periodicidade, valoresIguais]);

    // Atualizar valor de uma parcela específica
    const handleParcelaChange = (index, field, value) => {
        const novasParcelas = [...parcelasCustomizadas];
        novasParcelas[index] = { ...novasParcelas[index], [field]: value };
        setParcelasCustomizadas(novasParcelas);
        
        // Se mudou valor, recalcular total
        if (field === 'valor' && !valoresIguais) {
            const novoTotal = novasParcelas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
            setFormData(prev => ({ ...prev, valor_total: novoTotal.toFixed(2) }));
        }
    };

    // Copiar código de barras
    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        alert('Código copiado!');
    };

    const valor_parcela = formData.valor_total && formData.numero_parcelas 
        ? (parseFloat(formData.valor_total) / parseInt(formData.numero_parcelas)).toFixed(2)
        : '0.00';

    // Validar soma das parcelas
    const somaValoresParcelas = parcelasCustomizadas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
    const diferencaValor = Math.abs(somaValoresParcelas - parseFloat(formData.valor_total || 0));
    const valoresValidos = valoresIguais || diferencaValor < 0.02;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!valoresValidos) {
            alert('A soma dos valores das parcelas deve ser igual ao valor total!');
            return;
        }
        
        // Montar dados para enviar
        const dadosEnviar = {
            ...formData,
            parcelas_customizadas: (formData.forma_pagamento === 'Boleto' || !valoresIguais) ? parcelasCustomizadas : []
        };
        
        await onSave(dadosEnviar);
    };

    return (
        <Modal onClose={onClose}>
            <h2>📊 Cadastrar Pagamento Parcelado</h2>
            <form onSubmit={handleSubmit} className="form-orcamento" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>
                
                <label>
                    Vincular ao Serviço (Opcional):
                    <select
                        value={formData.servico_id}
                        onChange={(e) => setFormData({...formData, servico_id: e.target.value})}
                        disabled={loadingServicos}
                    >
                        <option value="">-- Nenhum serviço --</option>
                        {(servicos || []).map(servico => (
                            <option key={servico.id} value={servico.id}>{servico.nome}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Segmento:
                    <select
                        value={formData.segmento}
                        onChange={(e) => setFormData({...formData, segmento: e.target.value})}
                        required
                    >
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                    </select>
                </label>

                {/* Forma de Pagamento */}
                <label>
                    Forma de Pagamento:
                    <select
                        value={formData.forma_pagamento}
                        onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
                        required
                    >
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                    </select>
                </label>

                {/* Campo PIX - só aparece se forma_pagamento for PIX ou Transferência */}
                {formData.forma_pagamento !== 'Boleto' && (
                    <label>
                        Chave PIX:
                        <input
                            type="text"
                            value={formData.pix}
                            onChange={(e) => setFormData({...formData, pix: e.target.value})}
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </label>
                )}

                <label>
                    Valor Total:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                        required
                        disabled={!valoresIguais && formData.forma_pagamento === 'Boleto'}
                    />
                </label>

                <label>
                    Número de Parcelas:
                    <input
                        type="number"
                        min="1"
                        max="48"
                        value={formData.numero_parcelas}
                        onChange={(e) => setFormData({...formData, numero_parcelas: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Periodicidade:
                    <select
                        value={formData.periodicidade}
                        onChange={(e) => setFormData({...formData, periodicidade: e.target.value})}
                        required
                    >
                        <option value="Semanal">Semanal (a cada 7 dias)</option>
                        <option value="Quinzenal">Quinzenal (a cada 15 dias)</option>
                        <option value="Mensal">Mensal (a cada 30 dias)</option>
                    </select>
                </label>

                <label>
                    Data da 1ª Parcela:
                    <input
                        type="date"
                        value={formData.data_primeira_parcela}
                        onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})}
                        required
                    />
                </label>

                {/* Opção valores iguais/diferentes */}
                <div style={{ 
                    padding: '10px', 
                    background: '#f5f5f5', 
                    borderRadius: '5px',
                    marginBottom: '10px'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <input
                            type="radio"
                            checked={valoresIguais}
                            onChange={() => setValoresIguais(true)}
                        />
                        Valores iguais ({formatCurrency(parseFloat(valor_parcela))} cada)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="radio"
                            checked={!valoresIguais}
                            onChange={() => setValoresIguais(false)}
                        />
                        Valores diferentes
                    </label>
                </div>

                {/* Configuração das parcelas (Boletos ou valores diferentes) */}
                {(formData.forma_pagamento === 'Boleto' || !valoresIguais) && parcelasCustomizadas.length > 0 && (
                    <div style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '8px', 
                        padding: '10px',
                        marginBottom: '10px',
                        background: '#fafafa',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            🎫 {formData.forma_pagamento === 'Boleto' ? 'Configuração dos Boletos' : 'Valores das Parcelas'}
                        </h4>
                        
                        {parcelasCustomizadas.map((parcela, index) => (
                            <div key={index} style={{ 
                                background: '#fff', 
                                border: '1px solid #e0e0e0',
                                borderRadius: '5px',
                                padding: '10px',
                                marginBottom: '8px'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#555'
                                }}>
                                    <span>Parcela {parcela.numero}/{formData.numero_parcelas}</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                        Venc: {new Date(parcela.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Valor */}
                                    <div style={{ flex: '1', minWidth: '100px' }}>
                                        <label style={{ fontSize: '12px', color: '#666' }}>Valor:</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={parcela.valor}
                                            onChange={(e) => handleParcelaChange(index, 'valor', e.target.value)}
                                            disabled={valoresIguais}
                                            style={{ 
                                                width: '100%', 
                                                padding: '5px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Código de Barras (só para boleto) */}
                                    {formData.forma_pagamento === 'Boleto' && (
                                        <div style={{ flex: '3', minWidth: '200px' }}>
                                            <label style={{ fontSize: '12px', color: '#666' }}>Código de Barras:</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input
                                                    type="text"
                                                    value={parcela.codigo_barras}
                                                    onChange={(e) => handleParcelaChange(index, 'codigo_barras', e.target.value)}
                                                    placeholder="Cole a linha digitável do boleto"
                                                    style={{ 
                                                        flex: '1',
                                                        padding: '5px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                                {parcela.codigo_barras && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copiarCodigo(parcela.codigo_barras)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            background: '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                        title="Copiar código"
                                                    >
                                                        📋
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Validação de soma */}
                        {!valoresIguais && (
                            <div style={{ 
                                marginTop: '10px', 
                                padding: '8px',
                                background: valoresValidos ? '#e8f5e9' : '#ffebee',
                                borderRadius: '4px',
                                fontSize: '13px'
                            }}>
                                <strong>Soma das parcelas:</strong> {formatCurrency(somaValoresParcelas)}
                                {!valoresValidos && (
                                    <span style={{ color: '#d32f2f', marginLeft: '10px' }}>
                                        ⚠️ Diferença de {formatCurrency(diferencaValor)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="2"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn" disabled={!valoresValidos}>
                        Cadastrar
                    </button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};
// ==========================================
// COMPONENTE: MODAL DE EDIÇÃO DE PARCELAS
// ==========================================

// ==========================================
// COMPONENTE: CAIXA DE OBRA
// ==========================================

const CaixaObraModal = ({ obraId, obraNome, onClose }) => {
    const [caixa, setCaixa] = useState(null);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [mesAno, setMesAno] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    const [filtroTipo, setFiltroTipo] = useState(''); // '', 'Entrada', 'Saída'
    const [reanexandoId, setReanexandoId] = useState(null); // ID da movimentação sendo editada
    const [movimentacaoEditar, setMovimentacaoEditar] = useState(null); // Movimentação sendo editada

    // Função para excluir movimentação
    const handleExcluirMovimentacao = async (movId, descricao) => {
        if (!window.confirm(`Excluir movimentação "${descricao}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes/${movId}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) throw new Error('Erro ao excluir');
            
            alert('Movimentação excluída com sucesso!');
            carregarDados();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir movimentação');
        }
    };

    // Função para reanexar comprovante
    const handleReanexarComprovante = async (movId, file) => {
        if (!file) return;
        
        try {
            // Comprimir imagem
            const compressImage = (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 1200;
                            const MAX_HEIGHT = 1200;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            };
            
            const base64 = await compressImage(file);
            
            // Atualizar movimentação com novo comprovante
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes/${movId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ comprovante_url: base64 })
                }
            );
            
            if (!response.ok) throw new Error('Erro ao atualizar comprovante');
            
            alert('✅ Comprovante atualizado com sucesso!');
            carregarDados(); // Recarregar dados
        } catch (err) {
            console.error('Erro ao reanexar comprovante:', err);
            alert('Erro ao atualizar comprovante');
        } finally {
            setReanexandoId(null);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [obraId, mesAno]);

    const carregarDados = async () => {
        try {
            setIsLoading(true);
            
            // Carregar informações do caixa
            const resCaixa = await fetchWithAuth(`${API_URL}/obras/${obraId}/caixa`);
            if (!resCaixa.ok) throw new Error('Erro ao carregar caixa');
            const dataCaixa = await resCaixa.json();
            setCaixa(dataCaixa);

            // Carregar movimentações do mês
            const resMovs = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes?mes=${mesAno.mes}&ano=${mesAno.ano}`
            );
            if (!resMovs.ok) throw new Error('Erro ao carregar movimentações');
            const dataMovs = await resMovs.json();
            setMovimentacoes(dataMovs);
        } catch (err) {
            console.error('Erro ao carregar dados do caixa:', err);
            alert('Erro ao carregar dados do caixa');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNovaMovimentacao = () => {
        setModalAberto(true);
    };

    const handleGerarRelatorio = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/relatorio-pdf`,
                {
                    method: 'POST',
                    body: JSON.stringify({ mes: mesAno.mes, ano: mesAno.ano })
                }
            );

            if (!response.ok) {
                // Tentar pegar mensagem de erro do servidor
                try {
                    const errorData = await response.json();
                    console.error('Erro do servidor:', errorData);
                    throw new Error(errorData.mensagem || errorData.erro || 'Erro ao gerar relatório');
                } catch (jsonErr) {
                    throw new Error('Erro ao gerar relatório');
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Caixa_${obraNome}_${mesAno.mes}_${mesAno.ano}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erro ao gerar relatório:', err);
            alert('Erro ao gerar relatório PDF: ' + err.message);
        }
    };

    const movimentacoesFiltradas = filtroTipo 
        ? movimentacoes.filter(m => m.tipo === filtroTipo)
        : movimentacoes;

    if (isLoading) {
        return (
            <Modal customWidth="1200px">
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    Carregando...
                </div>
            </Modal>
        );
    }

    return (
        <Modal customWidth="1200px">
            <div style={{ padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Cabeçalho */}
                <h2 style={{ fontSize: '2em', marginBottom: '10px' }}>💰 Caixa de Obra</h2>
                <p style={{ color: '#666', marginBottom: '30px', fontSize: '1.1em' }}>
                    <strong>{obraNome}</strong>
                </p>

                {/* Dashboard do Caixa */}
                {caixa && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Saldo Atual</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {formatCurrency(caixa.saldo_atual)}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Entradas (mês)</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {formatCurrency(caixa.total_entradas_mes || 0)}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Saídas (mês)</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {formatCurrency(caixa.total_saidas_mes || 0)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Controles */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '25px',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '1.1em' }}>Período:</label>
                        <select
                            value={mesAno.mes}
                            onChange={e => setMesAno({ ...mesAno, mes: parseInt(e.target.value) })}
                            style={{ padding: '10px', fontSize: '1em', borderRadius: '5px' }}
                        >
                            <option value={1}>Janeiro</option>
                            <option value={2}>Fevereiro</option>
                            <option value={3}>Março</option>
                            <option value={4}>Abril</option>
                            <option value={5}>Maio</option>
                            <option value={6}>Junho</option>
                            <option value={7}>Julho</option>
                            <option value={8}>Agosto</option>
                            <option value={9}>Setembro</option>
                            <option value={10}>Outubro</option>
                            <option value={11}>Novembro</option>
                            <option value={12}>Dezembro</option>
                        </select>
                        <input
                            type="number"
                            value={mesAno.ano}
                            onChange={e => setMesAno({ ...mesAno, ano: parseInt(e.target.value) })}
                            min="2020"
                            max="2100"
                            style={{ padding: '10px', fontSize: '1em', borderRadius: '5px', width: '100px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleNovaMovimentacao}
                            className="submit-btn"
                            style={{ padding: '12px 24px', fontSize: '1.1em' }}
                        >
                            + Nova Movimentação
                        </button>
                        <button
                            onClick={handleGerarRelatorio}
                            className="submit-btn"
                            style={{ padding: '12px 24px', fontSize: '1.1em', backgroundColor: '#ff9800' }}
                        >
                            📊 Gerar Relatório PDF
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setFiltroTipo('')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === '' ? '2px solid #4CAF50' : '1px solid #ccc',
                            backgroundColor: filtroTipo === '' ? '#e8f5e9' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFiltroTipo('Entrada')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === 'Entrada' ? '2px solid #2196F3' : '1px solid #ccc',
                            backgroundColor: filtroTipo === 'Entrada' ? '#e3f2fd' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        📥 Entradas
                    </button>
                    <button
                        onClick={() => setFiltroTipo('Saída')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === 'Saída' ? '2px solid #f44336' : '1px solid #ccc',
                            backgroundColor: filtroTipo === 'Saída' ? '#ffebee' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        📤 Saídas
                    </button>
                </div>

                {/* Lista de Movimentações */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '1.3em' }}>Movimentações</h3>
                    {movimentacoesFiltradas.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            Nenhuma movimentação registrada neste período
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {movimentacoesFiltradas.map(mov => (
                                <div
                                    key={mov.id}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        backgroundColor: mov.tipo === 'Entrada' ? '#e3f2fd' : '#ffebee'
                                    }}
                                >
                                    {/* Header: Ícone, Data, Anexo e Valor */}
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        marginBottom: '10px',
                                        flexWrap: 'wrap',
                                        gap: '5px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.3em' }}>
                                                {mov.tipo === 'Entrada' ? '📥' : '📤'}
                                            </span>
                                            <span style={{ fontSize: '0.85em', color: '#666' }}>
                                                {new Date(mov.data).toLocaleString('pt-BR')}
                                            </span>
                                            {mov.comprovante_url && (
                                                <span style={{ fontSize: '1em' }}>📎</span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '1.4em',
                                            fontWeight: 'bold',
                                            color: mov.tipo === 'Entrada' ? '#2196F3' : '#f44336',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {mov.tipo === 'Entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                                        </div>
                                    </div>
                                    
                                    {/* Descrição */}
                                    <div style={{
                                        fontSize: '1.05em',
                                        fontWeight: '600',
                                        color: '#333'
                                    }}>
                                        {mov.descricao}
                                    </div>
                                    
                                    {/* Observações */}
                                    {mov.observacoes && (
                                        <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic', marginTop: '5px' }}>
                                            Obs: {mov.observacoes}
                                        </div>
                                    )}
                                    
                                    {/* Botão para reanexar comprovante */}
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <label 
                                                style={{ 
                                                    cursor: 'pointer',
                                                    padding: '5px 10px',
                                                    backgroundColor: mov.comprovante_url?.startsWith('data:image') ? '#4CAF50' : '#ff9800',
                                                    color: 'white',
                                                    borderRadius: '5px',
                                                    fontSize: '0.85em',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                {mov.comprovante_url?.startsWith('data:image') ? '✅ Comprovante OK' : '📎 Anexar/Reanexar'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) {
                                                            handleReanexarComprovante(mov.id, e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {mov.comprovante_url && !mov.comprovante_url.startsWith('data:image') && (
                                                <span style={{ fontSize: '0.75em', color: '#999' }}>
                                                    ⚠️ Precisa reanexar
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Botões de Editar e Excluir */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => setMovimentacaoEditar(mov)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#2196F3',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleExcluirMovimentacao(mov.id, mov.descricao)}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#f44336',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <button onClick={onClose} className="voltar-btn" style={{ padding: '12px 24px', fontSize: '1.1em' }}>
                        Fechar
                    </button>
                </div>
            </div>

            {/* Modal de Nova Movimentação */}
            {modalAberto && (
                <ModalNovaMovimentacaoCaixa
                    obraId={obraId}
                    onClose={() => setModalAberto(false)}
                    onSave={() => {
                        setModalAberto(false);
                        carregarDados();
                    }}
                />
            )}

            {/* Modal de Editar Movimentação */}
            {movimentacaoEditar && (
                <ModalEditarMovimentacaoCaixa
                    obraId={obraId}
                    movimentacao={movimentacaoEditar}
                    onClose={() => setMovimentacaoEditar(null)}
                    onSave={() => {
                        setMovimentacaoEditar(null);
                        carregarDados();
                    }}
                />
            )}
        </Modal>
    );
};

// Modal de Nova Movimentação
const ModalNovaMovimentacaoCaixa = ({ obraId, onClose, onSave }) => {
    const [tipo, setTipo] = useState('Saída');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [comprovante, setComprovante] = useState(null);
    const [previewComprovante, setPreviewComprovante] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    const handleComprovanteChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Se for PDF, não comprimir
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setComprovante(reader.result);
                setPreviewComprovante(null); // PDF não tem preview
            };
            reader.readAsDataURL(file);
            return;
        }
        
        // Se for imagem, comprimir
        if (file.type.startsWith('image/')) {
            try {
                setIsCompressing(true);
                console.log('🔄 Comprimindo imagem do comprovante...');
                
                const compressedImages = await compressImages([file]);
                
                if (compressedImages && compressedImages.length > 0) {
                    const compressed = compressedImages[0];
                    setComprovante(compressed.base64);
                    setPreviewComprovante(compressed.base64);
                    console.log('✅ Imagem comprimida com sucesso');
                }
            } catch (err) {
                console.error('Erro ao comprimir imagem:', err);
                // Fallback: usar imagem original
                const reader = new FileReader();
                reader.onloadend = () => {
                    setComprovante(reader.result);
                    setPreviewComprovante(reader.result);
                };
                reader.readAsDataURL(file);
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!valor || parseFloat(valor) <= 0) {
            alert('Por favor, informe um valor válido');
            return;
        }

        if (!descricao.trim()) {
            alert('Por favor, informe uma descrição');
            return;
        }

        try {
            setIsSubmitting(true);

            let comprovanteUrl = null;

            // Upload do comprovante se houver
            if (comprovante) {
                const resUpload = await fetchWithAuth(
                    `${API_URL}/obras/${obraId}/caixa/upload-comprovante`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ imagem: comprovante })
                    }
                );

                if (resUpload.ok) {
                    const dataUpload = await resUpload.json();
                    comprovanteUrl = dataUpload.comprovante_url;
                }
            }

            // Criar movimentação
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        tipo,
                        valor: parseFloat(valor),
                        descricao: descricao.trim(),
                        observacoes: observacoes.trim() || null,
                        comprovante_url: comprovanteUrl
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao salvar movimentação');

            alert('✅ Movimentação registrada com sucesso!');
            onSave();
        } catch (err) {
            console.error('Erro ao salvar movimentação:', err);
            alert('Erro ao salvar movimentação');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal customWidth="600px">
            <div style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '1.8em', marginBottom: '25px' }}>💸 Nova Movimentação</h2>

                {/* Tipo */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Tipo:
                    </label>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Saída"
                                checked={tipo === 'Saída'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📤 Saída</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Entrada"
                                checked={tipo === 'Entrada'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📥 Entrada</span>
                        </label>
                    </div>
                </div>

                {/* Valor */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Valor (R$):
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        placeholder="0,00"
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>

                {/* Descrição */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Descrição:
                    </label>
                    <textarea
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Ex: Cimento urgência laje 3º andar"
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Observações */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Observações (opcional):
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        placeholder="Informações adicionais..."
                        rows={2}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Comprovante */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Comprovante (opcional):
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleComprovanteChange}
                        disabled={isCompressing}
                        style={{ marginBottom: '15px' }}
                    />
                    {isCompressing && (
                        <div style={{ color: '#007bff', fontSize: '0.9em', marginBottom: '10px' }}>
                            ⏳ Comprimindo imagem...
                        </div>
                    )}
                    {previewComprovante && (
                        <div style={{ marginTop: '15px' }}>
                            <img
                                src={previewComprovante}
                                alt="Preview"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    borderRadius: '8px',
                                    border: '2px solid #ddd'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <button onClick={onClose} className="voltar-btn" style={{ padding: '12px 24px', fontSize: '1.1em' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isCompressing}
                        className="submit-btn"
                        style={{ padding: '12px 24px', fontSize: '1.1em' }}
                    >
                        {isCompressing ? '⏳ Comprimindo...' : isSubmitting ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Modal de Editar Movimentação do Caixa
const ModalEditarMovimentacaoCaixa = ({ obraId, movimentacao, onClose, onSave }) => {
    const [tipo, setTipo] = useState(movimentacao.tipo || 'Saída');
    const [valor, setValor] = useState(movimentacao.valor || '');
    const [descricao, setDescricao] = useState(movimentacao.descricao || '');
    const [observacoes, setObservacoes] = useState(movimentacao.observacoes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!valor || !descricao) {
            alert('Preencha valor e descrição');
            return;
        }

        try {
            setIsSubmitting(true);
            
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes/${movimentacao.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        tipo,
                        valor: parseFloat(valor),
                        descricao,
                        observacoes
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao atualizar');

            alert('✅ Movimentação atualizada!');
            onSave();
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao atualizar movimentação');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div style={{ padding: '20px' }}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
                    ✏️ Editar Movimentação
                </h2>

                {/* Tipo */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Tipo:
                    </label>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Saída"
                                checked={tipo === 'Saída'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📤 Saída</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Entrada"
                                checked={tipo === 'Entrada'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📥 Entrada</span>
                        </label>
                    </div>
                </div>

                {/* Valor */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Valor (R$):
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>

                {/* Descrição */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Descrição:
                    </label>
                    <textarea
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Observações */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Observações (opcional):
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        rows={2}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <button
                        onClick={onClose}
                        className="voltar-btn"
                        style={{ padding: '12px 24px', fontSize: '1.1em' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="submit-btn"
                        style={{ padding: '12px 24px', fontSize: '1.1em' }}
                    >
                        {isSubmitting ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const EditarParcelasModal = ({ obraId, pagamentoParcelado, onClose, onSave }) => {
    const [parcelas, setParcelas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parcelaEditando, setParcelaEditando] = useState(null);
    const [observacaoEditando, setObservacaoEditando] = useState(null);
    const [editandoDadosGerais, setEditandoDadosGerais] = useState(false);
    const [servicos, setServicos] = useState([]);
    const [dadosGerais, setDadosGerais] = useState({
        descricao: pagamentoParcelado.descricao,
        fornecedor: pagamentoParcelado.fornecedor || '',
        servico_id: pagamentoParcelado.servico_id || '',
        segmento: pagamentoParcelado.segmento || 'Material'
    });

    // Buscar serviços da obra
    useEffect(() => {
        const fetchServicos = async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos-nomes`);
                if (response.ok) {
                    const data = await response.json();
                    setServicos(data.servicos || []);
                }
            } catch (error) {
                console.error('Erro ao buscar serviços:', error);
            }
        };
        fetchServicos();
    }, [obraId]);

    useEffect(() => {
        carregarParcelas();
    }, []);

    const carregarParcelas = async () => {
        try {
            setIsLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas`
            );
            
            if (!response.ok) throw new Error('Erro ao carregar parcelas');
            
            const data = await response.json();
            setParcelas(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditarParcela = async (parcela, novoValor, novaData, novaObs) => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        valor_parcela: parseFloat(novoValor),
                        data_vencimento: novaData,
                        observacao: novaObs || parcela.observacao
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao editar parcela');

            await carregarParcelas();
            setParcelaEditando(null);
            setObservacaoEditando(null);
            
            // Toast de sucesso
            showToast('✅ Parcela atualizada com sucesso!');
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const handleMarcarPaga = async (parcela) => {
        if (!window.confirm(`Confirma o pagamento da parcela ${parcela.numero_parcela}?`)) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/pagar`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        data_pagamento: getTodayString()
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao marcar parcela como paga');

            const resultado = await response.json();
            showToast(`✅ ${resultado.mensagem}`);
            await carregarParcelas();
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // NOVO: Desfazer pagamento
    const handleDesfazerPagamento = async (parcela) => {
        if (!window.confirm(`Deseja desfazer o pagamento da parcela ${parcela.numero_parcela}? O lançamento associado será removido.`)) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/desfazer`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || 'Erro ao desfazer pagamento');
            }

            showToast('↩️ Pagamento desfeito com sucesso!');
            await carregarParcelas();
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const handleRecriarLancamentos = async () => {
        if (!window.confirm('Deseja recriar os lançamentos de todas as parcelas pagas? Isso é útil se os lançamentos não foram criados corretamente.')) {
            return;
        }

        try {
            const parcelasPagas = parcelas.filter(p => p.status === 'Pago');
            
            if (parcelasPagas.length === 0) {
                alert('Não há parcelas pagas para reprocessar.');
                return;
            }

            let sucessos = 0;
            let erros = 0;

            for (const parcela of parcelasPagas) {
                try {
                    const response = await fetchWithAuth(
                        `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/pagar`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                data_pagamento: parcela.data_pagamento || getTodayString()
                            })
                        }
                    );

                    if (response.ok) {
                        sucessos++;
                    } else {
                        erros++;
                    }
                } catch (error) {
                    erros++;
                }
            }

            showToast(`🔄 ${sucessos} lançamentos recriados${erros > 0 ? `, ${erros} erros` : ''}`);
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // NOVO: Salvar dados gerais
    const handleSalvarDadosGerais = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(dadosGerais)
                }
            );

            if (!response.ok) throw new Error('Erro ao salvar dados gerais');

            showToast('✅ Dados atualizados com sucesso!');
            setEditandoDadosGerais(false);
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // Toast helper
    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'cf-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const calcularValorTotal = () => {
        return parcelas.reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const calcularValorPago = () => {
        return parcelas.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const calcularValorRestante = () => {
        return parcelas.filter(p => p.status !== 'Pago').reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const getStatusParcela = (parcela) => {
        if (parcela.status === 'Pago') return 'paga';
        if (new Date(parcela.data_vencimento) < new Date()) return 'vencida';
        return 'pendente';
    };

    if (isLoading) return <Modal customWidth="900px"><div style={{ padding: '40px', textAlign: 'center' }}>Carregando parcelas...</div></Modal>;
    if (error) return <Modal customWidth="900px"><div style={{ padding: '40px', textAlign: 'center', color: 'var(--cor-vermelho)' }}>Erro: {error}</div></Modal>;

    const parcelasPagas = parcelas.filter(p => p.status === 'Pago').length;
    const progresso = Math.round((parcelasPagas / parcelas.length) * 100);

    return (
        <Modal customWidth="900px">
            <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'var(--cor-purple-bg)',
                    borderBottom: '3px solid var(--cor-purple-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ flex: 1 }}>
                        {editandoDadosGerais ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={dadosGerais.descricao}
                                    onChange={(e) => setDadosGerais({...dadosGerais, descricao: e.target.value})}
                                    style={{ 
                                        fontSize: '18px', 
                                        fontWeight: '700', 
                                        padding: '8px 12px', 
                                        borderRadius: '8px',
                                        border: '2px solid var(--cor-purple-light)',
                                        background: 'white'
                                    }}
                                    placeholder="Descrição"
                                />
                                <input
                                    type="text"
                                    value={dadosGerais.fornecedor}
                                    onChange={(e) => setDadosGerais({...dadosGerais, fornecedor: e.target.value})}
                                    style={{ 
                                        fontSize: '14px', 
                                        padding: '6px 12px', 
                                        borderRadius: '8px',
                                        border: '1px solid var(--cor-borda)',
                                        background: 'white'
                                    }}
                                    placeholder="Fornecedor"
                                />
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <select
                                        value={dadosGerais.servico_id || ''}
                                        onChange={(e) => setDadosGerais({...dadosGerais, servico_id: e.target.value || null})}
                                        style={{ 
                                            flex: 1,
                                            minWidth: '200px',
                                            fontSize: '14px', 
                                            padding: '6px 12px', 
                                            borderRadius: '8px',
                                            border: '1px solid var(--cor-borda)',
                                            background: 'white'
                                        }}
                                    >
                                        <option value="">Sem vínculo com serviço (Despesa Extra)</option>
                                        {servicos.map(s => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={dadosGerais.segmento || 'Material'}
                                        onChange={(e) => setDadosGerais({...dadosGerais, segmento: e.target.value})}
                                        style={{ 
                                            fontSize: '14px', 
                                            padding: '6px 12px', 
                                            borderRadius: '8px',
                                            border: '1px solid var(--cor-borda)',
                                            background: 'white'
                                        }}
                                    >
                                        <option value="Material">Material</option>
                                        <option value="Mão de Obra">Mão de Obra</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleSalvarDadosGerais} className="cf-btn cf-btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                        ✓ Salvar
                                    </button>
                                    <button onClick={() => setEditandoDadosGerais(false)} className="cf-btn cf-btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                        ✕ Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 style={{ 
                                    margin: 0, 
                                    fontSize: '20px', 
                                    fontWeight: '700', 
                                    color: 'var(--cor-texto)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    📦 {pagamentoParcelado.descricao}
                                    <button 
                                        onClick={() => setEditandoDadosGerais(true)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            fontSize: '14px',
                                            color: 'var(--cor-purple)'
                                        }}
                                        title="Editar dados gerais"
                                    >
                                        ✏️
                                    </button>
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--cor-texto-secundario)' }}>
                                    Fornecedor: {pagamentoParcelado.fornecedor || 'Não informado'} • {pagamentoParcelado.periodicidade || 'Mensal'}
                                    {pagamentoParcelado.servico_id && (
                                        <span style={{ 
                                            marginLeft: '8px',
                                            padding: '2px 8px',
                                            backgroundColor: 'var(--cor-primaria-bg)',
                                            color: 'var(--cor-primaria)',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '500'
                                        }}>
                                            🔗 {servicos.find(s => s.id === pagamentoParcelado.servico_id)?.nome || 'Serviço vinculado'}
                                        </span>
                                    )}
                                </p>
                            </>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--cor-texto-secundario)',
                            padding: 0,
                            lineHeight: 1
                        }}
                    >×</button>
                </div>

                {/* Resumo */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    padding: '20px 24px',
                    background: 'var(--cor-fundo-secundario)',
                    borderBottom: '1px solid var(--cor-borda)'
                }}>
                    <div style={{ background: 'var(--cor-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--cor-borda)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Valor Total</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cor-texto)' }}>{formatCurrency(calcularValorTotal())}</div>
                    </div>
                    <div style={{ background: 'var(--cor-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--cor-borda)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Valor Pago</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cor-acento)' }}>{formatCurrency(calcularValorPago())}</div>
                    </div>
                    <div style={{ background: 'var(--cor-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--cor-borda)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Restante</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cor-warning)' }}>{formatCurrency(calcularValorRestante())}</div>
                    </div>
                    <div style={{ background: 'var(--cor-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--cor-borda)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--cor-texto-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Parcelas</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cor-texto)' }}>{parcelasPagas} / {parcelas.length}</div>
                    </div>
                </div>

                {/* Barra de Progresso */}
                <div style={{ padding: '16px 24px', background: 'var(--cor-fundo-secundario)', borderBottom: '1px solid var(--cor-borda)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto-secundario)' }}>Progresso do pagamento</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cor-purple)' }}>{progresso}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--cor-borda)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progresso}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, var(--cor-purple-light) 0%, var(--cor-purple) 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease'
                        }} />
                    </div>
                </div>

                {/* Lista de Parcelas */}
                <div style={{ padding: '20px 24px', maxHeight: '350px', overflowY: 'auto' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Parcelas
                        <span style={{ fontSize: '11px', background: 'var(--cor-fundo-secundario)', padding: '2px 8px', borderRadius: '10px' }}>
                            Clique para editar
                        </span>
                    </h4>
                    
                    {parcelas.map(parcela => {
                        const status = getStatusParcela(parcela);
                        const isEditando = parcelaEditando === parcela.id;
                        
                        return (
                            <div 
                                key={parcela.id} 
                                className={`parcela-item ${status}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    background: status === 'paga' ? 'var(--cor-acento-bg)' : 
                                               status === 'vencida' ? 'var(--cor-vermelho-bg)' : 'var(--cor-fundo-secundario)',
                                    borderRadius: '10px',
                                    marginBottom: '10px',
                                    border: `1px solid ${status === 'paga' ? 'var(--cor-acento-light)' : 
                                                        status === 'vencida' ? 'var(--cor-vermelho-light)' : 'var(--cor-borda)'}`,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* Número da Parcela */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '700',
                                        fontSize: parcela.numero_parcela === 0 ? '10px' : '14px',
                                        background: status === 'paga' ? 'var(--cor-acento)' : 
                                                   parcela.numero_parcela === 0 ? '#10b981' : 'var(--cor-card)',
                                        color: status === 'paga' || parcela.numero_parcela === 0 ? 'white' : 'var(--cor-texto-muted)',
                                        border: status !== 'paga' && parcela.numero_parcela !== 0 ? '2px solid var(--cor-borda)' : 'none'
                                    }}>
                                        {status === 'paga' ? '✓' : parcela.numero_parcela === 0 ? 'ENT' : parcela.numero_parcela}
                                    </div>
                                    
                                    {/* Dados */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {isEditando ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={parcela.valor_parcela}
                                                    id={`valor-${parcela.id}`}
                                                    className="parcela-edit-input"
                                                    style={{ width: '110px' }}
                                                    placeholder="Valor"
                                                />
                                                <input
                                                    type="date"
                                                    defaultValue={parcela.data_vencimento}
                                                    id={`data-${parcela.id}`}
                                                    className="parcela-edit-input"
                                                    style={{ width: '140px' }}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--cor-texto)' }}>
                                                    {formatCurrency(parcela.valor_parcela)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>
                                                    {status === 'paga' && parcela.data_pagamento 
                                                        ? `Paga em ${new Date(parcela.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                        : `Vence ${new Date(parcela.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                    }
                                                    {parcela.observacao && ` • ${parcela.observacao}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Badge de Status */}
                                    <span 
                                        className={`parcela-status-badge ${status}`}
                                        style={parcela.numero_parcela === 0 && status !== 'paga' ? { background: '#10b981', color: 'white' } : {}}
                                    >
                                        {status === 'paga' ? 'Paga' : 
                                         status === 'vencida' ? 'Vencida' : 
                                         parcela.numero_parcela === 0 ? 'Entrada' : 'Pendente'}
                                    </span>
                                    
                                    {isEditando ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const novoValor = document.getElementById(`valor-${parcela.id}`).value;
                                                    const novaData = document.getElementById(`data-${parcela.id}`).value;
                                                    handleEditarParcela(parcela, novoValor, novaData);
                                                }}
                                                className="parcela-action-btn primary"
                                            >
                                                ✓ Salvar
                                            </button>
                                            <button
                                                onClick={() => setParcelaEditando(null)}
                                                className="parcela-action-btn"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    ) : status === 'paga' ? (
                                        <button
                                            onClick={() => handleDesfazerPagamento(parcela)}
                                            className="parcela-action-btn"
                                            title="Desfazer pagamento"
                                            style={{ color: 'var(--cor-vermelho)' }}
                                        >
                                            ↩️ Desfazer
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setParcelaEditando(parcela.id)}
                                                className="parcela-action-btn"
                                                title="Editar valor e data"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleMarcarPaga(parcela)}
                                                className="parcela-action-btn success"
                                                title="Marcar como paga"
                                            >
                                                💰 Pagar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '16px 24px', 
                    borderTop: '1px solid var(--cor-borda)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--cor-fundo-secundario)'
                }}>
                    <button 
                        onClick={handleRecriarLancamentos}
                        className="cf-btn cf-btn-outline"
                        title="Recria os lançamentos de parcelas já pagas (útil para corrigir dados)"
                    >
                        🔄 Recriar Lançamentos
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onClose} className="cf-btn cf-btn-outline">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


// ==========================================
// COMPONENTE: QUADRO DE ALERTAS DE VENCIMENTO
// ==========================================

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
            console.error('Erro ao carregar alertas:', err);
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
            icon: '⚠️',
            cor: 'var(--cor-vermelho)',
            corLight: 'var(--cor-vermelho-light)',
            corBg: 'var(--cor-vermelho-bg)',
            dados: alertas.vencidos
        },
        {
            key: 'vence_hoje',
            titulo: 'Vence Hoje',
            icon: '📅',
            cor: 'var(--cor-warning)',
            corLight: 'var(--cor-warning-light)',
            corBg: 'var(--cor-warning-bg)',
            dados: alertas.vence_hoje
        },
        {
            key: 'vence_amanha',
            titulo: 'Vence Amanhã',
            icon: '📆',
            cor: 'var(--cor-info)',
            corLight: 'var(--cor-info-light)',
            corBg: 'var(--cor-info-bg)',
            dados: alertas.vence_amanha
        },
        {
            key: 'vence_7_dias',
            titulo: 'Próximos 7 dias',
            icon: '📊',
            cor: 'var(--cor-purple)',
            corLight: 'var(--cor-purple-light)',
            corBg: 'var(--cor-purple-bg)',
            dados: alertas.vence_7_dias
        },
        {
            key: 'futuros',
            titulo: 'Futuros (+7d)',
            icon: '🗓️',
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
            
            {/* Cards de Status - Design Moderno */}
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
                                    {item.tipo === 'Parcela' ? '📦' : '📄'}
                                </div>
                                <div className="cf-pagamento-futuro-info">
                                    <div className="cf-pagamento-futuro-desc">{item.descricao}</div>
                                    <div className="cf-pagamento-futuro-meta">
                                        {item.fornecedor || 'Sem fornecedor'} • {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                        ✕ Fechar detalhes
                    </button>
                </div>
            )}
        </div>
    );
};
// Modal Principal do Cronograma Financeiro
const CronogramaFinanceiro = ({ onClose, obraId, obraNome, embedded = false, simplified = false }) => {
    const [pagamentosFuturos, setPagamentosFuturos] = useState([]);
    const [pagamentosParcelados, setPagamentosParcelados] = useState([]);
    const [pagamentosServicoPendentes, setPagamentosServicoPendentes] = useState([]); // NOVO
    const [isEditarParcelasVisible, setEditarParcelasVisible] = useState(false);
    const [pagamentoParceladoSelecionado, setPagamentoParceladoSelecionado] = useState(null);
    const [previsoes, setPrevisoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // NOVO: Estados para Expandir/Recolher seções
    const [isPagamentosFuturosCollapsed, setIsPagamentosFuturosCollapsed] = useState(false);
    const [isPagamentosParceladosCollapsed, setIsPagamentosParceladosCollapsed] = useState(false);
    
    // MUDANÇA 5: Estados para seleção múltipla
    const [itensSelecionados, setItensSelecionados] = useState([]); // [{tipo: 'futuro'|'parcela'|'servico', id: X}]
    const [isMarcarPagosVisible, setMarcarPagosVisible] = useState(false);
    
    const handleAbrirEditarParcelas = (pagamento) => {
        setPagamentoParceladoSelecionado(pagamento);
        setEditarParcelasVisible(true);
    };
    const [isCadastrarFuturoVisible, setCadastrarFuturoVisible] = useState(false);
    const [isCadastrarParceladoVisible, setCadastrarParceladoVisible] = useState(false);
    const [isEditarFuturoVisible, setEditarFuturoVisible] = useState(false);
    const [pagamentoFuturoSelecionado, setPagamentoFuturoSelecionado] = useState(null);
    
    // MUDANÇA 5: Funções de seleção
    const toggleSelecao = (tipo, id) => {
        // CORREÇÃO CRÍTICA: Detectar IDs tipo "servico-71" e converter
        let tipoFinal = tipo;
        let idFinal = id;
        
        // Se o ID é uma string tipo "servico-X", extrair o ID numérico
        if (typeof id === 'string' && id.startsWith('servico-')) {
            const idNumerico = parseInt(id.split('-')[1], 10);
            tipoFinal = 'servico';
            idFinal = idNumerico;
            console.log(`[CORREÇÃO] Convertido de tipo="${tipo}" id="${id}" para tipo="${tipoFinal}" id=${idFinal}`);
        }
        
        setItensSelecionados(prev => {
            const exists = prev.find(item => item.tipo === tipoFinal && item.id === idFinal);
            if (exists) {
                return prev.filter(item => !(item.tipo === tipoFinal && item.id === idFinal));
            } else {
                return [...prev, { tipo: tipoFinal, id: idFinal }];
            }
        });
    };
    
    const isItemSelecionado = (tipo, id) => {
        // CORREÇÃO CRÍTICA: Verificar com conversão também
        let tipoCheck = tipo;
        let idCheck = id;
        
        if (typeof id === 'string' && id.startsWith('servico-')) {
            const idNumerico = parseInt(id.split('-')[1], 10);
            tipoCheck = 'servico';
            idCheck = idNumerico;
        }
        
        return itensSelecionados.some(item => item.tipo === tipoCheck && item.id === idCheck);
    };
    
    const selecionarTodos = () => {
        const todos = [];
        
        // Pagamentos Futuros
        pagamentosFuturos.forEach(pag => {
            if (pag.status === 'Previsto') {
                // CORREÇÃO CRÍTICA: Detectar IDs tipo "servico-X"
                if (typeof pag.id === 'string' && pag.id.startsWith('servico-')) {
                    const idNumerico = parseInt(pag.id.split('-')[1], 10);
                    todos.push({ tipo: 'servico', id: idNumerico });
                    console.log(`[SELECIONAR TODOS] Convertido ${pag.id} para tipo=servico, id=${idNumerico}`);
                } else {
                    todos.push({ tipo: 'futuro', id: pag.id });
                }
            }
        });
        
        // Pagamentos de Serviço Pendentes
        pagamentosServicoPendentes.forEach(pag => {
            todos.push({ tipo: 'servico', id: pag.id });
        });
        
        // Parcelas
        pagamentosParcelados.forEach(pagParcelado => {
            pagParcelado.parcelas?.forEach(parcela => {
                if (parcela.status === 'Previsto') {
                    todos.push({ tipo: 'parcela', id: parcela.id });
                }
            });
        });
        
        setItensSelecionados(todos);
    };
    
    const desselecionarTodos = () => {
        setItensSelecionados([]);
    };
    
    // MUDANÇA 5: Handler para marcar múltiplos como pagos
    const handleMarcarMultiplosComoPago = async () => {
        if (itensSelecionados.length === 0) {
            alert('Selecione pelo menos um item para marcar como pago.');
            return;
        }
        
        try {
            const res = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        itens: itensSelecionados,
                        data_pagamento: new Date().toISOString().split('T')[0]
                    })
                }
            );
            
            if (res.ok) {
                const data = await res.json();
                const sucessos = data.resultados.filter(r => r.status === 'success').length;
                const erros = data.resultados.filter(r => r.status === 'error').length;
                
                alert(`${sucessos} item(ns) marcado(s) como pago. ${erros > 0 ? erros + ' erro(s).' : ''}`);
                setItensSelecionados([]);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao marcar itens como pagos:', error);
            alert('Erro ao processar pagamentos');
        }
    };

    // Carregar dados
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // <--- MUDANÇA: Carregar dados principais primeiro (rápido) -->
            const [futuroRes, parceladoRes, previsoesRes, servicoPendentesRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/previsoes`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/obras/${obraId}/pagamentos-servico-pendentes`).catch(e => ({ ok: false, error: e }))
            ]);

            // Processar respostas principais
            if (futuroRes.ok) {
                try {
                    const data = await futuroRes.json();
                    setPagamentosFuturos(data);
                } catch (e) {
                    console.error('Erro ao processar pagamentos futuros:', e);
                }
            }

            if (previsoesRes.ok) {
                try {
                    const data = await previsoesRes.json();
                    setPrevisoes(data);
                } catch (e) {
                    console.error('Erro ao processar previsões:', e);
                }
            }
            
            if (servicoPendentesRes.ok) {
                try {
                    const data = await servicoPendentesRes.json();
                    setPagamentosServicoPendentes(data);
                } catch (e) {
                    console.error('Erro ao processar pagamentos pendentes:', e);
                }
            }

            // <--- MUDANÇA: Processar parcelados SEM bloquear a tela -->
            if (parceladoRes.ok) {
                try {
                    const data = await parceladoRes.json();
                    
                    // Mostrar dados básicos imediatamente (sem parcelas)
                    setPagamentosParcelados(data.map(p => ({ ...p, parcelas: [] })));
                    setIsLoading(false); // <-- Libera a tela AQUI
                    
                    // Buscar parcelas em background (não bloqueia mais!)
                    const parceladosComParcelas = await Promise.all(
                        data.map(async (pagParcelado) => {
                            try {
                                const parcelasRes = await fetchWithAuth(
                                    `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagParcelado.id}/parcelas`
                                );
                                if (parcelasRes.ok) {
                                    const parcelas = await parcelasRes.json();
                                    return { ...pagParcelado, parcelas };
                                }
                            } catch (err) {
                                console.error('Erro ao buscar parcelas:', err);
                            }
                            return { ...pagParcelado, parcelas: [] };
                        })
                    );
                    
                    // Atualiza com parcelas quando disponíveis
                    setPagamentosParcelados(parceladosComParcelas);
                } catch (e) {
                    console.error('Erro ao processar parcelados:', e);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Erro ao carregar cronograma financeiro:', error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [obraId]);

    // Salvar Pagamento Futuro
    const handleSavePagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento futuro cadastrado com sucesso!');
                setCadastrarFuturoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar pagamento futuro:', error);
            alert('Erro ao salvar pagamento futuro');
        }
    };

    // Editar Pagamento Futuro
    const handleEditarPagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${pagamentoFuturoSelecionado.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento futuro atualizado com sucesso!');
                setEditarFuturoVisible(false);
                setPagamentoFuturoSelecionado(null);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao atualizar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao editar pagamento futuro:', error);
            alert('Erro ao editar pagamento futuro');
        }
    };

    // Salvar Pagamento Parcelado
    const handleSavePagamentoParcelado = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento parcelado cadastrado com sucesso!');
                setCadastrarParceladoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar pagamento parcelado:', error);
            alert('Erro ao salvar pagamento parcelado');
        }
    };

    // Deletar Pagamento Futuro
    const handleDeletePagamentoFuturo = async (id) => {
        const idStr = String(id);
        
        // Se for um pagamento de serviço (id começa com "servico-"), não pode deletar daqui
        if (idStr.startsWith('servico-')) {
            alert('⚠️ Este pagamento está vinculado a um serviço.\n\nPara excluí-lo, acesse a página do serviço correspondente.');
            return;
        }
        
        if (!window.confirm('Deseja realmente excluir este pagamento futuro?')) return;

        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                alert('Pagamento futuro excluído com sucesso!');
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao excluir pagamento futuro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao deletar pagamento futuro:', error);
            alert('Erro ao deletar pagamento futuro: ' + error.message);
        }
    };

    // Marcar Pagamento Futuro Individual como Pago
    const handleMarcarPagamentoFuturoPago = async (id) => {
        if (!window.confirm('Deseja marcar este pagamento como pago?')) return;

        try {
            let res;
            const idStr = String(id);
            
            if (idStr.startsWith('servico-')) {
                // É um pagamento de serviço pendente "injetado" na lista
                const servPagId = parseInt(idStr.split('-').pop(), 10);
                console.log("Marcando pagamento de serviço futuro como pago:", servPagId);
                res = await fetchWithAuth(
                    `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            itens: [{ tipo: 'servico', id: servPagId }],
                            data_pagamento: new Date().toISOString().split('T')[0]
                        })
                    }
                );
            } else {
                // É um pagamento futuro "normal"
                console.log("Marcando pagamento futuro normal como pago:", id);
                res = await fetchWithAuth(
                    `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}/marcar-pago`,
                    { method: 'POST' }
                );
            }

            if (res.ok) {
                // <--- MUDANÇA: Atualização LOCAL instantânea (sem reload) -->
                if (idStr.startsWith('servico-')) {
                    // Remove da lista de serviços pendentes
                    const servPagId = parseInt(idStr.split('-').pop(), 10);
                    setPagamentosServicoPendentes(prev => 
                        prev.filter(p => p.id !== servPagId)
                    );
                } else {
                    // Remove da lista de pagamentos futuros
                    setPagamentosFuturos(prev => 
                        prev.filter(pag => pag.id !== id)
                    );
                }
                
                // Feedback visual rápido
                const toast = document.createElement('div');
                toast.textContent = '✅ Pagamento marcado como pago!';
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:15px 25px;border-radius:8px;z-index:10000;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
                
                // CORREÇÃO: Usar fetchData() local do modal (não tem acesso aos setters globais)
                setTimeout(() => fetchData(), 500);
            } else {
                const errorData = await res.json();
                alert('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao marcar pagamento como pago:', error);
            alert('Erro ao processar: ' + error.message);
        }
    };

    // Deletar Pagamento Parcelado
    const handleDeletePagamentoParcelado = async (id) => {
        if (!window.confirm('Deseja realmente excluir este pagamento parcelado?')) return;

        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${id}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                alert('Pagamento parcelado excluído com sucesso!');
                fetchData();
            } else {
                alert('Erro ao excluir pagamento parcelado');
            }
        } catch (error) {
            console.error('Erro ao deletar pagamento parcelado:', error);
            alert('Erro ao deletar pagamento parcelado');
        }
    };

    // Marcar parcela como paga
    const handleMarcarParcelaPaga = async (pagamento) => {
        if (!window.confirm(`Confirma o pagamento da próxima parcela (${pagamento.proxima_parcela_numero}/${pagamento.numero_parcelas})?`)) {
            return;
        }

        try {
            // 1. Buscar as parcelas individuais
            const resListaParcelas = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}/parcelas`
            );

            if (!resListaParcelas.ok) {
                alert('Erro ao buscar parcelas');
                return;
            }

            const parcelas = await resListaParcelas.json();
            
            // 2. Encontrar a próxima parcela não paga
            const proximaParcela = parcelas.find(p => p.status !== 'Pago');

            if (!proximaParcela) {
                alert('Todas as parcelas já foram pagas!');
                return;
            }

            // 3. Marcar a parcela como paga (isso criará o lançamento no backend)
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}/parcelas/${proximaParcela.id}/pagar`,
                {
                    method: 'POST',
                    body: JSON.stringify({ data_pagamento: getTodayString() })
                }
            );

            if (res.ok) {
                const resultado = await res.json();
                
                // <--- MUDANÇA: Atualização LOCAL instantânea (sem reload) -->
                setPagamentosParcelados(prev => {
                    return prev.map(pag => {
                        if (pag.id === pagamento.id) {
                            // Atualizar as parcelas
                            const parcelasAtualizadas = pag.parcelas ? pag.parcelas.map(p => 
                                p.id === proximaParcela.id 
                                    ? { ...p, status: 'Pago', data_pagamento: getTodayString() }
                                    : p
                            ) : [];
                            
                            // Recalcular próxima parcela
                            const proxima = parcelasAtualizadas.find(p => p.status !== 'Pago');
                            const numeroProxima = proxima ? proxima.numero_parcela : null;
                            const vencimentoProximo = proxima ? proxima.data_vencimento : null;
                            
                            // Se todas pagas, marcar como Concluído
                            const todasPagas = parcelasAtualizadas.every(p => p.status === 'Pago');
                            
                            return {
                                ...pag,
                                parcelas: parcelasAtualizadas,
                                proxima_parcela_numero: numeroProxima,
                                proxima_parcela_vencimento: vencimentoProximo,
                                status: todasPagas ? 'Concluído' : 'Ativo'
                            };
                        }
                        return pag;
                    });
                });
                
                // Feedback visual rápido
                const toast = document.createElement('div');
                toast.textContent = `✅ ${resultado.mensagem}`;
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:15px 25px;border-radius:8px;z-index:10000;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
                
                // CORREÇÃO: Usar fetchData() local do modal (não tem acesso aos setters globais)
                setTimeout(() => fetchData(), 500);
            } else {
                const erro = await res.json();
                alert(`Erro: ${erro.erro || 'Erro ao marcar parcela como paga'}`);
            }
        } catch (error) {
            console.error('Erro ao marcar parcela:', error);
            alert('Erro ao marcar parcela como paga');
        }
    };

    if (isLoading) {
        if (embedded) {
            return <div className="loading-screen">Carregando cronograma...</div>;
        }
        return <Modal onClose={onClose}><div className="loading-screen">Carregando cronograma...</div></Modal>;
    }

    const totalPrevisoes = previsoes.reduce((acc, prev) => acc + prev.valor, 0);

    // Conteúdo do cronograma (usado tanto em embedded quanto em modal)
    const cronogramaContent = (
        <div style={{ maxHeight: embedded ? 'none' : '85vh', overflowY: embedded ? 'visible' : 'auto' }}>
            <h2>{simplified ? '🏠' : '💰'} {simplified ? 'Início' : 'Cronograma Financeiro'} - {obraNome}</h2>
            <QuadroAlertasVencimento obraId={obraId} /> 
            {/* Botões de Exportação */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {/* REMOVIDO: Botões de cadastro movidos para o dashboard principal
                <button 
                    onClick={() => setCadastrarFuturoVisible(true)} 
                    className="submit-btn"
                >
                    ➕ Cadastrar Pagamento Futuro (Único)
                </button>
                <button 
                    onClick={() => setCadastrarParceladoVisible(true)} 
                    className="submit-btn"
                    style={{ backgroundColor: 'var(--cor-acento)' }}
                >
                    ➕ Cadastrar Pagamento Parcelado
                </button>
                */}
                
                {/* NOVO: Botão Gerar PDF - apenas no modo completo */}
                {!simplified && (
                <button 
                    onClick={async () => {
                            try {
                                const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-financeiro/pdf`);
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `cronograma_financeiro_obra_${obraId}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } else {
                                    alert('Erro ao gerar PDF');
                                }
                            } catch (error) {
                                console.error('Erro ao exportar PDF:', error);
                                alert('Erro ao gerar PDF do cronograma financeiro');
                            }
                        }} 
                        className="export-btn pdf"
                        title="Gerar relatório PDF do cronograma financeiro"
                    >
                        📄 Gerar PDF
                    </button>
                )}
                    
                    {!simplified && itensSelecionados.length > 0 && (
                        <button 
                            onClick={handleMarcarMultiplosComoPago} 
                            className="cf-btn cf-btn-success"
                        >
                            ✓ Marcar {itensSelecionados.length} Selecionado(s) como Pago
                        </button>
                    )}
                </div>

                {/* Previsão de Fluxo de Caixa - NOVO DESIGN */}
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">📊 Previsão de Fluxo de Caixa</div>
                            <div className="cf-section-subtitle">Soma automática de pagamentos futuros e parcelados</div>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-financeiro/pdf`);
                                    if (response.ok) {
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `cronograma_financeiro_obra_${obraId}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    }
                                } catch (error) {
                                    console.error('Erro ao exportar PDF:', error);
                                }
                            }} 
                            className="cf-btn cf-btn-outline"
                        >
                            📄 Gerar PDF
                        </button>
                    </div>
                    
                    {previsoes.length > 0 ? (
                        <>
                            {/* Gráfico de Barras */}
                            <div className="cf-chart-container">
                                {previsoes.slice(0, 6).map((prev, index) => {
                                    const maxValor = Math.max(...previsoes.map(p => p.valor));
                                    const altura = maxValor > 0 ? (prev.valor / maxValor) * 130 : 0;
                                    
                                    return (
                                        <div key={index} className="cf-chart-bar">
                                            <div className="cf-chart-bar-value">
                                                {formatCurrency(prev.valor).replace('R$', '')}
                                            </div>
                                            <div 
                                                className="cf-chart-bar-fill"
                                                style={{ height: `${Math.max(altura, 20)}px` }}
                                            />
                                            <span className="cf-chart-bar-label">{prev.mes_nome}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total */}
                            <div className="cf-chart-total">
                                <span className="cf-chart-total-label">TOTAL PREVISTO</span>
                                <span className="cf-chart-total-value">{formatCurrency(totalPrevisoes)}</span>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhuma previsão calculada. Cadastre pagamentos futuros ou parcelados.
                        </p>
                    )}
                </div>

                {/* NOVO: Listagem de Pagamentos de Serviço Pendentes */}
                {pagamentosServicoPendentes.length > 0 && (
                    <div className="cf-section" style={{ marginBottom: '20px', background: 'var(--cor-warning-bg)', border: '2px solid var(--cor-warning-light)' }}>
                        <h3>⚠️ Pagamentos de Serviço Pendentes</h3>
                        <p style={{ fontSize: '0.9em', color: '#856404', marginBottom: '15px' }}>
                            Estes são pagamentos vinculados a serviços que ainda não foram quitados totalmente.
                        </p>
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>✓</th>
                                    <th>Serviço</th>
                                    <th>Descrição</th>
                                    <th>Tipo</th>
                                    <th>Valor Total</th>
                                    <th>Pago</th>
                                    <th>Restante</th>
                                    <th>Prior.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosServicoPendentes.map(pag => (
                                    <tr key={pag.id}>
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={isItemSelecionado('servico', pag.id)}
                                                onChange={() => toggleSelecao('servico', pag.id)}
                                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                            />
                                        </td>
                                        <td><strong>{pag.servico_nome}</strong></td>
                                        <td>{pag.descricao}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.tipo_pagamento === 'Mão de Obra' ? '#007bff' : '#28a745',
                                                color: 'white'
                                            }}>
                                                {pag.tipo_pagamento}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(pag.valor_total)}</td>
                                        <td>{formatCurrency(pag.valor_pago)}</td>
                                        <td><strong>{formatCurrency(pag.valor_restante)}</strong></td>
                                        <td>
                                            <PrioridadeBadge prioridade={pag.prioridade} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagamentos Futuros (Únicos) - NOVO DESIGN */}
                {!simplified && (
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                📋 Pagamentos Futuros
                                <span className="cf-badge cf-badge-info">Únicos</span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique na descrição para editar ou no badge para marcar como pago
                            </div>
                        </div>
                        <button 
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosFuturosCollapsed(prev => !prev)}
                        >
                            {isPagamentosFuturosCollapsed ? '▼ Expandir' : '▲ Recolher'}
                        </button>
                    </div>
                    
                    {!isPagamentosFuturosCollapsed && (
                        <>
                    {pagamentosFuturos.filter(pag => pag.status === 'Previsto').length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pagamentosFuturos.filter(pag => pag.status === 'Previsto').map(pag => (
                                <div 
                                    key={pag.id} 
                                    className="cf-pagamento-futuro-item"
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    {/* Checkbox */}
                                    {pag.status === 'Previsto' && (
                                        <input 
                                            type="checkbox" 
                                            checked={isItemSelecionado('futuro', pag.id)}
                                            onChange={() => toggleSelecao('futuro', pag.id)}
                                            style={{ 
                                                cursor: 'pointer', 
                                                width: '18px', 
                                                height: '18px',
                                                marginRight: '12px',
                                                accentColor: 'var(--cor-primaria)'
                                            }}
                                        />
                                    )}
                                    
                                    {/* Ícone */}
                                    <div className="cf-pagamento-futuro-icon">
                                        {String(pag.id).startsWith('servico-') ? '🔗' : '📄'}
                                    </div>
                                    
                                    {/* Info */}
                                    <div 
                                        className="cf-pagamento-futuro-info"
                                        onClick={() => {
                                            if (pag.status === 'Previsto' && !String(pag.id).startsWith('servico-')) {
                                                setPagamentoFuturoSelecionado(pag);
                                                setEditarFuturoVisible(true);
                                            }
                                        }}
                                        style={{ 
                                            cursor: pag.status === 'Previsto' && !String(pag.id).startsWith('servico-') ? 'pointer' : 'default' 
                                        }}
                                    >
                                        <div className="cf-pagamento-futuro-desc" style={{ 
                                            color: pag.status === 'Previsto' ? 'var(--cor-primaria)' : 'var(--cor-texto)'
                                        }}>
                                            {pag.descricao}
                                        </div>
                                        <div className="cf-pagamento-futuro-meta">
                                            {pag.fornecedor || 'Sem fornecedor'} • {new Date(pag.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    
                                    {/* Valor */}
                                    <div className="cf-pagamento-futuro-valor">
                                        {formatCurrency(pag.valor)}
                                    </div>
                                    
                                    {/* Badge Status */}
                                    <span 
                                        onClick={() => {
                                            if (pag.status === 'Previsto') {
                                                handleMarcarPagamentoFuturoPago(pag.id);
                                            }
                                        }}
                                        className="cf-badge cf-badge-warning"
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        title="Clique para marcar como pago"
                                    >
                                        Pendente
                                    </span>
                                    
                                    {/* Ações */}
                                    <div className="cf-pagamento-futuro-actions">
                                        {pag.status === 'Previsto' && !String(pag.id).startsWith('servico-') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePagamentoFuturo(pag.id);
                                                }}
                                                className="cf-btn cf-btn-danger"
                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                                title="Excluir pagamento"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhum pagamento futuro cadastrado.
                        </p>
                    )}
                    </>
                    )}
                </div>
                )}

                {/* Listagem de Pagamentos Parcelados - CARDS ESTILO POPUP */}
                {!simplified && (
                <div className="cf-section">
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                📦 Pagamentos Parcelados
                                <span className="cf-badge cf-badge-purple">
                                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length} ativos
                                </span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique no card para editar • Bolinhas = parcelas (● paga ○ pendente)
                            </div>
                        </div>
                        <button 
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosParceladosCollapsed(prev => !prev)}
                        >
                            {isPagamentosParceladosCollapsed ? '▼ Expandir' : '▲ Recolher'}
                        </button>
                    </div>
                    
                    {!isPagamentosParceladosCollapsed && (
                        <>
                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length > 0 ? (
                        <div className="parcelas-cards-grid">
                            {pagamentosParcelados.filter(pag => pag.status === 'Ativo').map(pag => {
                                const parcelasPagas = pag.proxima_parcela_numero ? pag.proxima_parcela_numero - 1 : pag.numero_parcelas;
                                const progresso = Math.round((parcelasPagas / pag.numero_parcelas) * 100);
                                
                                // Cores por periodicidade
                                const cores = {
                                    'Semanal': { cor: 'var(--cor-warning-light)', corText: '#92400e', corBg: 'var(--cor-warning-bg)' },
                                    'Quinzenal': { cor: 'var(--cor-purple-light)', corText: '#6b21a8', corBg: 'var(--cor-purple-bg)' },
                                    'Mensal': { cor: 'var(--cor-info-light)', corText: '#0369a1', corBg: 'var(--cor-info-bg)' }
                                };
                                const corConfig = cores[pag.periodicidade] || cores['Mensal'];
                                
                                return (
                                    <div 
                                        key={pag.id}
                                        className="parcela-popup-card"
                                        onClick={() => handleAbrirEditarParcelas(pag)}
                                        style={{ borderColor: 'var(--cor-borda)' }}
                                    >
                                        {/* Header com bolinhas */}
                                        <div 
                                            className="parcela-popup-header"
                                            style={{ 
                                                background: corConfig.corBg,
                                                borderBottomColor: corConfig.cor,
                                                color: corConfig.corText
                                            }}
                                        >
                                            <span className="parcela-popup-title">
                                                📦 {pag.descricao}
                                            </span>
                                            
                                            {/* Bolinhas = Parcelas */}
                                            <div className="parcelas-dots" style={{ color: corConfig.cor }}>
                                                {Array.from({ length: Math.min(pag.numero_parcelas, 10) }, (_, i) => (
                                                    <div 
                                                        key={i}
                                                        className={`parcela-dot ${i < parcelasPagas ? 'paga' : 'pendente'}`}
                                                        style={{ borderColor: corConfig.cor, background: i < parcelasPagas ? corConfig.cor : 'transparent' }}
                                                        title={i < parcelasPagas ? `Parcela ${i + 1} - Paga` : `Parcela ${i + 1} - Pendente`}
                                                    />
                                                ))}
                                                {pag.numero_parcelas > 10 && (
                                                    <span style={{ fontSize: '10px', marginLeft: '4px' }}>+{pag.numero_parcelas - 10}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="parcela-popup-content">
                                            {/* Valor Total */}
                                            <div className="parcela-popup-valor">
                                                <div className="parcela-popup-valor-number">
                                                    {formatCurrency(pag.valor_total)}
                                                </div>
                                                <div className="parcela-popup-periodo">
                                                    {pag.periodicidade || 'Mensal'}
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="parcela-popup-info-grid">
                                                <div className="parcela-popup-info-item">
                                                    <div className="parcela-popup-info-label">Parcela</div>
                                                    <div className="parcela-popup-info-value">
                                                        {pag.proxima_parcela_numero === 0 ? 'Entrada' : 
                                                         `${pag.proxima_parcela_numero || pag.numero_parcelas}/${pag.numero_parcelas}`}
                                                    </div>
                                                </div>
                                                <div className="parcela-popup-info-item">
                                                    <div className="parcela-popup-info-label">Valor/Parc</div>
                                                    <div className="parcela-popup-info-value">
                                                        {formatCurrency(pag.valor_proxima_parcela || pag.valor_parcela).replace('R$', '')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Vencimento */}
                                            <div className="parcela-popup-vencimento">
                                                <span className="parcela-popup-vencimento-label">📅 Vencimento</span>
                                                <span className="parcela-popup-vencimento-value">
                                                    {pag.proxima_parcela_vencimento ? 
                                                        new Date(pag.proxima_parcela_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') :
                                                        'Quitado'
                                                    }
                                                </span>
                                            </div>

                                            {/* Barra de Progresso */}
                                            <div className="parcela-popup-progress">
                                                <div className="parcela-popup-progress-header">
                                                    <span className="parcela-popup-progress-label">Progresso</span>
                                                    <span className="parcela-popup-progress-percent" style={{ color: corConfig.corText }}>{progresso}%</span>
                                                </div>
                                                <div className="parcela-popup-progress-bar">
                                                    <div 
                                                        className="parcela-popup-progress-fill"
                                                        style={{ width: `${progresso}%`, background: corConfig.cor }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="parcela-popup-footer">
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    className="parcela-popup-btn"
                                                    style={{ flex: 1, background: corConfig.cor, color: corConfig.corText }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarcarParcelaPaga(pag);
                                                    }}
                                                >
                                                    💰 {pag.proxima_parcela_numero === 0 ? 'Pagar Entrada' : `Pagar Parcela ${pag.proxima_parcela_numero || pag.numero_parcelas}`}
                                                </button>
                                                <button 
                                                    className="parcela-popup-btn"
                                                    style={{ background: 'var(--cor-vermelho-bg)', color: 'var(--cor-vermelho)', padding: '10px 12px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeletePagamentoParcelado(pag.id);
                                                    }}
                                                    title="Excluir parcelamento"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhum pagamento parcelado cadastrado.
                        </p>
                    )}
                    </>
                    )}
                </div>
                )}

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button onClick={onClose} className="voltar-btn">
                        {embedded ? '← Voltar às Obras' : 'Fechar'}
                    </button>
                </div>
            </div>
    );

    // Retornar com ou sem Modal dependendo do modo
    if (embedded) {
        return (
            <>
                {cronogramaContent}
                
                {/* Modais de Cadastro */}
                {isCadastrarFuturoVisible && (
                    <CadastrarPagamentoFuturoModal
                        onClose={() => setCadastrarFuturoVisible(false)}
                        onSave={handleSavePagamentoFuturo}
                        obraId={obraId}
                    />
                )}

                {isCadastrarParceladoVisible && (
                    <CadastrarPagamentoParceladoModal
                        onClose={() => setCadastrarParceladoVisible(false)}
                        onSave={handleSavePagamentoParcelado}
                        obraId={obraId}
                    />
                )}
                
                {isEditarFuturoVisible && pagamentoFuturoSelecionado && (
                    <EditarPagamentoFuturoModal
                        onClose={() => {
                            setEditarFuturoVisible(false);
                            setPagamentoFuturoSelecionado(null);
                        }}
                        onSave={handleEditarPagamentoFuturo}
                        pagamento={pagamentoFuturoSelecionado}
                    />
                )}
                
                {isEditarParcelasVisible && pagamentoParceladoSelecionado && (
                    <EditarParcelasModal
                        obraId={obraId}
                        pagamentoParcelado={pagamentoParceladoSelecionado}
                        onClose={() => {
                            setEditarParcelasVisible(false);
                            setPagamentoParceladoSelecionado(null);
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <Modal onClose={onClose} customWidth="96%">
            {cronogramaContent}

            {/* Modais de Cadastro */}
            {isCadastrarFuturoVisible && (
                <CadastrarPagamentoFuturoModal
                    onClose={() => setCadastrarFuturoVisible(false)}
                    onSave={handleSavePagamentoFuturo}
                    obraId={obraId}
                />
            )}

            {isCadastrarParceladoVisible && (
                <CadastrarPagamentoParceladoModal
                    onClose={() => setCadastrarParceladoVisible(false)}
                    onSave={handleSavePagamentoParcelado}
                    obraId={obraId}
                />
            )}
            
            {isEditarFuturoVisible && pagamentoFuturoSelecionado && (
                <EditarPagamentoFuturoModal
                    onClose={() => {
                        setEditarFuturoVisible(false);
                        setPagamentoFuturoSelecionado(null);
                    }}
                    onSave={handleEditarPagamentoFuturo}
                    pagamento={pagamentoFuturoSelecionado}
                />
            )}
            
            {isEditarParcelasVisible && pagamentoParceladoSelecionado && (
                <EditarParcelasModal
                    obraId={obraId}
                    pagamentoParcelado={pagamentoParceladoSelecionado}
                    onClose={() => {
                        setEditarParcelasVisible(false);
                        setPagamentoParceladoSelecionado(null);
                    }}
                />
            )}
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL (ROTEADOR) ---
function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true); 

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Falha ao carregar dados de autenticação:", error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        setIsLoading(false); 
    }, []);

    const login = (data) => {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {user ? <Dashboard /> : <LoginScreen />}
        </AuthContext.Provider>
    );
}

export default App;