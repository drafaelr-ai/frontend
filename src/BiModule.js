/**
 * =====================================================
 * OBRALY - MÓDULO DE BUSINESS INTELLIGENCE (BI)
 * =====================================================
 * 
 * Módulo independente para dashboards e análises.
 * 
 * INSTRUÇÕES DE INTEGRAÇÃO:
 * 1. Adicione este arquivo ao seu projeto React
 * 2. Importe o componente: import { BiDashboard } from './BiModule';
 * 3. Use: <BiDashboard apiUrl={API_URL} fetchWithAuth={fetchWithAuth} />
 * 
 * DEPENDÊNCIAS NECESSÁRIAS (já existentes no projeto):
 * - react
 * - recharts
 * 
 * =====================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart
} from 'recharts';

// =====================================================
// CONSTANTES E CONFIGURAÇÕES
// =====================================================

const COLORS = {
    primary: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    gray: '#6b7280',
    chartColors: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
};

const formatCompactCurrency = (value) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return formatCurrency(value);
};

// =====================================================
// ESTILOS CSS-IN-JS
// =====================================================

const styles = {
    container: {
        padding: '24px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
        marginBottom: '24px'
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0
    },
    grid: {
        display: 'grid',
        gap: '20px',
        marginBottom: '24px'
    },
    grid4: {
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
    },
    grid2: {
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
    },
    grid3: {
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    cardTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    kpiValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '8px 0'
    },
    kpiChange: {
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600'
    },
    progressBar: {
        height: '8px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '12px'
    },
    progressFill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.5s ease'
    },
    tableContainer: {
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
    },
    th: {
        textAlign: 'left',
        padding: '12px',
        borderBottom: '2px solid #e2e8f0',
        color: '#64748b',
        fontWeight: '600',
        fontSize: '12px',
        textTransform: 'uppercase'
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #f1f5f9',
        color: '#334155'
    },
    alertItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '8px'
    },
    filterBar: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
    },
    select: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer'
    },
    button: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    tabContainer: {
        display: 'flex',
        gap: '4px',
        backgroundColor: '#f1f5f9',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '20px'
    },
    tab: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: 'transparent',
        color: '#64748b'
    },
    tabActive: {
        backgroundColor: '#ffffff',
        color: '#4f46e5',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: '#64748b'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px',
        color: '#64748b'
    }
};

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

const KpiCard = ({ title, value, subtitle, icon, color = COLORS.primary, progress, trend }) => (
    <div style={styles.card}>
        <div style={styles.cardHeader}>
            <p style={styles.cardTitle}>{title}</p>
            <span style={{ fontSize: '24px' }}>{icon}</span>
        </div>
        <p style={{ ...styles.kpiValue, color }}>{value}</p>
        {subtitle && (
            <p style={{ ...styles.kpiChange, color: trend > 0 ? COLORS.success : trend < 0 ? COLORS.danger : COLORS.gray }}>
                {trend !== undefined && (
                    <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
                )}
                {subtitle}
            </p>
        )}
        {progress !== undefined && (
            <div style={styles.progressBar}>
                <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: color
                }} />
            </div>
        )}
    </div>
);

const ChartCard = ({ title, children, subtitle, action }) => (
    <div style={styles.card}>
        <div style={styles.cardHeader}>
            <div>
                <h3 style={{ ...styles.cardTitle, fontSize: '16px', textTransform: 'none' }}>{title}</h3>
                {subtitle && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>{subtitle}</p>}
            </div>
            {action}
        </div>
        {children}
    </div>
);

const AlertItem = ({ type, message, value }) => {
    const colors = {
        danger: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '🚨' },
        warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: '⚠️' },
        info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: 'ℹ️' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✅' }
    };
    const c = colors[type] || colors.info;
    
    return (
        <div style={{
            ...styles.alertItem,
            backgroundColor: c.bg,
            border: `1px solid ${c.border}`
        }}>
            <span style={{ fontSize: '20px' }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: c.text, fontWeight: '500' }}>{message}</p>
            </div>
            {value && (
                <span style={{ fontWeight: '600', color: c.text }}>{value}</span>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: '#1e293b',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
            <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px' }}>{label}</p>
            {payload.map((entry, index) => (
                <p key={index} style={{ margin: '4px 0', color: entry.color, fontWeight: '500' }}>
                    {entry.name}: {formatter ? formatter(entry.value) : entry.value}
                </p>
            ))}
        </div>
    );
};

// =====================================================
// COMPONENTES DE DASHBOARD
// =====================================================

/**
 * Dashboard Financeiro Principal
 */
