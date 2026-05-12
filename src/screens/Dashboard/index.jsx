import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { formatCurrency } from '../../utils/format';
import StatCard from './components/StatCard';
import AlertStatCard from './components/AlertStatCard';
import ProgressBar from './components/ProgressBar';
import ActivityItem from './components/ActivityItem';
import './Dashboard.css';

// --- helpers ---

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
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

function getObraProgressVariant(pct) {
    if (pct >= 70) return 'success';
    if (pct >= 30) return 'info';
    return 'warning';
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
                {[0,1,2,3].map(i => <div key={i} className="db-skeleton db-skeleton-kpi" />)}
            </div>
            <div className="db-alert-row">
                {[0,1,2].map(i => <div key={i} className="db-skeleton db-skeleton-kpi" />)}
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
    const [obraDetails, setObraDetails] = useState({});  // { [id]: { caixa, boletos, detail } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('mes');  // 'mes' | 'acumulado' — visual toggle, data uses mes

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Phase 1: fetch obra list
            const obrasRes = await fetchWithAuth(`${API_URL}/obras`);
            if (!obrasRes.ok) throw new Error('Falha ao carregar obras');
            const obrasData = await obrasRes.json();

            const list = Array.isArray(obrasData) ? obrasData
                : Array.isArray(obrasData.obras) ? obrasData.obras
                : [];

            setObras(list);

            // Phase 2: parallel per-obra detail fetches
            const activeObras = list.filter(o => !o.concluida);
            const results = await Promise.allSettled(
                activeObras.map(async (obra) => {
                    const id = obra.id ?? obra.obra_id;
                    const [caixaRes, boletosRes, detailRes] = await Promise.allSettled([
                        fetchWithAuth(`${API_URL}/obras/${id}/caixa`),
                        fetchWithAuth(`${API_URL}/obras/${id}/boletos/resumo`),
                        fetchWithAuth(`${API_URL}/obras/${id}`),
                    ]);

                    const caixa = caixaRes.status === 'fulfilled' && caixaRes.value.ok
                        ? await caixaRes.value.json() : null;
                    const boletos = boletosRes.status === 'fulfilled' && boletosRes.value.ok
                        ? await boletosRes.value.json() : null;
                    const detail = detailRes.status === 'fulfilled' && detailRes.value.ok
                        ? await detailRes.value.json() : null;

                    return { id, caixa, boletos, detail };
                })
            );

            const detailMap = {};
            results.forEach(r => {
                if (r.status === 'fulfilled') {
                    detailMap[r.value.id] = r.value;
                }
            });
            setObraDetails(detailMap);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // --- KPI aggregation ---
    const kpis = useMemo(() => {
        let totalSaldoAtual = 0;
        let totalSaidasMes = 0;
        let totalEntradasMes = 0;
        let totalBoletosVencidos = 0;
        let totalBoletosPendentes = 0;
        let totalOrcamento = 0;
        let totalPago = 0;
        let countObrasAtivas = 0;

        obras.filter(o => !o.concluida).forEach(obra => {
            const id = obra.id ?? obra.obra_id;
            const d = obraDetails[id];
            countObrasAtivas++;

            if (d?.caixa) {
                totalSaldoAtual += d.caixa.saldo_atual ?? 0;
                totalSaidasMes  += d.caixa.total_saidas_mes ?? 0;
                totalEntradasMes += d.caixa.total_entradas_mes ?? 0;
            }
            if (d?.boletos) {
                totalBoletosVencidos  += d.boletos.quantidade_vencido ?? 0;
                totalBoletosPendentes += d.boletos.quantidade_pendente ?? 0;
            }
            if (d?.detail?.sumarios) {
                totalOrcamento += d.detail.sumarios.orcamento_total ?? 0;
                totalPago      += d.detail.sumarios.valores_pagos ?? 0;
            }
        });

        return {
            totalSaldoAtual,
            totalSaidasMes,
            totalEntradasMes,
            totalBoletosVencidos,
            totalBoletosPendentes,
            totalOrcamento,
            totalPago,
            countObrasAtivas,
            countObrasConcluidas: obras.filter(o => o.concluida).length,
        };
    }, [obras, obraDetails]);

    // --- Activity feed: flatten historico_unificado across obras, sort by date, take 10 ---
    const activityFeed = useMemo(() => {
        const items = [];
        obras.filter(o => !o.concluida).forEach(obra => {
            const id = obra.id ?? obra.obra_id;
            const d = obraDetails[id];
            const historico = d?.detail?.historico_unificado;
            if (!Array.isArray(historico)) return;
            historico.forEach(h => {
                items.push({ ...h, obraId: id, obraName: obra.nome });
            });
        });
        items.sort((a, b) => {
            const da = new Date(a.data ?? a.data_lancamento ?? a.created_at ?? 0);
            const db = new Date(b.data ?? b.data_lancamento ?? b.created_at ?? 0);
            return db - da;
        });
        return items.slice(0, 10);
    }, [obras, obraDetails]);

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

    const activeObras = obras.filter(o => !o.concluida);

    return (
        <div className="db-root">
            {/* Header */}
            <div className="db-header">
                <div className="db-header-left">
                    <h1>{getGreeting()}{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}</h1>
                    <p>{kpis.countObrasAtivas} obra{kpis.countObrasAtivas !== 1 ? 's' : ''} ativa{kpis.countObrasAtivas !== 1 ? 's' : ''}</p>
                </div>
                <div className="db-period-toggle">
                    <button
                        className={`db-period-btn${period === 'mes' ? ' active' : ''}`}
                        onClick={() => setPeriod('mes')}
                    >
                        Mês
                    </button>
                    <button
                        className={`db-period-btn${period === 'acumulado' ? ' active' : ''}`}
                        onClick={() => setPeriod('acumulado')}
                    >
                        Total
                    </button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="db-kpi-grid">
                <StatCard
                    label="Saldo Atual"
                    value={formatCurrency(kpis.totalSaldoAtual)}
                    icon={<i className="ti ti-wallet" aria-hidden="true" />}
                />
                <StatCard
                    label="Entradas no Mês"
                    value={formatCurrency(kpis.totalEntradasMes)}
                    icon={<i className="ti ti-trending-up" aria-hidden="true" />}
                    trend={{ direction: 'up', value: 'entradas' }}
                />
                <StatCard
                    label="Saídas no Mês"
                    value={formatCurrency(kpis.totalSaidasMes)}
                    icon={<i className="ti ti-trending-down" aria-hidden="true" />}
                    trend={{ direction: 'down', value: 'saídas' }}
                />
                <StatCard
                    label="Total Pago / Orçamento"
                    value={`${kpis.totalOrcamento > 0 ? ((kpis.totalPago / kpis.totalOrcamento) * 100).toFixed(0) : 0}%`}
                    icon={<i className="ti ti-chart-pie" aria-hidden="true" />}
                />
            </div>

            {/* Alert cards */}
            <div className="db-alert-row">
                <AlertStatCard
                    label="Boletos Vencidos"
                    value={kpis.totalBoletosVencidos}
                    severity={kpis.totalBoletosVencidos > 0 ? 'danger' : 'info'}
                    description={kpis.totalBoletosVencidos > 0 ? 'Requer atenção' : 'Nenhum vencido'}
                />
                <AlertStatCard
                    label="Boletos Pendentes"
                    value={kpis.totalBoletosPendentes}
                    severity={kpis.totalBoletosPendentes > 3 ? 'warning' : 'info'}
                    description="A vencer"
                />
                <AlertStatCard
                    label="Obras Concluídas"
                    value={kpis.countObrasConcluidas}
                    severity="info"
                    description={`${obras.length} total`}
                />
            </div>

            {/* Obras ativas */}
            <div className="db-section">
                <div className="db-section-header">
                    <h2 className="db-section-title">Obras Ativas</h2>
                </div>
                {activeObras.length === 0 ? (
                    <div className="db-card">
                        <div className="db-empty">
                            <i className="ti ti-building-off" aria-hidden="true" />
                            <p>Nenhuma obra ativa</p>
                        </div>
                    </div>
                ) : (
                    <div className="db-obras-grid">
                        {activeObras.map(obra => {
                            const id = obra.id ?? obra.obra_id;
                            const d = obraDetails[id];
                            const sumarios = d?.detail?.sumarios;
                            const orcTotal = sumarios?.orcamento_total ?? 0;
                            const pago = sumarios?.valores_pagos ?? 0;
                            const pct = orcTotal > 0 ? (pago / orcTotal) * 100 : 0;
                            const saldo = d?.caixa?.saldo_atual;
                            const vencidos = d?.boletos?.quantidade_vencido ?? 0;

                            return (
                                <div
                                    key={id}
                                    className="db-obra-tile"
                                    onClick={() => navigateToObra(id)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Abrir obra ${obra.nome}`}
                                    onKeyDown={(e) => { if (e.key === 'Enter') navigateToObra(id); }}
                                >
                                    <div className="db-obra-tile-header">
                                        <span className="db-obra-tile-name">{obra.nome}</span>
                                        {vencidos > 0 && (
                                            <span className="db-obra-badge" style={{
                                                background: 'var(--status-danger-bg)',
                                                color: 'var(--status-danger)',
                                            }}>
                                                {vencidos} venc.
                                            </span>
                                        )}
                                    </div>
                                    {obra.cliente && (
                                        <div className="db-obra-tile-client">{obra.cliente}</div>
                                    )}
                                    {orcTotal > 0 && (
                                        <ProgressBar
                                            current={pago}
                                            total={orcTotal}
                                            showLabels={false}
                                            variant={getObraProgressVariant(pct)}
                                            height={3}
                                        />
                                    )}
                                    <div className="db-obra-stats-row">
                                        {saldo != null && (
                                            <div className="db-obra-stat">
                                                <span className="db-obra-stat-label">Saldo</span>
                                                <span className="db-obra-stat-value">{formatCurrency(saldo)}</span>
                                            </div>
                                        )}
                                        {orcTotal > 0 && (
                                            <div className="db-obra-stat">
                                                <span className="db-obra-stat-label">Orçamento</span>
                                                <span className="db-obra-stat-value">{pct.toFixed(0)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Activity feed */}
            <div className="db-section">
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
    );
}
