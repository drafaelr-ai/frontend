import React, { useState, useEffect } from 'react';
import NotificacoesDropdown from './NotificacoesDropdown';

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
                min-height: 44px;
            }

            .menu-dropdown {
                position: fixed;
                top: 120px;
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
                min-height: 48px;
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
                { id: 'exportar', label: 'Exportar Relatório...', icon: '📊', shortcut: 'Ctrl+E' },
                { type: 'separator' },
                { id: 'sair', label: 'Sair', icon: '🚪', shortcut: 'Alt+F4', action: 'logout' },
            ]
        },
        {
            id: 'financeiro',
            label: 'Financeiro',
            items: [
                { id: 'financeiro', label: 'Cronograma Financeiro', icon: '📅', shortcut: 'F2' },
                { id: 'boletos', label: 'Gestão de Boletos', icon: '📄', shortcut: 'F3' },
                { id: 'caixa', label: 'Caixa de Obra', icon: '💰', shortcut: 'F4' },
                { type: 'separator' },
                { id: 'pagamento', label: 'Novo Pagamento...', icon: '💳', shortcut: 'Ctrl+P' },
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
                { id: 'diario', label: 'Diário de Obras', icon: '📓', shortcut: 'F6' },
                { id: 'agenda', label: 'Agenda de Demandas', icon: '📆', shortcut: 'F9' },
                { id: 'orcamentos', label: 'Solicitações', icon: '📝', shortcut: 'F7', adminOnly: true },
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
        { id: 'orcamento-eng', icon: '📐', label: 'Orçamento' },
        { id: 'financeiro', icon: '📅', label: 'Financeiro' },
        { id: 'cronograma-obra', icon: '📋', label: 'Cronograma' },
        { id: 'boletos', icon: '📄', label: 'Boletos' },
        { id: 'relatorios', icon: '📊', label: 'Relatórios' },
        { id: 'diario', icon: '📓', label: 'Diário' },
        { id: 'agenda', icon: '📆', label: 'Agenda' },
        { id: 'caixa', icon: '💰', label: 'Caixa' },
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
            {/* === BARRA DE TÍTULO === */}
            <div className="windows-title-bar">
                <div className="title-bar-left">
                    <span className="title-bar-logo">🏗️</span>
                    <span className="title-bar-name">Obraly</span>
                    {obraSelecionada && (
                        <>
                            <span className="title-bar-separator">›</span>
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
                        <option value={0}>🏗️ Selecionar Obra...</option>
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

export { WindowsNavStyles };
export default WindowsNavBar;