const FinanceiroDashboard = ({ dados }) => {
    const { obras = [], resumo = {} } = dados;
    
    // Calcular métricas
    const totalOrcamento = obras.reduce((sum, o) => sum + (o.orcamento_total || 0), 0);
    const totalPago = obras.reduce((sum, o) => sum + (o.total_pago || 0), 0);
    const totalLiberado = obras.reduce((sum, o) => sum + (o.liberado_pagamento || 0), 0);
    const totalExtras = obras.reduce((sum, o) => sum + (o.despesas_extras || 0), 0);
    const percentualExecutado = totalOrcamento > 0 ? (totalPago / totalOrcamento) * 100 : 0;
    
    // Preparar dados para gráficos
    const dadosObras = obras
        .filter(o => o.orcamento_total > 0)
        .sort((a, b) => b.orcamento_total - a.orcamento_total)
        .slice(0, 8)
        .map(o => ({
            nome: o.nome?.length > 15 ? o.nome.substring(0, 15) + '...' : o.nome,
            orcamento: o.orcamento_total || 0,
            pago: o.total_pago || 0,
            pendente: o.liberado_pagamento || 0
        }));
    
    const dadosPizza = [
        { name: 'Pago', value: totalPago, color: COLORS.success },
        { name: 'A Liberar', value: totalLiberado, color: COLORS.warning },
        { name: 'Disponível', value: Math.max(0, totalOrcamento - totalPago - totalLiberado), color: COLORS.gray }
    ].filter(d => d.value > 0);
    
    return (
        <>
            {/* KPIs Principais */}
            <div style={{ ...styles.grid, ...styles.grid4 }}>
                <KpiCard
                    title="Orçamento Total"
                    value={formatCompactCurrency(totalOrcamento)}
                    icon="💰"
                    color={COLORS.primary}
                    subtitle={`${obras.length} obras ativas`}
                />
                <KpiCard
                    title="Valores Executados"
                    value={formatCompactCurrency(totalPago)}
                    icon="✅"
                    color={COLORS.success}
                    progress={percentualExecutado}
                    subtitle={`${formatPercent(percentualExecutado)} do orçamento`}
                />
                <KpiCard
                    title="A Liberar (Fila)"
                    value={formatCompactCurrency(totalLiberado)}
                    icon="📋"
                    color={COLORS.warning}
                    subtitle="Pagamentos pendentes"
                />
                <KpiCard
                    title="Despesas Extras"
                    value={formatCompactCurrency(totalExtras)}
                    icon="⚠️"
                    color={COLORS.danger}
                    subtitle="Fora do orçamento"
                />
            </div>
            
            {/* Gráficos */}
            <div style={{ ...styles.grid, ...styles.grid2 }}>
                <ChartCard title="📊 Orçamento vs Executado por Obra" subtitle="Top 8 obras por valor">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosObras} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="nome" 
                                tick={{ fontSize: 11 }} 
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis 
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                            />
                            <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                            <Legend />
                            <Bar dataKey="orcamento" name="Orçamento" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pago" name="Pago" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                
                <ChartCard title="🥧 Distribuição Financeira" subtitle="Visão geral do status">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={dadosPizza}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {dadosPizza.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={formatCurrency} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                        {dadosPizza.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color }} />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{item.name}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </>
    );
};

/**
 * Dashboard de Obras
 */
