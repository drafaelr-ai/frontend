import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { confirmDialog, notify } from '../../utils/notify';
import ActivityDrawer from './ActivityDrawer';
import ActivityModal from './ActivityModal';
import ImportModal from './ImportModal';
import { planejamentoApi } from './planejamentoApi';
import './Planejamento.css';


const STATUS_LABELS = {
    a_planejar: 'A planejar',
    pronto: 'Pronto',
    em_andamento: 'Em andamento',
    impedido: 'Impedido',
    concluido: 'Concluído',
};
const VIEW_OPTIONS = [
    ['visao-geral', 'Visão geral'],
    ['semana', 'Semana'],
    ['mes', 'Mês'],
    ['a-planejar', 'A planejar'],
];

function parseLocal(isoDate) {
    return isoDate ? new Date(`${isoDate}T00:00:00`) : null;
}

function toIso(localDate) {
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(value, amount) {
    const result = new Date(value);
    result.setDate(result.getDate() + amount);
    return result;
}

function mondayOf(value) {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
}

function overlaps(activity, start, end) {
    const activityStart = parseLocal(activity.data_inicio);
    const activityEnd = parseLocal(activity.data_fim);
    if (!activityStart && !activityEnd) return false;
    return (!activityStart || activityStart <= end) && (!activityEnd || activityEnd >= start);
}

function normalizeSchedules(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.itens)) return payload.itens;
    return [];
}

function ActivityCard({ activity, compact = false, onClick }) {
    return (
        <button className={`plan-activity-card plan-activity-card--${activity.status} ${compact ? 'compact' : ''}`} onClick={() => onClick(activity)}>
            <span className="plan-activity-card__top">
                <small>{activity.etapa_nome || 'Sem etapa'}</small>
                {activity.restricoes_abertas ? <i className="ti ti-alert-triangle" title="Atividade impedida" /> : null}
            </span>
            <strong>{activity.titulo}</strong>
            <span>{activity.responsavel || 'Sem responsável'}</span>
            <span className="plan-mini-progress"><i style={{ width: `${activity.percentual_conclusao}%` }} /></span>
            <small>{activity.percentual_conclusao}% · {activity.quantidade_executada}/{activity.quantidade_planejada} {activity.unidade}</small>
        </button>
    );
}

function EmptyState({ queue = false, onCreate, onImport }) {
    return (
        <div className="plan-empty">
            <span className="plan-empty__icon"><i className={`ti ${queue ? 'ti-list-check' : 'ti-calendar-plus'}`} /></span>
            <h3>{queue ? 'A fila está organizada' : 'Nada planejado neste período'}</h3>
            <p>{queue ? 'Atividades sem datas aparecerão aqui para completar o planejamento.' : 'Adicione uma atividade ou importe os serviços do orçamento.'}</p>
            <div><button className="plan-button plan-button--primary" onClick={onCreate}>Nova atividade</button><button className="plan-button plan-button--secondary" onClick={onImport}>Importar</button></div>
        </div>
    );
}

