import React, { useState, useEffect, useContext } from 'react';
import '../../styles/tokens.css';
import '../../styles/components.css';
import './rh.css';

import { AuthContext } from '../../auth/AuthContext';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { rhApi } from './rhApi';
import { iniciais } from './rhFormat';

import DashboardRH from './DashboardRH';
import FuncionariosRH from './FuncionariosRH';
import ConvencoesRH from './ConvencoesRH';
import PagamentosRH from './PagamentosRH';
import EncargosRH from './EncargosRH';

const TABS = [
    { id: 'dash', icon: 'ti-layout-dashboard', label: 'Visão geral' },
    { id: 'func', icon: 'ti-id-badge-2', label: 'Funcionários' },
    { id: 'cct', icon: 'ti-file-certificate', label: 'Convenções' },
    { id: 'pag', icon: 'ti-cash', label: 'Pagamentos' },
    { id: 'enc', icon: 'ti-receipt-tax', label: 'Encargos · DARF' },
];

export default function RHModule() {
    const { user, onBackToSelector } = useContext(AuthContext);
    const [tab, setTab] = useState('dash');
    const [obras, setObras] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [counts, setCounts] = useState({ func: null, cct: null });

    const loadRefs = async () => {
        const [oRes, cRes, fRes, cvRes] = await Promise.allSettled([
            rhApi.obras(), rhApi.categorias(),
            rhApi.funcionarios('?status=ativo'), rhApi.convencoes(),
        ]);
        const falhas = [oRes, cRes, fRes, cvRes].filter(r => r.status === 'rejected');
        if (falhas.length) {
            falhas.forEach(r => logger.error('RH loadRefs', r.reason));
            notify.error('Não foi possível carregar todos os dados de referência do RH. Tente novamente.');
        }
        if (oRes.status === 'fulfilled') setObras(Array.isArray(oRes.value) ? oRes.value : []);
        if (cRes.status === 'fulfilled') setCategorias(Array.isArray(cRes.value) ? cRes.value : []);
        setCounts({
            func: fRes.status === 'fulfilled' && Array.isArray(fRes.value) ? fRes.value.length : null,
            cct: cvRes.status === 'fulfilled' && Array.isArray(cvRes.value) ? cvRes.value.length : null,
        });
    };

    useEffect(() => { loadRefs(); }, []);

    const nomeUser = user?.username || 'Usuário';
    const shared = { obras, categorias, reloadRefs: loadRefs, setCounts };

    return (
        <div className="rh-shell">
            <div className="rh-navbar">
                <div className="rh-logo">
                    <img src="/obraly-mark.png" alt="" className="rh-logo-dot" /> Obraly
                </div>
                <div className="rh-crumbs">
                    <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> <b>Pessoal / RH</b>
                </div>
                <div className="rh-spacer" />
                <button className="rh-back" onClick={onBackToSelector}>
                    <i className="ti ti-arrow-left" /> Módulos
                </button>
                <div className="rh-user">
                    <span>{nomeUser}</span>
                    <span className="rh-user-av">{iniciais(nomeUser)}</span>
                </div>
            </div>

            <div className="rh-container">
                <div className="rh-pagehead">
                    <div>
                        <h1><i className="ti ti-users-group" /> Pessoal</h1>
                        <div className="rh-sub">
                            Módulo centralizado — funcionários, convenções, pagamentos e encargos de todas as obras
                        </div>
                    </div>
                    <button className="rh-btn rh-btn-secondary" onClick={() => notify.info('Exportação disponível em breve.')}>
                        <i className="ti ti-download" /> Exportar
                    </button>
                </div>

                <div className="rh-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`rh-tab${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <i className={`ti ${t.icon}`} /> {t.label}
                            {t.id === 'func' && counts.func != null && <span className="rh-tab-cnt">{counts.func}</span>}
                            {t.id === 'cct' && counts.cct != null && <span className="rh-tab-cnt">{counts.cct}</span>}
                        </button>
                    ))}
                </div>

                {tab === 'dash' && <DashboardRH {...shared} />}
                {tab === 'func' && <FuncionariosRH {...shared} />}
                {tab === 'cct' && <ConvencoesRH {...shared} />}
                {tab === 'pag' && <PagamentosRH {...shared} />}
                {tab === 'enc' && <EncargosRH {...shared} />}
            </div>
        </div>
    );
}
