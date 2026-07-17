import React, { useState, useEffect, useContext } from 'react';
import '../../styles/tokens.css';
import '../../styles/components.css';
import './solicitacoes.css';

import { AuthContext } from '../../auth/AuthContext';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import NotificacoesDropdown from '../../layout/NotificacoesDropdown';
import { solicitacoesApi } from './solicitacoesApi';
import { iniciais } from './solicitacoesFormat';

import SolicitacoesList from './SolicitacoesList';
import ConfigSolicitacoes from './ConfigSolicitacoes';

export default function SolicitacoesModule() {
    const { user, onBackToSelector } = useContext(AuthContext);
    const [tab, setTab] = useState('lista');
    const [obras, setObras] = useState([]);
    const isMaster = user?.role === 'master';

    const loadRefs = async () => {
        try {
            const data = await solicitacoesApi.obras();  // GET /obras — só ativas
            setObras(Array.isArray(data) ? data : []);
        } catch (e) {
            logger.error('Solicitações loadRefs', e);
            notify.error('Não foi possível carregar a lista de obras. Tente novamente.');
        }
    };

    useEffect(() => { loadRefs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const nomeUser = user?.username || 'Usuário';
    const shared = { obras, user, reloadRefs: loadRefs };

    const TABS = [
        { id: 'lista', icon: 'ti-list-details', label: 'Solicitações' },
        ...(isMaster ? [{ id: 'config', icon: 'ti-settings', label: 'Configurações' }] : []),
    ];

    return (
        <div className="solc-shell">
            <div className="solc-navbar">
                <div className="solc-logo">
                    <img src="/obraly-mark.png" alt="" className="solc-logo-dot" /> Obraly
                </div>
                <div className="solc-crumbs">
                    <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> <b>Solicitações</b>
                </div>
                <div className="solc-spacer" />
                <NotificacoesDropdown user={user} />
                <button className="solc-back" onClick={onBackToSelector}>
                    <i className="ti ti-arrow-left" /> Módulos
                </button>
                <div className="solc-user">
                    <span>{nomeUser}</span>
                    <span className="solc-user-av">{iniciais(nomeUser)}</span>
                </div>
            </div>

            <div className="solc-container">
                <div className="solc-pagehead">
                    <div>
                        <h1><i className="ti ti-shopping-cart" /> Solicitações</h1>
                        <div className="solc-sub">
                            Pedidos de compra de materiais, insumos e equipamentos — pesquisa de preços, aprovação e lançamento no financeiro
                        </div>
                    </div>
                </div>

                <div className="solc-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`solc-tab${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <i className={`ti ${t.icon}`} /> {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'lista' && <SolicitacoesList {...shared} />}
                {tab === 'config' && isMaster && <ConfigSolicitacoes {...shared} />}
            </div>
        </div>
    );
}
