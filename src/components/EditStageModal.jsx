import React, { useState, useEffect } from 'react';
import { notify } from '../utils/notify';
import './EditStageModal.css';

const EditStageModal = ({ stage, obraId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nome: '',
        ordem_execucao: 1,
        tipo_medicao: 'empreitada', // 'empreitada' ou 'area'
        area_total: null,
        area_executada: null,
        unidade_medida: 'm²', // m², m³, unidades, etc
        data_inicio_prevista: '',
        data_termino_prevista: '',
        data_inicio_real: '',
        data_termino_real: '',
        percentual_conclusao: 0,
        observacoes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (stage) {
            setFormData({
                nome: stage.nome || '',
                ordem_execucao: stage.ordem_execucao || 1,
                tipo_medicao: stage.tipo_medicao || 'empreitada',
                area_total: stage.area_total || null,
                area_executada: stage.area_executada || null,
                unidade_medida: stage.unidade_medida || 'm²',
                data_inicio_prevista: stage.data_inicio_prevista || '',
                data_termino_prevista: stage.data_termino_prevista || '',
                data_inicio_real: stage.data_inicio_real || '',
                data_termino_real: stage.data_termino_real || '',
                percentual_conclusao: stage.percentual_conclusao || 0,
                observacoes: stage.observacoes || ''
            });
        }
    }, [stage]);

    // Calcula o percentual automaticamente quando for por área
    const calculatePercentualFromArea = (areaExecutada, areaTotal) => {
        if (!areaTotal || areaTotal <= 0) return 0;
        const percentual = (parseFloat(areaExecutada) / parseFloat(areaTotal)) * 100;
        return Math.min(Math.round(percentual), 100); // Limita a 100%
    };

    const handleChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };

        // Se mudou o tipo de medição, reseta campos relevantes
        if (field === 'tipo_medicao') {
            if (value === 'empreitada') {
                newFormData.area_total = null;
                newFormData.area_executada = null;
            } else if (value === 'area') {
                newFormData.percentual_conclusao = 0;
            }
        }

        // Se está no modo área e mudou área_executada ou area_total, recalcula percentual
        if (newFormData.tipo_medicao === 'area') {
            if (field === 'area_executada' || field === 'area_total') {
                const areaExec = field === 'area_executada' ? value : newFormData.area_executada;
                const areaTotal = field === 'area_total' ? value : newFormData.area_total;
                
                if (areaExec && areaTotal) {
                    newFormData.percentual_conclusao = calculatePercentualFromArea(areaExec, areaTotal);
                }
            }
        }

        setFormData(newFormData);
        setErrors({ ...errors, [field]: null });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nome?.trim()) {
            newErrors.nome = 'Nome do serviço é obrigatório';
        }

        if (!formData.data_inicio_prevista) {
            newErrors.data_inicio_prevista = 'Data de início prevista é obrigatória';
        }

        if (!formData.data_termino_prevista) {
            newErrors.data_termino_prevista = 'Data de término prevista é obrigatória';
        }

        if (formData.data_inicio_prevista && formData.data_termino_prevista) {
            if (new Date(formData.data_inicio_prevista) > new Date(formData.data_termino_prevista)) {
                newErrors.data_termino_prevista = 'Data de término deve ser posterior à data de início';
            }
        }

        if (formData.tipo_medicao === 'area') {
            if (!formData.area_total || formData.area_total <= 0) {
                newErrors.area_total = 'Área total deve ser maior que zero';
            }
            if (!formData.unidade_medida?.trim()) {
                newErrors.unidade_medida = 'Unidade de medida é obrigatória';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar etapa:', error);
            notify.error('Erro ao salvar as alterações. Tente novamente.');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const getDaysRemaining = () => {
        if (!formData.data_termino_prevista) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(formData.data_termino_prevista + 'T00:00:00');
        
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    };

    const getDaysExecuted = () => {
        if (!formData.data_inicio_real) return 0;
        
        const startDate = new Date(formData.data_inicio_real + 'T00:00:00');
        const endDate = formData.data_termino_real 
            ? new Date(formData.data_termino_real + 'T00:00:00')
            : new Date();
        
        const diffTime = endDate - startDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(diffDays, 0);
    };

    const getStatus = () => {
        const daysRemaining = getDaysRemaining();
        if (!formData.data_inicio_real) return { text: 'A Iniciar', class: 'status-a-iniciar' };
        if (formData.data_termino_real) return { text: 'Concluído', class: 'status-concluido' };
        if (daysRemaining < 0) return { text: 'Atrasado', class: 'status-atrasado' };
        return { text: 'Em Andamento', class: 'status-em-andamento' };
    };

    const status = getStatus();
    const daysRemaining = getDaysRemaining();
    const daysExecuted = getDaysExecuted();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content edit-stage-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Editar Etapa</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Nome do Serviço */}
                    <div className="form-group">
                        <label>Nome do Serviço/Etapa *</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => handleChange('nome', e.target.value)}
                            placeholder="Ex: CP pav superior e inferior"
                            className={errors.nome ? 'error' : ''}
                        />
                        {errors.nome && <span className="error-message">{errors.nome}</span>}
                    </div>

                    {/* Ordem de Execução */}
                    <div className="form-group">
                        <label>Ordem de Execução *</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.ordem_execucao}
                            onChange={(e) => handleChange('ordem_execucao', parseInt(e.target.value))}
                        />
                    </div>

                    {/* Tipo de Medição */}
                    <div className="form-group">
                        <label>Tipo de Medição *</label>
                        <div className="tipo-medicao-options">
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="tipo_medicao"
                                    value="empreitada"
                                    checked={formData.tipo_medicao === 'empreitada'}
                                    onChange={(e) => handleChange('tipo_medicao', e.target.value)}
                                />
                                <span>Por Empreitada (ajuste manual do %)</span>
                            </label>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="tipo_medicao"
                                    value="area"
                                    checked={formData.tipo_medicao === 'area'}
                                    onChange={(e) => handleChange('tipo_medicao', e.target.value)}
                                />
                                <span>Por Área/Quantidade (cálculo automático)</span>
                            </label>
                        </div>
                    </div>

                    {/* SEÇÃO DE PLANEJAMENTO */}
                    <div className="section-box planning-section">
                        <div className="section-header">
                            <span className="section-icon">📅</span>
                            <h3>PLANEJAMENTO (Datas Previstas)</h3>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Data de Início Prevista *</label>
                                <input
                                    type="date"
                                    value={formData.data_inicio_prevista}
                                    onChange={(e) => handleChange('data_inicio_prevista', e.target.value)}
                                    className={errors.data_inicio_prevista ? 'error' : ''}
                                />
                                {errors.data_inicio_prevista && (
                                    <span className="error-message">{errors.data_inicio_prevista}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Data de Término Prevista *</label>
                                <input
                                    type="date"
                                    value={formData.data_termino_prevista}
                                    onChange={(e) => handleChange('data_termino_prevista', e.target.value)}
                                    className={errors.data_termino_prevista ? 'error' : ''}
                                />
                                {errors.data_termino_prevista && (
                                    <span className="error-message">{errors.data_termino_prevista}</span>
                                )}
                            </div>
                        </div>

                        {formData.data_inicio_prevista && formData.data_termino_prevista && (
                            <div className="info-box">
                                <span className="info-icon">⏱️</span>
                                <span>
                                    {Math.ceil(
                                        (new Date(formData.data_termino_prevista) - 
                                         new Date(formData.data_inicio_prevista)) / 
                                        (1000 * 60 * 60 * 24)
                                    )} dias planejados
                                </span>
                                {daysRemaining !== null && (
                                    <span className={daysRemaining < 0 ? 'text-danger' : ''}>
                                        {daysRemaining >= 0 
                                            ? `• Restam ${daysRemaining} dias` 
                                            : `• Atrasado ${Math.abs(daysRemaining)} dias`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SEÇÃO DE EXECUÇÃO REAL */}
                    <div className="section-box execution-section">
                        <div className="section-header">
                            <span className="section-icon">🎯</span>
                            <h3>EXECUÇÃO REAL (Atualizar Manualmente)</h3>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Data de Início Real (quando começou)</label>
                                <input
                                    type="date"
                                    value={formData.data_inicio_real}
                                    onChange={(e) => handleChange('data_inicio_real', e.target.value)}
                                />
                                <small className="help-text">
                                    {formData.data_inicio_real 
                                        ? `Iniciado em ${formatDate(formData.data_inicio_real)}`
                                        : 'Deixe vazio se ainda não iniciou'}
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Data de Término Real (quando terminou)</label>
                                <input
                                    type="date"
                                    value={formData.data_termino_real}
                                    onChange={(e) => handleChange('data_termino_real', e.target.value)}
                                    disabled={!formData.data_inicio_real}
                                />
                                <small className="help-text">
                                    {formData.data_termino_real
                                        ? `Concluído em ${formatDate(formData.data_termino_real)}`
                                        : 'Deixe vazio se ainda não terminou'}
                                </small>
                            </div>
                        </div>

                        {formData.data_inicio_real && (
                            <div className="info-box">
                                <span className="info-icon">⏰</span>
                                <span>{daysExecuted} dias executados</span>
                                <span className={`status-badge ${status.class}`}>{status.text}</span>
                            </div>
                        )}

                        {/* Campos específicos por tipo de medição */}
                        {formData.tipo_medicao === 'area' ? (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Área/Quantidade Total *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.area_total || ''}
                                            onChange={(e) => handleChange('area_total', parseFloat(e.target.value))}
                                            placeholder="Ex: 100"
                                            className={errors.area_total ? 'error' : ''}
                                        />
                                        {errors.area_total && (
                                            <span className="error-message">{errors.area_total}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>Unidade de Medida *</label>
                                        <select
                                            value={formData.unidade_medida}
                                            onChange={(e) => handleChange('unidade_medida', e.target.value)}
                                            className={errors.unidade_medida ? 'error' : ''}
                                        >
                                            <option value="m²">m² (metros quadrados)</option>
                                            <option value="m³">m³ (metros cúbicos)</option>
                                            <option value="m">m (metros lineares)</option>
                                            <option value="unidades">unidades</option>
                                            <option value="kg">kg (quilogramas)</option>
                                            <option value="litros">litros</option>
                                        </select>
                                        {errors.unidade_medida && (
                                            <span className="error-message">{errors.unidade_medida}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Área/Quantidade Executada</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={formData.area_total || undefined}
                                        value={formData.area_executada || ''}
                                        onChange={(e) => handleChange('area_executada', parseFloat(e.target.value))}
                                        placeholder="Ex: 30"
                                        disabled={!formData.area_total}
                                    />
                                    {formData.area_total && formData.area_executada && (
                                        <small className="help-text">
                                            {formData.area_executada} de {formData.area_total} {formData.unidade_medida} 
                                            ({formData.percentual_conclusao}% concluído)
                                        </small>
                                    )}
                                </div>

                                {/* Exibição do percentual calculado automaticamente */}
                                <div className="percentual-display">
                                    <label>Percentual de Conclusão (%) - Avanço Físico Real</label>
                                    <div className="percentual-value">
                                        {formData.percentual_conclusao}%
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${formData.percentual_conclusao}%` }}
                                        ></div>
                                    </div>
                                    <div className="percentual-warning">
                                        <span className="warning-icon">⚠️</span>
                                        <span>Este é o avanço físico REAL da obra, não é calculado pelos dias!</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Modo Empreitada - Slider manual */}
                                <div className="form-group">
                                    <label>Percentual de Conclusão (%) - Avanço Físico Real</label>
                                    <div className="slider-container">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.percentual_conclusao}
                                            onChange={(e) => handleChange('percentual_conclusao', parseInt(e.target.value))}
                                            className="percentual-slider"
                                        />
                                        <div className="slider-value">{formData.percentual_conclusao}%</div>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${formData.percentual_conclusao}%` }}
                                        ></div>
                                    </div>
                                    <div className="percentual-warning">
                                        <span className="warning-icon">⚠️</span>
                                        <span>Este é o avanço físico REAL da obra, não é calculado pelos dias!</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Observações */}
                    <div className="form-group">
                        <label>Observações</label>
                        <textarea
                            value={formData.observacoes}
                            onChange={(e) => handleChange('observacoes', e.target.value)}
                            placeholder="Importado de serviços - Responsável: Carlos"
                            rows="3"
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="btn-save" onClick={handleSubmit}>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditStageModal;
