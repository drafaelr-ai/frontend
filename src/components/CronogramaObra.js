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
    
    // Estados para modal de edição
    const [showEditModal, setShowEditModal] = useState(false);
    const [servicoEditando, setServicoEditando] = useState(null);
    
    // Estados para modal de importar serviço
    const [showImportModal, setShowImportModal] = useState(false);
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    
    // Estados para ETAPA
    const [showAddEtapaModal, setShowAddEtapaModal] = useState(false);
    const [servicoParaEtapa, setServicoParaEtapa] = useState(null);
    const [novaEtapa, setNovaEtapa] = useState({
        nome: '',
        etapa_anterior_id: null,
        tipo_condicao: 'apos_termino',
        dias_offset: 0,
        data_inicio: '',
        observacoes: ''
    });
    
    // Estados para SUBETAPA
    const [showAddSubetapaModal, setShowAddSubetapaModal] = useState(false);
    const [etapaParaSubetapa, setEtapaParaSubetapa] = useState(null);
    const [novaSubetapa, setNovaSubetapa] = useState({
        nome: '',
        duracao_dias: 1,
        data_inicio: '',
        percentual_conclusao: 0,
        observacoes: ''
    });
    
    // Estados para edição de etapa
    const [showEditEtapaModal, setShowEditEtapaModal] = useState(false);
    const [etapaEditando, setEtapaEditando] = useState(null);
    
    // Estados para edição de subetapa
    const [showEditSubetapaModal, setShowEditSubetapaModal] = useState(false);
    const [subetapaEditando, setSubetapaEditando] = useState(null);
    
    // EVM data
    const [evmData, setEvmData] = useState({});

    // Função de fetch com autenticação
    const fetchWithAuth = useCallback((url, options = {}) => {
        const token = localStorage.getItem('token');
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
    }, []);

    // Buscar cronograma
    const fetchCronograma = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma`);
            if (!response.ok) throw new Error('Erro ao carregar cronograma');
            const data = await response.json();
            setCronograma(data);
            
            // Buscar EVM para cada serviço
            const evmPromises = data.map(async (item) => {
                try {
                    const evmResponse = await fetchWithAuth(
                        `${API_URL}/obras/${obraId}/servico-financeiro?servico_nome=${encodeURIComponent(item.servico_nome)}`
                    );
                    if (evmResponse.ok) {
                        const evmData = await evmResponse.json();
                        return { nome: item.servico_nome, data: evmData };
                    }
                } catch (e) {
                    console.log('EVM não disponível para:', item.servico_nome);
                }
                return null;
            });
            
            const evmResults = await Promise.all(evmPromises);
            const evmMap = {};
            evmResults.forEach(result => {
                if (result) {
                    evmMap[result.nome] = result.data;
                }
            });
            setEvmData(evmMap);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [obraId, fetchWithAuth]);

    useEffect(() => {
        fetchCronograma();
    }, [fetchCronograma]);

    // Buscar serviços disponíveis para importar
    const fetchServicosDisponiveis = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`);
            if (response.ok) {
                const data = await response.json();
                const servicosNoCronograma = cronograma.map(c => c.servico_nome);
                const disponiveis = data.filter(s => !servicosNoCronograma.includes(s.nome));
                setServicosDisponiveis(disponiveis);
            }
        } catch (err) {
            console.error('Erro ao buscar serviços:', err);
        }
    };

    // Abrir modal de adicionar etapa
    const handleAddEtapa = (servico) => {
        setServicoParaEtapa(servico);
        const ultimaEtapa = servico.etapas && servico.etapas.length > 0 
            ? servico.etapas[servico.etapas.length - 1] 
            : null;
        setNovaEtapa({
            nome: '',
            etapa_anterior_id: ultimaEtapa ? ultimaEtapa.id : null,
            tipo_condicao: 'apos_termino',
            dias_offset: 0,
            data_inicio: '',
            observacoes: ''
        });
        setShowAddEtapaModal(true);
    };

    // Abrir modal de adicionar subetapa
    const handleAddSubetapa = (etapa) => {
        setEtapaParaSubetapa(etapa);
        setNovaSubetapa({
            nome: '',
            duracao_dias: 1,
            data_inicio: '',
            percentual_conclusao: 0,
            observacoes: ''
        });
        setShowAddSubetapaModal(true);
    };

    // Criar nova etapa
    const handleSaveEtapa = async () => {
        if (!novaEtapa.nome.trim()) {
            alert('Informe o nome da etapa');
            return;
        }
        
        try {
            const payload = {
                nome: novaEtapa.nome,
                etapa_anterior_id: novaEtapa.etapa_anterior_id,
                tipo_condicao: novaEtapa.tipo_condicao,
                dias_offset: parseInt(novaEtapa.dias_offset) || 0,
                observacoes: novaEtapa.observacoes
            };
            
            if (novaEtapa.tipo_condicao === 'manual' && novaEtapa.data_inicio) {
                payload.data_inicio = novaEtapa.data_inicio;
            }
            
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${servicoParaEtapa.id}/etapas/nova`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );
            
            if (!response.ok) throw new Error('Erro ao criar etapa');
            
            fetchCronograma();
            setShowAddEtapaModal(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Criar nova subetapa
    const handleSaveSubetapa = async () => {
        if (!novaSubetapa.nome.trim()) {
            alert('Informe o nome da subetapa');
            return;
        }
        
        try {
            const payload = {
                nome: novaSubetapa.nome,
                duracao_dias: parseInt(novaSubetapa.duracao_dias) || 1,
                percentual_conclusao: parseFloat(novaSubetapa.percentual_conclusao) || 0,
                observacoes: novaSubetapa.observacoes
            };
            
            if (novaSubetapa.data_inicio) {
                payload.data_inicio = novaSubetapa.data_inicio;
            }
            
            const response = await fetchWithAuth(
                `${API_URL}/etapa/${etapaParaSubetapa.id}/subetapas`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );
            
            if (!response.ok) throw new Error('Erro ao criar subetapa');
            
            fetchCronograma();
            setShowAddSubetapaModal(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Editar etapa
    const handleEditEtapa = (etapa) => {
        setEtapaEditando({
            ...etapa,
            servico_id: etapa.cronograma_id
        });
        setShowEditEtapaModal(true);
    };

    // Salvar edição de etapa
    const handleSaveEditEtapa = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${etapaEditando.cronograma_id}/etapas/${etapaEditando.id}/atualizar`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        nome: etapaEditando.nome,
                        etapa_anterior_id: etapaEditando.etapa_anterior_id,
                        tipo_condicao: etapaEditando.tipo_condicao,
                        dias_offset: parseInt(etapaEditando.dias_offset) || 0,
                        observacoes: etapaEditando.observacoes
                    })
                }
            );
            
            if (!response.ok) throw new Error('Erro ao atualizar etapa');
            
            fetchCronograma();
            setShowEditEtapaModal(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir etapa
    const handleDeleteEtapa = async (etapa) => {
        if (!window.confirm(`Excluir etapa "${etapa.nome}" e todas suas subetapas?`)) return;
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${etapa.cronograma_id}/etapas/${etapa.id}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) throw new Error('Erro ao excluir etapa');
            
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Editar subetapa
    const handleEditSubetapa = (subetapa, etapa) => {
        setSubetapaEditando({
            ...subetapa,
            etapa_id: etapa.id
        });
        setShowEditSubetapaModal(true);
    };

    // Salvar edição de subetapa
    const handleSaveEditSubetapa = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/etapa/${subetapaEditando.etapa_id}/subetapas/${subetapaEditando.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        nome: subetapaEditando.nome,
                        duracao_dias: parseInt(subetapaEditando.duracao_dias) || 1,
                        percentual_conclusao: parseFloat(subetapaEditando.percentual_conclusao) || 0,
                        observacoes: subetapaEditando.observacoes
                    })
                }
            );
            
            if (!response.ok) throw new Error('Erro ao atualizar subetapa');
            
            fetchCronograma();
            setShowEditSubetapaModal(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // Excluir subetapa
    const handleDeleteSubetapa = async (subetapa, etapa) => {
        if (!window.confirm(`Excluir subetapa "${subetapa.nome}"?`)) return;
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/etapa/${etapa.id}/subetapas/${subetapa.id}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) throw new Error('Erro ao excluir subetapa');
            
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Criar novo serviço
    const handleAddServico = async () => {
        if (!novoServico.servico_nome.trim()) {
            alert('Informe o nome do serviço');
            return;
        }
        
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
            
            if (novoServico.tipo_medicao === 'area') {
                payload.area_total = parseFloat(novoServico.area_total) || 0;
                payload.unidade_medida = novoServico.unidade_medida;
            }
            
            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify(payload)
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

    // Importar serviço
    const handleImportServico = async (servico) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma`, {
                method: 'POST',
                body: JSON.stringify({
                    obra_id: obraId,
                    servico_nome: servico.nome,
                    tipo_medicao: 'etapas',
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

    // Excluir serviço
    const handleDeleteServico = async (servico) => {
        if (!window.confirm(`Excluir serviço "${servico.servico_nome}" e todas suas etapas?`)) return;
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/cronograma/${servico.id}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) throw new Error('Erro ao excluir serviço');
            
            fetchCronograma();
        } catch (err) {
            alert(err.message);
        }
    };

    // Atualizar data_fim quando mudar data_inicio ou duracao
    useEffect(() => {
        if (novoServico.data_inicio && novoServico.duracao_dias) {
            const novaDataFim = addDays(novoServico.data_inicio, novoServico.duracao_dias - 1);
            setNovoServico(prev => ({ ...prev, data_fim_prevista: novaDataFim }));
        }
    }, [novoServico.data_inicio, novoServico.duracao_dias]);

    // Gerar relatório PDF
    const handleGerarRelatorioPDF = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-obra/relatorio-pdf`);
            
            if (!response.ok) {
                throw new Error('Erro ao gerar relatório');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cronograma_obras_${obraNome}_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Erro ao gerar relatório: ' + err.message);
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
                        className="btn-pdf"
                        onClick={handleGerarRelatorioPDF}
                        title="Gerar Relatório PDF"
                    >
                        📄 Gerar PDF
                    </button>
                    <button 
                        className="btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
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
                                        <span className="tipo-medicao">
                                            {servico.tipo_medicao === 'etapas' ? '📋 Por Etapas' :
                                             servico.tipo_medicao === 'area' ? '📐 Por Área' : '🔧 Empreitada'}
                                        </span>
                                    </div>
                                </div>

                                {/* Progresso */}
                                <div className="progress-section">
                                    <div className="progress-header">
                                        <span>Execução Física</span>
                                        <span>{servico.percentual_conclusao?.toFixed(1)}%</span>
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
                                <div className="datas-grid">
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

                                {/* ETAPAS E SUBETAPAS */}
                                {servico.tipo_medicao === 'etapas' && servico.etapas && servico.etapas.length > 0 && (
                                    <div className="etapas-section">
                                        <div className="etapas-header">
                                            <h4>📋 Etapas ({servico.etapas.length}) - {servico.etapas.reduce((acc, e) => acc + (e.total_dias || 0), 0)} dias</h4>
                                        </div>
                                        
                                        {servico.etapas.map((etapa, etapaIdx) => (
                                            <div key={etapa.id} className="etapa-container">
                                                {/* Header da Etapa */}
                                                <div className="etapa-header">
                                                    <div className="etapa-title">
                                                        <span className="etapa-numero">Etapa {etapaIdx + 1}</span>
                                                        <span className="etapa-nome">{etapa.nome}</span>
                                                        <span className="etapa-dias-total">{etapa.total_dias || 0} dias</span>
                                                        {etapa.tipo_condicao && etapa.tipo_condicao !== 'manual' && etapaIdx > 0 && (
                                                            <span className="etapa-condicao" title={`Condição: ${etapa.tipo_condicao}`}>
                                                                🔗
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="etapa-actions">
                                                        <span className="etapa-percent">{etapa.percentual_conclusao?.toFixed(0)}%</span>
                                                        <button 
                                                            className="btn-icon"
                                                            onClick={() => handleEditEtapa(etapa)}
                                                            title="Editar etapa"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            className="btn-icon delete"
                                                            onClick={() => handleDeleteEtapa(etapa)}
                                                            title="Excluir etapa"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Subetapas */}
                                                {etapa.subetapas && etapa.subetapas.length > 0 && (
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
                                                                    <div className="mini-progress-bar">
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
                                                                        onClick={() => handleEditSubetapa(sub, etapa)}
                                                                        title="Editar"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button 
                                                                        className="btn-icon small delete"
                                                                        onClick={() => handleDeleteSubetapa(sub, etapa)}
                                                                        title="Excluir"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Botão adicionar subetapa */}
                                                <button 
                                                    className="btn-add-subetapa"
                                                    onClick={() => handleAddSubetapa(etapa)}
                                                >
                                                    ➕ Adicionar Subetapa
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* EVM */}
                                {evm && evm.valor_total > 0 && (
                                    <div className="evm-section">
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
                                                            className="evm-bar-fill pago"
                                                            style={{ width: `${evm.percentual_pago}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{evm.percentual_pago?.toFixed(0)}%</span>
                                                </div>
                                                <div className="evm-bar-row">
                                                    <span>📊 Exec</span>
                                                    <div className="evm-bar">
                                                        <div 
                                                            className="evm-bar-fill exec"
                                                            style={{ width: `${evm.percentual_executado}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{evm.percentual_executado?.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ações */}
                                <div className="card-actions">
                                    {servico.tipo_medicao === 'etapas' && (
                                        <button 
                                            className="btn-add-etapa"
                                            onClick={() => handleAddEtapa(servico)}
                                        >
                                            ➕ Adicionar Etapa
                                        </button>
                                    )}
                                    <button 
                                        className="btn-edit"
                                        onClick={() => {
                                            setServicoEditando(servico);
                                            setShowEditModal(true);
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button 
                                        className="btn-delete"
                                        onClick={() => handleDeleteServico(servico)}
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
                <div className="modal-overlay">
                    <div className="modal-content">
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
                                <option value="empreitada">🔧 Empreitada (global)</option>
                                <option value="area">📐 Por Área (m², m³, etc)</option>
                                <option value="etapas">📋 Por Etapas (subdivisões)</option>
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
                                        placeholder="Ex: 150"
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
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novoServico.observacoes}
                                onChange={(e) => setNovoServico({...novoServico, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
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

            {/* Modal Adicionar Etapa */}
            {showAddEtapaModal && servicoParaEtapa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>➕ Nova Etapa - {servicoParaEtapa.servico_nome}</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input
                                type="text"
                                value={novaEtapa.nome}
                                onChange={(e) => setNovaEtapa({...novaEtapa, nome: e.target.value})}
                                placeholder="Ex: Primeira Fase, Revestimento, etc"
                            />
                        </div>
                        
                        {servicoParaEtapa.etapas && servicoParaEtapa.etapas.length > 0 && (
                            <>
                                <div className="form-group">
                                    <label>Condição de Início</label>
                                    <select
                                        value={novaEtapa.tipo_condicao}
                                        onChange={(e) => setNovaEtapa({...novaEtapa, tipo_condicao: e.target.value})}
                                    >
                                        <option value="apos_termino">Após término da etapa anterior (D+1)</option>
                                        <option value="dias_apos">X dias após término da etapa anterior</option>
                                        <option value="dias_antes">X dias antes do término da etapa anterior</option>
                                        <option value="manual">Data específica (manual)</option>
                                    </select>
                                </div>
                                
                                {novaEtapa.tipo_condicao === 'dias_apos' && (
                                    <div className="form-group">
                                        <label>Quantos dias após o término?</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={novaEtapa.dias_offset}
                                            onChange={(e) => setNovaEtapa({...novaEtapa, dias_offset: e.target.value})}
                                            placeholder="Ex: 3"
                                        />
                                        <small>A etapa iniciará {novaEtapa.dias_offset || 0} dias após o término da anterior</small>
                                    </div>
                                )}
                                
                                {novaEtapa.tipo_condicao === 'dias_antes' && (
                                    <div className="form-group">
                                        <label>Quantos dias antes do término?</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={novaEtapa.dias_offset}
                                            onChange={(e) => setNovaEtapa({...novaEtapa, dias_offset: e.target.value})}
                                            placeholder="Ex: 5"
                                        />
                                        <small>A etapa iniciará {novaEtapa.dias_offset || 0} dias antes do término da anterior (permite sobreposição)</small>
                                    </div>
                                )}
                                
                                {novaEtapa.tipo_condicao === 'manual' && (
                                    <div className="form-group">
                                        <label>Data de Início</label>
                                        <input
                                            type="date"
                                            value={novaEtapa.data_inicio}
                                            onChange={(e) => setNovaEtapa({...novaEtapa, data_inicio: e.target.value})}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={novaEtapa.observacoes}
                                onChange={(e) => setNovaEtapa({...novaEtapa, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddEtapaModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSaveEtapa}>
                                Salvar Etapa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Subetapa */}
            {showAddSubetapaModal && etapaParaSubetapa && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>➕ Nova Subetapa - {etapaParaSubetapa.nome}</h3>
                        
                        <div className="form-group">
                            <label>Nome da Subetapa *</label>
                            <input
                                type="text"
                                value={novaSubetapa.nome}
                                onChange={(e) => setNovaSubetapa({...novaSubetapa, nome: e.target.value})}
                                placeholder="Ex: Escavação, Tubulação, Armadura"
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
                                <small>Deixe em branco para calcular automaticamente</small>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Percentual de Conclusão</label>
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
                            <button className="btn-cancel" onClick={() => setShowAddSubetapaModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSaveSubetapa}>
                                Salvar Subetapa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Etapa */}
            {showEditEtapaModal && etapaEditando && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>✏️ Editar Etapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input
                                type="text"
                                value={etapaEditando.nome}
                                onChange={(e) => setEtapaEditando({...etapaEditando, nome: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Condição de Início</label>
                            <select
                                value={etapaEditando.tipo_condicao || 'apos_termino'}
                                onChange={(e) => setEtapaEditando({...etapaEditando, tipo_condicao: e.target.value})}
                            >
                                <option value="apos_termino">Após término da etapa anterior (D+1)</option>
                                <option value="dias_apos">X dias após término da etapa anterior</option>
                                <option value="dias_antes">X dias antes do término da etapa anterior</option>
                                <option value="manual">Data específica (manual)</option>
                            </select>
                        </div>
                        
                        {(etapaEditando.tipo_condicao === 'dias_apos' || etapaEditando.tipo_condicao === 'dias_antes') && (
                            <div className="form-group">
                                <label>Dias de offset</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={etapaEditando.dias_offset || 0}
                                    onChange={(e) => setEtapaEditando({...etapaEditando, dias_offset: e.target.value})}
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={etapaEditando.observacoes || ''}
                                onChange={(e) => setEtapaEditando({...etapaEditando, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowEditEtapaModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSaveEditEtapa}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Subetapa */}
            {showEditSubetapaModal && subetapaEditando && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>✏️ Editar Subetapa</h3>
                        
                        <div className="form-group">
                            <label>Nome da Subetapa *</label>
                            <input
                                type="text"
                                value={subetapaEditando.nome}
                                onChange={(e) => setSubetapaEditando({...subetapaEditando, nome: e.target.value})}
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={subetapaEditando.duracao_dias}
                                    onChange={(e) => setSubetapaEditando({...subetapaEditando, duracao_dias: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Percentual de Conclusão</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={subetapaEditando.percentual_conclusao}
                                    onChange={(e) => setSubetapaEditando({...subetapaEditando, percentual_conclusao: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Observações</label>
                            <textarea
                                value={subetapaEditando.observacoes || ''}
                                onChange={(e) => setSubetapaEditando({...subetapaEditando, observacoes: e.target.value})}
                                rows="2"
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowEditSubetapaModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSaveEditSubetapa}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar Serviço */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>📋 Importar Serviço</h3>
                        <p>Selecione um serviço da planilha de custos:</p>
                        
                        {servicosDisponiveis.length === 0 ? (
                            <p className="empty-message">Todos os serviços já foram importados.</p>
                        ) : (
                            <div className="servicos-import-list">
                                {servicosDisponiveis.map(servico => (
                                    <div 
                                        key={servico.id} 
                                        className="servico-import-item"
                                        onClick={() => handleImportServico(servico)}
                                    >
                                        <span>{servico.nome}</span>
                                        <span className="valor">
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
