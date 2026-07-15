import React, { useState, useMemo } from 'react';

const LABEL_W = 220;

const ptDate = (str) => {
    if (!str) return '—';
    return new Date(str + 'T00:00:00').toLocaleDateString('pt-BR');
};

const todayStr = () => {
    const t = new Date();
    return new Date(t.getTime() - t.getTimezoneOffset() * 60000)
        .toISOString().split('T')[0];
};

const GanttCronograma = ({ servicos }) => {
    const [expanded, setExpanded] = useState({});   // servico.id → bool (default true)
    const [expEtapa, setExpEtapa] = useState({});   // `${sId}:${eId}` → bool (default false)

    const isOpen = (id) => expanded[id] !== false;
    const isEtapaOpen = (k) => !!expEtapa[k];

    const today = todayStr();

    const range = useMemo(() => {
        let min = null, max = null;
        const chk = (str) => {
            if (!str) return;
            const d = new Date(str + 'T00:00:00');
            if (!min || d < min) min = new Date(d);
            if (!max || d > max) max = new Date(d);
        };
        servicos.forEach(s => {
            chk(s.data_inicio); chk(s.data_fim_prevista);
            (s.etapas || []).forEach(e => {
                chk(e.data_inicio); chk(e.data_fim);
                (e.subetapas || []).forEach(sub => { chk(sub.data_inicio); chk(sub.data_fim); });
            });
        });
        if (!min) {
            min = new Date(today + 'T00:00:00');
            max = new Date(min);
            max.setDate(max.getDate() + 60);
        } else {
            min = new Date(min); min.setDate(min.getDate() - 7);
            max = new Date(max); max.setDate(max.getDate() + 14);
        }
        return { min, max };
    }, [servicos, today]);

    const span = range.max - range.min;

    const toPct = (str) => {
        if (!str) return null;
        const d = new Date(str + 'T00:00:00');
        return Math.max(0, Math.min(100, ((d - range.min) / span) * 100));
    };

    const wPct = (start, end) => {
        if (!start) return 3;
        const s = new Date(start + 'T00:00:00');
        const e = end ? new Date(end + 'T00:00:00') : new Date(today + 'T00:00:00');
        return Math.max(1.5, ((e - s) / span) * 100);
    };

    const months = useMemo(() => {
        const res = [];
        const cur = new Date(range.min);
        cur.setDate(1);
        while (cur <= range.max) {
            res.push({
                label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                pct: Math.max(0, ((cur - range.min) / span) * 100),
            });
            cur.setMonth(cur.getMonth() + 1);
        }
        return res;
    }, [range, span]);

    const todayPct = toPct(today);

    // Correct today-line position: label_w*(1-f) + f*100% avoids mixed-unit issue
    const todayBodyStyle = todayPct !== null
        ? { left: `calc(${(LABEL_W * (1 - todayPct / 100)).toFixed(1)}px + ${todayPct.toFixed(3)}%)` }
        : null;

    const statusColor = (pct, dataInicio, dataFim) => {
        if (pct >= 100) return 'var(--status-success)';
        const hoje = new Date(today + 'T00:00:00');
        const fim = dataFim ? new Date(dataFim + 'T00:00:00') : null;
        if (fim && hoje >= fim) return 'var(--status-danger)';
        if (dataInicio && fim && hoje >= new Date(dataInicio + 'T00:00:00')) {
            const inicio = new Date(dataInicio + 'T00:00:00');
            const total = fim - inicio;
            const planejado = total > 0 ? ((hoje - inicio) / total) * 100 : 100;
            if (planejado - pct >= 15) return 'var(--status-warning)';
        }
        if (pct > 0) return 'var(--status-info)';
        return 'var(--status-neutral)';
    };

    const renderBar = (start, end, pct, color, label) => {
        if (!start) {
            return (
                <div
                    className="gantt-bar gantt-bar--nodate"
                    style={{ left: `${todayPct ?? 10}%`, width: '3%' }}
                    title={`${label} — sem data definida`}
                />
            );
        }
        return (
            <div
                className="gantt-bar"
                style={{ left: `${toPct(start)}%`, width: `${wPct(start, end)}%`, backgroundColor: color }}
                title={`${label} | ${Math.round(pct)}% | ${ptDate(start)} → ${ptDate(end)}`}
            >
                <div className="gantt-bar__fill" style={{ width: `${Math.min(100, pct)}%` }} />
                <span className="gantt-bar__label">{Math.round(pct)}%</span>
            </div>
        );
    };

    return (
        <div className="gantt-container">
            <div className="gantt-header">
                <div className="gantt-label-col">Tarefa</div>
                <div className="gantt-track-header">
                    {months.map((m, i) => (
                        <div key={i} className="gantt-month-tick" style={{ left: `${m.pct}%` }}>
                            {m.label}
                        </div>
                    ))}
                    {todayPct !== null && (
                        <div className="gantt-today-header-line" style={{ left: `${todayPct}%` }}>
                            <span className="gantt-today-chip">Hoje</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="gantt-body">
                {todayBodyStyle && (
                    <div className="gantt-today-body-line" style={todayBodyStyle} />
                )}

                {servicos.length === 0 && (
                    <div className="gantt-empty">Nenhum serviço no cronograma.</div>
                )}

                {servicos.map((s) => {
                    const open = isOpen(s.id);
                    const hasEtapas = s.tipo_medicao === 'etapas' && (s.etapas || []).length > 0;
                    const color = statusColor(s.percentual_conclusao || 0, s.data_inicio, s.data_fim_prevista);

                    return (
                        <React.Fragment key={s.id}>
                            <div className="gantt-row gantt-row--servico">
                                <div className="gantt-label">
                                    <button
                                        className="gantt-chevron"
                                        disabled={!hasEtapas}
                                        onClick={() => setExpanded(p => ({ ...p, [s.id]: !isOpen(s.id) }))}
                                        aria-label={open ? 'Recolher etapas' : 'Expandir etapas'}
                                    >
                                        <i
                                            className={`ti ${hasEtapas ? (open ? 'ti-chevron-down' : 'ti-chevron-right') : 'ti-minus'}`}
                                            aria-hidden="true"
                                        />
                                    </button>
                                    <span className="gantt-name" title={s.servico_nome}>{s.servico_nome}</span>
                                </div>
                                <div className="gantt-track">
                                    {renderBar(s.data_inicio, s.data_fim_prevista, s.percentual_conclusao || 0, color, s.servico_nome)}
                                </div>
                            </div>

                            {open && hasEtapas && (s.etapas || []).map((e, eIdx) => {
                                const eKey = `${s.id}:${e.id}`;
                                const eOpen = isEtapaOpen(eKey);
                                const hasSubs = (e.subetapas || []).length > 0;
                                const eColor = (e.percentual_conclusao || 0) >= 100 ? 'var(--status-success)' : 'var(--status-info)';

                                return (
                                    <React.Fragment key={e.id}>
                                        <div className="gantt-row gantt-row--etapa">
                                            <div className="gantt-label gantt-label--etapa">
                                                <button
                                                    className="gantt-chevron gantt-chevron--sm"
                                                    disabled={!hasSubs}
                                                    onClick={() => setExpEtapa(p => ({ ...p, [eKey]: !eOpen }))}
                                                    aria-label={eOpen ? 'Recolher subetapas' : 'Expandir subetapas'}
                                                >
                                                    <i
                                                        className={`ti ${hasSubs ? (eOpen ? 'ti-chevron-down' : 'ti-chevron-right') : 'ti-point'}`}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                                <span className="gantt-idx">{eIdx + 1}</span>
                                                <span className="gantt-name gantt-name--etapa" title={e.nome}>{e.nome}</span>
                                            </div>
                                            <div className="gantt-track">
                                                {renderBar(e.data_inicio, e.data_fim, e.percentual_conclusao || 0, eColor, e.nome)}
                                            </div>
                                        </div>

                                        {eOpen && hasSubs && (e.subetapas || []).map((sub, subIdx) => {
                                            const subColor = (sub.percentual_conclusao || 0) >= 100 ? 'var(--status-success)' : 'var(--status-info)';
                                            return (
                                                <div key={sub.id} className="gantt-row gantt-row--subetapa">
                                                    <div className="gantt-label gantt-label--subetapa">
                                                        <span className="gantt-idx">{eIdx + 1}.{subIdx + 1}</span>
                                                        <span className="gantt-name gantt-name--subetapa" title={sub.nome}>{sub.nome}</span>
                                                    </div>
                                                    <div className="gantt-track">
                                                        {renderBar(sub.data_inicio, sub.data_fim, sub.percentual_conclusao || 0, subColor, sub.nome)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default GanttCronograma;