const ObrasDashboard = ({ dados }) => {
    const { obras = [] } = dados;
    
    const obrasAtivas = obras.filter(o => !o.concluida).length;
    const obrasConcluidas = obras.filter(o => o.concluida).length;
    
    // Ranking de obras por valor
    const rankingObras = [...obras]
        .sort((a, b) => (b.total_pago || 0) - (a.total_pago || 0))
        .slice(0, 10);
    
    // Obras por cliente
    const porCliente = obras.reduce((acc, o) => {
        const cliente = o.cliente || 'Sem cliente';
        if (!acc[cliente]) acc[cliente] = { count: 0, valor: 0 };
        acc[cliente].count++;
        acc[cliente].valor += o.orcamento_total || 0;
        return acc;
    }, {});
    
    const dadosCliente = Object.entries(porCliente)
        .map(([nome, data]) => ({ nome, ...data }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);
    
    return (
        <>
            {/* KPIs */}
            <div style={{ ...styles.grid, ...styles.grid4 }}>
                <KpiCard
                    title="Obras Ativas"
                    value={obrasAtivas}
                    icon="🏗️"
                    color={COLORS.primary}
                />
                <KpiCard
                    title="Obras Concluídas"
                    value={obrasConcluidas}
                    icon="✅"
                    color={COLORS.success}
                />
                <KpiCard
                    title="Total de Obras"
                    value={obras.length}
                    icon="📊"
                    color={COLORS.info}
                />
                <KpiCard
                    title="Clientes Ativos"
                    value={Object.keys(porCliente).length}
                    icon="👥"
                    color={COLORS.purple}
                />
            </div>
            
            {/* Tabelas e Gráficos */}
            <div style={{ ...styles.grid, ...styles.grid2 }}>
                <ChartCard title="🏆 Ranking de Obras" subtitle="Por valor executado">
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>#</th>
                                    <th style={styles.th}>Obra</th>
                                    <th style={styles.th}>Cliente</th>
                                    <th style={{ ...styles.th, textAlign: 'right' }}>Executado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingObras.map((obra, i) => (
                                    <tr key={obra.id}>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                backgroundColor: i < 3 ? COLORS.chartColors[i] : '#e2e8f0',
                                                color: i < 3 ? '#fff' : '#64748b'
                                            }}>
                                                {i + 1}º
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: '500' }}>{obra.nome}</td>
                                        <td style={styles.td}>{obra.cliente || '-'}</td>
                                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', color: COLORS.success }}>
                                            {formatCurrency(obra.total_pago)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>
                
                <ChartCard title="👥 Obras por Cliente" subtitle="Distribuição de valor orçado">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dadosCliente} layout="vertical" margin={{ left: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                            <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={80} />
                            <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                            <Bar dataKey="valor" name="Valor Orçado" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </>
    );
};

/**
 * Dashboard de Alertas
 */
const AlertasDashboard = ({ dados }) => {
    const { obras = [], vencimentos = {} } = dados;
    
    const alertas = [];
    
    // Analisar cada obra
    obras.forEach(obra => {
        // Despesas extras altas (> 10% do orçamento)
        if (obra.orcamento_total > 0) {
            const percentExtras = (obra.despesas_extras / obra.orcamento_total) * 100;
            if (percentExtras > 10) {
                alertas.push({
                    type: 'warning',
                    message: `${obra.nome}: Despesas extras em ${formatPercent(percentExtras)}`,
                    value: formatCurrency(obra.despesas_extras)
                });
            }
        }
        
        // Obra com muito a liberar
        if (obra.liberado_pagamento > 50000) {
            alertas.push({
                type: 'info',
                message: `${obra.nome}: Alto valor na fila de pagamento`,
                value: formatCurrency(obra.liberado_pagamento)
            });
        }
    });
    
    // Alertas de vencimentos
    if (vencimentos.vencidos > 0) {
        alertas.unshift({
            type: 'danger',
            message: `${vencimentos.vencidos} pagamento(s) vencido(s)`,
            value: formatCurrency(vencimentos.valor_vencido)
        });
    }
    
    if (vencimentos.hoje > 0) {
        alertas.unshift({
            type: 'warning',
            message: `${vencimentos.hoje} pagamento(s) vencem hoje`,
            value: formatCurrency(vencimentos.valor_hoje)
        });
    }
    
    if (vencimentos.semana > 0) {
        alertas.push({
            type: 'info',
            message: `${vencimentos.semana} pagamento(s) nos próximos 7 dias`,
            value: formatCurrency(vencimentos.valor_semana)
        });
    }
    
    return (
        <div style={{ ...styles.grid, gridTemplateColumns: '1fr' }}>
            <ChartCard title="🔔 Central de Alertas" subtitle={`${alertas.length} alertas ativos`}>
                {alertas.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span style={{ fontSize: '48px' }}>✨</span>
                        <p>Nenhum alerta no momento. Tudo está em ordem!</p>
                    </div>
                ) : (
                    <div>
                        {alertas.map((alerta, i) => (
                            <AlertItem key={i} {...alerta} />
                        ))}
                    </div>
                )}
            </ChartCard>
        </div>
    );
};

