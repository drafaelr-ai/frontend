import React, { useState } from 'react';


const STATUS_LABELS = {
    a_planejar: 'A planejar',
    pronto: 'Pronto',
    em_andamento: 'Em andamento',
    impedido: 'Impedido',
    concluido: 'Concluído',
};

function ActivityDrawer({ activity, canDelete, onClose, onEdit, onDelete, onAddProgress, onAddRestriction, onResolveRestriction }) {
    const [mode, setMode] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [progressNote, setProgressNote] = useState('');
    const [restriction, setRestriction] = useState({ tipo: 'material', descricao: '', responsavel: '', data_limite: '' });
    const [working, setWorking] = useState(false);

    const submitProgress = async event => {
        event.preventDefault();
        setWorking(true);
        try {
            const result = await onAddProgress({
                quantidade: quantity,
                observacao: progressNote,
                data_apontamento: new Date().toISOString().slice(0, 10),
            });
            if (result) {
                setQuantity('');
                setProgressNote('');
                setMode(null);
            }
        } finally {
            setWorking(false);
        }
    };

    const submitRestriction = async event => {
        event.preventDefault();
        setWorking(true);
        try {
            const result = await onAddRestriction(restriction);
            if (result) {
                setRestriction({ tipo: 'material', descricao: '', responsavel: '', data_limite: '' });
                setMode(null);
            }
        } finally {
            setWorking(false);
        }
    };

    return (
        <aside className="plan-drawer" aria-label={`Detalhes de ${activity.titulo}`}>
            <header className="plan-drawer__header">
                <div>
                    <span className={`plan-status plan-status--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
                    <h2>{activity.titulo}</h2>
                    <p>{activity.etapa_nome || 'Sem etapa'} · {activity.origem === 'orcamento' ? `Orçamento ${activity.orcamento_codigo || ''}` : activity.origem === 'planilha' ? 'Planilha' : 'Manual'}</p>
                </div>
                <button className="plan-icon-button" onClick={onClose} aria-label="Fechar detalhes">×</button>
            </header>

            <div className="plan-progress-large" aria-label={`${activity.percentual_conclusao}% concluído`}>
                <div><strong>{activity.percentual_conclusao}%</strong><span>{activity.quantidade_executada} de {activity.quantidade_planejada} {activity.unidade}</span></div>
                <span><i style={{ width: `${activity.percentual_conclusao}%` }} /></span>
            </div>

            <dl className="plan-details-grid">
                <div><dt>Período</dt><dd>{activity.data_inicio || 'A definir'} → {activity.data_fim || 'A definir'}</dd></div>
                <div><dt>Responsável</dt><dd>{activity.responsavel || 'A definir'}</dd></div>
                <div><dt>Equipe</dt><dd>{activity.equipe || 'A definir'}</dd></div>
                <div><dt>Prioridade</dt><dd>{activity.prioridade}</dd></div>
            </dl>

            <div className="plan-drawer__actions">
                <button className="plan-button plan-button--primary" onClick={() => setMode(mode === 'progress' ? null : 'progress')}><i className="ti ti-progress-check" /> Apontar produção</button>
                <button className="plan-button plan-button--warning" onClick={() => setMode(mode === 'restriction' ? null : 'restriction')}><i className="ti ti-alert-triangle" /> Informar impedimento</button>
                <button className="plan-button plan-button--secondary" onClick={onEdit}><i className="ti ti-pencil" /> Editar</button>
            </div>

            {mode === 'progress' ? (
                <form className="plan-inline-form" onSubmit={submitProgress}>
                    <h3>Produção realizada hoje</h3>
                    <label className="plan-field"><span>Quantidade *</span><input required autoFocus type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
                    <label className="plan-field"><span>Observação</span><textarea rows="2" value={progressNote} onChange={e => setProgressNote(e.target.value)} /></label>
                    <button className="plan-button plan-button--primary" disabled={working}>{working ? 'Registrando…' : 'Registrar'}</button>
                </form>
            ) : null}

            {mode === 'restriction' ? (
                <form className="plan-inline-form" onSubmit={submitRestriction}>
                    <h3>Novo impedimento</h3>
                    <label className="plan-field"><span>Tipo *</span><select value={restriction.tipo} onChange={e => setRestriction({ ...restriction, tipo: e.target.value })}><option value="material">Material</option><option value="projeto">Projeto</option><option value="equipe">Equipe</option><option value="equipamento">Equipamento</option><option value="predecessora">Atividade predecessora</option><option value="outro">Outro</option></select></label>
                    <label className="plan-field"><span>Descrição *</span><input required maxLength={500} value={restriction.descricao} onChange={e => setRestriction({ ...restriction, descricao: e.target.value })} /></label>
                    <label className="plan-field"><span>Responsável</span><input value={restriction.responsavel} onChange={e => setRestriction({ ...restriction, responsavel: e.target.value })} /></label>
                    <label className="plan-field"><span>Resolver até</span><input type="date" value={restriction.data_limite} onChange={e => setRestriction({ ...restriction, data_limite: e.target.value })} /></label>
                    <button className="plan-button plan-button--warning" disabled={working}>{working ? 'Salvando…' : 'Registrar impedimento'}</button>
                </form>
            ) : null}

            <section className="plan-drawer__section">
                <h3>Impedimentos</h3>
                {activity.restricoes?.length ? activity.restricoes.map(item => (
                    <article className={`plan-restriction ${item.status !== 'aberta' ? 'resolved' : ''}`} key={item.id}>
                        <div><strong>{item.descricao}</strong><span>{item.tipo} · {item.responsavel || 'Sem responsável'} {item.data_limite ? `· até ${item.data_limite}` : ''}</span></div>
                        {item.status === 'aberta' ? <button onClick={() => onResolveRestriction(item.id)}>Resolver</button> : <small>Resolvido</small>}
                    </article>
                )) : <p className="plan-muted">Nenhum impedimento registrado.</p>}
            </section>

            <section className="plan-drawer__section">
                <h3>Últimos apontamentos</h3>
                {activity.apontamentos?.length ? activity.apontamentos.slice(0, 5).map(item => (
                    <article className="plan-note" key={item.id}><strong>+{item.quantidade} {activity.unidade}</strong><span>{item.data_apontamento} {item.observacao ? `· ${item.observacao}` : ''}</span></article>
                )) : <p className="plan-muted">Ainda não há produção apontada.</p>}
            </section>

            {canDelete ? <button className="plan-delete-link" onClick={onDelete}>Excluir atividade</button> : null}
        </aside>
    );
}

export default ActivityDrawer;
