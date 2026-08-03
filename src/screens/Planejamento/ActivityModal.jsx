import React, { useState } from 'react';


const EMPTY_FORM = {
    titulo: '',
    etapa_nome: '',
    responsavel: '',
    equipe: '',
    data_inicio: '',
    data_fim: '',
    quantidade_planejada: '',
    unidade: 'un',
    prioridade: 'normal',
    cronograma_id: '',
    observacoes: '',
};

function ActivityModal({ activity, schedules, onClose, onSave }) {
    const [form, setForm] = useState(() => ({
        ...EMPTY_FORM,
        ...(activity || {}),
        quantidade_planejada: activity?.quantidade_planejada ?? '',
        cronograma_id: activity?.cronograma_id ?? '',
    }));
    const [saving, setSaving] = useState(false);

    const update = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

    const submit = async event => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            delete payload.status;
            await onSave({
                ...payload,
                cronograma_id: form.cronograma_id ? Number(form.cronograma_id) : null,
                quantidade_planejada: form.quantidade_planejada || 0,
                versao: activity?.versao,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="plan-modal-backdrop" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="plan-modal" role="dialog" aria-modal="true" aria-labelledby="plan-activity-title">
                <header className="plan-modal__header">
                    <div>
                        <span className="plan-eyebrow">{activity ? 'Editar atividade' : 'Nova atividade'}</span>
                        <h2 id="plan-activity-title">{activity ? activity.titulo : 'Adicionar ao planejamento'}</h2>
                    </div>
                    <button className="plan-icon-button" onClick={onClose} aria-label="Fechar">×</button>
                </header>

                <form className="plan-form" onSubmit={submit}>
                    <label className="plan-field plan-field--wide">
                        <span>Atividade *</span>
                        <input autoFocus required maxLength={240} value={form.titulo} onChange={e => update('titulo', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Etapa</span>
                        <input maxLength={200} value={form.etapa_nome || ''} onChange={e => update('etapa_nome', e.target.value)} placeholder="Ex.: Estrutura" />
                    </label>
                    <label className="plan-field">
                        <span>Cronograma</span>
                        <select value={form.cronograma_id} onChange={e => update('cronograma_id', e.target.value)}>
                            <option value="">Sem vínculo</option>
                            {schedules.map(schedule => (
                                <option key={schedule.id} value={schedule.id}>{schedule.servico_nome}</option>
                            ))}
                        </select>
                    </label>
                    <label className="plan-field">
                        <span>Início</span>
                        <input type="date" value={form.data_inicio || ''} onChange={e => update('data_inicio', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Fim</span>
                        <input type="date" min={form.data_inicio || undefined} value={form.data_fim || ''} onChange={e => update('data_fim', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Responsável</span>
                        <input maxLength={160} value={form.responsavel || ''} onChange={e => update('responsavel', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Equipe</span>
                        <input maxLength={160} value={form.equipe || ''} onChange={e => update('equipe', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Quantidade</span>
                        <input type="number" min="0" step="0.001" value={form.quantidade_planejada} onChange={e => update('quantidade_planejada', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Unidade</span>
                        <input maxLength={24} value={form.unidade || ''} onChange={e => update('unidade', e.target.value)} />
                    </label>
                    <label className="plan-field">
                        <span>Prioridade</span>
                        <select value={form.prioridade || 'normal'} onChange={e => update('prioridade', e.target.value)}>
                            <option value="baixa">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica</option>
                        </select>
                    </label>
                    <label className="plan-field plan-field--wide">
                        <span>Observações</span>
                        <textarea rows="3" maxLength={4000} value={form.observacoes || ''} onChange={e => update('observacoes', e.target.value)} />
                    </label>
                    <footer className="plan-modal__footer plan-field--wide">
                        <button type="button" className="plan-button plan-button--secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="plan-button plan-button--primary" disabled={saving}>
                            {saving ? 'Salvando…' : 'Salvar atividade'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default ActivityModal;