/**
 * Dashboard de Fluxo de Caixa (Projeção)
 */
const FluxoCaixaDashboard = ({ dados }) => {
    const { fluxoMensal = [], projecao = [] } = dados;
    
    // Se não tiver dados de fluxo, gerar mockup baseado nas obras
    const dadosFluxo = fluxoMensal.length > 0 ? fluxoMensal : projecao.length > 0 ? projecao : [
        { mes: 'Jan', previsto: 0, realizado: 0 },
        { mes: 'Fev', previsto: 0, realizado: 0 },
        { mes: 'Mar', previsto: 0, realizado: 0 },
    ];
    
    return (
        <div style={{ ...styles.grid, gridTemplateColumns: '1fr' }}>
            <ChartCard title="📈 Fluxo de Caixa Mensal" subtitle="Previsto vs Realizado">
                <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={dadosFluxo} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes_nome" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend />
                        <Area 
                            type="monotone" 
                            dataKey="valor" 
                            name="Projetado" 
                            fill={COLORS.info} 
                            fillOpacity={0.2}
                            stroke={COLORS.info}
                            strokeWidth={2}
                        />
                        <Bar dataKey="valor" name="Valor" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};

/**
 * 🆕 Dashboard de Calendário de Vencimentos
 */
const CalendarioVencimentosDashboard = ({ dados }) => {
    const { vencimentos = [], resumoVencimentos = {} } = dados;
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroObra, setFiltroObra] = useState('todas');
    
    // Extrair obras únicas
    const obrasUnicas = useMemo(() => {
        const obras = new Set();
        vencimentos.forEach(v => obras.add(v.obra_nome));
        return ['todas', ...Array.from(obras)];
    }, [vencimentos]);
    
    // Filtrar vencimentos
    const vencimentosFiltrados = useMemo(() => {
        return vencimentos.filter(v => {
            if (filtroStatus !== 'todos' && v.status !== filtroStatus) return false;
            if (filtroObra !== 'todas' && v.obra_nome !== filtroObra) return false;
            return true;
        });
    }, [vencimentos, filtroStatus, filtroObra]);
    
    // Agrupar por data para visualização de calendário
    const vencimentosPorDia = useMemo(() => {
        const agrupado = {};
        vencimentosFiltrados.forEach(v => {
            if (!v.data) return;
            if (!agrupado[v.data]) agrupado[v.data] = [];
            agrupado[v.data].push(v);
        });
        return agrupado;
    }, [vencimentosFiltrados]);
    
    // Próximos 30 dias
    const proximosDias = useMemo(() => {
        const dias = [];
        const hoje = new Date();
        for (let i = 0; i < 30; i++) {
            const dia = new Date(hoje);
            dia.setDate(dia.getDate() + i);
            dias.push(dia.toISOString().split('T')[0]);
        }
        return dias;
    }, []);
    
    const getStatusColor = (status) => {
        switch(status) {
            case 'vencido': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
            case 'hoje': return { bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
            default: return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
        }
    };
    
    return (
        <>
            {/* KPIs de Vencimentos */}
            <div style={{ ...styles.grid, ...styles.grid4 }}>
                <KpiCard
                    title="Vencidos"
                    value={resumoVencimentos.vencidos || 0}
                    subtitle={formatCurrency(resumoVencimentos.valor_vencido || 0)}
                    icon="🚨"
                    color={COLORS.danger}
                />
                <KpiCard
                    title="Vencem Hoje"
                    value={resumoVencimentos.hoje || 0}
                    subtitle={formatCurrency(resumoVencimentos.valor_hoje || 0)}
                    icon="⚠️"
                    color={COLORS.warning}
                />
                <KpiCard
                    title="Próximos 7 Dias"
                    value={resumoVencimentos.semana || 0}
                    subtitle={formatCurrency(resumoVencimentos.valor_semana || 0)}
                    icon="📅"
                    color={COLORS.info}
                />
                <KpiCard
                    title="Próximos 30 Dias"
                    value={resumoVencimentos.mes || 0}
                    subtitle={formatCurrency(resumoVencimentos.valor_mes || 0)}
                    icon="📆"
                    color={COLORS.success}
                />
            </div>
            
            {/* Filtros */}
            <div style={{ ...styles.card, marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#64748b', marginRight: '8px' }}>Status:</label>
                        <select 
                            value={filtroStatus} 
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            style={styles.select}
                        >
                            <option value="todos">Todos</option>
                            <option value="vencido">Vencidos</option>
                            <option value="hoje">Hoje</option>
                            <option value="futuro">Futuros</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: '#64748b', marginRight: '8px' }}>Obra:</label>
                        <select 
                            value={filtroObra} 
                            onChange={(e) => setFiltroObra(e.target.value)}
                            style={styles.select}
                        >
                            {obrasUnicas.map(obra => (
                                <option key={obra} value={obra}>{obra === 'todas' ? 'Todas as obras' : obra}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#64748b' }}>
                        {vencimentosFiltrados.length} vencimentos encontrados
                    </div>
                </div>
            </div>
            
            {/* Visualização em Grid de Calendário */}
            <div style={{ ...styles.grid, ...styles.grid2 }}>
                {/* Mini Calendário dos próximos 30 dias */}
                <ChartCard title="📅 Próximos 30 Dias" subtitle="Clique em um dia para ver detalhes">
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)', 
                        gap: '4px',
                        marginTop: '10px'
                    }}>
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                            <div key={dia} style={{ 
                                textAlign: 'center', 
                                fontSize: '11px', 
                                color: '#94a3b8',
                                padding: '4px'
                            }}>
                                {dia}
                            </div>
                        ))}
                        {proximosDias.map((dataStr, idx) => {
                            const dataObj = new Date(dataStr + 'T12:00:00');
                            const vencimentosDia = vencimentosPorDia[dataStr] || [];
                            const temVencido = vencimentosDia.some(v => v.status === 'vencido');
                            const temHoje = vencimentosDia.some(v => v.status === 'hoje');
                            const valorTotal = vencimentosDia.reduce((sum, v) => sum + (v.valor || 0), 0);
                            
                            // Preencher dias vazios no início
                            const diasVazios = idx === 0 ? dataObj.getDay() : 0;
                            const elementos = [];
                            
                            if (idx === 0) {
                                for (let i = 0; i < diasVazios; i++) {
                                    elementos.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
                                }
                            }
                            
                            elementos.push(
                                <div 
                                    key={dataStr}
                                    style={{
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        backgroundColor: vencimentosDia.length > 0 
                                            ? (temVencido ? '#fef2f2' : temHoje ? '#fffbeb' : '#f0fdf4')
                                            : '#f8fafc',
                                        border: vencimentosDia.length > 0 
                                            ? `2px solid ${temVencido ? '#fecaca' : temHoje ? '#fde68a' : '#bbf7d0'}`
                                            : '1px solid #e2e8f0',
                                        cursor: vencimentosDia.length > 0 ? 'pointer' : 'default',
                                        transition: 'all 0.2s'
                                    }}
                                    title={vencimentosDia.length > 0 ? `${vencimentosDia.length} vencimento(s) - ${formatCurrency(valorTotal)}` : ''}
                                >
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{dataObj.getDate()}</div>
                                    {vencimentosDia.length > 0 && (
                                        <div style={{ 
                                            fontSize: '10px', 
                                            color: temVencido ? '#dc2626' : temHoje ? '#d97706' : '#16a34a',
                                            fontWeight: '600'
                                        }}>
                                            {vencimentosDia.length}
                                        </div>
                                    )}
                                </div>
                            );
                            
                            return elementos;
                        })}
                    </div>
                </ChartCard>
                
                {/* Lista de Vencimentos */}
                <ChartCard title="📋 Lista de Vencimentos" subtitle="Ordenado por data">
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {vencimentosFiltrados.length === 0 ? (
                            <div style={styles.emptyState}>
                                <span style={{ fontSize: '32px' }}>✨</span>
                                <p>Nenhum vencimento encontrado</p>
                            </div>
                        ) : (
                            vencimentosFiltrados.slice(0, 20).map((v, idx) => {
                                const statusColor = getStatusColor(v.status);
                                return (
                                    <div key={`${v.tipo}-${v.id}-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        marginBottom: '8px',
                                        backgroundColor: statusColor.bg,
                                        border: `1px solid ${statusColor.border}`
                                    }}>
                                        <div style={{
                                            width: '50px',
                                            textAlign: 'center',
                                            marginRight: '12px'
                                        }}>
                                            <div style={{ fontSize: '18px', fontWeight: '700', color: statusColor.text }}>
                                                {v.data ? new Date(v.data + 'T12:00:00').getDate() : '-'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                {v.data ? new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }) : ''}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#1e293b' }}>
                                                {v.descricao}
                                                {v.is_entrada && <span style={{ 
                                                    marginLeft: '8px',
                                                    padding: '2px 6px',
                                                    backgroundColor: '#dbeafe',
                                                    color: '#1d4ed8',
                                                    borderRadius: '4px',
                                                    fontSize: '10px'
                                                }}>ENTRADA</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {v.obra_nome} {v.fornecedor && `• ${v.fornecedor}`}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '600', color: statusColor.text }}>
                                                {formatCurrency(v.valor)}
                                            </div>
                                            <div style={{
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                backgroundColor: statusColor.text,
                                                color: '#fff'
                                            }}>
                                                {v.status === 'vencido' ? 'VENCIDO' : v.status === 'hoje' ? 'HOJE' : 'PENDENTE'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {vencimentosFiltrados.length > 20 && (
                            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                ... e mais {vencimentosFiltrados.length - 20} vencimentos
                            </p>
                        )}
                    </div>
                </ChartCard>
            </div>
        </>
    );
};

/**
 * 🆕 Dashboard Temporal (Análise Histórica)
 */
const TemporalDashboard = ({ dados }) => {
    const { historicoMensal = [], resumoHistorico = {} } = dados;
    const [visualizacao, setVisualizacao] = useState('barras');
    
    // Preparar dados para gráficos
    const dadosGrafico = useMemo(() => {
        return historicoMensal.map(h => ({
            ...h,
            mes_display: h.mes_nome || h.mes
        }));
    }, [historicoMensal]);
    
    // Agrupar por ano para comparativo
    const dadosPorAno = useMemo(() => {
        const anos = {};
        historicoMensal.forEach(h => {
            const ano = h.ano || (h.mes ? parseInt(h.mes.split('-')[0]) : new Date().getFullYear());
            if (!anos[ano]) anos[ano] = { ano, total: 0, meses: 0 };
            anos[ano].total += h.total || 0;
            anos[ano].meses += 1;
        });
        return Object.values(anos).sort((a, b) => a.ano - b.ano);
    }, [historicoMensal]);
    
    // Sazonalidade (média por mês do ano)
    const sazonalidade = useMemo(() => {
        const meses = {};
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        historicoMensal.forEach(h => {
            const mesNum = h.mes_num || (h.mes ? parseInt(h.mes.split('-')[1]) : 1);
            if (!meses[mesNum]) meses[mesNum] = { mes: mesesNomes[mesNum - 1], total: 0, count: 0 };
            meses[mesNum].total += h.total || 0;
            meses[mesNum].count += 1;
        });
        
        return Object.values(meses)
            .map(m => ({ ...m, media: m.count > 0 ? m.total / m.count : 0 }))
            .sort((a, b) => {
                const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return mesesNomes.indexOf(a.mes) - mesesNomes.indexOf(b.mes);
            });
    }, [historicoMensal]);
    
    return (
        <>
            {/* KPIs */}
            <div style={{ ...styles.grid, ...styles.grid4 }}>
                <KpiCard
                    title="Total Histórico"
                    value={formatCompactCurrency(resumoHistorico.total_geral || 0)}
                    subtitle={`${resumoHistorico.total_meses || 0} meses de dados`}
                    icon="💰"
                    color={COLORS.primary}
                />
                <KpiCard
                    title="Média Mensal"
                    value={formatCompactCurrency(resumoHistorico.media_mensal || 0)}
                    icon="📊"
                    color={COLORS.info}
                />
                <KpiCard
                    title="Melhor Mês"
                    value={resumoHistorico.melhor_mes?.mes_nome || '-'}
                    subtitle={formatCurrency(resumoHistorico.melhor_mes?.total || 0)}
                    icon="📈"
                    color={COLORS.success}
                />
                <KpiCard
                    title="Menor Mês"
                    value={resumoHistorico.pior_mes?.mes_nome || '-'}
                    subtitle={formatCurrency(resumoHistorico.pior_mes?.total || 0)}
                    icon="📉"
                    color={COLORS.warning}
                />
            </div>
            
            {/* Seletor de Visualização */}
            <div style={{ ...styles.card, marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { id: 'barras', label: '📊 Barras' },
                        { id: 'linha', label: '📈 Linha' },
                        { id: 'area', label: '🌊 Área' }
                    ].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setVisualizacao(v.id)}
                            style={{
                                ...styles.button,
                                backgroundColor: visualizacao === v.id ? COLORS.primary : '#f1f5f9',
                                color: visualizacao === v.id ? '#fff' : '#64748b'
                            }}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Gráfico Principal - Histórico Mensal */}
            <div style={{ ...styles.grid, gridTemplateColumns: '1fr' }}>
                <ChartCard title="📅 Histórico de Pagamentos" subtitle="Evolução mensal dos gastos">
                    {dadosGrafico.length === 0 ? (
                        <div style={styles.emptyState}>
                            <span style={{ fontSize: '48px' }}>📊</span>
                            <p>Nenhum dado histórico disponível</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            {visualizacao === 'barras' ? (
                                <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="mes_display" 
                                        tick={{ fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                    />
                                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                    <Legend />
                                    <Bar dataKey="mao_obra" name="Mão de Obra" fill={COLORS.primary} stackId="a" />
                                    <Bar dataKey="material" name="Material" fill={COLORS.success} stackId="a" />
                                </BarChart>
                            ) : visualizacao === 'linha' ? (
                                <LineChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="mes_display" 
                                        tick={{ fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                    />
                                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="mao_obra" name="Mão de Obra" stroke={COLORS.info} strokeWidth={2} />
                                    <Line type="monotone" dataKey="material" name="Material" stroke={COLORS.success} strokeWidth={2} />
                                </LineChart>
                            ) : (
                                <AreaChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="mes_display" 
                                        tick={{ fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                    />
                                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                    <Legend />
                                    <Area type="monotone" dataKey="total" name="Total" fill={COLORS.primary} fillOpacity={0.3} stroke={COLORS.primary} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
            
            {/* Gráficos Secundários */}
            <div style={{ ...styles.grid, ...styles.grid2 }}>
                {/* Sazonalidade */}
                <ChartCard title="🌡️ Sazonalidade" subtitle="Média de gastos por mês do ano">
                    {sazonalidade.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p>Dados insuficientes</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={sazonalidade}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                <Bar dataKey="media" name="Média" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                
                {/* Comparativo Anual */}
                <ChartCard title="📆 Comparativo Anual" subtitle="Total por ano">
                    {dadosPorAno.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p>Dados insuficientes</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={dadosPorAno} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                                <YAxis type="category" dataKey="ano" tick={{ fontSize: 12 }} width={50} />
                                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                <Bar dataKey="total" name="Total" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </>
    );
};

// =====================================================
// COMPONENTE PRINCIPAL DO DASHBOARD
// =====================================================

/**
 * BiDashboard - Componente principal do módulo de BI
 * 
 * @param {string} apiUrl - URL base da API (ex: https://backend.railway.app)
 * @param {function} fetchWithAuth - Função para fazer requisições autenticadas
 * @param {function} onClose - Callback para fechar o dashboard (opcional)
 */
export const BiDashboard = ({ apiUrl, fetchWithAuth, onClose, embedded = false }) => {
    const [activeTab, setActiveTab] = useState('financeiro');
    const [isLoading, setIsLoading] = useState(true);
    const [dados, setDados] = useState({
        obras: [],
        resumo: {},
        vencimentos: [],
        resumoVencimentos: {},
        historicoMensal: [],
        resumoHistorico: {},
        projecao: [],
        fluxoMensal: []
    });
    const [error, setError] = useState(null);
    
    // Carregar dados
    useEffect(() => {
        const carregarDados = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Buscar lista de obras
                const resObras = await fetchWithAuth(`${apiUrl}/obras?mostrar_concluidas=true`);
                if (!resObras.ok) throw new Error('Erro ao buscar obras');
                const obras = await resObras.json();
                
                // Buscar vencimentos
                let vencimentos = [];
                let resumoVencimentos = {};
                try {
                    const resVencimentos = await fetchWithAuth(`${apiUrl}/bi/vencimentos`);
                    if (resVencimentos.ok) {
                        const dataVenc = await resVencimentos.json();
                        vencimentos = dataVenc.vencimentos || [];
                        resumoVencimentos = dataVenc.resumo || {};
                    }
                } catch (e) {
                    console.log('Vencimentos não disponível:', e);
                }
                
                // Buscar histórico mensal
                let historicoMensal = [];
                let resumoHistorico = {};
                try {
                    const resHistorico = await fetchWithAuth(`${apiUrl}/bi/historico-mensal`);
                    console.log('[BI] Resposta histórico:', resHistorico.status);
                    if (resHistorico.ok) {
                        const dataHist = await resHistorico.json();
                        console.log('[BI] Dados histórico:', dataHist);
                        historicoMensal = dataHist.historico || [];
                        resumoHistorico = dataHist.resumo || {};
                        console.log('[BI] Histórico mensal:', historicoMensal.length, 'meses');
                    } else {
                        const errText = await resHistorico.text();
                        console.log('[BI] Erro histórico:', errText);
                    }
                } catch (e) {
                    console.log('Histórico não disponível:', e);
                }
                
                // Buscar projeção
                let projecao = [];
                try {
                    const resProjecao = await fetchWithAuth(`${apiUrl}/bi/projecao`);
                    if (resProjecao.ok) {
                        const dataProj = await resProjecao.json();
                        projecao = dataProj.projecao || [];
                    }
                } catch (e) {
                    console.log('Projeção não disponível:', e);
                }
                
                setDados({
                    obras: Array.isArray(obras) ? obras : [],
                    resumo: {},
                    vencimentos,
                    resumoVencimentos,
                    historicoMensal,
                    resumoHistorico,
                    projecao,
                    fluxoMensal: projecao // Usar projeção como fluxo
                });
            } catch (err) {
                console.error('Erro ao carregar dados do BI:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        carregarDados();
    }, [apiUrl, fetchWithAuth]);
    
    const tabs = [
        { id: 'financeiro', label: '💰 Financeiro', component: FinanceiroDashboard },
        { id: 'obras', label: '🏗️ Obras', component: ObrasDashboard },
        { id: 'calendario', label: '📅 Calendário', component: CalendarioVencimentosDashboard },
        { id: 'temporal', label: '📈 Temporal', component: TemporalDashboard },
        { id: 'alertas', label: '🔔 Alertas', component: AlertasDashboard },
        { id: 'fluxo', label: '💸 Projeção', component: FluxoCaixaDashboard }
    ];
    
    const TabComponent = tabs.find(t => t.id === activeTab)?.component || FinanceiroDashboard;
    
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={styles.title}>
                            📊 Business Intelligence
                        </h1>
                        <p style={styles.subtitle}>
                            Análises e insights do seu negócio • Atualizado em tempo real
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                ...styles.button,
                                backgroundColor: '#f1f5f9',
                                color: '#64748b'
                            }}
                        >
                            ← Voltar
                        </button>
                    )}
                </div>
            </div>
            
            {/* Tabs */}
            <div style={styles.tabContainer}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.tabActive : {})
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* Conteúdo */}
            {isLoading ? (
                <div style={styles.loading}>
                    <div>
                        <span style={{ fontSize: '32px' }}>⏳</span>
                        <p>Carregando dados...</p>
                    </div>
                </div>
            ) : error ? (
                <div style={{ ...styles.card, textAlign: 'center', color: COLORS.danger }}>
                    <span style={{ fontSize: '48px' }}>❌</span>
                    <p>Erro ao carregar dados: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ ...styles.button, backgroundColor: COLORS.primary, color: '#fff', marginTop: '16px' }}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <TabComponent dados={dados} />
            )}
            
            {/* Footer */}
            <div style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                <p>Obraly BI Module v1.1 • Dados atualizados em tempo real</p>
            </div>
        </div>
    );
};

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default BiDashboard;

// Exportar componentes individuais para uso customizado
export {
    KpiCard,
    ChartCard,
    AlertItem,
    FinanceiroDashboard,
    ObrasDashboard,
    AlertasDashboard,
    FluxoCaixaDashboard,
    CalendarioVencimentosDashboard,
    TemporalDashboard,
    COLORS,
    formatCurrency,
    formatPercent,
    formatCompactCurrency
};