function Planejamento({ obraId, obraNome, user, onHome }) {
    const [view, setView] = useState('visao-geral');
    const [cursorDate, setCursorDate] = useState(() => new Date());
    const [activities, setActivities] = useState([]);
    const [summary, setSummary] = useState(null);
    const [budget, setBudget] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [closings, setClosings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const [activityResult, budgetResult, scheduleResult, closingResult] = await Promise.allSettled([
            planejamentoApi.listActivities(obraId, { limit: 200 }),
            planejamentoApi.getBudget(obraId),
            planejamentoApi.getSchedules(obraId),
            planejamentoApi.getClosings(obraId),
        ]);
        if (activityResult.status === 'fulfilled') {
            const nextActivities = activityResult.value.itens || [];
            setActivities(nextActivities);
            setSummary(activityResult.value.resumo || null);
            setSelectedActivity(previous => previous
                ? nextActivities.find(item => item.id === previous.id) || null
                : null);
        } else {
            notify.error(activityResult.reason.message);
        }
        if (budgetResult.status === 'fulfilled') setBudget(budgetResult.value.etapas || []);
        if (scheduleResult.status === 'fulfilled') setSchedules(normalizeSchedules(scheduleResult.value));
        if (closingResult.status === 'fulfilled') setClosings(closingResult.value || []);
        setLoading(false);
    }, [obraId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredActivities = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('pt-BR');
        return activities.filter(activity => {
            if (statusFilter && activity.status !== statusFilter) return false;
            if (!term) return true;
            return [activity.titulo, activity.etapa_nome, activity.responsavel]
                .some(value => value?.toLocaleLowerCase('pt-BR').includes(term));
        });
    }, [activities, search, statusFilter]);

    const weekStart = useMemo(() => mondayOf(cursorDate), [cursorDate]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
    const monthDays = useMemo(() => {
        const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
        const gridStart = addDays(first, -first.getDay());
        return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    }, [cursorDate]);
    const weekActivities = useMemo(
        () => filteredActivities.filter(activity => overlaps(activity, weekStart, addDays(weekStart, 6))),
        [filteredActivities, weekStart]
    );
    const queueActivities = useMemo(
        () => filteredActivities.filter(activity => activity.status === 'a_planejar' || !activity.data_inicio || !activity.data_fim),
        [filteredActivities]
    );
    const upcoming = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filteredActivities
            .filter(activity => overlaps(activity, today, addDays(today, 30)))
            .slice(0, 8);
    }, [filteredActivities]);
    const availableBudgetCount = useMemo(
        () => budget.reduce((total, stage) => total + stage.itens.length, 0),
        [budget]
    );
    const canAdmin = user?.role === 'master' || user?.role === 'administrador';

    const saveActivity = async data => {
        try {
            if (editingActivity) {
                const updated = await planejamentoApi.updateActivity(editingActivity.id, data);
                setSelectedActivity(updated);
                notify.success('Atividade atualizada.');
            } else {
                await planejamentoApi.createActivity(obraId, data);
                notify.success('Atividade adicionada ao planejamento.');
            }
            await loadData(true);
            setShowActivityModal(false);
            setEditingActivity(null);
        } catch (error) {
            notify.error(error.message);
        }
    };

    const runActivityAction = async (action, successMessage) => {
        try {
            const result = await action();
            if (result?.atividade) setSelectedActivity(result.atividade);
            notify.success(successMessage);
            await loadData(true);
            return result;
        } catch (error) {
            notify.error(error.message);
            return null;
        }
    };

    const deleteSelected = async () => {
        if (!selectedActivity) return;
        const confirmed = await confirmDialog('Excluir esta atividade e seu histórico de apontamentos?', { danger: true, confirmText: 'Excluir' });
        if (!confirmed) return;
        const result = await runActivityAction(
            () => planejamentoApi.deleteActivity(selectedActivity.id),
            'Atividade excluída.'
        );
        if (result) setSelectedActivity(null);
    };

    const importBudget = async data => {
        try {
            const result = await planejamentoApi.importBudget(obraId, data);
            notify.success(`${result.criados.length} atividade(s) importada(s) do orçamento.`);
            await loadData(true);
            setShowImportModal(false);
        } catch (error) {
            notify.error(error.message);
        }
    };

    const previewSpreadsheet = async file => {
        try {
            return await planejamentoApi.importSpreadsheet(obraId, file, false);
        } catch (error) {
            notify.error(error.message);
            return null;
        }
    };

    const confirmSpreadsheet = async file => {
        try {
            const result = await planejamentoApi.importSpreadsheet(obraId, file, true);
            notify.success(`${result.total} atividade(s) importada(s) da planilha.`);
            await loadData(true);
            setShowImportModal(false);
        } catch (error) {
            notify.error(error.message);
        }
    };

    const closeCurrentWeek = async () => {
        const confirmed = await confirmDialog('Fechar a semana atual e registrar o PPC?', { confirmText: 'Fechar semana' });
        if (!confirmed) return;
        try {
            const result = await planejamentoApi.closeWeek(obraId, { semana_inicio: toIso(weekStart) });
            notify.success(`Semana fechada com PPC de ${result.ppc}%.`);
            await loadData(true);
        } catch (error) {
            notify.error(error.message);
        }
    };

    const movePeriod = amount => {
        setCursorDate(previous => view === 'mes'
            ? new Date(previous.getFullYear(), previous.getMonth() + amount, 1)
            : addDays(previous, amount * 7));
    };

    const openNewActivity = () => {
        setEditingActivity(null);
        setShowActivityModal(true);
    };

    if (loading) {
        return <div className="plan-loading"><span /><p>Montando o planejamento da obra…</p></div>;
    }

    return (
        <div className="planning-page">
            <header className="plan-header">
                <div>
                    {onHome ? <button className="plan-back-link" onClick={onHome}><i className="ti ti-home" /> Home do planejamento</button> : null}
                    <span className="plan-eyebrow">Planejamento da obra</span>
                    <h1>{obraNome}</h1>
                    <p>Veja o que está acontecendo, organize a semana e remova impedimentos.</p>
                </div>
                <div className="plan-header__actions">
                    <button className="plan-button plan-button--secondary" onClick={() => setShowImportModal(true)}><i className="ti ti-file-import" /> Importar</button>
                    <button className="plan-button plan-button--primary" onClick={openNewActivity}><i className="ti ti-plus" /> Nova atividade</button>
                </div>
            </header>

            <section className="plan-kpis" aria-label="Resumo do planejamento">
                <article><span className="blue"><i className="ti ti-list-details" /></span><div><small>Total</small><strong>{summary?.total || 0}</strong><p>{availableBudgetCount} itens do orçamento disponíveis</p></div></article>
                <article><span className="green"><i className="ti ti-progress-check" /></span><div><small>Em andamento</small><strong>{summary?.por_status?.em_andamento || 0}</strong><p>{summary?.por_status?.concluido || 0} concluídas</p></div></article>
                <article><span className="amber"><i className="ti ti-alert-triangle" /></span><div><small>Impedimentos</small><strong>{summary?.restricoes_abertas || 0}</strong><p>Precisam de atenção</p></div></article>
                <article><span className="purple"><i className="ti ti-target-arrow" /></span><div><small>Confiabilidade</small><strong>{summary?.confiabilidade || 0}%</strong><p>PPC do conjunto atual</p></div></article>
            </section>

            <div className="plan-controls">
                <div className="plan-tabs" role="tablist" aria-label="Visualizações do planejamento">
                    {VIEW_OPTIONS.map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}{id === 'a-planejar' && queueActivities.length ? <b>{queueActivities.length}</b> : null}</button>)}
                </div>
                <div className="plan-filters">
                    <label className="plan-search"><i className="ti ti-search" /><input aria-label="Buscar atividades" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar atividade…" /></label>
                    <select aria-label="Filtrar por status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
                </div>
            </div>

            {view === 'visao-geral' ? (
                <div className="plan-overview">
                    <section className="plan-panel">
                        <div className="plan-panel__title"><div><span className="plan-eyebrow">Próximos 30 dias</span><h2>Atividades em foco</h2></div><button onClick={() => setView('semana')}>Ver semana <i className="ti ti-arrow-right" /></button></div>
                        {upcoming.length ? <div className="plan-table-list">{upcoming.map(activity => <ActivityCard key={activity.id} activity={activity} compact onClick={setSelectedActivity} />)}</div> : <EmptyState onCreate={openNewActivity} onImport={() => setShowImportModal(true)} />}
                    </section>
                    <aside className="plan-panel plan-health">
                        <div className="plan-panel__title"><div><span className="plan-eyebrow">Saúde do plano</span><h2>Distribuição</h2></div></div>
                        {Object.entries(STATUS_LABELS).map(([status, label]) => {
                            const value = summary?.por_status?.[status] || 0;
                            const percent = summary?.total ? Math.round(value / summary.total * 100) : 0;
                            return <div className="plan-health__row" key={status}><span><i className={`dot dot--${status}`} />{label}</span><strong>{value}</strong><div><i style={{ width: `${percent}%` }} /></div></div>;
                        })}
                        {closings[0] ? <div className="plan-last-closing"><small>Último fechamento</small><strong>PPC {closings[0].ppc}%</strong><span>Semana de {closings[0].semana_inicio}</span></div> : null}
                    </aside>
                </div>
            ) : null}

            {view === 'semana' ? (
                <section className="plan-panel plan-period-panel">
                    <div className="plan-period-header">
                        <div className="plan-period-nav"><button onClick={() => movePeriod(-1)} aria-label="Semana anterior"><i className="ti ti-chevron-left" /></button><strong>{weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {addDays(weekStart, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</strong><button onClick={() => movePeriod(1)} aria-label="Próxima semana"><i className="ti ti-chevron-right" /></button><button onClick={() => setCursorDate(new Date())}>Hoje</button></div>
                        {canAdmin ? <button className="plan-button plan-button--secondary" onClick={closeCurrentWeek}><i className="ti ti-lock-check" /> Fechar semana</button> : null}
                    </div>
                    <div className="plan-week-board">
                        {weekDays.map(day => {
                            const dayIso = toIso(day);
                            const dayActivities = weekActivities.filter(activity => activity.data_inicio === dayIso || (parseLocal(activity.data_inicio) <= day && parseLocal(activity.data_fim) >= day));
                            return <div className={`plan-day ${dayIso === toIso(new Date()) ? 'today' : ''}`} key={dayIso}><header><span>{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</span><strong>{day.getDate()}</strong><small>{dayActivities.length}</small></header><div>{dayActivities.map(activity => <ActivityCard key={activity.id} activity={activity} compact onClick={setSelectedActivity} />)}</div></div>;
                        })}
                    </div>
                </section>
            ) : null}

            {view === 'mes' ? (
                <section className="plan-panel plan-period-panel">
                    <div className="plan-period-header"><div className="plan-period-nav"><button onClick={() => movePeriod(-1)} aria-label="Mês anterior"><i className="ti ti-chevron-left" /></button><strong>{cursorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button onClick={() => movePeriod(1)} aria-label="Próximo mês"><i className="ti ti-chevron-right" /></button><button onClick={() => setCursorDate(new Date())}>Hoje</button></div></div>
                    <div className="plan-month-weekdays">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <span key={day}>{day}</span>)}</div>
                    <div className="plan-month-grid">{monthDays.map(day => {
                        const dayActivities = filteredActivities.filter(activity => overlaps(activity, day, day)).slice(0, 3);
                        const outside = day.getMonth() !== cursorDate.getMonth();
                        return <div className={`plan-month-day ${outside ? 'outside' : ''} ${toIso(day) === toIso(new Date()) ? 'today' : ''}`} key={toIso(day)}><strong>{day.getDate()}</strong>{dayActivities.map(activity => <button className={`plan-month-item plan-month-item--${activity.status}`} key={activity.id} onClick={() => setSelectedActivity(activity)} title={activity.titulo}>{activity.titulo}</button>)}{filteredActivities.filter(activity => overlaps(activity, day, day)).length > 3 ? <small>+ mais</small> : null}</div>;
                    })}</div>
                </section>
            ) : null}

            {view === 'a-planejar' ? (
                <section className="plan-panel plan-queue">
                    <div className="plan-panel__title"><div><span className="plan-eyebrow">Fila de preparação</span><h2>Atividades que precisam de dados</h2><p>Complete datas, responsável e equipe para liberar a execução.</p></div></div>
                    {queueActivities.length ? <div className="plan-table-list">{queueActivities.map(activity => <ActivityCard key={activity.id} activity={activity} compact onClick={setSelectedActivity} />)}</div> : <EmptyState queue onCreate={openNewActivity} onImport={() => setShowImportModal(true)} />}
                </section>
            ) : null}

            {selectedActivity ? <ActivityDrawer
                key={selectedActivity.id}
                activity={selectedActivity}
                canDelete={canAdmin}
                onClose={() => setSelectedActivity(null)}
                onEdit={() => { setEditingActivity(selectedActivity); setShowActivityModal(true); }}
                onDelete={deleteSelected}
                onAddProgress={data => runActivityAction(() => planejamentoApi.addProgress(selectedActivity.id, data), 'Produção registrada.')}
                onAddRestriction={data => runActivityAction(() => planejamentoApi.addRestriction(selectedActivity.id, data), 'Impedimento registrado.')}
                onResolveRestriction={restrictionId => runActivityAction(() => planejamentoApi.resolveRestriction(restrictionId), 'Impedimento resolvido.')}
            /> : null}

            {showActivityModal ? <ActivityModal
                activity={editingActivity}
                schedules={schedules}
                onClose={() => { setShowActivityModal(false); setEditingActivity(null); }}
                onSave={saveActivity}
            /> : null}
            {showImportModal ? <ImportModal
                budget={budget}
                schedules={schedules}
                onClose={() => setShowImportModal(false)}
                onImportBudget={importBudget}
                onPreviewSpreadsheet={previewSpreadsheet}
                onConfirmSpreadsheet={confirmSpreadsheet}
            /> : null}
        </div>
    );
}

export default Planejamento;
