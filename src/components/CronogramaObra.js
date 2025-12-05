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
    
    // Estados para ETAPA PAI (nova)
    const [showAddEtapaPaiModal, setShowAddEtapaPaiModal] = useState(null); // cronograma_id
    const [novaEtapaPai, setNovaEtapaPai] = useState({
        nome: '',
        etapa_anterior_id: null,
        tipo_condicao: 'apos_termino',
        dias_offset: 0,
        observacoes: ''
    });
    
    // Estados para SUBETAPA (antigo "etapa")
    const [showAddSubetapaModal, setShowAddSubetapaModal] = useState(null); // etapa_pai_id
    const [novaSubetapa, setNovaSubetapa] = useState({
        nome: '',
        duracao_dias: 1,
        data_inicio: '',
        percentual_conclusao: 0,
        observacoes: ''
    });
    
    // Estados para edição
    const [editingEtapaPai, setEditingEtapaPai] = useState(null);
    const [editingSubetapa, setEditingSubetapa] = useState(null);
    
    // Estados para serviços vinculados (importar)
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Estados para EVM
    const [evmData, setEvmData] = useState({});
    
    // Estados para controle de expansão das etapas
    const [expandedEtapas, setExpandedEtapas] = useState({});

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
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma`);
            if (!response.ok) throw new Error('Erro ao carregar cronograma');
            const data = await response.json();
            setCronograma(data);
            
            // Expandir todas as etapas por padrão
            const expanded = {};
            data.forEach(servico => {
                if (servico.etapas) {
                    servico.etapas.forEach(etapa => {
                        expanded[etapa.id] = true;
                    });
                }
            });
            setExpandedEtapas(expanded);
            
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

    // Buscar dados EVM
    const fetchEVMData = async (servicoNome) => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/servico-financeiro?servico_nome=${encodeURIComponent(servicoNome)}`
            );
            if (response.ok) {
                const data = await response.json();
                setEvmData(prev => ({ ...prev, [servicoNome]: data }));
            }
        } catch (err) {
            console.log('EVM não disponível para:', servicoNome);
        }
    };

    useEffect(() => {
        fetchCronograma();
    }, [fetchCronograma]);

    // Buscar serviços disponíveis para importar
    const fetchServicosDisponiveis = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`);
            if (response.ok) {
                const data = await response.json();
                const nomesCronograma = cronograma.map(c => c.servico_nome.toLowerCase());
                const disponiveis = data.filter(s => !nomesCronograma.includes(s.nome.toLowerCase()));
                setServicosDisponiveis(disponiveis);
            }
        } catch (err) {
            console.error('Erro ao buscar serviços:', err);
        }
    };

    // Toggle expansão de etapa
    const toggleEtapaExpansion = (etapaId) => {
        setExpandedEtapas(prev => ({
            ...prev,
            [etapaId]: !prev[etapaId]
        }));
    };

    // ==================== CRUD SERVIÇO ====================
    
    // Adicionar novo serviço
    const handleAddServico = async () => {
        if (!novoServico.servico_nome.trim()) {
            alert('Informe o nome do serviço');
            return;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify({
                    obra_id: obraId,
                    servico_nome: novoServico.servico_nome,
                    tipo_medicao: novoServico.tipo_medicao,
                    data_inicio: novoServico.data_inicio,
                    data_fim_prevista: novoServico.data_fim_prevista,
                    percentual_conclusao: 0,
                    area_total: novoServico.tipo_medicao === 'area' ? parseFloat(novoServico.area_total) || 0 : null,
                    unidade_medida: novoServico.tipo_medicao === 'area' ? novoServico.unidade_medida : null,
                    observacoes: novoServico.observacoes
                })
            });

            if (!response.ok) throw new Error('Erro ao criar serviço');

            fetchCronograma();
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
        } catch (err) {
            alert(err.message);
        }
    };

    // Importar serviço existente
    const handleImportServico = async (servico) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify({
                    obra_id: obraId,
                    servico_nome: servico.nome,
                    tipo_medicao: 'etapas',
                    data_inicio: getTodayString(),
                    data_fim_prevista: addDays(getTodayString(), 30),
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

    // Excluir serviço
    const handleDeleteServico = async (servicoId) => {
        if (!window.confirm('Excluir este serviço e todas suas etapas?')) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${servicoId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erro ao excluir serviço');
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================== CRUD ETAPA PAI ====================
    
    // Adicionar nova etapa pai
    const handleAddEtapaPai = async () => {
        if (!novaEtapaPai.nome.trim()) {
            alert('Informe o nome da etapa');
            return;
        }

        try {
            const payload = {
                nome: novaEtapaPai.nome,
                observacoes: novaEtapaPai.observacoes
            };
            
            // Se tem etapa anterior, adicionar condições
            if (novaEtapaPai.etapa_anterior_id) {
                payload.etapa_anterior_id = novaEtapaPai.etapa_anterior_id;
                payload.tipo_condicao = novaEtapaPai.tipo_condicao;
                payload.dias_offset = parseInt(novaEtapaPai.dias_offset) || 0;
            }

            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${showAddEtapaPaiModal}/etapas`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao criar etapa');
            }

            fetchCronograma();
            setShowAddEtapaPaiModal(null);
            setNovaEtapaPai({
                nome: '',
                etapa_anterior_id: null,
                tipo_condicao: 'apos_termino',
                dias_offset: 0,
                observacoes: ''
            });
        } catch (err) {
            alert(err.message);
        }
    };

    // Editar etapa pai
    const handleUpdateEtapaPai = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${editingEtapaPai.cronograma_id}/etapas/${editingEtapaPai.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        nome: editingEtapaPai.nome,
                        etapa_anterior_id: editingEtapaPai.etapa_anterior_id,
                        tipo_condicao: editingEtapaPai.tipo_condicao,
                        dias_offset: parseInt(editingEtapaPai.dias_offset) || 0,
                        observacoes: editingEtapaPai.observacoes
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao atualizar etapa');

            fetchCronograma();
            setEditingEtapaPai(null);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir etapa pai
    const handleDeleteEtapaPai = async (cronogramaId, etapaId, etapaNome) => {
        if (!window.confirm(`Excluir etapa "${etapaNome}" e todas suas subetapas?`)) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${cronogramaId}/etapas/${etapaId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Erro ao excluir etapa');
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================== CRUD SUBETAPA ====================
    
    // Adicionar nova subetapa
    const handleAddSubetapa = async () => {
        if (!novaSubetapa.nome.trim()) {
            alert('Informe o nome da subetapa');
            return;
        }

        try {
            const payload = {
                nome: novaSubetapa.nome,
                etapa_pai_id: showAddSubetapaModal.etapa_pai_id,
                duracao_dias: parseInt(novaSubetapa.duracao_dias) || 1,
                percentual_conclusao: parseFloat(novaSubetapa.percentual_conclusao) || 0,
                observacoes: novaSubetapa.observacoes
            };
            
            if (novaSubetapa.data_inicio) {
                payload.data_inicio = novaSubetapa.data_inicio;
            }

            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${showAddSubetapaModal.cronograma_id}/etapas`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao criar subetapa');
            }

            fetchCronograma();
            setShowAddSubetapaModal(null);
            setNovaSubetapa({
                nome: '',
                duracao_dias: 1,
                data_inicio: '',
                percentual_conclusao: 0,
                observacoes: ''
            });
        } catch (err) {
            alert(err.message);
        }
    };

    // Editar subetapa
    const handleUpdateSubetapa = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${editingSubetapa.cronograma_id}/etapas/${editingSubetapa.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        nome: editingSubetapa.nome,
                        duracao_dias: parseInt(editingSubetapa.duracao_dias) || 1,
                        percentual_conclusao: parseFloat(editingSubetapa.percentual_conclusao) || 0,
                        observacoes: editingSubetapa.observacoes
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao atualizar subetapa');

            fetchCronograma();
            setEditingSubetapa(null);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir subetapa
    const handleDeleteSubetapa = async (cronogramaId, subetapaId, subetapaNome) => {
        if (!window.confirm(`Excluir subetapa "${subetapaNome}"?`)) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${cronogramaId}/etapas/${subetapaId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Erro ao excluir subetapa');
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================== HELPERS ====================
    
    // Atualizar data_fim quando mudar data_inicio ou duracao
    useEffect(() => {
        if (novoServico.data_inicio && novoServico.duracao_dias) {
            setNovoServico(prev => ({
                ...prev,
                data_fim_prevista: addDays(prev.data_inicio, prev.duracao_dias - 1)
            }));
        }
    }, [novoServico.data_inicio, novoServico.duracao_dias]);

    // Status do serviço
    const getStatus = (servico) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataFim = servico.data_fim_prevista ? new Date(servico.data_fim_prevista + 'T00:00:00') : null;
        const percentual = servico.percentual_conclusao || 0;

        if (percentual >= 100) return { label: 'Concluído', color: '#28a745', icon: '✅' };
        if (dataFim && hoje > dataFim) return { label: 'Atrasado', color: '#dc3545', icon: '🔴' };
        if (servico.data_inicio_real) return { label: 'Em Andamento', color: '#007bff', icon: '🔄' };
        return { label: 'A Iniciar', color: '#6c757d', icon: '⏳' };
    };

    // Indicador EVM
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

    // Gerar PDF
    const handleGerarPDF = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-obra/relatorio-pdf`);
            if (!response.ok) throw new Error('Erro ao gerar PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cronograma_${obraNome}_${getTodayString()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert(err.message);
        }
    };

    // ==================== RENDER ====================

    if (loading) {
        return <div className="loading-container">Carregando cronograma...</div>;
    }

    if (error) {
        return <div className="error-container">Erro: {error}</div>;
    }

    const content = (
        <div className="cronograma-obra-container">
            {/* Header */}
            <div className="cronograma-header">
                <h2>📅 Cronograma de Obras - {obraNome}</h2>
                <div className="header-actions">
                    <button className="btn-pdf" onClick={handleGerarPDF}>
                        📄 Gerar PDF
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        ➕ Novo Serviço
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={() => {
                            fetchServicosDisponiveis();
                            setShowImportModal(true);
                        }}
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
                                        <span className="progress-value">{(servico.percentual_conclusao || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill"
                                            style={{ 
                                                width: `${servico.percentual_conclusao || 0}%`,
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

                                {/* ========== ETAPAS HIERÁRQUICAS ========== */}
                                {servico.tipo_medicao === 'etapas' && servico.etapas && servico.etapas.length > 0 && (
                                    <div className="etapas-section">
                                        <div className="etapas-header">
                                            <h4>
                                                📋 Etapas ({servico.etapas.length}) - {
                                                    servico.etapas.reduce((acc, e) => acc + (e.total_dias || e.duracao_dias || 0), 0)
                                                } dias
                                            </h4>
                                        </div>
                                        
                                        {servico.etapas.map((etapa, etapaIdx) => {
                                            const isExpanded = expandedEtapas[etapa.id] !== false;
                                            const hasSubetapas = etapa.subetapas && etapa.subetapas.length > 0;
                                            const totalDias = etapa.total_dias || etapa.duracao_dias || 0;
                                            const percentual = etapa.percentual_conclusao || 0;
                                            
                                            return (
                                                <div key={etapa.id} className="etapa-pai-container">
                                                    {/* Header da Etapa Pai */}
                                                    <div 
                                                        className="etapa-pai-header"
                                                        onClick={() => toggleEtapaExpansion(etapa.id)}
                                                    >
                                                        <div className="etapa-pai-left">
                                                            <span className="etapa-expand-icon">
                                                                {hasSubetapas ? (isExpanded ? '▼' : '▶') : '○'}
                                                            </span>
                                                            <span className="etapa-numero">Etapa {etapaIdx + 1}</span>
                                                            <span className="etapa-nome">{etapa.nome}</span>
                                                            <span className="etapa-dias-badge">{totalDias} dias</span>
                                                            {etapa.tipo_condicao && etapa.tipo_condicao !== 'manual' && etapaIdx > 0 && (
                                                                <span className="etapa-condicao-badge" title={
                                                                    etapa.tipo_condicao === 'apos_termino' ? 'Após término da etapa anterior' :
                                                                    etapa.tipo_condicao === 'dias_apos' ? `${etapa.dias_offset} dias após término` :
                                                                    etapa.tipo_condicao === 'dias_antes' ? `${etapa.dias_offset} dias antes do término` : ''
                                                                }>
                                                                    🔗
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="etapa-pai-right">
                                                            <span className="etapa-datas">
                                                                {formatDate(etapa.data_inicio)} → {formatDate(etapa.data_fim)}
                                                            </span>
                                                            <div className="mini-progress-container">
                                                                <div className="mini-progress-bar">
                                                                    <div 
                                                                        className="mini-progress-fill"
                                                                        style={{ 
                                                                            width: `${percentual}%`,
                                                                            backgroundColor: percentual >= 100 ? '#28a745' : '#007bff'
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                                <span className="etapa-percent">{percentual.toFixed(0)}%</span>
                                                            </div>
                                                            <div className="etapa-actions" onClick={e => e.stopPropagation()}>
                                                                <button 
                                                                    className="btn-icon"
                                                                    onClick={() => setEditingEtapaPai({ ...etapa, cronograma_id: servico.id })}
                                                                    title="Editar etapa"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button 
                                                                    className="btn-icon danger"
                                                                    onClick={() => handleDeleteEtapaPai(servico.id, etapa.id, etapa.nome)}
                                                                    title="Excluir etapa"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Subetapas (colapsável) */}
                                                    {isExpanded && (
                                                        <div className="subetapas-container">
                                                            {hasSubetapas && (
                                                                <div className="subetapas-list">
                                                                    {etapa.subetapas.map((sub, subIdx) => (
                                                                        <div key={sub.id} className="subetapa-item">
                                                                            <div className="subetapa-info">
                                                                                <span className="subetapa-ordem">{etapaIdx + 1}.{subIdx + 1}</span>
                                                                                <span className="subetapa-nome">{sub.nome}</span>
                                                                                <span className="subetapa-dias">{sub.duracao_dias} dias</span>
                                                                            </div>
                                                                            <div className="subetapa-datas">
                                                                                <span>{formatDate(sub.data_inicio)} → {formatDate(sub.data_fim)}</span>
                                                                                {sub.inicio_ajustado_manualmente && (
                                                                                    <span className="ajustado-badge" title="Data ajustada manualmente">✏️</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="subetapa-progress">
                                                                                <div className="mini-progress-bar small">
                                                                                    <div 
                                                                                        className="mini-progress-fill"
                                                                                        style={{ 
                                                                                            width: `${sub.percentual_conclusao}%`,
                                                                                            backgroundColor: sub.percentual_conclusao >= 100 ? '#28a745' : '#007bff'
                                                                                        }}
                                                                                    ></div>
                                                                                </div>
                                                                                <span className="subetapa-percent">{sub.percentual_conclusao}%</span>
                                                                            </div>
                                                                            <div className="subetapa-actions">
                                                                                <button 
                                                                                    className="btn-icon small"
                                                                                    onClick={() => setEditingSubetapa({ ...sub, cronograma_id: servico.id })}
                                                                                    title="Editar"
                                                                                >
                                                                                    ✏️
                                                                                </button>
                                                                                <button 
                                                                                    className="btn-icon small danger"
                                                                                    onClick={() => handleDeleteSubetapa(servico.id, sub.id, sub.nome)}
                                                                                    title="Excluir"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Botão Adicionar Subetapa */}
                                                            <button 
                                                                className="btn-add-subetapa"
                                                                onClick={() => setShowAddSubetapaModal({ 
                                                                    etapa_pai_id: etapa.id, 
                                                                    cronograma_id: servico.id,
                                                                    etapa_nome: etapa.nome
                                                                })}
                                                            >
                                                                ➕ Adicionar Subetapa
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                                <span>{formatCurrency(evm.valor_pago)} ({(evm.percentual_pago || 0).toFixed(1)}%)</span>
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

                                {/* Ações do Card */}
                                <div className="card-actions">
                                    <button 
                                        className="btn-action primary"
                                        onClick={() => {
                                            // Preparar modal com etapas existentes para condição
                                            const etapasExistentes = servico.etapas || [];
                                            const ultimaEtapa = etapasExistentes.length > 0 
                                                ? etapasExistentes[etapasExistentes.length - 1] 
                                                : null;
                                            setNovaEtapaPai({
                                                nome: '',
                                                etapa_anterior_id: ultimaEtapa?.id || null,
                                                tipo_condicao: 'apos_termino',
                                                dias_offset: 0,
                                                observacoes: ''
                                            });
                                            setShowAddEtapaPaiModal(servico.id);
                                        }}
                                    >
                                        ➕ Adicionar Etapa
                                    </button>
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

            {/* ========== MODAIS ========== */}
            
            {/* Modal Adicionar Serviço */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Novo Serviço</h3>
                        
                        <div className="form-group">
                            <label>Nome do Serviço *</label>
                            <input
                                type="text"
                                value={novoServico.servico_nome}
                                onChange={(e) => setNovoServico({...novoServico, servico_nome: e.target.value})}
                                placeholder="Ex: Construção da Piscina"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Tipo de Medição</label>
                            <select
                                value={novoServico.tipo_medicao}
                                onChange={(e) => setNovoServico({...novoServico, tipo_medicao: e.target.value})}
                            >
                                <option value="etapas">📋 Por Etapas (recomendado)</option>
                                <option value="empreitada">🔧 Empreitada (global)</option>
                                <option value="area">📐 Por Área (m², m³, etc)</option>
                            </select>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Início</label>
                                <input
                                    type="date"
                                    value={novoServico.data_inicio}
                                    onChange={(e) => setNovoServico({...novoServico, data_inicio: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={novoServico.duracao_dias}
                                    onChange={(e) => setNovoServico({...novoServico, duracao_dias: parseInt(e.target.value) || 1})}
                                />
                            </div>
                        </div>
                        
                        {novoServico.tipo_medicao === 'area' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Área Total</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={novoServico.area_total}
                                        onChange={(e) => setNovoServico({...novoServico, area_total: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unidade</label>
                                    <select
                                        value={novoServico.unidade_medida}
                                        onChange={(e) => setNovoServico({...novoServico, unidade_medida: e.target.value})}
                                    >
                                        <option value="m²">m²</option>
                                        <option value="m³">m³</option>
                                        <option value="m">m</option>
                                        <option value="un">un</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleAddServico}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Etapa Pai */}
            {showAddEtapaPaiModal && (
                <div className="modal-overlay" onClick={() => setShowAddEtapaPaiModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Nova Etapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input
                                type="text"
                                value={novaEtapaPai.nome}
                                onChange={(e) => setNovaEtapaPai({...novaEtapaPai, nome: e.target.value})}
                                placeholder="Ex: Infraestrutura, Revestimento, Acabamento"
                            />
                        </div>
                        
                        {/* Condições de início - só se já existem etapas */}
                        {(() => {
                            const servico = cronograma.find(s => s.id === showAddEtapaPaiModal);
                            const etapasExistentes = servico?.etapas || [];
                            
                            if (etapasExistentes.length > 0) {
                                return (
                                    <>
                                        <div className="form-group">
                                            <label>Condição de Início</label>
                                            <select
                                                value={novaEtapaPai.tipo_condicao}
                                                onChange={(e) => setNovaEtapaPai({...novaEtapaPai, tipo_condicao: e.target.value})}
                                            >
                                                <option value="apos_termino">Após término da etapa anterior (D+1)</option>
                                                <option value="dias_apos">X dias após término da etapa anterior</option>
                                                <option value="dias_antes">X dias antes do término da etapa anterior</option>
                                                <option value="manual">Data específica (manual)</option>
                                            </select>
                                        </div>
                                        
                                        {(novaEtapaPai.tipo_condicao === 'dias_apos' || novaEtapaPai.tipo_condicao === 'dias_antes') && (
                                            <div className="form-group">
                                                <label>
                                                    {novaEtapaPai.tipo_condicao === 'dias_apos' 
                                                        ? 'Quantos dias após o término?' 
                                                        : 'Quantos dias antes do término?'}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={novaEtapaPai.dias_offset}
                                                    onChange={(e) => setNovaEtapaPai({...novaEtapaPai, dias_offset: e.target.value})}
                                                />
                                                <small className="form-hint">
                                                    {novaEtapaPai.tipo_condicao === 'dias_antes' 
                                                        ? 'Permite iniciar antes da etapa anterior terminar (sobreposição)'
                                                        : 'Adiciona folga entre as etapas'}
                                                </small>
                                            </div>
                                        )}
                                    </>
                                );
                            }
                            return null;
                        })()}
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novaEtapaPai.observacoes}
                                onChange={(e) => setNovaEtapaPai({...novaEtapaPai, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddEtapaPaiModal(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleAddEtapaPai}>
                                Criar Etapa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Subetapa */}
            {showAddSubetapaModal && (
                <div className="modal-overlay" onClick={() => setShowAddSubetapaModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Nova Subetapa - {showAddSubetapaModal.etapa_nome}</h3>
                        
                        <div className="form-group">
                            <label>Nome da Subetapa *</label>
                            <input
                                type="text"
                                value={novaSubetapa.nome}
                                onChange={(e) => setNovaSubetapa({...novaSubetapa, nome: e.target.value})}
                                placeholder="Ex: Escavação, Tubulação, Concretagem"
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={novaSubetapa.duracao_dias}
                                    onChange={(e) => setNovaSubetapa({...novaSubetapa, duracao_dias: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Início (opcional)</label>
                                <input
                                    type="date"
                                    value={novaSubetapa.data_inicio}
                                    onChange={(e) => setNovaSubetapa({...novaSubetapa, data_inicio: e.target.value})}
                                />
                                <small className="form-hint">Deixe em branco para calcular automaticamente</small>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Percentual Concluído</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={novaSubetapa.percentual_conclusao}
                                onChange={(e) => setNovaSubetapa({...novaSubetapa, percentual_conclusao: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novaSubetapa.observacoes}
                                onChange={(e) => setNovaSubetapa({...novaSubetapa, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddSubetapaModal(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleAddSubetapa}>
                                Criar Subetapa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Etapa Pai */}
            {editingEtapaPai && (
                <div className="modal-overlay" onClick={() => setEditingEtapaPai(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Etapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input
                                type="text"
                                value={editingEtapaPai.nome}
                                onChange={(e) => setEditingEtapaPai({...editingEtapaPai, nome: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Condição de Início</label>
                            <select
                                value={editingEtapaPai.tipo_condicao || 'apos_termino'}
                                onChange={(e) => setEditingEtapaPai({...editingEtapaPai, tipo_condicao: e.target.value})}
                            >
                                <option value="apos_termino">Após término da etapa anterior (D+1)</option>
                                <option value="dias_apos">X dias após término</option>
                                <option value="dias_antes">X dias antes do término</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                        
                        {(editingEtapaPai.tipo_condicao === 'dias_apos' || editingEtapaPai.tipo_condicao === 'dias_antes') && (
                            <div className="form-group">
                                <label>Dias de offset</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editingEtapaPai.dias_offset || 0}
                                    onChange={(e) => setEditingEtapaPai({...editingEtapaPai, dias_offset: e.target.value})}
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={editingEtapaPai.observacoes || ''}
                                onChange={(e) => setEditingEtapaPai({...editingEtapaPai, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingEtapaPai(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleUpdateEtapaPai}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Subetapa */}
            {editingSubetapa && (
                <div className="modal-overlay" onClick={() => setEditingSubetapa(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Subetapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Subetapa *</label>
                            <input
                                type="text"
                                value={editingSubetapa.nome}
                                onChange={(e) => setEditingSubetapa({...editingSubetapa, nome: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editingSubetapa.duracao_dias}
                                    onChange={(e) => setEditingSubetapa({...editingSubetapa, duracao_dias: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Percentual Concluído</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editingSubetapa.percentual_conclusao}
                                    onChange={(e) => setEditingSubetapa({...editingSubetapa, percentual_conclusao: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={editingSubetapa.observacoes || ''}
                                onChange={(e) => setEditingSubetapa({...editingSubetapa, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingSubetapa(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleUpdateSubetapa}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar Serviço */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📋 Importar Serviço</h3>
                        <p>Selecione um serviço da planilha de custos:</p>
                        
                        {servicosDisponiveis.length === 0 ? (
                            <div className="empty-message">
                                Todos os serviços já foram importados.
                            </div>
                        ) : (
                            <div className="import-list">
                                {servicosDisponiveis.map(servico => (
                                    <div 
                                        key={servico.id} 
                                        className="import-item"
                                        onClick={() => handleImportServico(servico)}
                                    >
                                        <span className="import-nome">{servico.nome}</span>
                                        <span className="import-valor">
                                            {formatCurrency((servico.valor_global_mao_de_obra || 0) + (servico.valor_global_material || 0))}
                                        </span>
                                    </div>
                                ))}
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

            {/* Modal Editar Serviço */}
            {editingServico && (
                <div className="modal-overlay" onClick={() => setEditingServico(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Serviço</h3>
                        
                        <div className="form-group">
                            <label>Nome do Serviço</label>
                            <input
                                type="text"
                                value={editingServico.servico_nome}
                                onChange={(e) => setEditingServico({...editingServico, servico_nome: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Início</label>
                                <input
                                    type="date"
                                    value={editingServico.data_inicio || ''}
                                    onChange={(e) => setEditingServico({...editingServico, data_inicio: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Término</label>
                                <input
                                    type="date"
                                    value={editingServico.data_fim_prevista || ''}
                                    onChange={(e) => setEditingServico({...editingServico, data_fim_prevista: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Início Real</label>
                                <input
                                    type="date"
                                    value={editingServico.data_inicio_real || ''}
                                    onChange={(e) => setEditingServico({...editingServico, data_inicio_real: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Término Real</label>
                                <input
                                    type="date"
                                    value={editingServico.data_fim_real || ''}
                                    onChange={(e) => setEditingServico({...editingServico, data_fim_real: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Execução Física (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={editingServico.percentual_conclusao || 0}
                                    onChange={(e) => setEditingServico({...editingServico, percentual_conclusao: parseFloat(e.target.value)})}
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={editingServico.percentual_conclusao || 0}
                                    onChange={(e) => setEditingServico({...editingServico, percentual_conclusao: parseFloat(e.target.value) || 0})}
                                    style={{ width: '70px', textAlign: 'center' }}
                                />
                                <span>%</span>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={editingServico.observacoes || ''}
                                onChange={(e) => setEditingServico({...editingServico, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingServico(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={async () => {
                                try {
                                    const response = await fetchWithAuth(
                                        `${API_URL}/cronograma/${editingServico.id}`,
                                        {
                                            method: 'PUT',
                                            body: JSON.stringify(editingServico)
                                        }
                                    );
                                    if (!response.ok) throw new Error('Erro ao atualizar');
                                    fetchCronograma();
                                    setEditingServico(null);
                                } catch (err) {
                                    alert(err.message);
                                }
                            }}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="cronograma-obra-fullscreen">
            <div className="fullscreen-header">
                <button className="btn-back" onClick={onClose}>
                    ← Voltar
                </button>
            </div>
            {content}
        </div>
    );
};

export default CronogramaObra;
