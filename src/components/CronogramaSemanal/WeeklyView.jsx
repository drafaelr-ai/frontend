import React, { useState, useMemo } from 'react';
import './WeeklyView.css';

const formatCurrency = (v) =>
    typeof v === 'number' && !isNaN(v)
        ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : 'R$ 0';

const formatDate = (d) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfWeek = (start) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59);
    return d;
};

function getStatusKey(servico, hoje) {
    const pct = servico.percentual_conclusao || 0;
    const fim = servico.data_fim_prevista ? new Date(servico.data_fim_prevista + 'T00:00:00') : null;
    if (pct >= 100) return 'concluido';
    if (fim && hoje > fim) return 'atrasado';
    if (servico.data_inicio_real || pct > 0) return 'em_andamento';
    return 'a_iniciar';
}

function isActiveDuringWeek(servico, weekStart, weekEnd) {
    if (!servico.data_inicio && !servico.data_fim_prevista) return true;
    const start = servico.data_inicio ? new Date(servico.data_inicio + 'T00:00:00') : null;
    const end = servico.data_fim_prevista ? new Date(servico.data_fim_prevista + 'T00:00:00') : null;
    if (start && end) return start <= weekEnd && end >= weekStart;
    if (start) return start <= weekEnd;
    if (end) return end >= weekStart;
    return true;
}

const STATUS_CONFIG = {
    concluido:    { label: 'Concluído',    cls: 'success',  icon: 'ti-circle-check' },
    atrasado:     { label: 'Atrasado',     cls: 'danger',   icon: 'ti-alert-triangle' },
    em_andamento: { label: 'Em Andamento', cls: 'info',     icon: 'ti-loader' },
    a_iniciar:    { label: 'A Iniciar',    cls: 'neutral',  icon: 'ti-clock' },
};

const WeeklyCard = ({ servico, evmData, hoje, onEdit }) => {
    const status = getStatusKey(servico, hoje);
    const cfg = STATUS_CONFIG[status];
    const pct = servico.percentual_conclusao || 0;
    const evm = evmData?.[servico.servico_nome] || {};
    const valorPago = evm.valor_pago || 0;
    const pagoPct = evm.percentual_pago || 0;

    return (
        <article
            className={`wv-card wv-card--${status}`}
            aria-label={servico.servico_nome}
        >
            <div className="wv-card__top">
                <div className="wv-card__nome-row">
                    {servico.ordem && (
                        <span className="wv-card__ordem">#{servico.ordem}</span>
                    )}
                    <h4 className="wv-card__nome">{servico.servico_nome}</h4>
                </div>
                <span className={`wv-card__badge wv-card__badge--${cfg.cls}`}>
                    <i className={`ti ${cfg.icon}`} aria-hidden="true" />
                    {cfg.label}
                </span>
            </div>

            <div className="wv-card__progress">
                <div className="wv-card__progress-header">
                    <span className="wv-card__progress-label">
                        <i className="ti ti-tool" aria-hidden="true" /> Físico
                    </span>
                    <span className="wv-card__progress-pct">{pct.toFixed(0)}%</span>
                </div>
                <div className="wv-card__bar-track">
                    <div
                        className={`wv-card__bar-fill wv-card__bar-fill--${status}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {(valorPago > 0 || pagoPct > 0) && (
                <div className="wv-card__financeiro">
                    <span className="wv-card__fin-label">
                        <i className="ti ti-receipt" aria-hidden="true" /> Pago
                    </span>
                    <span className="wv-card__fin-value">{formatCurrency(valorPago)}</span>
                </div>
            )}

            {servico.data_fim_prevista && (
                <div className={`wv-card__prazo${status === 'atrasado' ? ' wv-card__prazo--danger' : ''}`}>
                    <i className="ti ti-calendar-due" aria-hidden="true" />
                    Prazo: {new Date(servico.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
            )}

            {onEdit && (
                <button
                    type="button"
                    className="wv-card__edit-btn"
                    onClick={() => onEdit(servico)}
                    aria-label={`Editar ${servico.servico_nome}`}
                >
                    <i className="ti ti-edit" aria-hidden="true" />
                </button>
            )}
        </article>
    );
};

const WeeklyView = ({ servicos = [], evmData = {}, onEdit }) => {
    const [weekOffset, setWeekOffset] = useState(0);

    const hoje = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const { weekStart, weekEnd } = useMemo(() => {
        const base = startOfWeek(hoje);
        base.setDate(base.getDate() + weekOffset * 7);
        return { weekStart: base, weekEnd: endOfWeek(base) };
    }, [hoje, weekOffset]);

    const servicosSemana = useMemo(
        () => servicos.filter(s => isActiveDuringWeek(s, weekStart, weekEnd)),
        [servicos, weekStart, weekEnd]
    );

    const semanaLabel = `${formatDate(weekStart)} a ${formatDate(weekEnd)}`;
    const isCurrentWeek = weekOffset === 0;

    if (servicos.length === 0) {
        return (
            <div className="wv-empty">
                <i className="ti ti-calendar-off" aria-hidden="true" />
                <p>Nenhum serviço no cronograma.</p>
            </div>
        );
    }

    return (
        <section className="wv-root" aria-label="Visualização semanal do cronograma">
            {/* Nav semana */}
            <div className="wv-nav">
                <button
                    type="button"
                    className="wv-nav__btn"
                    onClick={() => setWeekOffset(o => o - 1)}
                    aria-label="Semana anterior"
                >
                    <i className="ti ti-chevron-left" aria-hidden="true" />
                </button>

                <div className="wv-nav__center">
                    <span className="wv-nav__label">Semana de {semanaLabel}</span>
                    {!isCurrentWeek && (
                        <button
                            type="button"
                            className="wv-nav__today-btn"
                            onClick={() => setWeekOffset(0)}
                        >
                            Semana atual
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="wv-nav__btn"
                    onClick={() => setWeekOffset(o => o + 1)}
                    aria-label="Próxima semana"
                >
                    <i className="ti ti-chevron-right" aria-hidden="true" />
                </button>
            </div>

            {/* Cards */}
            {servicosSemana.length === 0 ? (
                <div key={weekOffset} className="wv-empty-week">
                    <i className="ti ti-calendar-event" aria-hidden="true" />
                    <p>Nenhum serviço ativo nesta semana.</p>
                    <span>Navegue para semanas com serviços planejados.</span>
                </div>
            ) : (
                <div key={weekOffset} className="wv-cards">
                    {servicosSemana.map(s => (
                        <WeeklyCard
                            key={s.id}
                            servico={s}
                            evmData={evmData}
                            hoje={hoje}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}

            <p className="wv-count">
                {servicosSemana.length} de {servicos.length} serviço{servicos.length !== 1 ? 's' : ''} nesta semana
            </p>
        </section>
    );
};

export default WeeklyView;
