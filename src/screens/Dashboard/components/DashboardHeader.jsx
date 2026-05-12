import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import NotificacoesDropdown from '../../../layout/NotificacoesDropdown';
import './DashboardHeader.css';

function getInitials(user) {
    if (!user) return '?';
    const name = (user.nome || user.username || '').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() ?? '?';
}

export default function DashboardHeader() {
    const { user, logout, onBackToSelector } = useAuth();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        function onMouseDown(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        function onKeyDown(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    function handleLogout() {
        setOpen(false);
        logout();
    }

    function handleModuleSelector() {
        setOpen(false);
        onBackToSelector();
    }

    return (
        <header className="dh-root">
            <div className="dh-left">
                <span className="dh-logo">Obraly</span>
            </div>
            <div className="dh-right">
                <NotificacoesDropdown user={user} />
                <div className="dh-avatar-wrap" ref={wrapRef}>
                    <button
                        className="dh-avatar"
                        onClick={() => setOpen(o => !o)}
                        aria-label="Menu do usuário"
                        aria-expanded={open}
                        aria-haspopup="menu"
                    >
                        {getInitials(user)}
                    </button>
                    {open && (
                        <div className="dh-dropdown" role="menu">
                            <button
                                className="dh-dropdown-item"
                                onClick={handleModuleSelector}
                                role="menuitem"
                            >
                                <i className="ti ti-layout-grid" aria-hidden="true" />
                                Voltar ao seletor de módulos
                            </button>
                            <div className="dh-dropdown-divider" aria-hidden="true" />
                            <button
                                className="dh-dropdown-item dh-dropdown-item--danger"
                                onClick={handleLogout}
                                role="menuitem"
                            >
                                <i className="ti ti-logout" aria-hidden="true" />
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
