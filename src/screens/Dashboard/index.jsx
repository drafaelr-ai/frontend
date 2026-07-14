import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { formatCurrency } from '../../utils/format';
import StatCard from './components/StatCard';
import ProgressBar from './components/ProgressBar';
import ActivityItem from './components/ActivityItem';
import DashboardHeader from './components/DashboardHeader';
import ObraCardActions from './components/ObraCardActions';
import './Dashboard.css';

// --- helpers ---

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mesAtualLabel() {
    const d = new Date();
    return `${MESES[d.getMonth()]} / ${d.getFullYear()}`;
}

function dataBRcurta(iso) {
    if (!iso) return '';
    const [, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}`;
}

function formatTimestamp(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays}d atrás`;
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
        return '';
    }
}

function ultimaAtividadeLabel(historico) {
    if (!Array.isArray(historico) || historico.length === 0) return '—';
    const datas = historico
        .map(h => h.data ?? h.data_lancamento ?? h.created_at)
        .filter(Boolean)
        .sort()
        .reverse();
    if (!datas.length) return '—';
    const label = formatTimestamp(datas[0]);
    return label ? (label === 'Hoje' || label === 'Ontem' ? label.toLowerCase() : `há ${label.replace('d atrás', ' dias')}`.replace('há Hoje', 'hoje')) : '—';
}

function getObraProgressVariant(pct) {
    if (pct >= 70) return 'success';
    if (pct >= 30) return 'info';
    return 'warning';
}

function getPctColor(pct) {
    if (pct >= 90) return 'var(--status-danger)';
    if (pct >= 70) return 'var(--status-warning)';
    return 'var(--text-primary)';
}

function ActivityIcon({ tipo }) {
    const map = {
        lancamento:  <i className="ti ti-cash" aria-hidden="true" />,
        servico:     <i className="ti ti-tools" aria-hidden="true" />,
        nota_fiscal: <i className="ti ti-file-invoice" aria-hidden="true" />,
        orcamento:   <i className="ti ti-clipboard-list" aria-hidden="true" />,
        boleto:      <i className="ti ti-receipt" aria-hidden="true" />,
    };
    return map[tipo] ?? <i className="ti ti-dots-circle-horizontal" aria-hidden="true" />;
}

function navigateToObra(obraId) {
    window.location.href = `?obra=${obraId}`;
}

// --- loading skeleton ---
function LoadingSkeleton() {
    return (
        <div className="db-root">
            <div className="db-header">
                <div className="db-header-left">
                    <div className="db-skeleton" style={{ width: 180, height: 22, marginBottom: 6 }} />
                    <div className="db-skeleton" style={{ width: 120, height: 14 }} />
                </div>
            </div>
            <div className="db-kpi-grid" style={{ marginBottom: 12 }}>
                {[0,1,2,3,4].map(i => <div key={i} className="db-skeleton db-skeleton-kpi" />)}
            </div>
            <div className="db-section">
                <div className="db-skeleton" style={{ width: 80, height: 12, marginBottom: 10 }} />
                <div className="db-obras-grid">
                    {[0,1,2,3].map(i => <div key={i} className="db-skeleton db-skeleton-obra" />)}
                </div>
            </div>
            <div className="db-section">
                <div className="db-skeleton" style={{ width: 100, height: 12, marginBottom: 10 }} />
                <div className="db-activity-list">
                    {[0,1,2,3,4].map(i => <div key={i} className="db-skeleton db-skeleton-activity" style={{ margin: '0 14px', marginBottom: 8 }} />)}
                </div>
            </div>
        </div>
    );
}

