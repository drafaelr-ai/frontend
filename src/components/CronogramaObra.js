import React, { useState, useEffect } from 'react';
import './CronogramaObra.css';

const API_URL = 'http://localhost:5000'; // Para testes locais

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
const CardCronograma = ({ item, onEdit, onDelete }) => {
    const diasTotais = calcularDias(item.data_inicio, item.data_fim_prevista);
    const diasRestantes = calcularDiasRestantes(item.data_fim_prevista);
    const status = determinarStatus(item);
    
    // Calcular dias reais se tiver data_inicio_real
    const diasReais = item.data_inicio_real && item.data_fim_real 
        ? calcularDias(item.data_inicio_real, item.data_fim_real)
        : null;
    
    return (
        <div className={`card-cronograma ${status}`}>
            {/* Cabeçalho */}
            <div className="cronograma-header">
                <div className="cronograma-title">
                    <h4>🏗️ {item.servico_nome}</h4>
                    {item.ordem && <span className="ordem-badge">#{item.ordem}</span>}
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
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
        </div>
    );
};

// Modal de Adicionar/Editar
const CronogramaModal = ({ item, onClose, onSave, obraId }) => {
    const [formData, setFormData] = useState({
        servico_nome: '',
        ordem: 1,
        // PLANEJAMENTO
        data_inicio: '',
        data_fim_prevista: '',
        // EXECUÇÃO REAL
        data_inicio_real: '',
        data_fim_real: '',
        percentual_conclusao: 0,
        observacoes: ''
    });

    useEffect(() => {
        if (item) {
            setFormData({
                ...item,
                data_inicio: item.data_inicio || '',
                data_fim_prevista: item.data_fim_prevista || '',
                data_inicio_real: item.data_inicio_real || '',
                data_fim_real: item.data_fim_real || '',
            });
        }
    }, [item]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'percentual_conclusao' || name === 'ordem' 
                ? parseFloat(value) || 0 
                : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const dataToSend = {
            ...formData,
            obra_id: obraId,
            percentual_conclusao: Math.min(100, Math.max(0, formData.percentual_conclusao)),
            // Enviar string vazia como null
            data_inicio_real: formData.data_inicio_real || null,
            data_fim_real: formData.data_fim_real || null
        };

        onSave(dataToSend);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="close-modal-btn">&times;</button>
                <h2>{item ? 'Editar Etapa' : 'Nova Etapa do Cronograma'}</h2>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome do Serviço/Etapa *</label>
                        <input 
                            type="text" 
                            name="servico_nome" 
                            value={formData.servico_nome} 
                            onChange={handleChange} 
                            placeholder="Ex: Fundação, Estrutura, Alvenaria..."
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Ordem de Execução *</label>
                        <input 
                            type="number" 
                            name="ordem" 
                            value={formData.ordem} 
                            onChange={handleChange} 
                            min="1"
                            required 
                        />
                    </div>

                    {/* SEÇÃO: PLANEJAMENTO */}
                    <div style={{
                        background: '#f0f9ff', 
                        padding: '15px', 
                        borderRadius: '8px',
                        border: '2px solid #3b82f6',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.95em'}}>
                            📋 PLANEJAMENTO (Datas Previstas)
                        </h4>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data de Início Prevista *</label>
                                <input 
                                    type="date" 
                                    name="data_inicio" 
                                    value={formData.data_inicio} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label>Data de Término Prevista *</label>
                                <input 
                                    type="date" 
                                    name="data_fim_prevista" 
                                    value={formData.data_fim_prevista} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO: EXECUÇÃO REAL */}
                    <div style={{
                        background: '#f0fdf4', 
                        padding: '15px', 
                        borderRadius: '8px',
                        border: '2px solid #10b981',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{margin: '0 0 12px 0', color: '#047857', fontSize: '0.95em'}}>
                            🎯 EXECUÇÃO REAL (Atualizar Manualmente)
                        </h4>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data de Início Real (quando começou)</label>
                                <input 
                                    type="date" 
                                    name="data_inicio_real" 
                                    value={formData.data_inicio_real} 
                                    onChange={handleChange} 
                                />
                                <small style={{color: '#6b7280', fontSize: '0.8em'}}>
                                    Deixe vazio se ainda não iniciou
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Data de Término Real (quando terminou)</label>
                                <input 
                                    type="date" 
                                    name="data_fim_real" 
                                    value={formData.data_fim_real} 
                                    onChange={handleChange} 
                                />
                                <small style={{color: '#6b7280', fontSize: '0.8em'}}>
                                    Deixe vazio se ainda não terminou
                                </small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                Percentual de Conclusão (%) 
                                <span style={{color: '#047857', fontWeight: 'bold'}}> - Avanço Físico Real</span>
                            </label>
                            <div className="slider-container">
                                <input 
                                    type="range" 
                                    name="percentual_conclusao" 
                                    value={formData.percentual_conclusao} 
                                    onChange={handleChange} 
                                    min="0"
                                    max="100"
                                    step="5"
                                    className="slider"
                                />
                                <span className="slider-value">{formData.percentual_conclusao}%</span>
                            </div>
                            <small style={{color: '#6b7280', fontSize: '0.8em'}}>
                                ⚠️ Este é o avanço físico REAL da obra, não é calculado pelos dias!
                            </small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Observações</label>
                        <textarea 
                            name="observacoes" 
                            value={formData.observacoes} 
                            onChange={handleChange} 
                            placeholder="Detalhes adicionais, equipe responsável, etc..."
                            rows="3"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">
                            Cancelar
                        </button>
                        <button type="submit" className="submit-btn">
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
    const [loading, setLoading] = useState(true);
    const [selectedServicos, setSelectedServicos] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [diasPorServico, setDiasPorServico] = useState(7);

    useEffect(() => {
        fetchServicos();
    }, [obraId]);

    const fetchServicos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/servicos`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setServicos(data);
            }
        } catch (error) {
            console.error('Erro ao buscar serviços:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleServico = (servicoId) => {
        setSelectedServicos(prev => 
            prev.includes(servicoId)
                ? prev.filter(id => id !== servicoId)
                : [...prev, servicoId]
        );
    };

    const handleImport = () => {
        if (selectedServicos.length === 0) {
            alert('Selecione pelo menos um serviço');
            return;
        }
        if (!dataInicio) {
            alert('Informe a data de início');
            return;
        }

        const servicosSelecionados = servicos.filter(s => selectedServicos.includes(s.id));
        onImport(servicosSelecionados, dataInicio, diasPorServico);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="close-modal-btn">&times;</button>
                <h2>📥 Importar Serviços para o Cronograma</h2>
                
                {loading ? (
                    <div style={{textAlign: 'center', padding: '20px'}}>Carregando serviços...</div>
                ) : servicos.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>
                        <p>Nenhum serviço cadastrado nesta obra.</p>
                        <small>Cadastre serviços primeiro para poder importá-los.</small>
                    </div>
                ) : (
                    <>
                        <div style={{marginBottom: '20px'}}>
                            <div className="form-group">
                                <label>Data de Início do Cronograma *</label>
                                <input 
                                    type="date" 
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    required
                                />
                                <small style={{color: '#6b7280', fontSize: '0.85em'}}>
                                    Os serviços serão agendados em sequência a partir desta data
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Dias por Serviço (padrão)</label>
                                <input 
                                    type="number" 
                                    value={diasPorServico}
                                    onChange={(e) => setDiasPorServico(parseInt(e.target.value) || 7)}
                                    min="1"
                                    max="365"
                                />
                                <small style={{color: '#6b7280', fontSize: '0.85em'}}>
                                    Cada serviço terá esse prazo. Você pode ajustar depois.
                                </small>
                            </div>
                        </div>

                        <div style={{
                            maxHeight: '300px', 
                            overflowY: 'auto', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '10px'
                        }}>
                            <h4 style={{margin: '0 0 10px 0', fontSize: '0.9em', color: '#6b7280'}}>
                                Selecione os serviços ({selectedServicos.length} selecionados)
                            </h4>
                            {servicos.map((servico, index) => (
                                <div 
                                    key={servico.id}
                                    style={{
                                        padding: '10px',
                                        marginBottom: '8px',
                                        background: selectedServicos.includes(servico.id) ? '#f0f9ff' : '#f9fafb',
                                        border: selectedServicos.includes(servico.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => handleToggleServico(servico.id)}
                                >
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <input 
                                            type="checkbox"
                                            checked={selectedServicos.includes(servico.id)}
                                            onChange={() => {}}
                                            style={{cursor: 'pointer'}}
                                        />
                                        <div style={{flex: 1}}>
                                            <strong>{servico.nome}</strong>
                                            {servico.responsavel && (
                                                <div style={{fontSize: '0.85em', color: '#6b7280'}}>
                                                    Responsável: {servico.responsavel}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            background: '#10b981',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75em',
                                            fontWeight: 'bold'
                                        }}>
                                            #{index + 1}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="form-actions" style={{marginTop: '20px'}}>
                            <button type="button" onClick={onClose} className="cancel-btn">
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={handleImport}
                                className="submit-btn"
                                disabled={selectedServicos.length === 0 || !dataInicio}
                            >
                                Importar {selectedServicos.length} Serviço(s)
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
    const [editingItem, setEditingItem] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [showImportModal, setShowImportModal] = useState(false);

    // Fetch inicial
    useEffect(() => {
        fetchCronograma();
    }, [obraId]);

    const fetchCronograma = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/obras/${obraId}/cronograma`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setCronograma(data);
            }
        } catch (error) {
            console.error('Erro ao buscar cronograma:', error);
        } finally {
            setLoading(false);
        }
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
                        onClick={() => setShowImportModal(true)}
                        style={{background: '#10b981', marginRight: '8px'}}
                    >
                        📥 Importar Serviços
                    </button>
                    <button className="acao-btn add-btn" onClick={handleAdd}>
                        ➕ Nova Etapa
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
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <CronogramaModal 
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
