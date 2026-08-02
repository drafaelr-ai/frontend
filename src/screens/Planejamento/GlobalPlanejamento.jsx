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

function openWork(obraId) {
    window.location.href = `${window.location.pathname}?obra=${obraId}&page=planejamento`;
}

function GlobalPlanejamento() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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

    return (
        <div className="plan-global-root">
            <DashboardHeader />
            <main className="planning-page planning-page--global">
                <header className="plan-header">
                    <div>
                        <button className="plan-back-link" onClick={() => { window.location.href = window.location.pathname; }}><i className="ti ti-home" /> Home do planejamento</button>
                        <span className="plan-eyebrow">Todas as obras</span>
                        <h1>Painel de planejamento</h1>
                        <p>Uma leitura simples do que está em andamento e do que precisa de atenção.</p>
                    </div>
                    <label className="plan-search plan-global-search"><i className="ti ti-search" /><input aria-label="Buscar em todas as obras" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra ou atividade…" /></label>
                </header>

                {loading ? <div className="plan-loading"><span /><p>Consolidando as obras…</p></div> : (
                    <>
                        <section className="plan-kpis" aria-label="Resumo de todas as obras">
                            <article><span className="blue"><i className="ti ti-building" /></span><div><small>Obras no painel</small><strong>{data?.obras?.length || 0}</strong><p>Somente obras acessíveis</p></div></article>
                            <article><span className="green"><i className="ti ti-progress-check" /></span><div><small>Em andamento</small><strong>{data?.resumo?.por_status?.em_andamento || 0}</strong><p>{data?.resumo?.por_status?.concluido || 0} concluídas</p></div></article>
                            <article><span className="amber"><i className="ti ti-alert-triangle" /></span><div><small>Impedimentos</small><strong>{data?.resumo?.restricoes_abertas || 0}</strong><p>Nas obras acessíveis</p></div></article>
                            <article><span className="purple"><i className="ti ti-target-arrow" /></span><div><small>Confiabilidade</small><strong>{data?.resumo?.confiabilidade || 0}%</strong><p>Atividades comprometidas</p></div></article>
                        </section>

                        <section className="plan-global-works">
                            {(data?.obras || []).map(work => (
                                <button key={work.id} className="plan-work-card" onClick={() => openWork(work.id)}>
                                    <span className="plan-work-card__icon"><i className="ti ti-building-community" /></span>
                                    <span className="plan-work-card__body"><strong>{work.nome}</strong><small>{work.cliente || 'Sem cliente informado'}</small><i><b style={{ width: `${work.planejamento?.total ? (work.planejamento.por_status.concluido / work.planejamento.total * 100) : 0}%` }} /></i></span>
                                    <span className="plan-work-card__numbers"><strong>{work.planejamento?.total || 0}</strong><small>atividades</small>{work.planejamento?.restricoes_abertas ? <em>{work.planejamento.restricoes_abertas} impedimento(s)</em> : null}</span>
                                    <i className="ti ti-chevron-right" />
                                </button>
                            ))}
                        </section>

                        <section className="plan-panel plan-global-activities">
                            <div className="plan-panel__title"><div><span className="plan-eyebrow">Período atual</span><h2>Atividades de todas as obras</h2></div><strong>{activities.length}</strong></div>
                            {activities.length ? <div className="plan-global-table">
                                <div className="plan-global-table__header"><span>Obra / atividade</span><span>Responsável</span><span>Período</span><span>Status</span><span>Avanço</span></div>
                                {activities.map(item => <button key={item.id} onClick={() => openWork(item.obra_id)}><span><strong>{item.titulo}</strong><small>{item.obra_nome} · {item.etapa_nome || 'Sem etapa'}</small></span><span>{item.responsavel || 'A definir'}</span><span>{item.data_inicio || '—'} → {item.data_fim || '—'}</span><span><em className={`plan-status plan-status--${item.status}`}>{STATUS_LABELS[item.status]}</em></span><span><b>{item.percentual_conclusao}%</b><i><b style={{ width: `${item.percentual_conclusao}%` }} /></i></span></button>)}
                            </div> : <div className="plan-empty"><span className="plan-empty__icon"><i className="ti ti-calendar-off" /></span><h3>Nenhuma atividade encontrada</h3><p>Ajuste a busca ou abra uma obra para começar a planejar.</p></div>}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default GlobalPlanejamento;
