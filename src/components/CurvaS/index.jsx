import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import './CurvaS.css';

function calcularCurvaS(servicos, evmData) {
    if (!servicos || servicos.length === 0) return [];

    const servicosComData = servicos.filter(s => s.data_inicio && s.data_fim_prevista);
    if (servicosComData.length === 0) return [];

    const allDates = servicosComData.flatMap(s => [
        new Date(s.data_inicio + 'T00:00:00'),
        new Date(s.data_fim_prevista + 'T00:00:00'),
    ]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));

    minDate.setDate(1);
    maxDate.setMonth(maxDate.getMonth() + 2);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const avgFisicoAtual = servicos.length > 0
        ? servicos.reduce((acc, s) => acc + (s.percentual_conclusao || 0), 0) / servicos.length
        : 0;

    const points = [];
    const cur = new Date(minDate);

    while (cur <= maxDate) {
        const mesEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        mesEnd.setHours(23, 59, 59);

        const label = cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        const mesKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;

        let planejadoSum = 0;
        servicos.forEach(s => {
            if (!s.data_inicio || !s.data_fim_prevista) {
                return;
            }
            const start = new Date(s.data_inicio + 'T00:00:00');
            const end = new Date(s.data_fim_prevista + 'T00:00:00');
            if (mesEnd < start) {
                planejadoSum += 0;
            } else if (mesEnd >= end) {
                planejadoSum += 100;
            } else {
                const totalMs = end - start;
                const passedMs = mesEnd - start;
                planejadoSum += Math.max(0, Math.min(100, (passedMs / totalMs) * 100));
            }
        });

        const planejado = parseFloat((planejadoSum / servicos.length).toFixed(1));
        const isFuturo = mesEnd > hoje;

        const point = { periodo: label, planejado };

        if (!isFuturo || mesKey === mesHoje) {
            const evmSum = servicos.reduce((acc, s) => {
                const evm = evmData[s.servico_nome];
                return acc + (evm ? (evm.percentual_executado || 0) : (s.percentual_conclusao || 0));
            }, 0);
            point.executado = parseFloat((evmSum / servicos.length).toFixed(1));
        }

        points.push(point);
        cur.setMonth(cur.getMonth() + 1);
    }

    return points;
}

const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="curva-s__tooltip">
            <p className="curva-s__tooltip-label">{label}</p>
            {payload.map(entry => (
                <p key={entry.dataKey} style={{ color: entry.color, margin: '2px 0' }}>
                    {entry.name}: {entry.value != null ? `${entry.value.toFixed(1)}%` : '—'}
                </p>
            ))}
        </div>
    );
};

const CurvaS = ({ servicos, evmData = {} }) => {
    const data = useMemo(
        () => calcularCurvaS(servicos, evmData),
        [servicos, evmData]
    );

    const avgFisico = useMemo(() => {
        if (!servicos || servicos.length === 0) return 0;
        return servicos.reduce((acc, s) => acc + (s.percentual_conclusao || 0), 0) / servicos.length;
    }, [servicos]);

    if (!data || data.length === 0) {
        return (
            <div className="curva-s__empty">
                <i className="ti ti-chart-line" aria-hidden="true" />
                <p>Sem datas definidas para gerar a Curva S.</p>
                <span>Defina data de início e fim nos serviços.</span>
            </div>
        );
    }

    const hoje = new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    return (
        <section className="curva-s" aria-label="Curva S — Progresso Acumulado">
            <div className="curva-s__header">
                <h3 className="curva-s__title">
                    <i className="ti ti-chart-line" aria-hidden="true" />
                    Curva S — Progresso Acumulado
                </h3>
                <span className="curva-s__avg">
                    Físico atual: <strong>{avgFisico.toFixed(1)}%</strong>
                </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis
                        dataKey="periodo"
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        tickFormatter={v => `${v}%`}
                        domain={[0, 100]}
                    />
                    <Tooltip content={<TooltipCustom />} />
                    <Legend
                        wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                    />
                    <ReferenceLine
                        x={hoje}
                        stroke="var(--status-warning)"
                        strokeDasharray="4 4"
                        label={{ value: 'Hoje', fill: 'var(--status-warning)', fontSize: 11 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="planejado"
                        stroke="var(--status-info)"
                        strokeDasharray="6 3"
                        strokeWidth={2}
                        dot={false}
                        name="Planejado"
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="executado"
                        stroke="var(--status-success)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'var(--status-success)' }}
                        activeDot={{ r: 5 }}
                        name="Físico Executado"
                        connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </section>
    );
};

export default CurvaS;
