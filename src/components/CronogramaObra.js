import React, { useState, useEffect } from 'react';
import './CronogramaObra.css';

const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para formatar moeda BRL
const formatCurrency = (value) => {
    if (typeof value !== 'number') value = 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para formatar data brasileira
const formatDateBR = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

// Helper para calcular dias entre datas
const calcularDias = (dataInicio, dataFim) => {
    if (!dataInicio || !dataFim) return 0;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diffTime = Math.abs(fim - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Helper para calcular dias restantes
const calcularDiasRestantes = (dataFim) => {
    if (!dataFim) return 0;
    const hoje = new Date();
    const fim = new Date(dataFim);
    const diffTime = fim - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Helper para determinar status automaticamente com LÓGICA CORRETA
const determinarStatus = (item) => {
    const { data_inicio, data_inicio_real, data_fim_prevista, percentual_conclusao } = item;
    
    const hoje = new Date();
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim_prevista);
    
    // Se chegou em 100%, está concluído
    if (percentual_conclusao >= 100) return 'concluido';
    
    // Se já tem data_inicio_real, significa que começou
    if (data_inicio_real) {
        // Começou e passou do prazo sem estar em 100%
        if (hoje > fim && percentual_conclusao < 100) return 'atrasado';
        // Começou e está dentro do prazo
        return 'em_andamento';
    }
    
    // Não começou ainda
    if (hoje < inicio) return 'nao_iniciado';
    
    // Passou da data de início prevista mas não começou
    if (hoje >= inicio && !data_inicio_real) return 'atrasado';
    
    return 'nao_iniciado';
};

// ==================== COMPONENTE DE ANÁLISE FINANCEIRA ====================
const AnaliseFinanceira = ({ dadosFinanceiros, percentualConclusao }) => {
    if (!dadosFinanceiros) return null;
    
    const { valor_total, valor_pago, area_total, area_executada } = dadosFinanceiros;
    
    // Calcular percentuais
    const percPago = valor_total > 0 ? (valor_pago / valor_total) * 100 : 0;
    const percExecutado = percentualConclusao || 0;
    
    // Calcular diferença (positivo = está adiantado, negativo = está atrasado)
    const diferenca = percExecutado - percPago;
    
    // Determinar status
    let statusAnalise = {
        label: '',
        cor: '',
        emoji: '',
        descricao: ''
    };
    
    if (diferenca >= 5) {
        statusAnalise = {
            label: 'ADIANTADO',
            cor: '#10b981',
            emoji: '🟢',
            descricao: 'Execução à frente do pagamento'
        };
    } else if (diferenca >= -5) {
        statusAnalise = {
            label: 'NO PRAZO',
            cor: '#3b82f6',
            emoji: '🔵',
            descricao: 'Execução proporcional ao pagamento'
        };
    } else if (diferenca >= -15) {
        statusAnalise = {
            label: 'ATENÇÃO',
            cor: '#f59e0b',
            emoji: '🟡',
            descricao: 'Execução levemente abaixo do pago'
        };
    } else {
        statusAnalise = {
            label: 'ATRASO CRÍTICO',
            cor: '#ef4444',
            emoji: '🔴',
            descricao: 'Pagou muito mais do que executou'
        };
    }
    
    return (
        <div className="analise-financeira">
            <div className="analise-header">
                <h5>💰 Análise de Valor Agregado (EVM)</h5>
            </div>
            
            {/* Valores em reais */}
            <div className="valores-resumo">
                <div className="valor-item">
                    <span className="valor-label">💵 Total Orçado:</span>
                    <span className="valor-numero">{formatCurrency(valor_total)}</span>
                </div>
                <div className="valor-item">
                    <span className="valor-label">✅ Já Pago:</span>
                    <span className="valor-numero destaque">{formatCurrency(valor_pago)}</span>
                </div>
                {area_total && (
                    <>
                        <div className="valor-item">
                            <span className="valor-label">📐 Área Total:</span>
                            <span className="valor-numero">{area_total} m²</span>
                        </div>
                        <div className="valor-item">
                            <span className="valor-label">✔️ Executado:</span>
                            <span className="valor-numero destaque">{area_executada || 0} m²</span>
                        </div>
                    </>
                )}
            </div>
            
            {/* Barras Comparativas */}
            <div className="barras-comparativas">
                {/* Barra de Pagamento */}
                <div className="barra-item">
                    <div className="barra-label">
                        <span>💰 Pago</span>
                        <strong>{percPago.toFixed(1)}%</strong>
                    </div>
                    <div className="barra-track">
                        <div 
                            className="barra-fill pago"
                            style={{ width: `${Math.min(100, percPago)}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* Barra de Execução */}
                <div className="barra-item">
                    <div className="barra-label">
                        <span>🏗️ Executado</span>
                        <strong>{percExecutado.toFixed(1)}%</strong>
                    </div>
                    <div className="barra-track">
                        <div 
                            className="barra-fill executado"
                            style={{ width: `${Math.min(100, percExecutado)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            
            {/* Status da Análise */}
            <div 
                className="status-analise"
                style={{ 
                    backgroundColor: `${statusAnalise.cor}15`,
                    borderLeft: `4px solid ${statusAnalise.cor}`
                }}
            >
                <div className="status-analise-header">
                    <span className="status-emoji">{statusAnalise.emoji}</span>
                    <span className="status-label" style={{ color: statusAnalise.cor }}>
                        {statusAnalise.label}
                    </span>
                    <span className="status-diferenca" style={{ color: statusAnalise.cor }}>
                        {diferenca > 0 ? '+' : ''}{diferenca.toFixed(1)}%
                    </span>
                </div>
                <p className="status-descricao">{statusAnalise.descricao}</p>
                
                {/* Alerta se estiver crítico */}
                {diferenca < -15 && (
                    <div className="alerta-critico">
                        <strong>⚠️ Ação necessária:</strong> Revise os pagamentos ou acelere a execução!
                    </div>
                )}
            </div>
        </div>
    );
};

// Badge de Status
const StatusBadge = ({ status }) => {
    const statusConfig = {
        'nao_iniciado': { label: 'A Iniciar', color: '#6c757d', emoji: '⏸️' },
        'em_andamento': { label: 'Em Andamento', color: '#3b82f6', emoji: '⚙️' },
        'concluido': { label: 'Concluído', color: '#10b981', emoji: '✅' },
        'atrasado': { label: 'Atrasado', color: '#ef4444', emoji: '⚠️' }
    };
    
    const config = statusConfig[status] || statusConfig['nao_iniciado'];
    
    return (
        <span 
            className="badge-status" 
            style={{ backgroundColor: config.color }}
        >
            {config.emoji} {config.label}
        </span>
    );
};

// Card individual de cronograma
const CardCronograma = ({ item, onEdit, onDelete, obraId, isExpanded, onToggle }) => {
    const [dadosFinanceiros, setDadosFinanceiros] = useState(null);
    const [carregandoDados, setCarregandoDados] = useState(true);
    
    const diasTotais = calcularDias(item.data_inicio, item.data_fim_prevista);
    const diasRestantes = calcularDiasRestantes(item.data_fim_prevista);
    const status = determinarStatus(item);
    
    // Calcular dias reais se tiver data_inicio_real
    const diasReais = item.data_inicio_real && item.data_fim_real 
        ? calcularDias(item.data_inicio_real, item.data_fim_real)
        : null;
    
    // Buscar dados financeiros do serviço quando o card é montado
    useEffect(() => {
        const buscarDadosFinanceiros = async () => {
            if (!item.servico_id && !item.servico_nome) {
                setCarregandoDados(false);
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                // Buscar dados financeiros do serviço
                const response = await fetch(
                    `${API_URL}/obras/${obraId}/servico-financeiro?servico_nome=${encodeURIComponent(item.servico_nome)}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                
                if (response.ok) {
                    const dados = await response.json();
                    setDadosFinanceiros(dados);
                }
            } catch (error) {
                console.error('Erro ao buscar dados financeiros:', error);
            } finally {
                setCarregandoDados(false);
            }
        };
        
        buscarDadosFinanceiros();
    }, [item.servico_id, item.servico_nome, obraId]);
    
    return (
        <div className={`card-cronograma ${status}`}>
            {/* Cabeçalho - SEMPRE VISÍVEL + CLICÁVEL */}
            <div 
                className="cronograma-header"
                onClick={onToggle}
                style={{ cursor: 'pointer', marginBottom: isExpanded ? '12px' : '8px' }}
            >
                <div className="cronograma-title">
                    <h4>🏗️ {item.servico_nome}</h4>
                    {item.ordem && <span className="ordem-badge">#{item.ordem}</span>}
                    <StatusBadge status={status} />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5em',
                        cursor: 'pointer',
                        padding: '5px',
                        color: '#4a5568'
                    }}
                >
                    {isExpanded ? '🔽' : '▶️'}
                </button>
            </div>

            {/* TIPO DE MEDIÇÃO - SEMPRE VISÍVEL */}
            {item.tipo_medicao && (
                <div style={{
                    fontSize: '0.75em', 
                    color: '#6b7280', 
                    marginBottom: '8px',
                    padding: '4px 8px',
                    background: '#f3f4f6',
                    borderRadius: '4px',
                    display: 'inline-block'
                }}>
                    {item.tipo_medicao === 'area' ? '📐 Medição por Área/Quantidade' : '📋 Medição por Empreitada'}
                </div>
            )}

            {/* ÁREA/QUANTIDADE - SEMPRE VISÍVEL se for tipo área */}
            {item.tipo_medicao === 'area' && (item.area_total || item.area_executada) && (
                <div style={{
                    padding: '8px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '0.9em'
                }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                        <span style={{color: '#6b7280'}}>Total:</span>
                        <strong>{item.area_total} {item.unidade_medida || 'm²'}</strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span style={{color: '#6b7280'}}>Executado:</span>
                        <strong style={{color: '#10b981'}}>{item.area_executada || 0} {item.unidade_medida || 'm²'}</strong>
                    </div>
                </div>
            )}

            {/* Progress Bar - SEMPRE VISÍVEL */}
            <div className="progress-container" style={{ marginBottom: isExpanded ? '12px' : '0' }}>
                <div 
                    className="progress-bar" 
                    style={{
                        width: `${item.percentual_conclusao}%`,
                        background: status === 'atrasado' 
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                            : 'linear-gradient(90deg, #4f46e5, #10b981)'
                    }}
                >
                    <span className="progress-text">{item.percentual_conclusao}%</span>
                </div>
            </div>

            {/* CONTEÚDO EXPANSÍVEL */}
            {isExpanded && (
                <>
                    {/* PLANEJAMENTO */}
                    <div className="timeline-info">
                        <h5 style={{margin: '8px 0 4px 0', fontSize: '0.85em', color: '#6b7280', fontWeight: 600}}>
                            📋 PLANEJAMENTO
                        </h5>
                        <div className="timeline-dates">
                            <span>📅 {formatDateBR(item.data_inicio)}</span>
                            <span className="arrow">→</span>
                            <span>📅 {formatDateBR(item.data_fim_prevista)}</span>
                        </div>
                        <div className="timeline-duration">
                            <span>⏱️ {diasTotais} dias planejados</span>
                </div>
            </div>

            {/* EXECUÇÃO REAL */}
            {(item.data_inicio_real || item.data_fim_real) && (
                <div className="timeline-info" style={{borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px'}}>
                    <h5 style={{margin: '8px 0 4px 0', fontSize: '0.85em', color: '#6b7280', fontWeight: 600}}>
                        🎯 EXECUÇÃO REAL
                    </h5>
                    <div className="timeline-dates">
                        <span>{item.data_inicio_real ? `📅 Início: ${formatDateBR(item.data_inicio_real)}` : 'Não iniciado'}</span>
                        {item.data_fim_real && (
                            <>
                                <span className="arrow">→</span>
                                <span>📅 Fim: {formatDateBR(item.data_fim_real)}</span>
                            </>
                        )}
                    </div>
                    {diasReais && (
                        <div className="timeline-duration">
                            <span>⏱️ {diasReais} dias executados</span>
                        </div>
                    )}
                </div>
            )}

            {/* Informações de prazo */}
            {status === 'em_andamento' && (
                <div className="timeline-duration" style={{marginTop: '8px'}}>
                    <span className={diasRestantes < 0 ? 'text-danger' : ''}>
                        {diasRestantes >= 0 
                            ? `⏰ Restam ${diasRestantes} dias` 
                            : `⚠️ Atrasado ${Math.abs(diasRestantes)} dias`
                        }
                    </span>
                </div>
            )}

            {/* Mini Timeline Visual */}
            <div className="mini-timeline">
                <div className="timeline-track">
                    <div 
                        className="timeline-progress" 
                        style={{ 
                            width: `${item.percentual_conclusao}%`,
                            backgroundColor: status === 'atrasado' ? '#ef4444' : '#10b981'
                        }}
                    ></div>
                    {status === 'em_andamento' && (
                        <div 
                            className="timeline-marker today" 
                            style={{ 
                                left: `${Math.min(100, (new Date() - new Date(item.data_inicio)) / (new Date(item.data_fim_prevista) - new Date(item.data_inicio)) * 100)}%` 
                            }}
                        >
                            Hoje
                        </div>
                    )}
                </div>
            </div>

            {/* Análise Financeira */}
            {!carregandoDados && dadosFinanceiros && (
                <AnaliseFinanceira 
                    dadosFinanceiros={dadosFinanceiros}
                    percentualConclusao={item.percentual_conclusao}
                />
            )}

            {/* Observações */}
            {item.observacoes && (
                <div className="cronograma-obs">
                    <small>💬 {item.observacoes}</small>
                </div>
            )}

            {/* Ações */}
            <div className="cronograma-actions">
                <button className="btn-editar" onClick={() => onEdit(item)}>
                    ✏️ Editar
                </button>
                <button className="btn-delete" onClick={() => onDelete(item.id)}>
                    🗑️ Excluir
                </button>
            </div>
                </>
            )}
        </div>
    );
};

// ==================== EDIT STAGE MODAL COM DOIS MODOS ====================
const EditStageModal = ({ item, onClose, onSave, obraId }) => {
    const [tipoMedicao, setTipoMedicao] = useState(item?.tipo_medicao || 'empreitada');
    const [formData, setFormData] = useState({
        servico_nome: item?.servico_nome || '',
        ordem: item?.ordem || '',
        data_inicio: item?.data_inicio || '',
        data_fim_prevista: item?.data_fim_prevista || '',
        data_inicio_real: item?.data_inicio_real || '',
        data_fim_real: item?.data_fim_real || '',
        percentual_conclusao: item?.percentual_conclusao || 0,
        observacoes: item?.observacoes || '',
        // Campos de área/quantidade
        area_total: item?.area_total || '',
        area_executada: item?.area_executada || '',
        unidade_medida: item?.unidade_medida || 'm²'
    });

    // Calcular percentual automaticamente quando for modo área
    useEffect(() => {
        if (tipoMedicao === 'area' && formData.area_total > 0) {
            const areaExec = parseFloat(formData.area_executada) || 0;
            const areaTotal = parseFloat(formData.area_total);
            const percentual = Math.min(100, Math.round((areaExec / areaTotal) * 100));
            setFormData(prev => ({ ...prev, percentual_conclusao: percentual }));
        }
    }, [formData.area_executada, formData.area_total, tipoMedicao]);

    // Auto-preencher data_inicio_real quando percentual > 0 e não tiver data
    useEffect(() => {
        if (formData.percentual_conclusao > 0 && !formData.data_inicio_real) {
            const hoje = new Date().toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, data_inicio_real: hoje }));
        }
    }, [formData.percentual_conclusao]);

    // Auto-preencher data_fim_real quando percentual = 100%
    useEffect(() => {
        if (formData.percentual_conclusao >= 100 && !formData.data_fim_real) {
            const hoje = new Date().toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, data_fim_real: hoje }));
        }
    }, [formData.percentual_conclusao]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validações
        if (!formData.servico_nome || !formData.data_inicio || !formData.data_fim_prevista) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        // Se for modo área, validar campos de área
        if (tipoMedicao === 'area') {
            if (!formData.area_total || parseFloat(formData.area_total) <= 0) {
                alert('Informe a área total válida');
                return;
            }
        }

        const dataToSave = {
            ...formData,
            obra_id: obraId,
            tipo_medicao: tipoMedicao,
            // Limpar campos de área se for empreitada
            ...(tipoMedicao === 'empreitada' && {
                area_total: null,
                area_executada: null,
                unidade_medida: null
            })
        };

        onSave(dataToSave);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content-cronograma">
                <div className="modal-header">
                    <h3>{item ? '✏️ Editar Etapa' : '➕ Nova Etapa'}</h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ESCOLHA DO TIPO DE MEDIÇÃO */}
                    <div className="form-section">
                        <label className="form-label">
                            <strong>📊 Tipo de Medição</strong>
                        </label>
                        <div className="radio-group">
                            <label className={`radio-card ${tipoMedicao === 'empreitada' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    value="empreitada"
                                    checked={tipoMedicao === 'empreitada'}
                                    onChange={(e) => setTipoMedicao(e.target.value)}
                                />
                                <div className="radio-content">
                                    <div className="radio-icon">📋</div>
                                    <div>
                                        <div className="radio-title">Por Empreitada</div>
                                        <div className="radio-description">
                                            Ajuste manual do percentual com slider
                                        </div>
                                    </div>
                                </div>
                            </label>

                            <label className={`radio-card ${tipoMedicao === 'area' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    value="area"
                                    checked={tipoMedicao === 'area'}
                                    onChange={(e) => setTipoMedicao(e.target.value)}
                                />
                                <div className="radio-content">
                                    <div className="radio-icon">📐</div>
                                    <div>
                                        <div className="radio-title">Por Área/Quantidade</div>
                                        <div className="radio-description">
                                            Calcula percentual automaticamente
                                        </div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* INFORMAÇÕES BÁSICAS */}
                    <div className="form-section">
                        <label className="form-label">
                            Nome do Serviço/Etapa *
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.servico_nome}
                            onChange={(e) => setFormData({...formData, servico_nome: e.target.value})}
                            placeholder="Ex: Contrapiso, Alvenaria, Pintura..."
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ordem</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.ordem}
                                onChange={(e) => setFormData({...formData, ordem: e.target.value})}
                                placeholder="1"
                            />
                        </div>
                    </div>

                    {/* CAMPOS DE ÁREA - só aparecem se tipo = area */}
                    {tipoMedicao === 'area' && (
                        <div className="form-section area-section">
                            <label className="form-label">
                                <strong>📐 Medição de Área/Quantidade</strong>
                            </label>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Área Total *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={formData.area_total}
                                        onChange={(e) => setFormData({...formData, area_total: e.target.value})}
                                        placeholder="100"
                                        required={tipoMedicao === 'area'}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Área Executada</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={formData.area_executada}
                                        onChange={(e) => setFormData({...formData, area_executada: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unidade</label>
                                    <select
                                        className="form-input"
                                        value={formData.unidade_medida}
                                        onChange={(e) => setFormData({...formData, unidade_medida: e.target.value})}
                                    >
                                        <option value="m²">m²</option>
                                        <option value="m³">m³</option>
                                        <option value="m">m</option>
                                        <option value="un">un</option>
                                        <option value="kg">kg</option>
                                        <option value="L">L</option>
                                    </select>
                                </div>
                            </div>
                            <div className="info-box">
                                ℹ️ O percentual será calculado automaticamente: (Executado ÷ Total) × 100
                            </div>
                        </div>
                    )}

                    {/* PERCENTUAL - sempre aparece, mas com comportamento diferente */}
                    <div className="form-section">
                        <label className="form-label">
                            Percentual de Conclusão: <strong>{formData.percentual_conclusao}%</strong>
                        </label>
                        {tipoMedicao === 'empreitada' ? (
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                className="slider"
                                value={formData.percentual_conclusao}
                                onChange={(e) => setFormData({...formData, percentual_conclusao: parseInt(e.target.value)})}
                            />
                        ) : (
                            <div className="readonly-progress">
                                <div className="progress-bar" style={{width: `${formData.percentual_conclusao}%`}}>
                                    {formData.percentual_conclusao}%
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PLANEJAMENTO */}
                    <div className="form-section">
                        <label className="form-label">
                            <strong>📋 PLANEJAMENTO</strong>
                        </label>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Data Início Prevista *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.data_inicio}
                                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Data Fim Prevista *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.data_fim_prevista}
                                    onChange={(e) => setFormData({...formData, data_fim_prevista: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* EXECUÇÃO REAL */}
                    <div className="form-section">
                        <label className="form-label">
                            <strong>🎯 EXECUÇÃO REAL</strong>
                        </label>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Data Início Real</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.data_inicio_real}
                                    onChange={(e) => setFormData({...formData, data_inicio_real: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Data Fim Real</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.data_fim_real}
                                    onChange={(e) => setFormData({...formData, data_fim_real: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* OBSERVAÇÕES */}
                    <div className="form-section">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-textarea"
                            value={formData.observacoes}
                            onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                            placeholder="Notas adicionais sobre esta etapa..."
                            rows="3"
                        />
                    </div>

                    {/* BOTÕES */}
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            {item ? 'Salvar Alterações' : 'Adicionar Etapa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal de Importar Serviços
const ImportarServicosModal = ({ obraId, onClose, onImport }) => {
    const [servicos, setServicos] = useState([]);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [diasPorServico, setDiasPorServico] = useState(7);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchServicos();
    }, [obraId]);

    const fetchServicos = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const obra = await response.json();
                setServicos(obra.servicos || []);
            }
        } catch (error) {
            console.error('Erro ao buscar serviços:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleServico = (servico) => {
        const exists = servicosSelecionados.find(s => s.id === servico.id);
        if (exists) {
            setServicosSelecionados(servicosSelecionados.filter(s => s.id !== servico.id));
        } else {
            setServicosSelecionados([...servicosSelecionados, servico]);
        }
    };

    const handleImport = () => {
        if (servicosSelecionados.length === 0) {
            alert('Selecione pelo menos um serviço');
            return;
        }
        if (!dataInicio) {
            alert('Defina a data de início');
            return;
        }
        onImport(servicosSelecionados, dataInicio, diasPorServico);
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content-cronograma">
                    <p>Carregando serviços...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content-cronograma">
                <div className="modal-header">
                    <h3>📥 Importar Serviços para o Cronograma</h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="import-config">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Data de Início</label>
                            <input
                                type="date"
                                className="form-input"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dias por Serviço</label>
                            <input
                                type="number"
                                className="form-input"
                                value={diasPorServico}
                                onChange={(e) => setDiasPorServico(parseInt(e.target.value))}
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                {servicos.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhum serviço cadastrado nesta obra ainda.</p>
                    </div>
                ) : (
                    <>
                        <div className="servicos-list">
                            <h4>Selecione os Serviços:</h4>
                            {servicos.map(servico => (
                                <label key={servico.id} className="servico-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={servicosSelecionados.some(s => s.id === servico.id)}
                                        onChange={() => toggleServico(servico)}
                                    />
                                    <span className="servico-nome">{servico.nome}</span>
                                    {servico.responsavel && (
                                        <span className="servico-responsavel">
                                            👤 {servico.responsavel}
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleImport}>
                                Importar {servicosSelecionados.length} Serviço(s)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Componente Principal
const CronogramaObra = ({ obraId }) => {
    const [cronograma, setCronograma] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [expandedCards, setExpandedCards] = useState({});
    const [globalExpanded, setGlobalExpanded] = useState(true);

    useEffect(() => {
        if (obraId) {
            fetchCronograma();
        }
    }, [obraId]);

    const fetchCronograma = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/cronograma/${obraId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setCronograma(data);
                
                // Inicializa todos os cards como expandidos
                const initialExpanded = {};
                data.forEach(item => {
                    initialExpanded[item.id] = true;
                });
                setExpandedCards(initialExpanded);
            }
        } catch (error) {
            console.error('Erro ao buscar cronograma:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCard = (itemId) => {
        setExpandedCards(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const toggleAllCards = () => {
        const newState = !globalExpanded;
        setGlobalExpanded(newState);
        
        const newExpandedState = {};
        cronograma.forEach(item => {
            newExpandedState[item.id] = newState;
        });
        setExpandedCards(newExpandedState);
    };

    const handleSave = async (data) => {
        try {
            const token = localStorage.getItem('token');
            const url = editingItem 
                ? `${API_URL}/cronograma/${editingItem.id}`
                : `${API_URL}/cronograma`;
            
            const method = editingItem ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                fetchCronograma();
                setShowModal(false);
                setEditingItem(null);
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar etapa do cronograma');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja realmente excluir esta etapa?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/cronograma/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchCronograma();
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir etapa');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleExportPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/cronograma/exportar-pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cronograma_obra_${obraId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                alert('PDF exportado com sucesso!');
            } else {
                alert('Erro ao exportar PDF');
            }
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            alert('Erro ao exportar PDF');
        }
    };

    const handleImportServicos = async (servicosSelecionados, dataInicio, diasPorServico) => {
        try {
            const token = localStorage.getItem('token');
            let currentDate = new Date(dataInicio);
            
            // Criar etapas do cronograma para cada serviço selecionado
            for (let i = 0; i < servicosSelecionados.length; i++) {
                const servico = servicosSelecionados[i];
                
                // Calcular data de término (início + dias por serviço)
                const dataFim = new Date(currentDate);
                dataFim.setDate(dataFim.getDate() + diasPorServico);
                
                const etapa = {
                    obra_id: obraId,
                    servico_nome: servico.nome,
                    ordem: i + 1,
                    data_inicio: currentDate.toISOString().split('T')[0],
                    data_fim_prevista: dataFim.toISOString().split('T')[0],
                    percentual_conclusao: 0,
                    tipo_medicao: 'empreitada', // padrão ao importar
                    observacoes: servico.responsavel 
                        ? `Importado de serviços - Responsável: ${servico.responsavel}` 
                        : 'Importado de serviços'
                };
                
                const response = await fetch(`${API_URL}/cronograma`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(etapa)
                });

                if (!response.ok) {
                    console.error(`Erro ao importar serviço: ${servico.nome}`);
                }
                
                // Próximo serviço começa no dia seguinte ao término do anterior
                currentDate = new Date(dataFim);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Atualizar lista de cronograma
            await fetchCronograma();
            setShowImportModal(false);
            alert(`${servicosSelecionados.length} serviço(s) importado(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao importar serviços:', error);
            alert('Erro ao importar serviços. Tente novamente.');
        }
    };

    // Filtrar cronograma
    const cronogramaFiltrado = cronograma.filter(item => {
        if (filtroStatus === 'todos') return true;
        const status = determinarStatus(item);
        return status === filtroStatus;
    });

    // Ordenar por ordem
    const cronogramaOrdenado = [...cronogramaFiltrado].sort((a, b) => a.ordem - b.ordem);

    if (loading) {
        return <div className="loading-screen">Carregando cronograma...</div>;
    }

    return (
        <div className="cronograma-container">
            <div className="card-header">
                <h3>📅 Cronograma da Obra</h3>
                <div className="header-actions">
                    <select 
                        value={filtroStatus} 
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="filtro-status"
                    >
                        <option value="todos">Todos</option>
                        <option value="nao_iniciado">A Iniciar</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="atrasado">Atrasados</option>
                        <option value="concluido">Concluídos</option>
                    </select>
                    <button 
                        className="acao-btn"
                        onClick={toggleAllCards}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#6c757d'
                        }}
                    >
                        <span>{globalExpanded ? '📕' : '📖'}</span>
                        {globalExpanded ? 'Recolher Todos' : 'Expandir Todos'}
                    </button>
                    <button 
                        className="acao-btn" 
                        onClick={() => setShowImportModal(true)}
                        style={{background: '#10b981'}}
                    >
                        📥 Importar Serviços
                    </button>
                    <button className="acao-btn add-btn" onClick={handleAdd}>
                        ➕ Nova Etapa
                    </button>
                    <button 
                        className="acao-btn" 
                        onClick={handleExportPDF}
                        style={{background: '#dc3545'}}
                    >
                        📄 Exportar PDF
                    </button>
                </div>
            </div>

            {cronogramaOrdenado.length === 0 ? (
                <div className="empty-state">
                    <p>📋 Nenhuma etapa cadastrada ainda.</p>
                    <button className="acao-btn add-btn" onClick={handleAdd}>
                        Adicionar Primeira Etapa
                    </button>
                </div>
            ) : (
                <div className="cronograma-grid">
                    {cronogramaOrdenado.map(item => (
                        <CardCronograma 
                            key={item.id}
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            obraId={obraId}
                            isExpanded={expandedCards[item.id]}
                            onToggle={() => toggleCard(item.id)}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <EditStageModal 
                    item={editingItem}
                    onClose={() => {
                        setShowModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSave}
                    obraId={obraId}
                />
            )}

            {showImportModal && (
                <ImportarServicosModal
                    obraId={obraId}
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportServicos}
                />
            )}
        </div>
    );
};

export default CronogramaObra;
