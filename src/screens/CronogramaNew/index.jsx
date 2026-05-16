import React, { useState, useEffect, useCallback } from 'react';
import CurvaS from '../../components/CurvaS';
import EtapasGrid from '../../components/EtapaCard/EtapasGrid';
import WeeklyView from '../../components/CronogramaSemanal/WeeklyView';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import './CronogramaNew.css';

const VIEW_MODES = [
    { id: 'cards',   label: 'Cards',   icon: 'ti-layout-grid' },
    { id: 'semanal', label: 'Semanal', icon: 'ti-calendar-week' },
    { id: 'classic', label: 'Clássico', icon: 'ti-table' },
];

const CronogramaNew = ({ obraId, obraNome, onSwitchToClassic }) => {
    const [servicos, setServicos] = useState([]);
    const [evmData, setEvmData] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('cards');
    const [filtroStatus, setFiltroStatus] = useState('todos');

    const fetchServicos = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma`);
            if (!res.ok) throw new Error('Erro ao carregar cronograma');
            const data = await res.json();
            setServicos(data);

            // Fetch EVM per servico (same pattern as CronogramaObra.js)
            const evmMap = {};
            await Promise.allSettled(
                data.map(async (s) => {
                    try {
                        const evmRes = await fetchWithAuth(
                            `${API_URL}/obras/${obraId}/servico-financeiro?servico_nome=${encodeURIComponent(s.servico_nome)}`
                        );
                        if (evmRes.ok) {
                            evmMap[s.servico_nome] = await evmRes.json();
                        }
                    } catch (err) {
                        logger.debug('EVM nao disponivel:', s.servico_nome);
                    }
                })
            );
            setEvmData(evmMap);
        } catch (err) {
            notify.error(err.message);
            logger.error('CronogramaNew fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [obraId]);

    useEffect(() => {
        fetchServicos();
    }, [fetchServicos]);

    const handleSetFiltro = (novoFiltro) => setFiltroStatus(novoFiltro);

    // Injeta o setter no onEdit para que EtapasGrid possa mudar filtroStatus
    const editProxy = (servico) => {
        notify.info(`Edição disponível na visualização Clássica.`);
    };
    editProxy.__setFiltro = handleSetFiltro;

    const stats = {
        total: servicos.length,
        atrasados: servicos.filter(s => {
            const pct = s.percentual_conclusao || 0;
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const fim = s.data_fim_prevista ? new Date(s.data_fim_prevista + 'T00:00:00') : null;
            return pct < 100 && fim && hoje > fim;
        }).length,
        concluidos: servicos.filter(s => (s.percentual_conclusao || 0) >= 100).length,
        progressoGeral: servicos.length > 0
            ? Math.round(servicos.reduce((acc, s) => acc + (s.percentual_conclusao || 0), 0) / servicos.length)
            : 0,
    };

    if (loading) {
        return (
            <div className="cn-loading" aria-live="polite" aria-busy="true">
                <div className="cn-skeleton cn-skeleton--header" />
                <div className="cn-skeleton cn-skeleton--chart" />
                <div className="cn-skeleton-grid">
                    {[1, 2, 3].map(i => <div key={i} className="cn-skeleton cn-skeleton--card" />)}
                </div>
            </div>
        );
    }

    return (
        <main className="cn-root" aria-label="Cronograma de Obras — Nova Visualização">
            {/* Header */}
            <div className="cn-header">
                <div className="cn-header-left">
                    <h2 className="cn-title">
                        <i className="ti ti-layout-grid" aria-hidden="true" />
                        Cronograma
                        {obraNome && <span className="cn-obra-nome"> — {obraNome}</span>}
                    </h2>
                    <div className="cn-kpis" aria-label="Indicadores gerais">
                        <span className="cn-kpi">
                            <strong>{stats.total}</strong> serviços
                        </span>
                        <span className="cn-kpi cn-kpi--success">
                            <strong>{stats.concluidos}</strong> concluídos
                        </span>
                        {stats.atrasados > 0 && (
                            <span className="cn-kpi cn-kpi--danger">
                                <strong>{stats.atrasados}</strong> atrasados
                            </span>
                        )}
                        <span className="cn-kpi cn-kpi--info">
                            <strong>{stats.progressoGeral}%</strong> geral
                        </span>
                    </div>
                </div>

                <div className="cn-header-right">
                    {/* Toggle de view */}
                    <div className="cn-view-toggle" role="group" aria-label="Modo de visualização">
                        {VIEW_MODES.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                className={`cn-view-btn${viewMode === m.id ? ' cn-view-btn--active' : ''}`}
                                onClick={() => m.id === 'classic' ? onSwitchToClassic?.() : setViewMode(m.id)}
                                aria-pressed={viewMode === m.id}
                                title={m.label}
                            >
                                <i className={`ti ${m.icon}`} aria-hidden="true" />
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Curva S */}
            {servicos.length > 0 && (
                <div className="cn-section">
                    <CurvaS servicos={servicos} evmData={evmData} />
                </div>
            )}

            {/* Vista principal */}
            <div key={viewMode} className="cn-section cn-section--animated">
                {viewMode === 'semanal' ? (
                    <WeeklyView servicos={servicos} evmData={evmData} />
                ) : (
                    <EtapasGrid
                        servicos={servicos}
                        evmData={evmData}
                        filtroStatus={filtroStatus}
                        onEdit={editProxy}
                    />
                )}
            </div>

            {/* Nota opt-in */}
            <p className="cn-opt-in-note">
                <i className="ti ti-info-circle" aria-hidden="true" />
                Para editar serviços, use{' '}
                <button type="button" className="cn-link-btn" onClick={onSwitchToClassic}>
                    a visualização clássica
                </button>.
                O cronograma clássico permanece intacto.
            </p>
        </main>
    );
};

export default CronogramaNew;
