import React, { useState, useEffect, useContext, useRef } from 'react';
import '../../styles/tokens.css';
import '../../styles/components.css';
import './frota.css';

import { AuthContext } from '../../auth/AuthContext';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { frotaApi } from './frotaApi';
import { iniciais } from './frotaFormat';

import DashboardFrota from './DashboardFrota';
import VeiculosFrota from './VeiculosFrota';
import CondutoresFrota from './CondutoresFrota';
import CustosFrota from './CustosFrota';
import MultasFrota from './MultasFrota';

const TABS = [
    { id: 'dash', icon: 'ti-layout-dashboard', label: 'Visão geral' },
    { id: 'veic', icon: 'ti-truck', label: 'Veículos' },
    { id: 'cond', icon: 'ti-steering-wheel', label: 'Condutores' },
    { id: 'custos', icon: 'ti-tool', label: 'Custos' },
    { id: 'multas', icon: 'ti-alert-triangle', label: 'Multas' },
];

export default function FrotaModule() {
    const { user, onBackToSelector, onGoToDashboard } = useContext(AuthContext);
    const [tab, setTab] = useState('dash');
    const [obras, setObras] = useState([]);
    const [imoveis, setImoveis] = useState([]);
    const [condutores, setCondutores] = useState([]);
    const [counts, setCounts] = useState({ veic: null, cond: null });
    const avisoImoveisRef = useRef(false);

    const loadRefs = async () => {
        const [oRes, iRes, vRes, cRes] = await Promise.allSettled([
            frotaApi.obras(), frotaApi.imoveisAdmin(),
            frotaApi.veiculos('?status=ativo'), frotaApi.condutores('?status=ativo'),
        ]);
        const falhas = [oRes, iRes, vRes, cRes].filter(r => r.status === 'rejected');
        if (falhas.length) {
            falhas.forEach(r => logger.error('Frota loadRefs', r.reason));
            notify.error('Não foi possível carregar todos os dados de referência da Frota. Tente novamente.');
        }
        if (oRes.status === 'fulfilled') setObras(Array.isArray(oRes.value) ? oRes.value : []);
        if (iRes.status === 'fulfilled') {
            setImoveis(Array.isArray(iRes.value?.imoveis) ? iRes.value.imoveis : []);
            if (iRes.value?.aviso && !avisoImoveisRef.current) {
                avisoImoveisRef.current = true;
                notify.info(iRes.value.aviso);
            }
        }
        if (cRes.status === 'fulfilled') setCondutores(Array.isArray(cRes.value) ? cRes.value : []);
        setCounts({
            veic: vRes.status === 'fulfilled' && Array.isArray(vRes.value) ? vRes.value.length : null,
            cond: cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value.length : null,
        });
    };

    useEffect(() => { loadRefs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const nomeUser = user?.username || 'Usuário';
    const shared = { obras, imoveis, condutores, reloadRefs: loadRefs, setCounts };

    return (
        <div className="frota-shell">
            <div className="frota-navbar">
                <button type="button" className="frota-logo" onClick={onGoToDashboard} title="Ir para o dashboard principal">
                    <img src="/obraly-mark.png" alt="" className="frota-logo-dot" /> Obraly
                </button>
                <div className="frota-crumbs">
                    <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> <b>Frota</b>
                </div>
                <div className="frota-spacer" />
                <button className="frota-back" onClick={onBackToSelector}>
                    <i className="ti ti-arrow-left" /> Módulos
                </button>
                <div className="frota-user">
                    <span>{nomeUser}</span>
                    <span className="frota-user-av">{iniciais(nomeUser)}</span>
                </div>
            </div>

            <div className="frota-container">
                <div className="frota-pagehead">
                    <div>
                        <h1><i className="ti ti-truck" /> Frota</h1>
                        <div className="frota-sub">
                            Veículos alocados em obras e imóveis do patrimônio — documentos, manutenções, abastecimentos e multas
                        </div>
                    </div>
                </div>

                <div className="frota-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`frota-tab${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <i className={`ti ${t.icon}`} /> {t.label}
                            {t.id === 'veic' && counts.veic != null && <span className="frota-tab-cnt">{counts.veic}</span>}
                            {t.id === 'cond' && counts.cond != null && <span className="frota-tab-cnt">{counts.cond}</span>}
                        </button>
                    ))}
                </div>

                {tab === 'dash' && <DashboardFrota {...shared} />}
                {tab === 'veic' && <VeiculosFrota {...shared} />}
                {tab === 'cond' && <CondutoresFrota {...shared} />}
                {tab === 'custos' && <CustosFrota {...shared} />}
                {tab === 'multas' && <MultasFrota {...shared} />}
            </div>
        </div>
    );
}
