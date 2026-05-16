import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { notify } from '../../utils/notify';
import { logger } from '../../utils/logger';
import './ServicoEditModal.css';

const ServicoEditModal = ({ servico, onClose, onSaved }) => {
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!servico) return;
        setForm({
            servico_nome: servico.servico_nome || '',
            data_inicio: servico.data_inicio || '',
            data_fim_prevista: servico.data_fim_prevista || '',
            data_inicio_real: servico.data_inicio_real || '',
            data_fim_real: servico.data_fim_real || '',
            percentual_conclusao: servico.percentual_conclusao ?? 0,
            tipo_medicao: servico.tipo_medicao || 'empreitada',
            area_total: servico.area_total ?? '',
            area_executada: servico.area_executada ?? '',
            unidade_medida: servico.unidade_medida || 'm²',
            observacoes: servico.observacoes || '',
        });
    }, [servico]);

    if (!servico) return null;

    const set = (field) => (e) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleConcluir = async () => {
        try {
            setSaving(true);
            const payload = {
                ...servico,
                ...form,
                percentual_conclusao: 100,
                data_fim_real: form.data_fim_real || new Date().toISOString().slice(0, 10),
                data_inicio_real: form.data_inicio_real || null,
                area_total: form.area_total !== '' ? parseFloat(form.area_total) : null,
                area_executada: form.area_executada !== '' ? parseFloat(form.area_executada) : null,
            };
            const res = await fetchWithAuth(`${API_URL}/cronograma/${servico.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Erro ao marcar como concluído.');
            notify.success('Serviço marcado como concluído.');
            onSaved?.();
            onClose();
        } catch (err) {
            logger.error('ServicoEditModal concluir error:', err);
            notify.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!form.servico_nome?.trim()) {
            notify.error('Nome do serviço é obrigatório.');
            return;
        }
        if (!form.data_inicio) {
            notify.error('Data de início é obrigatória.');
            return;
        }
        if (!form.data_fim_prevista) {
            notify.error('Data de fim prevista é obrigatória.');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                ...servico,
                ...form,
                percentual_conclusao: parseFloat(form.percentual_conclusao) || 0,
                area_total: form.area_total !== '' ? parseFloat(form.area_total) : null,
                area_executada: form.area_executada !== '' ? parseFloat(form.area_executada) : null,
                data_inicio_real: form.data_inicio_real || null,
                data_fim_real: form.data_fim_real || null,
            };
            const res = await fetchWithAuth(`${API_URL}/cronograma/${servico.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Erro ao salvar serviço.');
            notify.success('Serviço atualizado.');
            onSaved?.();
            onClose();
        } catch (err) {
            logger.error('ServicoEditModal save error:', err);
            notify.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sem-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Editar ${servico.servico_nome}`}>
            <div className="sem-content" onClick={e => e.stopPropagation()}>
                <div className="sem-header">
                    <h3 className="sem-title">
                        <i className="ti ti-edit" aria-hidden="true" />
                        Editar Serviço
                    </h3>
                    <button type="button" className="sem-close" onClick={onClose} aria-label="Fechar">
                        <i className="ti ti-x" aria-hidden="true" />
                    </button>
                </div>

                <div className="sem-body">
                    <div className="sem-field">
                        <label className="sem-label">Nome</label>
                        <input className="sem-input" type="text" value={form.servico_nome} onChange={set('servico_nome')} />
                    </div>

                    <div className="sem-row">
                        <div className="sem-field">
                            <label className="sem-label">Início previsto</label>
                            <input className="sem-input" type="date" value={form.data_inicio} onChange={set('data_inicio')} />
                        </div>
                        <div className="sem-field">
                            <label className="sem-label">Fim previsto</label>
                            <input className="sem-input" type="date" value={form.data_fim_prevista} onChange={set('data_fim_prevista')} />
                        </div>
                    </div>

                    <div className="sem-row">
                        <div className="sem-field">
                            <label className="sem-label">Início real</label>
                            <input className="sem-input" type="date" value={form.data_inicio_real} onChange={set('data_inicio_real')} />
                        </div>
                        <div className="sem-field">
                            <label className="sem-label">Fim real</label>
                            <input className="sem-input" type="date" value={form.data_fim_real} onChange={set('data_fim_real')} />
                        </div>
                    </div>

                    <div className="sem-row">
                        <div className="sem-field">
                            <label className="sem-label">% Físico concluído</label>
                            <input
                                className="sem-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={form.percentual_conclusao}
                                onChange={set('percentual_conclusao')}
                            />
                        </div>
                        <div className="sem-field">
                            <label className="sem-label">Tipo de medição</label>
                            <select className="sem-input" value={form.tipo_medicao} onChange={set('tipo_medicao')}>
                                <option value="empreitada">Empreitada</option>
                                <option value="area">Área</option>
                            </select>
                        </div>
                    </div>

                    {form.tipo_medicao === 'area' && (
                        <div className="sem-row">
                            <div className="sem-field">
                                <label className="sem-label">Área total</label>
                                <input className="sem-input" type="number" min="0" step="0.01" value={form.area_total} onChange={set('area_total')} />
                            </div>
                            <div className="sem-field">
                                <label className="sem-label">Área executada</label>
                                <input className="sem-input" type="number" min="0" step="0.01" value={form.area_executada} onChange={set('area_executada')} />
                            </div>
                            <div className="sem-field">
                                <label className="sem-label">Unidade</label>
                                <input className="sem-input" type="text" value={form.unidade_medida} onChange={set('unidade_medida')} />
                            </div>
                        </div>
                    )}

                    <div className="sem-field">
                        <label className="sem-label">Observações</label>
                        <textarea className="sem-input sem-textarea" value={form.observacoes} onChange={set('observacoes')} rows={3} />
                    </div>
                </div>

                <div className="sem-footer">
                    <button
                        type="button"
                        className="sem-btn sem-btn--concluir"
                        onClick={handleConcluir}
                        disabled={saving}
                        title="Marca 100% e preenche a data de fim real com hoje"
                    >
                        <i className="ti ti-circle-check" aria-hidden="true" />
                        Concluído
                    </button>
                    <div className="sem-footer-right">
                        <button type="button" className="sem-btn sem-btn--cancel" onClick={onClose} disabled={saving}>
                            Cancelar
                        </button>
                        <button type="button" className="sem-btn sem-btn--save" onClick={handleSave} disabled={saving}>
                            {saving ? 'Salvando…' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServicoEditModal;
