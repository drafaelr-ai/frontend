import React, { useState, useEffect } from 'react';
import NotificacoesDropdown from './NotificacoesDropdown';

const getInitials = (nome) => {
    if (!nome) return '?';
    const parts = nome.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const WindowsNavStyles = () => (
    <style>{`
        /* === LAYOUT WRAPPER === */
        .app-layout-windows {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: var(--surface-page);
        }

        .main-content-windows {
            flex: 1;
            padding: 20px;
            overflow-x: hidden;
            overflow-y: auto;
        }

        /* === NAVBAR (48px) === */
        .wnb-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 20px;
            background: var(--surface-dark);
            position: sticky;
            top: 0;
            z-index: 100;
            flex-shrink: 0;
        }

        .wnb-left {
            display: flex;
            align-items: center;
            gap: 32px;
        }

        .wnb-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .wnb-logo-box {
            width: 22px;
            height: 22px;
            background: var(--brand-accent);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--surface-dark);
            font-size: 13px;
            flex-shrink: 0;
        }

        .wnb-logo-text {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-on-dark);
            letter-spacing: -0.01em;
        }

        .wnb-nav {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .wnb-item {
            padding: 6px 10px;
            background: transparent;
            border: none;
            font-size: 12px;
            color: var(--text-on-dark-muted);
            cursor: pointer;
            border-radius: 5px;
            transition: background 0.15s, color 0.15s;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            font-family: var(--font-sans);
            white-space: nowrap;
        }

        .wnb-item:hover {
            background: rgba(255,255,255,0.04);
            color: var(--text-on-dark);
        }

        .wnb-item.wnb-item--open {
            background: rgba(255,255,255,0.08);
            color: var(--text-on-dark);
        }

        .wnb-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .wnb-obra-selector {
            padding: 0 10px;
            height: 28px;
            border: 0.5px solid rgba(255,255,255,0.08);
            border-radius: 6px;
            font-size: 12px;
            background: rgba(255,255,255,0.06);
            cursor: pointer;
            color: var(--text-on-dark-muted);
            max-width: 180px;
            font-family: var(--font-sans);
        }

        .wnb-obra-selector:hover {
            background: rgba(255,255,255,0.1);
        }

        .wnb-obra-selector option {
            background: var(--surface-dark);
            color: var(--text-on-dark);
        }

        .wnb-avatar {
            width: 28px;
            height: 28px;
            background: var(--surface-dark-soft);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 500;
            color: var(--text-on-dark);
            cursor: pointer;
            flex-shrink: 0;
            user-select: none;
        }

        /* === MENU DROPDOWN === */
        .menu-dropdown-container {
            position: relative;
        }

        .menu-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 99;
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

        .menu-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            min-width: 220px;
            background: var(--surface-card);
            border: 0.5px solid var(--border-subtle);
            border-radius: 8px;
            box-shadow: var(--shadow-popup);
            padding: 4px 0;
            z-index: 100;
            animation: dropdownFadeIn 0.15s ease;
        }

        @keyframes dropdownFadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .menu-dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 8px 12px;
            background: transparent;
            border: none;
            font-size: 13px;
            color: var(--text-secondary);
            cursor: pointer;
            text-align: left;
            transition: background 0.1s;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            user-select: none;
            font-family: var(--font-sans);
        }

        .menu-dropdown-item:hover {
            background: var(--surface-muted);
            color: var(--text-primary);
        }

        .menu-dropdown-item.active {
            background: var(--status-info-bg);
            color: var(--status-info-text);
        }

        .menu-item-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .menu-item-icon {
            width: 18px;
            text-align: center;
            font-size: 14px;
            flex-shrink: 0;
        }

        .menu-item-shortcut {
            font-size: 11px;
            color: var(--text-muted);
            font-family: 'JetBrains Mono', ui-monospace, 'Consolas', monospace;
        }

        .menu-separator {
            height: 0.5px;
            background: var(--border-subtle);
            margin: 4px 8px;
        }

        /* === TOOLBAR (abaixo do nav) === */
        .windows-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            background: var(--surface-card);
            border-bottom: 0.5px solid var(--border-subtle);
            flex-shrink: 0;
        }

        .toolbar-items {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .toolbar-separator {
            width: 0.5px;
            height: 22px;
            background: var(--border-subtle);
            margin: 0 6px;
        }

        .toolbar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 6px 12px;
            background: transparent;
            border: 0.5px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
            font-family: var(--font-sans);
        }

        .toolbar-btn:hover {
            background: var(--surface-muted);
            border-color: var(--border-subtle);
        }

        .toolbar-btn.active {
            background: var(--status-info-bg);
            border-color: var(--border-default);
        }

        .toolbar-icon {
            font-size: 18px;
        }

        .toolbar-label {
            font-size: 10px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .toolbar-btn.active .toolbar-label {
            color: var(--status-info-text);
        }

        .toolbar-actions {
            display: flex;
            gap: 8px;
        }

        .toolbar-action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            font-family: var(--font-sans);
        }

        .toolbar-action-btn.primary {
            background: var(--brand-primary);
            color: var(--text-on-dark);
        }

        .toolbar-action-btn.primary:hover {
            background: var(--brand-primary-soft);
        }

        /* === RESPONSIVE === */
        @media (max-width: 1024px) {
            .toolbar-label { display: none; }
            .toolbar-btn { padding: 6px 8px; }
            .wnb-obra-selector { max-width: 140px; }
        }

        @media (max-width: 768px) {
            .wnb-nav { display: none; }
            .wnb-obra-selector { max-width: 110px; }
            .windows-toolbar { flex-wrap: wrap; gap: 8px; }
            .toolbar-items { flex-wrap: wrap; }
            .toolbar-actions { width: 100%; justify-content: center; }
            .main-content-windows { padding: 12px; }
            .menu-dropdown {
                position: fixed;
                top: 56px;
                left: 10px;
                right: 10px;
                bottom: auto;
                max-height: 60vh;
                overflow-y: auto;
                min-width: auto;
                width: calc(100% - 20px);
                z-index: 9999;
            }
            .menu-dropdown-item {
                padding: 12px 14px;
                min-height: 44px;
                font-size: 14px;
            }
            .menu-separator { margin: 8px 0; }
        }
    `}</style>
);

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

    const menuStructure = [
        {
            id: 'obra',
            label: 'Obra',
            items: [
                { id: 'home',     label: 'Início',          icon: '🏠', shortcut: 'Alt+I' },
                { id: 'obras',    label: 'Minhas Obras',    icon: '🏗️', shortcut: 'Alt+O' },
                { type: 'separator' },
                { id: 'exportar', label: 'Exportar Relatório...', icon: '📊', shortcut: 'Ctrl+E' },
                { type: 'separator' },
                { id: 'sair',     label: 'Sair',            icon: '🚪', shortcut: 'Alt+F4', action: 'logout' },
            ]
        },
        {
            id: 'financeiro',
            label: 'Financeiro',
            items: [
                { id: 'financeiro', label: 'Cronograma Financeiro', icon: '📅', shortcut: 'F2' },
                { id: 'boletos',    label: 'Gestão de Boletos',     icon: '📄', shortcut: 'F3' },
                { id: 'caixa',      label: 'Caixa de Obra',         icon: '💰', shortcut: 'F4' },
                { type: 'separator' },
                { id: 'pagamento',  label: 'Novo Pagamento...',     icon: '💳', shortcut: 'Ctrl+P' },
            ]
        },
        {
            id: 'cronograma',
            label: 'Cronograma',
            items: [
                { id: 'cronograma-obra', label: 'Cronograma de Obras', icon: '📋', shortcut: 'F5' },
            ]
        },
        {
            id: 'documentos',
            label: 'Documentos',
            items: [
                { id: 'diario',    label: 'Diário de Obras',    icon: '📓', shortcut: 'F6' },
                { id: 'agenda',    label: 'Agenda de Demandas', icon: '📆', shortcut: 'F9' },
                { id: 'orcamentos',label: 'Solicitações',       icon: '📝', shortcut: 'F7', adminOnly: true },
                { id: 'relatorios',label: 'Relatórios',         icon: '📊', shortcut: 'F8' },
            ]
        },
        {
            id: 'ferramentas',
            label: 'Ferramentas',
            items: [
                { id: 'usuarios',       label: 'Gerenciar Usuários', icon: '👥', masterOnly: true },
                { type: 'separator' },
                { id: 'configuracoes',  label: 'Configurações',      icon: '⚙️' },
            ]
        },
        {
            id: 'ajuda',
            label: 'Ajuda',
            items: [
                { id: 'tutorial', label: 'Tutorial',            icon: '📖' },
                { id: 'atalhos',  label: 'Atalhos de Teclado', icon: '⌨️' },
                { type: 'separator' },
                { id: 'sobre',    label: 'Sobre o Obraly',     icon: 'ℹ️' },
            ]
        },
    ];

    const toolbarItems = [
        { id: 'home',          icon: '🏠', label: 'Início' },
        { id: 'orcamento-eng', icon: '📐', label: 'Orçamento' },
        { id: 'financeiro',    icon: '📅', label: 'Financeiro' },
        { id: 'cronograma-obra',icon: '📋', label: 'Cronograma' },
        { id: 'boletos',       icon: '📄', label: 'Boletos' },
        { id: 'relatorios',    icon: '📊', label: 'Relatórios' },
        { id: 'diario',        icon: '📓', label: 'Diário' },
        { id: 'agenda',        icon: '📆', label: 'Agenda' },
        { id: 'caixa',         icon: '💰', label: 'Caixa' },
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
        if (item.id === 'obras') setObraSelecionada(null);
        setCurrentPage(item.id);
        setActiveMenu(null);
    };

    const handleMouseEnter = (menuId) => {
        if (activeMenu !== null) setActiveMenu(menuId);
    };

    const handleObraChange = (e) => {
        const obraId = parseInt(e.target.value);
        if (obraId === 0) {
            setObraSelecionada(null);
            setCurrentPage('obras');
        } else {
            if (typeof window.navigateTo === 'function') {
                window.navigateTo('home', obraId);
            }
            if (typeof window.handleSelectObra === 'function') {
                window.handleSelectObra(obraId);
            } else {
                const obra = obras.find(o => o.id === obraId);
                if (obra) {
                    setObraSelecionada(obra);
                    setCurrentPage('home');
                }
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
            {/* === NAVBAR === */}
            <nav className="wnb-bar" ref={menuRef}>
                <div className="wnb-left">
                    <div className="wnb-logo">
                        <div className="wnb-logo-box">
                            <i className="ti ti-building-skyscraper" aria-hidden="true"></i>
                        </div>
                        <span className="wnb-logo-text">Obraly</span>
                    </div>

                    <div className="wnb-nav">
                        {menuStructure.map(menu => (
                            <div key={menu.id} className="menu-dropdown-container">
                                <button
                                    className={`wnb-item${activeMenu === menu.id ? ' wnb-item--open' : ''}`}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMenuClick(menu.id); }}
                                    onTouchEnd={(e) => { e.preventDefault(); handleMenuClick(menu.id); }}
                                    onMouseEnter={() => handleMouseEnter(menu.id)}
                                >
                                    {menu.label}
                                </button>

                                {activeMenu === menu.id && (
                                    <>
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
                                                        className={`menu-dropdown-item${currentPage === item.id ? ' active' : ''}`}
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
                </div>

                <div className="wnb-right">
                    <select
                        className="wnb-obra-selector"
                        value={obraSelecionada?.id || 0}
                        onChange={handleObraChange}
                        title="Selecionar obra"
                    >
                        <option value={0}>🏗️ Selecionar obra...</option>
                        {(obras || []).map(obra => (
                            <option key={obra.id} value={obra.id}>{obra.nome}</option>
                        ))}
                    </select>

                    <NotificacoesDropdown user={user} />

                    <div className="wnb-avatar" title={user.nome || 'Usuário'}>
                        {getInitials(user.nome)}
                    </div>
                </div>
            </nav>

            {/* === TOOLBAR (quando obra selecionada) === */}
            {obraSelecionada && (
                <div className="windows-toolbar">
                    <div className="toolbar-items">
                        {toolbarItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                                {idx === 4 && <div className="toolbar-separator" />}
                                <button
                                    className={`toolbar-btn${currentPage === item.id ? ' active' : ''}`}
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
                <div className="menu-backdrop" onClick={() => setActiveMenu(null)} />
            )}
        </>
    );
};

export { WindowsNavStyles };
export default WindowsNavBar;
