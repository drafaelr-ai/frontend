import React, { useState, useEffect, useCallback } from 'react';
import './CronogramaObra.css';

const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para formatar datas
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

// Helper para formatar moeda
const formatCurrency = (value) => {
    if (typeof value !== 'number') value = 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para obter data de hoje
const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
    return todayWithOffset.toISOString().split('T')[0];
};

// Helper para adicionar dias a uma data
const addDays = (dateStr, days) => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

const CronogramaObra = ({ obraId, obraNome, onClose, embedded = false }) => {
    const [cronograma, setCronograma] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados para modal de novo serviço
    const [showAddModal, setShowAddModal] = useState(false);
    const [novoServico, setNovoServico] = useState({
        servico_nome: '',
        tipo_medicao: 'empreitada',
        data_inicio: getTodayString(),
        duracao_dias: 7,
        data_fim_prevista: addDays(getTodayString(), 6),
        area_total: '',
        unidade_medida: 'm²',
        observacoes: ''
    });
    
    // Estados para edição de serviço
    const [editingServico, setEditingServico] = useState(null);
    
    // Estados para etapas
    const [showEtapasModal, setShowEtapasModal] = useState(null); // ID do cronograma
    const [novaEtapa, setNovaEtapa] = useState({
        nome: '',
        duracao_dias: 1,
        data_inicio: '',
        percentual_conclusao: 0,
        observacoes: ''
    });
    const [editingEtapa, setEditingEtapa] = useState(null);
    
    // Estados para serviços vinculados (importar)
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Estados para EVM
    const [evmData, setEvmData] = useState({});

    // Função para buscar com autenticação
    const fetchWithAuth = useCallback(async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };
        return fetch(url, { ...options, headers });
    }, []);

    // Carregar cronograma
    const fetchCronograma = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`${API_URL}/cronograma/${obraId}`);
            if (!response.ok) throw new Error('Erro ao carregar cronograma');
            const data = await response.json();
            setCronograma(data);
            
            // Carregar dados EVM para cada serviço
            for (const item of data) {
                fetchEVMData(item.servico_nome);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [obraId, fetchWithAuth]);

    // Carregar serviços disponíveis para importar
    const fetchServicosDisponiveis = useCallback(async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`);
            if (response.ok) {
                const data = await response.json();
                setServicosDisponiveis(data);
            }
        } catch (err) {
            console.error('Erro ao carregar serviços:', err);
        }
    }, [obraId, fetchWithAuth]);

    // Carregar dados EVM
    const fetchEVMData = useCallback(async (servicoNome) => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/servico-financeiro?servico_nome=${encodeURIComponent(servicoNome)}`
            );
            if (response.ok) {
                const data = await response.json();
                setEvmData(prev => ({ ...prev, [servicoNome]: data }));
            }
        } catch (err) {
            console.error('Erro ao carregar EVM:', err);
        }
    }, [obraId, fetchWithAuth]);

    useEffect(() => {
        fetchCronograma();
        fetchServicosDisponiveis();
    }, [fetchCronograma, fetchServicosDisponiveis]);

    // Calcular data fim baseado em duração
    const calcularDataFim = (dataInicio, duracaoDias) => {
        if (!dataInicio || !duracaoDias) return '';
        return addDays(dataInicio, duracaoDias - 1);
    };

    // Handler para mudança de duração no novo serviço
    const handleDuracaoChange = (dias) => {
        const duracaoDias = parseInt(dias) || 1;
        setNovoServico(prev => ({
            ...prev,
            duracao_dias: duracaoDias,
            data_fim_prevista: calcularDataFim(prev.data_inicio, duracaoDias)
        }));
    };

    // Handler para mudança de data início no novo serviço
    const handleDataInicioChange = (data) => {
        setNovoServico(prev => ({
            ...prev,
            data_inicio: data,
            data_fim_prevista: calcularDataFim(data, prev.duracao_dias)
        }));
    };

    // Criar novo serviço
    const handleCreateServico = async () => {
        try {
            const payload = {
                obra_id: obraId,
                servico_nome: novoServico.servico_nome,
                tipo_medicao: novoServico.tipo_medicao,
                data_inicio: novoServico.data_inicio,
                data_fim_prevista: novoServico.data_fim_prevista,
                percentual_conclusao: 0,
                observacoes: novoServico.observacoes
            };

            if (novoServico.tipo_medicao === 'area' && novoServico.area_total) {
                payload.area_total = parseFloat(novoServico.area_total);
                payload.unidade_medida = novoServico.unidade_medida;
            }

            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao criar serviço');
            }

            setShowAddModal(false);
            setNovoServico({
                servico_nome: '',
                tipo_medicao: 'empreitada',
                data_inicio: getTodayString(),
                duracao_dias: 7,
                data_fim_prevista: addDays(getTodayString(), 6),
                area_total: '',
                unidade_medida: 'm²',
                observacoes: ''
            });
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Atualizar serviço
    const handleUpdateServico = async (id, updates) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Erro ao atualizar');
            fetchCronograma();
            setEditingServico(null);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir serviço
    const handleDeleteServico = async (id) => {
        if (!window.confirm('Excluir este serviço do cronograma?')) return;
        
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir');
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================== ETAPAS ====================

    // Criar nova etapa
    const handleCreateEtapa = async (cronogramaId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${cronogramaId}/etapas`, {
                method: 'POST',
                body: JSON.stringify(novaEtapa)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao criar etapa');
            }

            setNovaEtapa({
                nome: '',
                duracao_dias: 1,
                data_inicio: '',
                percentual_conclusao: 0,
                observacoes: ''
            });
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Atualizar etapa
    const handleUpdateEtapa = async (cronogramaId, etapaId, updates) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${cronogramaId}/etapas/${etapaId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Erro ao atualizar etapa');
            fetchCronograma();
            setEditingEtapa(null);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir etapa
    const handleDeleteEtapa = async (cronogramaId, etapaId) => {
        if (!window.confirm('Excluir esta etapa?')) return;
        
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${cronogramaId}/etapas/${etapaId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir etapa');
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Importar serviço
    const handleImportServico = async (servico) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify({
                    obra_id: obraId,
                    servico_nome: servico.nome,
                    tipo_medicao: 'empreitada',
                    data_inicio: getTodayString(),
                    data_fim_prevista: addDays(getTodayString(), 6),
                    percentual_conclusao: 0
                })
            });

            if (!response.ok) throw new Error('Erro ao importar serviço');
            fetchCronograma();
            setShowImportModal(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Calcular status do serviço
    const getStatus = (servico) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const dataFim = new Date(servico.data_fim_prevista + 'T00:00:00');
        const percentual = servico.percentual_conclusao;
        
        if (percentual >= 100) return { label: 'Concluído', color: '#28a745', icon: '✅' };
        if (hoje > dataFim) return { label: 'Atrasado', color: '#dc3545', icon: '🔴' };
        if (servico.data_inicio_real) return { label: 'Em Andamento', color: '#007bff', icon: '🔄' };
        return { label: 'A Iniciar', color: '#6c757d', icon: '⏳' };
    };

    // Calcular indicador EVM
    const getEVMIndicator = (servicoNome) => {
        const evm = evmData[servicoNome];
        if (!evm || !evm.valor_total) return null;

        const percentualPago = evm.percentual_pago || 0;
        const percentualExecutado = evm.percentual_executado || 0;
        const diferenca = percentualExecutado - percentualPago;

        if (diferenca >= 5) return { label: 'ADIANTADO', color: '#28a745', icon: '🟢' };
        if (diferenca >= -5) return { label: 'NO PRAZO', color: '#007bff', icon: '🔵' };
        if (diferenca >= -15) return { label: 'ATENÇÃO', color: '#ffc107', icon: '🟡' };
        return { label: 'CRÍTICO', color: '#dc3545', icon: '🔴' };
    };

    if (loading) {
        return <div className="loading-container">Carregando cronograma...</div>;
    }

    if (error) {
        return <div className="error-container">Erro: {error}</div>;
    }

    const content = (
        <div className="cronograma-obra-container">
            <div className="cronograma-header">
                <h2>📅 Cronograma de Obras - {obraNome}</h2>
                <div className="header-actions">
                    <button 
                        className="btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        ➕ Novo Serviço
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={() => setShowImportModal(true)}
                    >
                        📋 Importar Serviço
                    </button>
                </div>
            </div>

            {/* Legenda */}
            <div className="legenda-container">
                <span className="legenda-item"><span className="dot gray"></span> A Iniciar</span>
                <span className="legenda-item"><span className="dot blue"></span> Em Andamento</span>
                <span className="legenda-item"><span className="dot green"></span> Concluído</span>
                <span className="legenda-item"><span className="dot red"></span> Atrasado</span>
            </div>

            {/* Lista de Serviços */}
            {cronograma.length === 0 ? (
                <div className="empty-state">
                    <p>Nenhuma etapa cadastrada no cronograma.</p>
                    <p>Clique em "Novo Serviço" ou "Importar Serviço" para começar.</p>
                </div>
            ) : (
                <div className="cronograma-list">
                    {cronograma.map((servico) => {
                        const status = getStatus(servico);
                        const evmIndicator = getEVMIndicator(servico.servico_nome);
                        const evm = evmData[servico.servico_nome];
                        
                        return (
                            <div key={servico.id} className="servico-card">
                                {/* Cabeçalho do Card */}
                                <div className="card-header" style={{ borderLeftColor: status.color }}>
                                    <div className="header-left">
                                        <span className="servico-ordem">#{servico.ordem}</span>
                                        <h3 className="servico-nome">{servico.servico_nome}</h3>
                                        <span 
                                            className="status-badge"
                                            style={{ backgroundColor: status.color }}
                                        >
                                            {status.icon} {status.label}
                                        </span>
                                    </div>
                                    <div className="header-right">
                                        <span className="tipo-badge">
                                            {servico.tipo_medicao === 'etapas' ? '📋 Por Etapas' : 
                                             servico.tipo_medicao === 'area' ? '📐 Por Área' : '🔧 Empreitada'}
                                        </span>
                                    </div>
                                </div>

                                {/* Barra de Progresso Principal */}
                                <div className="progress-section">
                                    <div className="progress-header">
                                        <span>Execução Física</span>
                                        <span className="progress-value">{servico.percentual_conclusao.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${servico.percentual_conclusao}%`,
                                                backgroundColor: status.color
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Datas */}
                                <div className="datas-section">
                                    <div className="data-item">
                                        <span className="data-label">📅 Início Previsto</span>
                                        <span className="data-value">{formatDate(servico.data_inicio)}</span>
                                    </div>
                                    <div className="data-item">
                                        <span className="data-label">📅 Término Previsto</span>
                                        <span className="data-value">{formatDate(servico.data_fim_prevista)}</span>
                                    </div>
                                    {servico.data_inicio_real && (
                                        <div className="data-item real">
                                            <span className="data-label">▶️ Início Real</span>
                                            <span className="data-value">{formatDate(servico.data_inicio_real)}</span>
                                        </div>
                                    )}
                                    {servico.data_fim_real && (
                                        <div className="data-item real">
                                            <span className="data-label">⏹️ Término Real</span>
                                            <span className="data-value">{formatDate(servico.data_fim_real)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Medição por Área */}
                                {servico.tipo_medicao === 'area' && servico.area_total && (
                                    <div className="area-section">
                                        <span>📐 Área: {servico.area_executada || 0} / {servico.area_total} {servico.unidade_medida}</span>
                                    </div>
                                )}

                                {/* ETAPAS */}
                                {servico.tipo_medicao === 'etapas' && servico.etapas && servico.etapas.length > 0 && (
                                    <div className="etapas-section">
                                        <div className="etapas-header">
                                            <h4>📋 Etapas ({servico.etapas.length})</h4>
                                        </div>
                                        <div className="etapas-list">
                                            {servico.etapas.map((etapa, idx) => (
                                                <div key={etapa.id} className="etapa-item">
                                                    <div className="etapa-info">
                                                        <span className="etapa-ordem">{idx + 1}.</span>
                                                        <span className="etapa-nome">{etapa.nome}</span>
                                                        <span className="etapa-dias">{etapa.duracao_dias} dias</span>
                                                    </div>
                                                    <div className="etapa-datas">
                                                        <span>{formatDate(etapa.data_inicio)} → {formatDate(etapa.data_fim)}</span>
                                                        {etapa.inicio_ajustado_manualmente && (
                                                            <span className="ajustado-badge" title="Data ajustada manualmente">✏️</span>
                                                        )}
                                                    </div>
                                                    <div className="etapa-progress">
                                                        <div className="mini-progress-bar">
                                                            <div 
                                                                className="mini-progress-fill"
                                                                style={{ 
                                                                    width: `${etapa.percentual_conclusao}%`,
                                                                    backgroundColor: etapa.percentual_conclusao >= 100 ? '#28a745' : '#007bff'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="etapa-percent">{etapa.percentual_conclusao}%</span>
                                                    </div>
                                                    <div className="etapa-actions">
                                                        <button 
                                                            className="btn-icon"
                                                            onClick={() => setEditingEtapa({ ...etapa, cronograma_id: servico.id })}
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            className="btn-icon danger"
                                                            onClick={() => handleDeleteEtapa(servico.id, etapa.id)}
                                                            title="Excluir"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Análise EVM */}
                                {evm && evm.valor_total > 0 && (
                                    <div className="evm-section" style={{ borderColor: evmIndicator?.color }}>
                                        <div className="evm-header">
                                            <span>💰 Análise de Valor Agregado (EVM)</span>
                                            {evmIndicator && (
                                                <span 
                                                    className="evm-badge"
                                                    style={{ backgroundColor: evmIndicator.color }}
                                                >
                                                    {evmIndicator.icon} {evmIndicator.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="evm-content">
                                            <div className="evm-row">
                                                <span>💵 Total Orçado:</span>
                                                <span>{formatCurrency(evm.valor_total)}</span>
                                            </div>
                                            <div className="evm-row">
                                                <span>✅ Já Pago:</span>
                                                <span>{formatCurrency(evm.valor_pago)} ({evm.percentual_pago?.toFixed(1)}%)</span>
                                            </div>
                                            <div className="evm-bars">
                                                <div className="evm-bar-row">
                                                    <span>💰 Pago</span>
                                                    <div className="evm-bar">
                                                        <div 
                                                            className="evm-bar-fill paid"
                                                            style={{ width: `${Math.min(evm.percentual_pago || 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{(evm.percentual_pago || 0).toFixed(0)}%</span>
                                                </div>
                                                <div className="evm-bar-row">
                                                    <span>🏗️ Exec</span>
                                                    <div className="evm-bar">
                                                        <div 
                                                            className="evm-bar-fill executed"
                                                            style={{ width: `${Math.min(evm.percentual_executado || 0, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{(evm.percentual_executado || 0).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ações */}
                                <div className="card-actions">
                                    {servico.tipo_medicao === 'etapas' || servico.etapas?.length > 0 ? (
                                        <button 
                                            className="btn-action"
                                            onClick={() => setShowEtapasModal(servico.id)}
                                        >
                                            ➕ Adicionar Etapa
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn-action secondary"
                                            onClick={() => setShowEtapasModal(servico.id)}
                                        >
                                            📋 Converter para Etapas
                                        </button>
                                    )}
                                    <button 
                                        className="btn-action"
                                        onClick={() => setEditingServico(servico)}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button 
                                        className="btn-action danger"
                                        onClick={() => handleDeleteServico(servico.id)}
                                    >
                                        🗑️ Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Adicionar Serviço */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Novo Serviço no Cronograma</h3>
                        
                        <div className="form-group">
                            <label>Nome do Serviço *</label>
                            <input 
                                type="text"
                                value={novoServico.servico_nome}
                                onChange={e => setNovoServico(prev => ({ ...prev, servico_nome: e.target.value }))}
                                placeholder="Ex: Construção Piscina"
                            />
                        </div>

                        <div className="form-group">
                            <label>Tipo de Medição</label>
                            <select
                                value={novoServico.tipo_medicao}
                                onChange={e => setNovoServico(prev => ({ ...prev, tipo_medicao: e.target.value }))}
                            >
                                <option value="empreitada">🔧 Empreitada (% manual)</option>
                                <option value="area">📐 Por Área (m², m³, etc)</option>
                                <option value="etapas">📋 Por Etapas (subdivisões)</option>
                            </select>
                        </div>

                        {novoServico.tipo_medicao === 'area' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Área Total</label>
                                    <input 
                                        type="number"
                                        value={novoServico.area_total}
                                        onChange={e => setNovoServico(prev => ({ ...prev, area_total: e.target.value }))}
                                        placeholder="100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unidade</label>
                                    <select
                                        value={novoServico.unidade_medida}
                                        onChange={e => setNovoServico(prev => ({ ...prev, unidade_medida: e.target.value }))}
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
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Início *</label>
                                <input 
                                    type="date"
                                    value={novoServico.data_inicio}
                                    onChange={e => handleDataInicioChange(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={novoServico.duracao_dias}
                                    onChange={e => handleDuracaoChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Data Término (calculada)</label>
                            <input 
                                type="date"
                                value={novoServico.data_fim_prevista}
                                disabled
                                className="calculated"
                            />
                        </div>

                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novoServico.observacoes}
                                onChange={e => setNovoServico(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                                Cancelar
                            </button>
                            <button 
                                className="btn-save"
                                onClick={handleCreateServico}
                                disabled={!novoServico.servico_nome}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Serviço */}
            {editingServico && (
                <div className="modal-overlay" onClick={() => setEditingServico(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Serviço</h3>
                        
                        <div className="form-group">
                            <label>Nome do Serviço</label>
                            <input 
                                type="text"
                                value={editingServico.servico_nome}
                                onChange={e => setEditingServico(prev => ({ ...prev, servico_nome: e.target.value }))}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Início</label>
                                <input 
                                    type="date"
                                    value={editingServico.data_inicio}
                                    onChange={e => setEditingServico(prev => ({ ...prev, data_inicio: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Término Previsto</label>
                                <input 
                                    type="date"
                                    value={editingServico.data_fim_prevista}
                                    onChange={e => setEditingServico(prev => ({ ...prev, data_fim_prevista: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Início Real</label>
                                <input 
                                    type="date"
                                    value={editingServico.data_inicio_real || ''}
                                    onChange={e => setEditingServico(prev => ({ ...prev, data_inicio_real: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Término Real</label>
                                <input 
                                    type="date"
                                    value={editingServico.data_fim_real || ''}
                                    onChange={e => setEditingServico(prev => ({ ...prev, data_fim_real: e.target.value }))}
                                />
                            </div>
                        </div>

                        {editingServico.tipo_medicao !== 'etapas' && (
                            <div className="form-group">
                                <label>Percentual de Conclusão: {editingServico.percentual_conclusao}%</label>
                                <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={editingServico.percentual_conclusao}
                                    onChange={e => setEditingServico(prev => ({ 
                                        ...prev, 
                                        percentual_conclusao: parseFloat(e.target.value) 
                                    }))}
                                />
                            </div>
                        )}

                        {editingServico.tipo_medicao === 'area' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Área Executada</label>
                                    <input 
                                        type="number"
                                        value={editingServico.area_executada || 0}
                                        onChange={e => setEditingServico(prev => ({ 
                                            ...prev, 
                                            area_executada: parseFloat(e.target.value) 
                                        }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>de {editingServico.area_total} {editingServico.unidade_medida}</label>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={editingServico.observacoes || ''}
                                onChange={e => setEditingServico(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingServico(null)}>
                                Cancelar
                            </button>
                            <button 
                                className="btn-save"
                                onClick={() => handleUpdateServico(editingServico.id, editingServico)}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Adicionar Etapa */}
            {showEtapasModal && (
                <div className="modal-overlay" onClick={() => setShowEtapasModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Nova Etapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input 
                                type="text"
                                value={novaEtapa.nome}
                                onChange={e => setNovaEtapa(prev => ({ ...prev, nome: e.target.value }))}
                                placeholder="Ex: Escavação"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias) *</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={novaEtapa.duracao_dias}
                                    onChange={e => setNovaEtapa(prev => ({ ...prev, duracao_dias: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Início (opcional)</label>
                                <input 
                                    type="date"
                                    value={novaEtapa.data_inicio}
                                    onChange={e => setNovaEtapa(prev => ({ ...prev, data_inicio: e.target.value }))}
                                />
                                <small>Deixe vazio para calcular automaticamente</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novaEtapa.observacoes}
                                onChange={e => setNovaEtapa(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowEtapasModal(null)}>
                                Cancelar
                            </button>
                            <button 
                                className="btn-save"
                                onClick={() => handleCreateEtapa(showEtapasModal)}
                                disabled={!novaEtapa.nome}
                            >
                                Adicionar Etapa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Etapa */}
            {editingEtapa && (
                <div className="modal-overlay" onClick={() => setEditingEtapa(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Etapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa</label>
                            <input 
                                type="text"
                                value={editingEtapa.nome}
                                onChange={e => setEditingEtapa(prev => ({ ...prev, nome: e.target.value }))}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={editingEtapa.duracao_dias}
                                    onChange={e => setEditingEtapa(prev => ({ ...prev, duracao_dias: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Início</label>
                                <input 
                                    type="date"
                                    value={editingEtapa.data_inicio}
                                    onChange={e => setEditingEtapa(prev => ({ ...prev, data_inicio: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Percentual de Conclusão: {editingEtapa.percentual_conclusao}%</label>
                            <input 
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={editingEtapa.percentual_conclusao}
                                onChange={e => setEditingEtapa(prev => ({ 
                                    ...prev, 
                                    percentual_conclusao: parseFloat(e.target.value) 
                                }))}
                            />
                        </div>

                        {editingEtapa.inicio_ajustado_manualmente && (
                            <div className="form-group">
                                <label>
                                    <input 
                                        type="checkbox"
                                        checked={editingEtapa.resetar_ajuste_manual}
                                        onChange={e => setEditingEtapa(prev => ({ 
                                            ...prev, 
                                            resetar_ajuste_manual: e.target.checked 
                                        }))}
                                    />
                                    Resetar ajuste manual (recalcular data automaticamente)
                                </label>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={editingEtapa.observacoes || ''}
                                onChange={e => setEditingEtapa(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingEtapa(null)}>
                                Cancelar
                            </button>
                            <button 
                                className="btn-save"
                                onClick={() => handleUpdateEtapa(editingEtapa.cronograma_id, editingEtapa.id, editingEtapa)}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Importar Serviço */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📋 Importar Serviço</h3>
                        
                        <p className="modal-description">
                            Selecione um serviço cadastrado na planilha de custos para importar ao cronograma:
                        </p>

                        {servicosDisponiveis.length === 0 ? (
                            <p className="empty-message">Nenhum serviço cadastrado na obra.</p>
                        ) : (
                            <div className="servicos-import-list">
                                {servicosDisponiveis.map(servico => {
                                    // Verificar se já está no cronograma
                                    const jaImportado = cronograma.some(c => 
                                        c.servico_nome.toLowerCase() === servico.nome.toLowerCase()
                                    );
                                    
                                    return (
                                        <div 
                                            key={servico.id} 
                                            className={`servico-import-item ${jaImportado ? 'disabled' : ''}`}
                                        >
                                            <div className="servico-import-info">
                                                <span className="servico-import-nome">{servico.nome}</span>
                                                {servico.responsavel && (
                                                    <span className="servico-import-responsavel">
                                                        👤 {servico.responsavel}
                                                    </span>
                                                )}
                                            </div>
                                            {jaImportado ? (
                                                <span className="ja-importado-badge">Já importado</span>
                                            ) : (
                                                <button 
                                                    className="btn-import"
                                                    onClick={() => handleImportServico(servico)}
                                                >
                                                    Importar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowImportModal(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Se embedded, retorna só o conteúdo
    if (embedded) {
        return content;
    }

    // Se modal, envolve em overlay
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-fullscreen" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>✕</button>
                {content}
            </div>
        </div>
    );
};

export default CronogramaObra;
