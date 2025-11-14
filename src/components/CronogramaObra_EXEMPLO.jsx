import React, { useState, useEffect } from 'react';
import EditStageModal from './EditStageModal';
import './CronogramaObra.css';

const API_URL = 'https://backend-production-78c9.up.railway.app';

const CronogramaObra = ({ obraId }) => {
    const [etapas, setEtapas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingStage, setEditingStage] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNewStageModalOpen, setIsNewStageModalOpen] = useState(false);
    const [resumo, setResumo] = useState(null);

    // Helper para requisições autenticadas
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(url, { ...options, headers });
    };

    // Carrega as etapas
    const loadEtapas = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-obra/${obraId}/etapas`
            );
            const data = await response.json();
            
            if (data.success) {
                setEtapas(data.etapas);
            }
        } catch (error) {
            console.error('Erro ao carregar etapas:', error);
            alert('Erro ao carregar o cronograma');
        } finally {
            setLoading(false);
        }
    };

    // Carrega o resumo
    const loadResumo = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-obra/${obraId}/resumo`
            );
            const data = await response.json();
            
            if (data.success) {
                setResumo(data.resumo);
            }
        } catch (error) {
            console.error('Erro ao carregar resumo:', error);
        }
    };

    useEffect(() => {
        loadEtapas();
        loadResumo();
    }, [obraId]);

    // Abre modal para editar
    const handleEditStage = (stage) => {
        setEditingStage(stage);
        setIsEditModalOpen(true);
    };

    // Abre modal para nova etapa
    const handleNewStage = () => {
        setEditingStage({
            nome: '',
            ordem_execucao: etapas.length + 1,
            tipo_medicao: 'empreitada',
            data_inicio_prevista: '',
            data_termino_prevista: '',
            percentual_conclusao: 0
        });
        setIsNewStageModalOpen(true);
    };

    // Salva etapa (nova ou editada)
    const handleSaveStage = async (formData) => {
        try {
            const isNew = !editingStage.id;
            const url = isNew
                ? `${API_URL}/sid/cronograma-obra/${obraId}/etapas`
                : `${API_URL}/sid/cronograma-obra/${obraId}/etapas/${editingStage.id}`;
            
            const response = await fetchWithAuth(url, {
                method: isNew ? 'POST' : 'PUT',
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.success) {
                await loadEtapas();
                await loadResumo();
                setIsEditModalOpen(false);
                setIsNewStageModalOpen(false);
                alert(isNew ? 'Etapa criada com sucesso!' : 'Etapa atualizada com sucesso!');
            } else {
                alert(data.message || 'Erro ao salvar etapa');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            throw error;
        }
    };

    // Exclui etapa
    const handleDeleteStage = async (etapaId) => {
        if (!window.confirm('Deseja realmente excluir esta etapa?')) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-obra/${obraId}/etapas/${etapaId}`,
                { method: 'DELETE' }
            );

            const data = await response.json();
            
            if (data.success) {
                await loadEtapas();
                await loadResumo();
                alert('Etapa excluída com sucesso!');
            } else {
                alert(data.message || 'Erro ao excluir etapa');
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir etapa');
        }
    };

    // Formata data para exibição
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    // Retorna classe CSS do status
    const getStatusClass = (status) => {
        const statusMap = {
            'A Iniciar': 'status-a-iniciar',
            'Em Andamento': 'status-em-andamento',
            'Concluído': 'status-concluido',
            'Atrasado': 'status-atrasado'
        };
        return statusMap[status] || '';
    };

    // Retorna badge do status
    const getStatusBadge = (status) => {
        const statusConfig = {
            'A Iniciar': { icon: '⭐', color: '#667eea' },
            'Em Andamento': { icon: '⚙️', color: '#f59e0b' },
            'Concluído': { icon: '✅', color: '#10b981' },
            'Atrasado': { icon: '⚠️', color: '#ef4444' }
        };
        const config = statusConfig[status] || {};
        return (
            <span className="status-badge" style={{ backgroundColor: config.color + '20', color: config.color }}>
                {config.icon} {status}
            </span>
        );
    };

    if (loading) {
        return <div className="loading">Carregando cronograma...</div>;
    }

    return (
        <div className="cronograma-obra-container">
            {/* Header com Resumo */}
            <div className="cronograma-header">
                <h2>Cronograma da Obra</h2>
                <button className="btn-new-stage" onClick={handleNewStage}>
                    + Nova Etapa
                </button>
            </div>

            {/* Cards de Resumo */}
            {resumo && (
                <div className="resumo-cards">
                    <div className="resumo-card">
                        <div className="card-value">{resumo.total_etapas}</div>
                        <div className="card-label">Total de Etapas</div>
                    </div>
                    <div className="resumo-card success">
                        <div className="card-value">{resumo.etapas_concluidas}</div>
                        <div className="card-label">Concluídas</div>
                    </div>
                    <div className="resumo-card warning">
                        <div className="card-value">{resumo.etapas_em_andamento}</div>
                        <div className="card-label">Em Andamento</div>
                    </div>
                    <div className="resumo-card danger">
                        <div className="card-value">{resumo.etapas_atrasadas}</div>
                        <div className="card-label">Atrasadas</div>
                    </div>
                    <div className="resumo-card primary">
                        <div className="card-value">{resumo.percentual_medio}%</div>
                        <div className="card-label">Progresso Médio</div>
                    </div>
                </div>
            )}

            {/* Lista de Etapas */}
            <div className="etapas-list">
                {etapas.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhuma etapa cadastrada ainda.</p>
                        <button onClick={handleNewStage}>Criar primeira etapa</button>
                    </div>
                ) : (
                    etapas.map((etapa) => (
                        <div key={etapa.id} className="etapa-card">
                            {/* Header da Etapa */}
                            <div className="etapa-header">
                                <div className="etapa-title">
                                    <span className="etapa-ordem">#{etapa.ordem_execucao}</span>
                                    <h3>{etapa.nome}</h3>
                                    {getStatusBadge(etapa.status)}
                                </div>
                                {etapa.tipo_medicao === 'area' && (
                                    <span className="tipo-badge">
                                        📏 {etapa.unidade_medida}
                                    </span>
                                )}
                            </div>

                            {/* Progresso */}
                            <div className="etapa-progress">
                                <div className="progress-header">
                                    <span>Progresso</span>
                                    <span className="progress-percent">
                                        {etapa.percentual_conclusao}%
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${etapa.percentual_conclusao}%` }}
                                    ></div>
                                </div>
                                {etapa.tipo_medicao === 'area' && etapa.area_total && (
                                    <div className="area-info">
                                        {etapa.area_executada || 0} de {etapa.area_total} {etapa.unidade_medida}
                                    </div>
                                )}
                            </div>

                            {/* Informações de Datas */}
                            <div className="etapa-dates">
                                <div className="date-section">
                                    <span className="date-label">📅 Planejamento</span>
                                    <span className="date-value">
                                        {formatDate(etapa.data_inicio_prevista)} - {formatDate(etapa.data_termino_prevista)}
                                    </span>
                                    <span className="date-info">
                                        {etapa.dias_planejados} dias planejados
                                    </span>
                                </div>

                                {etapa.data_inicio_real && (
                                    <div className="date-section">
                                        <span className="date-label">🎯 Execução Real</span>
                                        <span className="date-value">
                                            Início: {formatDate(etapa.data_inicio_real)}
                                            {etapa.data_termino_real && ` - Fim: ${formatDate(etapa.data_termino_real)}`}
                                        </span>
                                        <span className="date-info">
                                            {etapa.dias_executados} dias executados
                                            {etapa.dias_restantes !== null && etapa.dias_restantes >= 0 && (
                                                <> • Restam {etapa.dias_restantes} dias</>
                                            )}
                                            {etapa.dias_restantes !== null && etapa.dias_restantes < 0 && (
                                                <span className="text-danger">
                                                    {' '}• Atrasado {Math.abs(etapa.dias_restantes)} dias
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Observações */}
                            {etapa.observacoes && (
                                <div className="etapa-observacoes">
                                    💬 {etapa.observacoes}
                                </div>
                            )}

                            {/* Ações */}
                            <div className="etapa-actions">
                                <button 
                                    className="btn-edit"
                                    onClick={() => handleEditStage(etapa)}
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDeleteStage(etapa.id)}
                                >
                                    🗑️ Excluir
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {isEditModalOpen && (
                <EditStageModal
                    stage={editingStage}
                    obraId={obraId}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveStage}
                />
            )}

            {isNewStageModalOpen && (
                <EditStageModal
                    stage={editingStage}
                    obraId={obraId}
                    onClose={() => setIsNewStageModalOpen(false)}
                    onSave={handleSaveStage}
                />
            )}
        </div>
    );
};

export default CronogramaObra;
