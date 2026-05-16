import React from 'react';
import './EtapaCard.css';

const formatCurrency = (v) => {
    if (typeof v !== 'number' || isNaN(v)) return 'R$ 0';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPct = (v) => `${(v || 0).toFixed(0)}%`;

function calcularStatusCard(servico) {
    const pct = servico.percentual_conclusao || 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = servico.data_fim_prevista
        ? new Date(servico.data_fim_prevista + 'T00:00:00')
        : null;

    if (pct >= 100) return 'concluido';
    if (dataFim && hoje > dataFim) return 'atrasado';
    if (servico.data_inicio_real || pct > 0) return 'em_andamento';
    return 'a_iniciar';
}

function calcularPlanejadoHoje(servico) {
    if (!servico.data_inicio || !servico.data_fim_prevista) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const start = new Date(servico.data_inicio + 'T00:00:00');
    const end = new Date(servico.data_fim_prevista + 'T00:00:00');
    if (hoje < start) return 0;
    if (hoje >= end) return 100;
    const total = end - start;
    const passed = hoje - start;
    return Math.round((passed / total) * 100);
}

const STATUS_CONFIG = {
    concluido:    { label: 'Concluído',   cls: 'success',  icon: 'ti-circle-check' },
    atrasado:     { label: 'Atrasado',    cls: 'danger',   icon: 'ti-alert-triangle' },
    em_andamento: { label: 'Em Andamento',cls: 'info',     icon: 'ti-loader' },
    a_iniciar:    { label: 'A Iniciar',   cls: 'neutral',  icon: 'ti-clock' },
};

const ProgressBar = ({ value, target, colorVar }) => {
    const capped = Math.min(value, 100);
    const targetCapped = target != null ? Math.min(target, 100) : null;
    return (
        <div className="etapa-card__bar-track" title={`${value.toFixed(0)}%${target != null ? ` / planejado ${target.toFixed(0)}%` : ''}`}>
            {targetCapped != null && (
                <div
                    className="etapa-card__bar-target"
                    style={{ width: `${targetCapped}%` }}
                    aria-hidden="true"
                />
            )}
            <div
                className="etapa-card__bar-fill"
                style={{ width: `${capped}%`, background: colorVar }}
                aria-hidden="true"
            />
        </div>
    );
};

const Metric = ({ icon, label, value, sub }) => (
    <div className="etapa-card__metric">
        <i className={`ti ${icon} etapa-card__metric-icon`} aria-hidden="true" />
        <div className="etapa-card__metric-body">
            <span className="etapa-card__metric-label">{label}</span>
            <span className="etapa-card__metric-value">{value}</span>
            {sub && <span className="etapa-card__metric-sub">{sub}</span>}
        </div>
    </div>
);

const EtapaCard = ({ servico, evmData, onEdit }) => {
    const status = calcularStatusCard(servico);
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.a_iniciar;
    const planejadoHoje = calcularPlanejadoHoje(servico);

    const fisicoPct = servico.percentual_conclusao || 0;
    const evm = evmData?.[servico.servico_nome] || {};
    const executadoPct = evm.percentual_executado || 0;
    const pagoPct = evm.percentual_pago || 0;
    const valorTotal = evm.valor_total || 0;
    const valorPago = evm.valor_pago || 0;

    const evmStatusCls = (() => {
        const diff = pagoPct - executadoPct;
        if (executadoPct === 0 && pagoPct === 0) return '';
        if (diff <= -10) return 'evm-otimo';
        if (diff <= 5) return 'evm-normal';
        return 'evm-atencao';
    })();

    return (
        <article className={`etapa-card etapa-card--${status} ${evmStatusCls}`} aria-label={servico.servico_nome} data-servico-id={servico.id}>
            <div className="etapa-card__header">
                <div className="etapa-card__header-left">
                    {servico.ordem && (
                        <span className="etapa-card__ordem">#{servico.ordem}</span>
                    )}
                    <h4 className="etapa-card__nome">{servico.servico_nome}</h4>
                </div>
                <div className="etapa-card__badges">
                    <span className={`etapa-card__badge etapa-card__badge--${cfg.cls}`}>
                        <i className={`ti ${cfg.icon}`} aria-hidden="true" />
                        {cfg.label}
                    </span>
                </div>
            </div>

            {/* Físico */}
            <div className="etapa-card__fisico">
                <div className="etapa-card__fisico-row">
                    <span className="etapa-card__fisico-label">
                        <i className="ti ti-tool" aria-hidden="true" /> Físico
                    </span>
                    <span className="etapa-card__fisico-pct">
                        {formatPct(fisicoPct)}
                        {planejadoHoje != null && (
                            <span className="etapa-card__fisico-plan"> / {formatPct(planejadoHoje)} plan.</span>
                        )}
                    </span>
                </div>
                <ProgressBar
                    value={fisicoPct}
                    target={planejadoHoje}
                    colorVar={status === 'atrasado' ? 'var(--status-danger)' : 'var(--status-info)'}
                />
            </div>

            {/* Tripé Executado + Pago */}
            {valorTotal > 0 && (
                <div className="etapa-card__metrics">
                    <Metric
                        icon="ti-coin"
                        label="EXECUTADO"
                        value={formatPct(executadoPct)}
                        sub={valorTotal > 0 ? `de ${formatCurrency(valorTotal)}` : null}
                    />
                    <Metric
                        icon="ti-receipt"
                        label="PAGO"
                        value={formatCurrency(valorPago)}
                        sub={executadoPct > 0 ? `${formatPct(pagoPct)} do exec.` : null}
                    />
                </div>
            )}

            {/* Datas */}
            {(servico.data_inicio || servico.data_fim_prevista) && (
                <div className="etapa-card__datas">
                    {servico.data_inicio && (
                        <span>
                            <i className="ti ti-calendar-event" aria-hidden="true" />
                            {new Date(servico.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                    {servico.data_inicio && servico.data_fim_prevista && <span>→</span>}
                    {servico.data_fim_prevista && (
                        <span className={status === 'atrasado' ? 'etapa-card__data--danger' : ''}>
                            <i className="ti ti-calendar-due" aria-hidden="true" />
                            {new Date(servico.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    )}
                </div>
            )}

            {onEdit && (
                <button
                    type="button"
                    className="etapa-card__edit-btn"
                    onClick={() => onEdit(servico)}
                    aria-label={`Editar ${servico.servico_nome}`}
                >
                    <i className="ti ti-edit" aria-hidden="true" />
                </button>
            )}
        </article>
    );
};

export default EtapaCard;
