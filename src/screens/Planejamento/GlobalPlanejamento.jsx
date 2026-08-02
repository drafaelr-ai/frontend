import React, { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '../Dashboard/components/DashboardHeader';
import { notify } from '../../utils/notify';
import { planejamentoApi } from './planejamentoApi';
import './Planejamento.css';


const STATUS_LABELS = {
    a_planejar: 'A planejar',
    pronto: 'Pronto',
    em_andamento: 'Em andamento',
    impedido: 'Impedido',
    concluido: 'Concluído',
};

const RESTRICTION_LABELS = {
    material: 'Material',
    projeto: 'Projeto',
    equipe: 'Equipe',
    equipamento: 'Equipamento',
    predecessora: 'Atividade anterior',
    outro: 'Outro',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

function openWork(obraId, activityId = null) {
    const params = new URLSearchParams({ obra: String(obraId), page: 'planejamento' });
    if (activityId) params.set('atividade', String(activityId));
    window.location.href = `${window.location.pathname}?${params.toString()}`;
}

function formatDate(value) {
    if (!value) return 'Sem prazo definido';
    return DATE_FORMATTER.format(new Date(`${value}T12:00:00`));
}

function getRestrictionUrgency(item) {
    if (item.data_limite) {
        const deadline = new Date(`${item.data_limite}T12:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadline < today) return { key: 'critical', label: 'Prazo vencido' };
    }
    if (item.prioridade === 'critica' || item.prioridade === 'alta') {
        return { key: 'attention', label: 'Atenção' };
    }
    return { key: 'normal', label: 'Em aberto' };
}

function ImpedimentsDrawer({ items, onClose, onOpenWork }) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = event => {
            if (event.key === 'Escape') onClose();
        };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="plan-global-drawer-backdrop" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <aside className="plan-drawer plan-impediments-drawer" role="dialog" aria-modal="true" aria-labelledby="plan-impediments-title">
                <header className="plan-drawer__header">
                    <div>
                        <span className="plan-eyebrow">Atenção necessária</span>
                        <h2 id="plan-impediments-title">Impedimentos em aberto</h2>
                        <p>{items.length} {items.length === 1 ? 'impedimento afeta' : 'impedimentos afetam'} o planejamento das obras.</p>
                    </div>
                    <button type="button" className="plan-icon-button" onClick={onClose} aria-label="Fechar impedimentos">×</button>
                </header>

                {items.length > 0 ? (
                    <div className="plan-impediments-list">
                        {items.map(item => {
                            const urgency = getRestrictionUrgency(item);
                            return (
                                <article className={`plan-impediment-card plan-impediment-card--${urgency.key}`} key={`${item.activity_id}-${item.id}`}>
                                    <div className="plan-impediment-card__top">
                                        <span>{RESTRICTION_LABELS[item.tipo] || 'Impedimento'}</span>
                                        <em>{urgency.label}</em>
                                    </div>
                                    <h3>{item.descricao}</h3>
                                    <p><strong>{item.activity_title}</strong> · {item.obra_nome}</p>
                                    <dl>
                                        <div><dt>Etapa</dt><dd>{item.etapa_nome || 'Sem etapa'}</dd></div>
                                        <div><dt>Responsável</dt><dd>{item.responsavel || item.activity_responsavel || 'A definir'}</dd></div>
                                        <div><dt>Prazo</dt><dd>{formatDate(item.data_limite)}</dd></div>
                                    </dl>
                                    {item.observacoes ? <p className="plan-impediment-card__note">{item.observacoes}</p> : null}
                                    <button type="button" onClick={() => onOpenWork(item.obra_id, item.activity_id)}>
                                        Abrir atividade <i className="ti ti-arrow-right" aria-hidden="true" />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="plan-empty">
                        <span className="plan-empty__icon"><i className="ti ti-circle-check" /></span>
                        <h3>Nenhum impedimento em aberto</h3>
                        <p>As atividades do período estão livres para avançar.</p>
                    </div>
                )}
            </aside>
        </div>
    );
}

function GlobalPlanejamento({ onOpenWork = openWork }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showImpediments, setShowImpediments] = useState(false);

    useEffect(() => {
        let active = true;
        planejamentoApi.getPanel()
            .then(payload => { if (active) setData(payload); })
            .catch(error => notify.error(error.message))
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const activities = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('pt-BR');
        const rows = data?.atividades || [];
        if (!term) return rows;
        return rows.filter(item => [item.titulo, item.obra_nome, item.responsavel]
            .some(value => value?.toLocaleLowerCase('pt-BR').includes(term)));
    }, [data, search]);

    const impediments = useMemo(() => (data?.atividades || []).flatMap(activity =>
        (activity.restricoes || [])
            .filter(restriction => restriction.status === 'aberta')
            .map(restriction => ({
                ...restriction,
                obra_id: activity.obra_id,
                obra_nome: activity.obra_nome,
                activity_id: activity.id,
                activity_title: activity.titulo,
                activity_responsavel: activity.responsavel,
                etapa_nome: activity.etapa_nome,
                prioridade: activity.prioridade,
            }))
    ), [data]);

    return (
        <div className="plan-global-root">
            <DashboardHeader />
            <main className="planning-page planning-page--global">
                <header className="plan-header">
                    <div>
                        <span className="plan-eyebrow">Planejamento</span>
                        <h1>Visão geral das obras</h1>
                        <p>Veja o que está em andamento na semana e no mês, e remova impedimentos.</p>
                    </div>
                    <label className="plan-search plan-global-search"><i className="ti ti-search" /><input aria-label="Buscar em todas as obras" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra ou atividade…" /></label>
                </header>

                {loading ? <div className="plan-loading"><span /><p>Consolidando as obras…</p></div> : (
                    <>
                        <section className="plan-kpis" aria-label="Resumo de todas as obras">
                            <article><span className="blue"><i className="ti ti-list-check" /></span><div><small>Total planejado</small><strong>{data?.resumo?.total || 0}</strong><p>Em {data?.obras?.length || 0} obras</p></div></article>
                            <article><span className="green"><i className="ti ti-progress-check" /></span><div><small>Em andamento</small><strong>{data?.resumo?.por_status?.em_andamento || 0}</strong><p>{data?.resumo?.por_status?.concluido || 0} concluídas</p></div></article>
                            <button type="button" className="plan-kpi-button" onClick={() => setShowImpediments(true)} aria-label="Ver impedimentos em aberto">
                                <span className="amber"><i className="ti ti-alert-triangle" /></span>
                                <div><small>Impedimentos</small><strong>{impediments.length}</strong><p>Clique para ver quais são</p></div>
                                <i className="ti ti-chevron-right" aria-hidden="true" />
                            </button>
                            <article><span className="purple"><i className="ti ti-target-arrow" /></span><div><small>Confiabilidade</small><strong>{data?.resumo?.confiabilidade || 0}%</strong><p>Atividades comprometidas</p></div></article>
                        </section>

                        <section className="plan-global-works" aria-label="Planejamento por obra">
                            {(data?.obras || []).map(work => (
                                <button key={work.id} className="plan-work-card" onClick={() => onOpenWork(work.id)}>
                                    <span className="plan-work-card__icon"><i className="ti ti-building-community" /></span>
                                    <span className="plan-work-card__body"><strong>{work.nome}</strong><small>{work.cliente || 'Sem cliente informado'}</small><i><b style={{ width: `${work.planejamento?.total ? (work.planejamento.por_status.concluido / work.planejamento.total * 100) : 0}%` }} /></i></span>
                                    <span className="plan-work-card__numbers"><strong>{work.planejamento?.total || 0}</strong><small>atividades</small>{work.planejamento?.restricoes_abertas > 0 ? <em>{work.planejamento.restricoes_abertas} impedimento(s)</em> : null}</span>
                                    <i className="ti ti-chevron-right" />
                                </button>
                            ))}
                        </section>

                        <section className="plan-panel plan-global-activities">
                            <div className="plan-panel__title"><div><span className="plan-eyebrow">Período atual</span><h2>Atividades de todas as obras</h2></div><strong>{activities.length}</strong></div>
                            {activities.length > 0 ? <div className="plan-global-table">
                                <div className="plan-global-table__header"><span>Obra / atividade</span><span>Responsável</span><span>Período</span><span>Status</span><span>Avanço</span></div>
                                {activities.map(item => <button key={item.id} onClick={() => onOpenWork(item.obra_id, item.id)}><span><strong>{item.titulo}</strong><small>{item.obra_nome} · {item.etapa_nome || 'Sem etapa'}</small></span><span>{item.responsavel || 'A definir'}</span><span>{item.data_inicio || '—'} → {item.data_fim || '—'}</span><span><em className={`plan-status plan-status--${item.status}`}>{STATUS_LABELS[item.status]}</em></span><span><b>{item.percentual_conclusao}%</b><i><b style={{ width: `${item.percentual_conclusao}%` }} /></i></span></button>)}
                            </div> : <div className="plan-empty"><span className="plan-empty__icon"><i className="ti ti-calendar-off" /></span><h3>Nenhuma atividade encontrada</h3><p>Ajuste a busca ou abra uma obra para começar a planejar.</p></div>}
                        </section>
                    </>
                )}
            </main>

            {showImpediments ? <ImpedimentsDrawer items={impediments} onClose={() => setShowImpediments(false)} onOpenWork={onOpenWork} /> : null}
        </div>
    );
}

export default GlobalPlanejamento;