// --- main component ---
export default function Dashboard() {
    const { user } = useAuth();
    const [obras, setObras] = useState([]);
    const [obraDetails, setObraDetails] = useState({});  // { [id]: { detail } }
    const [homeData, setHomeData] = useState(null);      // /home/obras (MO, material, previsão)
    const [alertas, setAlertas] = useState(null);        // /home/alertas
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtroObras, setFiltroObras] = useState('ativas');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fase 1: lista de obras + agregados da home em paralelo
            const [obrasRes, homeRes, alertasRes] = await Promise.allSettled([
                fetchWithAuth(`${API_URL}/obras?incluir_arquivadas=true`),
                fetchWithAuth(`${API_URL}/home/obras`),
                fetchWithAuth(`${API_URL}/home/alertas`),
            ]);
            if (obrasRes.status !== 'fulfilled' || !obrasRes.value.ok) {
                throw new Error('Falha ao carregar obras');
            }
            const obrasData = await obrasRes.value.json();
            const list = Array.isArray(obrasData) ? obrasData
                : Array.isArray(obrasData.obras) ? obrasData.obras
                : [];
            setObras(list);

            if (homeRes.status === 'fulfilled' && homeRes.value.ok) {
                setHomeData(await homeRes.value.json());
            }
            if (alertasRes.status === 'fulfilled' && alertasRes.value.ok) {
                setAlertas(await alertasRes.value.json());
            }

            // Fase 2: detalhe por obra ativa (orçamento executado + histórico)
            const activeObras = list.filter(o => !o.concluida && !o.arquivada);
            const results = await Promise.allSettled(
                activeObras.map(async (obra) => {
                    const id = obra.id ?? obra.obra_id;
                    const detailRes = await fetchWithAuth(`${API_URL}/obras/${id}`);
                    const detail = detailRes.ok ? await detailRes.json() : null;
                    return { id, detail };
                })
            );
            const detailMap = {};
            results.forEach(r => {
                if (r.status === 'fulfilled') detailMap[r.value.id] = r.value;
            });
            setObraDetails(detailMap);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // --- agregações ---
    const kpis = useMemo(() => {
        let totalOrcamento = 0;
        let totalPago = 0;
        let countObrasAtivas = 0;
        obras.filter(o => !o.concluida && !o.arquivada).forEach(obra => {
            const id = obra.id ?? obra.obra_id;
            const d = obraDetails[id];
            countObrasAtivas++;
            if (d?.detail?.sumarios) {
                totalOrcamento += d.detail.sumarios.orcamento_total ?? 0;
                totalPago      += d.detail.sumarios.valores_pagos ?? 0;
            }
        });
        return { totalOrcamento, totalPago, countObrasAtivas };
    }, [obras, obraDetails]);

    const homePorObra = useMemo(() => {
        const map = {};
        (homeData?.obras || []).forEach(o => { map[o.id] = o; });
        return map;
    }, [homeData]);

    const pendObras = useMemo(
        () => (alertas?.pendencias || []).filter(p => p.modulo === 'obras'),
        [alertas]
    );
    const pendVencidas = pendObras.filter(p => p.situacao === 'vencido');

    const activityFeed = useMemo(() => {
        const items = [];
        obras.filter(o => !o.concluida && !o.arquivada).forEach(obra => {
            const id = obra.id ?? obra.obra_id;
            const historico = obraDetails[id]?.detail?.historico_unificado;
            if (!Array.isArray(historico)) return;
            historico.forEach(h => items.push({ ...h, obraId: id, obraName: obra.nome }));
        });
        items.sort((a, b) => {
            const da = new Date(a.data ?? a.data_lancamento ?? a.created_at ?? 0);
            const db = new Date(b.data ?? b.data_lancamento ?? b.created_at ?? 0);
            return db - da;
        });
        return items.slice(0, 10);
    }, [obras, obraDetails]);

    const displayObras = useMemo(() => {
        if (filtroObras === 'arquivadas') return obras.filter(o => o.arquivada);
        if (filtroObras === 'todas') return obras.filter(o => !o.concluida);
        return obras.filter(o => !o.concluida && !o.arquivada);
    }, [obras, filtroObras]);

    if (loading) return <LoadingSkeleton />;

    if (error) {
        return (
            <div className="db-root">
                <div className="db-empty">
                    <i className="ti ti-alert-triangle" aria-hidden="true" />
                    <p>Erro ao carregar: {error}</p>
                    <button className="db-section-link" onClick={loadData} style={{ marginTop: 8 }}>
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const hk = homeData?.kpis;
    const previsao = hk?.previsao_pagar;
    const pctOrc = kpis.totalOrcamento > 0 ? (kpis.totalPago / kpis.totalOrcamento) * 100 : 0;

    return (
        <div className="db-root">
            <DashboardHeader />
            {/* Hero header — saudação + competência */}
            <div className="db-header">
                <div className="db-header-left">
                    <h1>{getGreeting()}{user?.username ? `, ${user.username.split(' ')[0]}` : ''} 👋</h1>
                    <p>
                        {kpis.countObrasAtivas} obra{kpis.countObrasAtivas !== 1 ? 's' : ''} ativa{kpis.countObrasAtivas !== 1 ? 's' : ''}
                        {pendVencidas.length > 0 ? ` · ${pendVencidas.length} pendência${pendVencidas.length !== 1 ? 's' : ''} vencida${pendVencidas.length !== 1 ? 's' : ''}` : ''}
                    </p>
                </div>
                <div className="db-period-toggle">
                    <span className="db-period-btn active" style={{ cursor: 'default' }}>
                        <i className="ti ti-calendar" aria-hidden="true" style={{ marginRight: 4 }} />
                        {mesAtualLabel()}
                    </span>
                </div>
            </div>

            {/* KPI cards */}
            <div className="db-kpi-grid db-kpi-grid--5">
                <StatCard
                    label="Mão de obra (total)"
                    value={formatCurrency(hk?.mo_total ?? 0)}
                    icon={<i className="ti ti-users" aria-hidden="true" />}
                />
                <StatCard
                    label="Material (total)"
                    value={formatCurrency(hk?.material_total ?? 0)}
                    icon={<i className="ti ti-wall" aria-hidden="true" />}
                />
                <StatCard
                    label="Saídas no Mês"
                    value={formatCurrency(hk?.saidas_mes ?? 0)}
                    icon={<i className="ti ti-trending-down" aria-hidden="true" />}
                />
                <StatCard
                    label="Orçamento executado"
                    value={`${pctOrc.toFixed(0)}%`}
                    icon={<i className="ti ti-chart-pie" aria-hidden="true" />}
                    trend={{ direction: 'none', value: `de ${formatCurrency(kpis.totalOrcamento)}` }}
                />
                <div className="db-kpi-previsao">
                    <div className="db-kpi-previsao-label">
                        <i className="ti ti-calendar-due" aria-hidden="true" /> Previsão a pagar (mês)
                    </div>
                    <div className="db-kpi-previsao-value num">
                        {formatCurrency(previsao?.total ?? 0)}
                    </div>
                    <div className="db-kpi-previsao-sub">
                        {previsao?.qtd ?? 0} título{(previsao?.qtd ?? 0) !== 1 ? 's' : ''} até {dataBRcurta(previsao?.ate)}
                    </div>
                </div>
            </div>

            {/* Alerta de vencidos */}
            {pendVencidas.length > 0 && (
                <div className="db-alert-banner">
                    <i className="ti ti-alert-triangle" aria-hidden="true" />
                    <span>
                        {pendVencidas.length} pendência{pendVencidas.length !== 1 ? 's' : ''} vencida{pendVencidas.length !== 1 ? 's' : ''}
                        {' '}({formatCurrency(pendVencidas.reduce((s, p) => s + p.valor, 0))})
                        {' '}— {[...new Set(pendVencidas.map(p => p.origem).filter(Boolean))].slice(0, 3).join(', ')}
                    </span>
                    <span style={{ flex: 1 }} />
                    {pendVencidas[0]?.origem_id && (
                        <button
                            className="db-alert-banner-cta"
                            onClick={() => navigateToObra(pendVencidas[0].origem_id)}
                        >
                            Resolver →
                        </button>
                    )}
                </div>
            )}

            <div className="db-main-cols">
                <div>
                    {/* Obras */}
                    <div className="db-section">
                        <div className="db-filtro-obras">
                            <button
                                className={`db-filtro-chip${filtroObras === 'ativas' ? ' active' : ''}`}
                                onClick={() => setFiltroObras('ativas')}
                            >
                                Ativas
                            </button>
                            <button
                                className={`db-filtro-chip${filtroObras === 'arquivadas' ? ' active' : ''}`}
                                onClick={() => setFiltroObras('arquivadas')}
                            >
                                Arquivadas
                            </button>
                            <button
                                className={`db-filtro-chip${filtroObras === 'todas' ? ' active' : ''}`}
                                onClick={() => setFiltroObras('todas')}
                            >
                                Todas
                            </button>
                        </div>
                        <div className="db-section-header">
                            <h2 className="db-section-title">
                                {filtroObras === 'ativas' && `Obras Ativas (${displayObras.length})`}
                                {filtroObras === 'arquivadas' && `Obras Arquivadas (${displayObras.length})`}
                                {filtroObras === 'todas' && `Todas as Obras (${displayObras.length})`}
                            </h2>
                        </div>
                        {displayObras.length === 0 ? (
                            <div className="db-card">
                                <div className="db-empty">
                                    <i className="ti ti-building-off" aria-hidden="true" />
                                    <p>{filtroObras === 'arquivadas' ? 'Nenhuma obra arquivada' : 'Nenhuma obra ativa'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="db-obras-grid">
                                {displayObras.map(obra => {
                                    const id = obra.id ?? obra.obra_id;
                                    const d = obraDetails[id];
                                    const h = homePorObra[id];
                                    const sumarios = d?.detail?.sumarios;
                                    const orcTotal = sumarios?.orcamento_total ?? 0;
                                    const pago = sumarios?.valores_pagos ?? 0;
                                    const pct = orcTotal > 0 ? (pago / orcTotal) * 100 : 0;
                                    const vencidos = h?.vencidos_qtd ?? 0;

                                    return (
                                        <div
                                            key={id}
                                            className={`db-obra-tile${obra.arquivada ? ' db-obra-tile--arquivada' : ''}`}
                                            onClick={() => navigateToObra(id)}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Abrir obra ${obra.nome}`}
                                            onKeyDown={(e) => { if (e.key === 'Enter') navigateToObra(id); }}
                                        >
                                            <div className="db-obra-tile-header">
                                                <span className="db-obra-tile-name">
                                                    <span
                                                        className="db-obra-status-dot"
                                                        style={{ background: vencidos > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                                                    />
                                                    {obra.nome}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                    {obra.arquivada && (
                                                        <span className="db-obra-badge-archived">
                                                            <i className="ti ti-archive" aria-hidden="true" />
                                                            Arquivada
                                                        </span>
                                                    )}
                                                    {!obra.arquivada && vencidos > 0 && (
                                                        <span className="db-obra-badge" style={{
                                                            background: 'var(--status-danger-bg)',
                                                            color: 'var(--status-danger)',
                                                        }}>
                                                            {vencidos} vencido{vencidos !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    {!obra.arquivada && vencidos === 0 && (
                                                        <span className="db-obra-badge" style={{
                                                            background: 'var(--status-success-bg)',
                                                            color: 'var(--status-success-text)',
                                                        }}>
                                                            Em dia
                                                        </span>
                                                    )}
                                                    <ObraCardActions
                                                        obraId={id}
                                                        obraName={obra.nome}
                                                        obraCliente={obra.cliente}
                                                        obraArquivada={obra.arquivada}
                                                        onNavigate={() => navigateToObra(id)}
                                                        onDeleted={loadData}
                                                        onArchived={loadData}
                                                        onUnarchived={loadData}
                                                        onEdited={loadData}
                                                    />
                                                </div>
                                            </div>
                                            {obra.cliente && (
                                                <div className="db-obra-tile-client">{obra.cliente}</div>
                                            )}
                                            {orcTotal > 0 && (
                                                <>
                                                    <div className="db-obra-progress-row">
                                                        <span>Pago {formatCurrency(pago)} de {formatCurrency(orcTotal)}</span>
                                                        <span style={{ color: getPctColor(pct), fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                                                    </div>
                                                    <ProgressBar
                                                        current={pago}
                                                        total={orcTotal}
                                                        showLabels={false}
                                                        variant={getObraProgressVariant(pct)}
                                                        height={4}
                                                    />
                                                </>
                                            )}
                                            <div className="db-obra-stats-row">
                                                <div className="db-obra-stat">
                                                    <span className="db-obra-stat-label">Mão de obra (total)</span>
                                                    <span className="db-obra-stat-value">{formatCurrency(h?.mo_total ?? 0)}</span>
                                                </div>
                                                <div className="db-obra-stat">
                                                    <span className="db-obra-stat-label">Material (total)</span>
                                                    <span className="db-obra-stat-value">{formatCurrency(h?.material_total ?? 0)}</span>
                                                </div>
                                                <div className="db-obra-stat">
                                                    <span className="db-obra-stat-label">Última atividade</span>
                                                    <span className="db-obra-stat-value">
                                                        {ultimaAtividadeLabel(d?.detail?.historico_unificado)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity feed (coluna lateral no desktop) */}
                <div className="db-section db-activity-col">
                    <div className="db-section-header">
                        <h2 className="db-section-title">Atividade Recente</h2>
                    </div>
                    {activityFeed.length === 0 ? (
                        <div className="db-card">
                            <div className="db-empty">
                                <i className="ti ti-history" aria-hidden="true" />
                                <p>Sem atividade recente</p>
                            </div>
                        </div>
                    ) : (
                        <div className="db-activity-list">
                            {activityFeed.map((item, idx) => {
                                const tipo = item.tipo ?? item.type ?? 'lancamento';
                                const title = item.descricao ?? item.titulo ?? item.nome ?? tipo;
                                const description = item.valor != null ? formatCurrency(item.valor) : undefined;
                                const dateKey = item.data ?? item.data_lancamento ?? item.created_at;
                                return (
                                    <ActivityItem
                                        key={`${item.obraId}-${idx}`}
                                        icon={<ActivityIcon tipo={tipo} />}
                                        title={title}
                                        description={description}
                                        timestamp={formatTimestamp(dateKey)}
                                        obraName={item.obraName}
                                        isLast={idx === activityFeed.length - 1}
                                        onClick={() => navigateToObra(item.obraId)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
