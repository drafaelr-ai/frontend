import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './CronogramaObra.css';

const API_URL = 'https://obraly-api.fly.dev';

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

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const CronogramaObra = ({ obraId, obraNome, onClose, embedded = false }) => {
    const [cronograma, setCronograma] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // NOVO: Estado para modo de visualização
    const [viewMode, setViewMode] = useState('lista'); // 'kanban', 'timeline', 'lista'
    const [filtroStatus, setFiltroStatus] = useState('todos');
    
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
    
    // Estados para ETAPA PAI
    const [showAddEtapaPaiModal, setShowAddEtapaPaiModal] = useState(null);
    const [novaEtapaPai, setNovaEtapaPai] = useState({
        nome: '',
        etapa_anterior_id: null,
        tipo_condicao: 'apos_termino',
        dias_offset: 0,
        observacoes: ''
    });
    
    // Estados para SUBETAPA
    const [showAddSubetapaModal, setShowAddSubetapaModal] = useState(null);
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
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    
    // NOVO: Estados para importar do orçamento de engenharia
    const [showImportOrcamentoModal, setShowImportOrcamentoModal] = useState(false);
    const [etapasOrcamento, setEtapasOrcamento] = useState([]);
    const [etapasOrcamentoSelecionadas, setEtapasOrcamentoSelecionadas] = useState([]);
    const [importandoOrcamento, setImportandoOrcamento] = useState(false);
    const [configImportacao, setConfigImportacao] = useState({
        data_inicio: getTodayString(),
        duracao_padrao: 30
    });
    
    // Estados para EVM
    const [evmData, setEvmData] = useState({});
    
    // Estados para controle de expansão das etapas
    const [expandedEtapas, setExpandedEtapas] = useState({});
    
    // NOVO: Estado para modal de detalhes
    const [servicoDetalhes, setServicoDetalhes] = useState(null);

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

    const handleImportServicos = async () => {
        if (servicosSelecionados.length === 0) {
            alert('Selecione pelo menos um serviço para importar');
            return;
        }
        
        try {
            for (const servico of servicosSelecionados) {
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

                if (!response.ok) throw new Error(`Erro ao importar serviço: ${servico.nome}`);
            }

            fetchCronograma();
            setShowImportModal(false);
            setServicosSelecionados([]);
        } catch (err) {
            alert(err.message);
        }
    };
    
    const toggleServicoSelecionado = (servico) => {
        setServicosSelecionados(prev => {
            const isSelected = prev.some(s => s.id === servico.id);
            if (isSelected) {
                return prev.filter(s => s.id !== servico.id);
            } else {
                return [...prev, servico];
            }
        });
    };
    
    const toggleSelectAll = () => {
        if (servicosSelecionados.length === servicosDisponiveis.length) {
            setServicosSelecionados([]);
        } else {
            setServicosSelecionados([...servicosDisponiveis]);
        }
    };

    // ==================== IMPORTAR DO ORÇAMENTO ====================
    
    const fetchEtapasOrcamento = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma/importar-orcamento`);
            if (response.ok) {
                const data = await response.json();
                setEtapasOrcamento(data.etapas || []);
            } else {
                setEtapasOrcamento([]);
            }
        } catch (err) {
            console.error('Erro ao buscar etapas do orçamento:', err);
            setEtapasOrcamento([]);
        }
    };

    const toggleEtapaOrcamentoSelecionada = (etapa) => {
        setEtapasOrcamentoSelecionadas(prev => {
            const isSelected = prev.some(e => e.id === etapa.id);
            if (isSelected) {
                return prev.filter(e => e.id !== etapa.id);
            } else {
                return [...prev, etapa];
            }
        });
    };

    const toggleSelectAllOrcamento = () => {
        const disponiveis = etapasOrcamento.filter(e => !e.ja_importado);
        if (etapasOrcamentoSelecionadas.length === disponiveis.length) {
            setEtapasOrcamentoSelecionadas([]);
        } else {
            setEtapasOrcamentoSelecionadas([...disponiveis]);
        }
    };

    const handleImportarOrcamento = async () => {
        if (etapasOrcamentoSelecionadas.length === 0) {
            alert('Selecione pelo menos uma etapa para importar');
            return;
        }

        try {
            setImportandoOrcamento(true);
            
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma/importar-orcamento`, {
                method: 'POST',
                body: JSON.stringify({
                    etapa_ids: etapasOrcamentoSelecionadas.map(e => e.id),
                    data_inicio: configImportacao.data_inicio,
                    duracao_padrao: parseInt(configImportacao.duracao_padrao) || 30
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.erro || 'Erro ao importar');
            }

            const result = await response.json();
            alert(`✅ ${result.total_importados} serviço(s) importado(s) com sucesso!`);
            
            fetchCronograma();
            setShowImportOrcamentoModal(false);
            setEtapasOrcamentoSelecionadas([]);
        } catch (err) {
            alert(err.message);
        } finally {
            setImportandoOrcamento(false);
        }
    };

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

    // ==================== SINCRONIZAÇÃO COM ORÇAMENTO ====================
    
    const handleSincronizarOrcamento = async (servicoId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/cronograma/${servicoId}/sincronizar-orcamento`, {
                method: 'POST'
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.erro || 'Erro ao sincronizar');
            }

            const result = await response.json();
            alert(`✅ ${result.mensagem}`);
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // ==================== CRUD ETAPA PAI ====================
    
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
    
    useEffect(() => {
        if (novoServico.data_inicio && novoServico.duracao_dias) {
            setNovoServico(prev => ({
                ...prev,
                data_fim_prevista: addDays(prev.data_inicio, prev.duracao_dias - 1)
            }));
        }
    }, [novoServico.data_inicio, novoServico.duracao_dias]);

    const getStatus = (servico) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataFim = servico.data_fim_prevista ? new Date(servico.data_fim_prevista + 'T00:00:00') : null;
        const percentual = servico.percentual_conclusao || 0;

        if (percentual >= 100) return { label: 'Concluído', color: '#10b981', bg: '#d1fae5', icon: '✅', key: 'concluido' };
        if (dataFim && hoje > dataFim) return { label: 'Atrasado', color: '#ef4444', bg: '#fee2e2', icon: '⚠️', key: 'atrasado' };
        if (servico.data_inicio_real || percentual > 0) return { label: 'Em Andamento', color: '#3b82f6', bg: '#dbeafe', icon: '🔄', key: 'em_andamento' };
        return { label: 'A Iniciar', color: '#6b7280', bg: '#f3f4f6', icon: '⏳', key: 'a_iniciar' };
    };

    // NOVO: Calcular status EVM simplificado
    const getEVMStatus = (servicoNome) => {
        const evm = evmData[servicoNome];
        if (!evm || !evm.valor_total) return null;

        const percentualPago = evm.percentual_pago || 0;
        const percentualExecutado = evm.percentual_executado || 0;
        const diferenca = percentualPago - percentualExecutado;

        if (percentualExecutado === 0 && percentualPago === 0) {
            return { status: 'neutro', label: 'Não iniciado', color: '#6b7280', bg: '#f3f4f6', icon: '⏳' };
        }
        if (percentualExecutado >= 100 && percentualPago <= 105) {
            return { status: 'concluido', label: 'Concluído', color: '#10b981', bg: '#d1fae5', icon: '✅' };
        }
        if (diferenca <= -10) {
            return { status: 'otimo', label: 'Saudável', color: '#10b981', bg: '#d1fae5', icon: '🟢', msg: 'Executou mais do que pagou' };
        }
        if (diferenca <= 5) {
            return { status: 'normal', label: 'No Prazo', color: '#f59e0b', bg: '#fef3c7', icon: '🟡', msg: 'Pagamento alinhado' };
        }
        return { status: 'atencao', label: 'Atenção', color: '#ef4444', bg: '#fee2e2', icon: '🔴', msg: 'Pagando mais do que executou' };
    };

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

    // ==================== DADOS CALCULADOS ====================
    
    const servicosPorStatus = useMemo(() => {
        return {
            'a_iniciar': cronograma.filter(s => getStatus(s).key === 'a_iniciar'),
            'em_andamento': cronograma.filter(s => getStatus(s).key === 'em_andamento'),
            'concluido': cronograma.filter(s => getStatus(s).key === 'concluido'),
            'atrasado': cronograma.filter(s => getStatus(s).key === 'atrasado')
        };
    }, [cronograma]);

    const servicosFiltrados = useMemo(() => {
        if (filtroStatus === 'todos') return cronograma;
        return cronograma.filter(s => getStatus(s).key === filtroStatus);
    }, [cronograma, filtroStatus]);

    const stats = useMemo(() => {
        const total = cronograma.length;
        const concluidos = servicosPorStatus.concluido.length;
        const atrasados = servicosPorStatus.atrasado.length;
        const progressoGeral = total > 0 
            ? Math.round(cronograma.reduce((acc, s) => acc + (s.percentual_conclusao || 0), 0) / total)
            : 0;
        const comAtencao = cronograma.filter(s => {
            const evmStatus = getEVMStatus(s.servico_nome);
            return evmStatus?.status === 'atencao';
        }).length;

        return { total, concluidos, atrasados, progressoGeral, comAtencao };
    }, [cronograma, servicosPorStatus]);

    const statusConfig = {
        'a_iniciar': { label: 'A Iniciar', color: '#6b7280', bg: '#f3f4f6', icon: '⏳' },
        'em_andamento': { label: 'Em Andamento', color: '#3b82f6', bg: '#dbeafe', icon: '🔄' },
        'concluido': { label: 'Concluído', color: '#10b981', bg: '#d1fae5', icon: '✅' },
        'atrasado': { label: 'Atrasado', color: '#ef4444', bg: '#fee2e2', icon: '⚠️' }
    };

    const getTimelineRange = useMemo(() => {
        if (cronograma.length === 0) return { start: new Date(), end: new Date() };
        
        let minDate = new Date();
        let maxDate = new Date();
        
        cronograma.forEach(s => {
            if (s.data_inicio) {
                const d = new Date(s.data_inicio + 'T00:00:00');
                if (d < minDate) minDate = d;
            }
            if (s.data_fim_prevista) {
                const d = new Date(s.data_fim_prevista + 'T00:00:00');
                if (d > maxDate) maxDate = d;
            }
        });
        
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 14);
        
        return { start: minDate, end: maxDate };
    }, [cronograma]);

    const getTimelinePosition = (date) => {
        if (!date) return 0;
        const d = new Date(date + 'T00:00:00');
        const { start, end } = getTimelineRange;
        const totalDays = (end - start) / (1000 * 60 * 60 * 24);
        const daysFromStart = (d - start) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    };

    const getTimelineWidth = (startDate, endDate) => {
        if (!startDate || !endDate) return 5;
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const { start: rangeStart, end: rangeEnd } = getTimelineRange;
        const totalDays = (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24);
        const duration = (end - start) / (1000 * 60 * 60 * 24);
        return Math.max(3, (duration / totalDays) * 100);
    };

    const getTimelineMonths = useMemo(() => {
        const { start, end } = getTimelineRange;
        const months = [];
        const current = new Date(start);
        current.setDate(1);
        
        while (current <= end) {
            months.push(current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            current.setMonth(current.getMonth() + 1);
        }
        
        return months;
    }, [getTimelineRange]);

    // ==================== COMPONENTES DE VISUALIZAÇÃO ====================

    // Componente de barras EVM simplificado
    const EVMProgressBars = ({ servico, compact = false }) => {
        const evm = evmData[servico.servico_nome];
        if (!evm || !evm.valor_total) return null;

        const percentualPago = Math.round(evm.percentual_pago || 0);
        const percentualExecutado = Math.round(evm.percentual_executado || 0);
        const evmStatus = getEVMStatus(servico.servico_nome);

        return (
            <div className="evm-progress-section">
                <div className="evm-progress-row">
                    <span className="evm-progress-label">🔧 Exec</span>
                    <div className="evm-progress-bar">
                        <div 
                            className="evm-progress-fill executed"
                            style={{ width: `${Math.min(percentualExecutado, 100)}%` }}
                        />
                    </div>
                    <span className="evm-progress-value executed">{percentualExecutado}%</span>
                </div>
                <div className="evm-progress-row">
                    <span className="evm-progress-label">💰 Pago</span>
                    <div className="evm-progress-bar">
                        <div 
                            className="evm-progress-fill paid"
                            style={{ width: `${Math.min(percentualPago, 100)}%` }}
                        />
                    </div>
                    <span className="evm-progress-value paid">{percentualPago}%</span>
                </div>
                {!compact && evmStatus && (
                    <div 
                        className="evm-status-badge"
                        style={{ backgroundColor: evmStatus.bg, color: evmStatus.color }}
                    >
                        {evmStatus.icon} {evmStatus.label}
                    </div>
                )}
            </div>
        );
    };

    // Card para Kanban
    const ServicoCardKanban = ({ servico }) => {
        const status = getStatus(servico);
        const evm = evmData[servico.servico_nome];
        const evmStatus = getEVMStatus(servico.servico_nome);

        return (
            <div 
                className="kanban-card"
                style={{ borderLeftColor: status.color }}
                onClick={() => setServicoDetalhes(servico)}
            >
                <div className="kanban-card-header">
                    <span className="kanban-card-ordem">#{servico.ordem}</span>
                    <h4 className="kanban-card-nome">{servico.servico_nome}</h4>
                    {evmStatus && (
                        <span 
                            className="kanban-evm-badge"
                            style={{ backgroundColor: evmStatus.bg, color: evmStatus.color }}
                            title={evmStatus.msg || evmStatus.label}
                        >
                            {evmStatus.icon}
                        </span>
                    )}
                </div>

                {/* Barra de progresso */}
                <div className="kanban-progress-section">
                    <div className="kanban-progress-header">
                        <span>Execução</span>
                        <span>{(servico.percentual_conclusao || 0).toFixed(0)}%</span>
                    </div>
                    <div className="kanban-progress-bar">
                        <div 
                            className="kanban-progress-fill"
                            style={{ 
                                width: `${servico.percentual_conclusao || 0}%`,
                                backgroundColor: status.color
                            }}
                        />
                    </div>
                </div>

                {/* EVM simplificado */}
                {evm && evm.valor_total > 0 && (
                    <EVMProgressBars servico={servico} compact={true} />
                )}

                {/* Datas */}
                <div className="kanban-card-dates">
                    <span>📅 {formatDate(servico.data_inicio)} → {formatDate(servico.data_fim_prevista)}</span>
                </div>

                {/* Ações */}
                <div className="kanban-card-actions" onClick={e => e.stopPropagation()}>
                    <button 
                        className="kanban-action-btn"
                        onClick={() => setEditingServico(servico)}
                        title="Editar"
                    >
                        ✏️
                    </button>
                    <button 
                        className="kanban-action-btn"
                        onClick={() => {
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
                        title="Adicionar Etapa"
                    >
                        ➕
                    </button>
                    <button 
                        className="kanban-action-btn danger"
                        onClick={() => handleDeleteServico(servico.id)}
                        title="Excluir"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        );
    };

    // VIEW: KANBAN
    const KanbanView = () => (
        <div className="kanban-container">
            {Object.entries(servicosPorStatus).map(([statusKey, lista]) => (
                <div key={statusKey} className="kanban-column">
                    <div 
                        className="kanban-column-header"
                        style={{ backgroundColor: statusConfig[statusKey].bg }}
                    >
                        <span className="kanban-status-icon">{statusConfig[statusKey].icon}</span>
                        <span className="kanban-status-label" style={{ color: statusConfig[statusKey].color }}>
                            {statusConfig[statusKey].label}
                        </span>
                        <span 
                            className="kanban-count"
                            style={{ backgroundColor: statusConfig[statusKey].color }}
                        >
                            {lista.length}
                        </span>
                    </div>
                    <div className="kanban-cards">
                        {lista.map(servico => (
                            <ServicoCardKanban key={servico.id} servico={servico} />
                        ))}
                        {lista.length === 0 && (
                            <div className="kanban-empty">
                                Nenhum serviço
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    // VIEW: TIMELINE
    const TimelineView = () => (
        <div className="timeline-container">
            <div className="timeline-header">
                <div className="timeline-label-header">Serviço</div>
                <div className="timeline-bars-header">
                    {getTimelineMonths.map((month, idx) => (
                        <div key={idx} className="timeline-month">{month}</div>
                    ))}
                </div>
            </div>
            <div className="timeline-body">
                {/* Linha de hoje */}
                <div 
                    className="timeline-today-line"
                    style={{ left: `calc(200px + ${getTimelinePosition(getTodayString())}%)` }}
                >
                    <span className="timeline-today-label">HOJE</span>
                </div>

                {servicosFiltrados.map(servico => {
                    const status = getStatus(servico);
                    const evm = evmData[servico.servico_nome];
                    const evmStatus = getEVMStatus(servico.servico_nome);
                    const percentualPago = evm ? Math.round(evm.percentual_pago || 0) : 0;

                    return (
                        <div key={servico.id} className="timeline-row">
                            <div className="timeline-label">
                                <div className="timeline-servico-info">
                                    <span className="timeline-servico-nome">{servico.servico_nome}</span>
                                    {evmStatus && (
                                        <span 
                                            className="timeline-evm-badge"
                                            style={{ backgroundColor: evmStatus.bg, color: evmStatus.color }}
                                        >
                                            {evmStatus.icon}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="timeline-track">
                                <div
                                    className="timeline-bar"
                                    style={{
                                        left: `${getTimelinePosition(servico.data_inicio)}%`,
                                        width: `${getTimelineWidth(servico.data_inicio, servico.data_fim_prevista)}%`,
                                        backgroundColor: status.color
                                    }}
                                    onClick={() => setServicoDetalhes(servico)}
                                    title={`${servico.servico_nome}: ${servico.percentual_conclusao || 0}% executado, ${percentualPago}% pago`}
                                >
                                    <div 
                                        className="timeline-bar-progress"
                                        style={{ width: `${servico.percentual_conclusao || 0}%` }}
                                    />
                                    <span className="timeline-bar-label">
                                        {(servico.percentual_conclusao || 0).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // VIEW: LISTA (modo detalhado original)
    const ListView = () => (
        <div className="lista-container">
            {servicosFiltrados.map((servico) => {
                const status = getStatus(servico);
                const evmIndicator = getEVMStatus(servico.servico_nome);
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
                                {evmIndicator && (
                                    <span 
                                        className="evm-indicator-badge"
                                        style={{ backgroundColor: evmIndicator.bg, color: evmIndicator.color }}
                                        title={evmIndicator.msg || ''}
                                    >
                                        {evmIndicator.icon} {evmIndicator.label}
                                    </span>
                                )}
                            </div>
                            <div className="header-right">
                                {servico.orcamento_etapa_id && (
                                    <span className="vinculo-badge" title={`Vinculado ao Orçamento: ${servico.orcamento_etapa_codigo || ''} - ${servico.orcamento_etapa_nome || ''}`}>
                                        🔗 Orçamento
                                    </span>
                                )}
                                <span className="tipo-badge">
                                    {servico.tipo_medicao === 'etapas' ? '📋 Por Etapas' : 
                                     servico.tipo_medicao === 'area' ? '📐 Por Área' : '🔧 Empreitada'}
                                </span>
                            </div>
                        </div>

                        {/* Barra de Progresso Principal */}
                        <div 
                            className="progress-section"
                            onClick={() => setEditingServico(servico)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="progress-header">
                                <span>Execução Física</span>
                                <span className="progress-value">{(servico.percentual_conclusao || 0).toFixed(1)}%</span>
                            </div>
                            <div className="cronograma-progress-bar">
                                <div 
                                    className="cronograma-progress-fill"
                                    style={{ 
                                        width: `${servico.percentual_conclusao || 0}%`,
                                        backgroundColor: status.color
                                    }}
                                ></div>
                            </div>
                            <span style={{ fontSize: '0.75em', color: '#666', marginTop: '3px' }}>✏️ Clique para editar</span>
                        </div>

                        {/* EVM Simplificado */}
                        {evm && evm.valor_total > 0 && (
                            <div className="evm-section-new">
                                <div className="evm-header-new">
                                    <span>📊 Executado vs Pago</span>
                                    {evmIndicator && (
                                        <span 
                                            className="evm-badge"
                                            style={{ backgroundColor: evmIndicator.bg, color: evmIndicator.color }}
                                        >
                                            {evmIndicator.icon} {evmIndicator.label}
                                        </span>
                                    )}
                                </div>
                                <div className="evm-bars-new">
                                    <div className="evm-bar-row-new">
                                        <span className="evm-bar-label-new">🔧 Executado</span>
                                        <div className="evm-bar-track">
                                            <div 
                                                className="evm-bar-fill-new executed"
                                                style={{ width: `${Math.min(evm.percentual_executado || 0, 100)}%` }}
                                            />
                                        </div>
                                        <span className="evm-bar-value executed">{(evm.percentual_executado || 0).toFixed(0)}%</span>
                                    </div>
                                    <div className="evm-bar-row-new">
                                        <span className="evm-bar-label-new">💰 Pago</span>
                                        <div className="evm-bar-track">
                                            <div 
                                                className="evm-bar-fill-new paid"
                                                style={{ width: `${Math.min(evm.percentual_pago || 0, 100)}%` }}
                                            />
                                        </div>
                                        <span className="evm-bar-value paid">{(evm.percentual_pago || 0).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="evm-values">
                                    <span>Orçado: {formatCurrency(evm.valor_total)}</span>
                                    <span>Pago: {formatCurrency(evm.valor_pago)}</span>
                                </div>
                            </div>
                        )}

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
                            <div 
                                className="area-section clickable"
                                onClick={() => setEditingServico(servico)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>📐 Área: <strong>{servico.area_executada || 0}</strong> / {servico.area_total} {servico.unidade_medida || 'm²'}</span>
                                <span style={{ marginLeft: '15px', color: '#1976d2', fontSize: '0.85em' }}>✏️ Clique para editar</span>
                            </div>
                        )}

                        {/* ETAPAS HIERÁRQUICAS */}
                        {servico.tipo_medicao === 'etapas' && servico.etapas && servico.etapas.length > 0 && (
                            <div className="etapas-section">
                                <div className="etapas-header">
                                    <h4>
                                        📋 Etapas ({servico.etapas.length}) - {
                                            servico.etapas.reduce((acc, e) => acc + (e.total_dias || e.duracao_dias || 0), 0)
                                        } dias
                                    </h4>
                                </div>
                                
                                <div className="etapas-list">
                                    {servico.etapas.map((etapa, etapaIdx) => {
                                        const hasSubetapas = etapa.subetapas && etapa.subetapas.length > 0;
                                        const isExpanded = expandedEtapas[etapa.id];
                                        const percentual = etapa.percentual_conclusao || 0;
                                        const totalDias = etapa.total_dias || etapa.duracao_dias || 0;
                                        
                                        return (
                                            <div key={etapa.id} className="etapa-pai-container">
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
                                                                        backgroundColor: percentual >= 100 ? '#10b981' : '#3b82f6'
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
                                                
                                                {/* Subetapas */}
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
                                                                        </div>
                                                                        <div 
                                                                            className="subetapa-progress clickable"
                                                                            onClick={() => setEditingSubetapa({ ...sub, cronograma_id: servico.id })}
                                                                            style={{ cursor: 'pointer' }}
                                                                        >
                                                                            <div className="mini-progress-bar small">
                                                                                <div 
                                                                                    className="mini-progress-fill"
                                                                                    style={{ 
                                                                                        width: `${sub.percentual_conclusao}%`,
                                                                                        backgroundColor: sub.percentual_conclusao >= 100 ? '#10b981' : '#3b82f6'
                                                                                    }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="subetapa-percent">{sub.percentual_conclusao}%</span>
                                                                        </div>
                                                                        <div className="subetapa-actions">
                                                                            <button 
                                                                                className="btn-icon small"
                                                                                onClick={() => setEditingSubetapa({ ...sub, cronograma_id: servico.id })}
                                                                            >
                                                                                ✏️
                                                                            </button>
                                                                            <button 
                                                                                className="btn-icon small danger"
                                                                                onClick={() => handleDeleteSubetapa(servico.id, sub.id, sub.nome)}
                                                                            >
                                                                                🗑️
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
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
                            </div>
                        )}

                        {/* Ações do Card */}
                        <div className="card-actions">
                            <button 
                                className="btn-action primary"
                                onClick={() => {
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
                            {servico.orcamento_etapa_id && (
                                <button 
                                    className="btn-action sync"
                                    onClick={() => handleSincronizarOrcamento(servico.id)}
                                    title="Sincronizar % com Orçamento"
                                >
                                    🔄 Sincronizar
                                </button>
                            )}
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
    );

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
                    <div className="view-toggle">
                        <button 
                            className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                            onClick={() => setViewMode('kanban')}
                        >
                            📋 Kanban
                        </button>
                        <button 
                            className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                            onClick={() => setViewMode('timeline')}
                        >
                            📅 Timeline
                        </button>
                        <button 
                            className={`view-btn ${viewMode === 'lista' ? 'active' : ''}`}
                            onClick={() => setViewMode('lista')}
                        >
                            📝 Lista
                        </button>
                    </div>
                    <button className="btn-pdf" onClick={handleGerarPDF}>📄 PDF</button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>➕ Novo Serviço</button>
                    <button className="btn-secondary" onClick={() => { fetchServicosDisponiveis(); setShowImportModal(true); }}>📋 Importar</button>
                    <button className="btn-orcamento" onClick={() => { fetchEtapasOrcamento(); setShowImportOrcamentoModal(true); }}>📊 Orçamento</button>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.progressoGeral}%</div>
                    <div className="stat-label">Progresso</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.concluidos}</div>
                    <div className="stat-label">Concluídos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: stats.comAtencao > 0 ? '#ef4444' : '#10b981' }}>{stats.comAtencao}</div>
                    <div className="stat-label">Atenção (EVM)</div>
                </div>
            </div>

            {/* Filtros */}
            {(viewMode === 'lista' || viewMode === 'timeline') && (
                <div className="filtros-bar">
                    <button className={`filtro-chip ${filtroStatus === 'todos' ? 'active' : ''}`} onClick={() => setFiltroStatus('todos')}>
                        Todos ({cronograma.length})
                    </button>
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                            key={key}
                            className={`filtro-chip ${filtroStatus === key ? 'active' : ''}`}
                            style={filtroStatus === key ? { backgroundColor: config.color, color: 'white' } : {}}
                            onClick={() => setFiltroStatus(key)}
                        >
                            {config.icon} {config.label} ({servicosPorStatus[key].length})
                        </button>
                    ))}
                </div>
            )}

            {/* Conteúdo */}
            {cronograma.length === 0 ? (
                <div className="empty-state">
                    <p>Nenhuma etapa cadastrada.</p>
                    <p>Clique em "Novo Serviço" ou "Importar" para começar.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'kanban' && <KanbanView />}
                    {viewMode === 'timeline' && <TimelineView />}
                    {viewMode === 'lista' && <ListView />}
                </>
            )}

            {/* MODAIS */}
            
            {/* Modal Novo Serviço */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Novo Serviço</h3>
                        <div className="form-group">
                            <label>Nome do Serviço *</label>
                            <input type="text" value={novoServico.servico_nome} onChange={(e) => setNovoServico({...novoServico, servico_nome: e.target.value})} placeholder="Ex: Construção da Piscina" />
                        </div>
                        <div className="form-group">
                            <label>Tipo de Medição</label>
                            <select value={novoServico.tipo_medicao} onChange={(e) => setNovoServico({...novoServico, tipo_medicao: e.target.value})}>
                                <option value="etapas">📋 Por Etapas</option>
                                <option value="empreitada">🔧 Empreitada</option>
                                <option value="area">📐 Por Área</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Data Início</label>
                                <input type="date" value={novoServico.data_inicio} onChange={(e) => setNovoServico({...novoServico, data_inicio: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input type="number" min="1" value={novoServico.duracao_dias} onChange={(e) => setNovoServico({...novoServico, duracao_dias: parseInt(e.target.value) || 1})} />
                            </div>
                        </div>
                        {novoServico.tipo_medicao === 'area' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Área Total</label>
                                    <input type="number" step="0.01" value={novoServico.area_total} onChange={(e) => setNovoServico({...novoServico, area_total: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Unidade</label>
                                    <select value={novoServico.unidade_medida} onChange={(e) => setNovoServico({...novoServico, unidade_medida: e.target.value})}>
                                        <option value="m²">m²</option>
                                        <option value="m³">m³</option>
                                        <option value="m">m</option>
                                        <option value="un">un</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancelar</button>
                            <button className="btn-save" onClick={handleAddServico}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>📋 Importar Serviços</h3>
                        {servicosDisponiveis.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Todos os serviços já estão no cronograma.</div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={servicosSelecionados.length === servicosDisponiveis.length} onChange={toggleSelectAll} />
                                        <strong>Selecionar Todos ({servicosDisponiveis.length})</strong>
                                    </label>
                                </div>
                                <div className="servicos-import-list">
                                    {servicosDisponiveis.map(servico => (
                                        <label key={servico.id} className={`servico-import-item ${servicosSelecionados.some(s => s.id === servico.id) ? 'selected' : ''}`}>
                                            <input type="checkbox" checked={servicosSelecionados.some(s => s.id === servico.id)} onChange={() => toggleServicoSelecionado(servico)} />
                                            <span>{servico.nome}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowImportModal(false)}>Cancelar</button>
                            <button className="btn-save" onClick={handleImportServicos} disabled={servicosSelecionados.length === 0}>Importar ({servicosSelecionados.length})</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar do Orçamento de Engenharia */}
            {showImportOrcamentoModal && (
                <div className="modal-overlay" onClick={() => setShowImportOrcamentoModal(false)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <h3>📊 Importar do Orçamento de Engenharia</h3>
                        <p style={{ color: '#666', marginBottom: '15px' }}>
                            Importe etapas do Orçamento de Engenharia diretamente para o Cronograma.
                        </p>
                        
                        {etapasOrcamento.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>📭 Nenhuma etapa encontrada no Orçamento.</p>
                                <p style={{ fontSize: '0.9rem' }}>Crie etapas no módulo de Orçamento de Engenharia primeiro.</p>
                            </div>
                        ) : (
                            <>
                                {/* Configurações de importação */}
                                <div className="import-config-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>📅 Data de Início</label>
                                            <input 
                                                type="date" 
                                                value={configImportacao.data_inicio}
                                                onChange={(e) => setConfigImportacao({...configImportacao, data_inicio: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>⏱️ Duração Padrão (dias)</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={configImportacao.duracao_padrao}
                                                onChange={(e) => setConfigImportacao({...configImportacao, duracao_padrao: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seleção de etapas */}
                                <div style={{ marginBottom: '10px', marginTop: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={etapasOrcamentoSelecionadas.length === etapasOrcamento.filter(e => !e.ja_importado).length && etapasOrcamento.filter(e => !e.ja_importado).length > 0}
                                            onChange={toggleSelectAllOrcamento}
                                        />
                                        <strong>Selecionar Todas Disponíveis ({etapasOrcamento.filter(e => !e.ja_importado).length})</strong>
                                    </label>
                                </div>
                                
                                <div className="orcamento-import-list">
                                    {etapasOrcamento.map(etapa => (
                                        <label 
                                            key={etapa.id} 
                                            className={`orcamento-import-item ${etapa.ja_importado ? 'disabled' : ''} ${etapasOrcamentoSelecionadas.some(e => e.id === etapa.id) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={etapasOrcamentoSelecionadas.some(e => e.id === etapa.id)}
                                                onChange={() => toggleEtapaOrcamentoSelecionada(etapa)}
                                                disabled={etapa.ja_importado}
                                            />
                                            <div className="orcamento-item-info">
                                                <div className="orcamento-item-header">
                                                    <span className="orcamento-item-codigo">{etapa.codigo}</span>
                                                    <span className="orcamento-item-nome">{etapa.nome}</span>
                                                    {etapa.ja_importado && (
                                                        <span className="orcamento-item-badge imported">✓ Já importado</span>
                                                    )}
                                                </div>
                                                <div className="orcamento-item-details">
                                                    <span>💰 {formatCurrency(etapa.total)}</span>
                                                    <span>📦 {etapa.qtd_itens} itens</span>
                                                    <span>📊 {etapa.percentual_pago}% pago</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Resumo */}
                                {etapasOrcamentoSelecionadas.length > 0 && (
                                    <div className="import-summary">
                                        <strong>Resumo da Importação:</strong>
                                        <p>{etapasOrcamentoSelecionadas.length} etapa(s) selecionada(s)</p>
                                        <p>Total: {formatCurrency(etapasOrcamentoSelecionadas.reduce((acc, e) => acc + e.total, 0))}</p>
                                    </div>
                                )}
                            </>
                        )}
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => { setShowImportOrcamentoModal(false); setEtapasOrcamentoSelecionadas([]); }}>
                                Cancelar
                            </button>
                            <button 
                                className="btn-save" 
                                onClick={handleImportarOrcamento} 
                                disabled={etapasOrcamentoSelecionadas.length === 0 || importandoOrcamento}
                            >
                                {importandoOrcamento ? '⏳ Importando...' : `📥 Importar (${etapasOrcamentoSelecionadas.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Etapa */}
            {showAddEtapaPaiModal && (
                <div className="modal-overlay" onClick={() => setShowAddEtapaPaiModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Nova Etapa</h3>
                        <div className="form-group">
                            <label>Nome da Etapa *</label>
                            <input type="text" value={novaEtapaPai.nome} onChange={(e) => setNovaEtapaPai({...novaEtapaPai, nome: e.target.value})} placeholder="Ex: Infraestrutura" />
                        </div>
                        {(() => {
                            const servico = cronograma.find(s => s.id === showAddEtapaPaiModal);
                            if (servico?.etapas?.length > 0) {
                                return (
                                    <div className="form-group">
                                        <label>Condição de Início</label>
                                        <select value={novaEtapaPai.tipo_condicao} onChange={(e) => setNovaEtapaPai({...novaEtapaPai, tipo_condicao: e.target.value})}>
                                            <option value="apos_termino">Após término da anterior</option>
                                            <option value="dias_apos">X dias após término</option>
                                            <option value="dias_antes">X dias antes do término</option>
                                            <option value="manual">Data específica</option>
                                        </select>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddEtapaPaiModal(null)}>Cancelar</button>
                            <button className="btn-save" onClick={handleAddEtapaPai}>Criar Etapa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Subetapa */}
            {showAddSubetapaModal && (
                <div className="modal-overlay" onClick={() => setShowAddSubetapaModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>➕ Nova Subetapa - {showAddSubetapaModal.etapa_nome}</h3>
                        <div className="form-group">
                            <label>Nome da Subetapa *</label>
                            <input type="text" value={novaSubetapa.nome} onChange={(e) => setNovaSubetapa({...novaSubetapa, nome: e.target.value})} placeholder="Ex: Escavação" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input type="number" min="1" value={novaSubetapa.duracao_dias} onChange={(e) => setNovaSubetapa({...novaSubetapa, duracao_dias: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Percentual (%)</label>
                                <input type="number" min="0" max="100" value={novaSubetapa.percentual_conclusao} onChange={(e) => setNovaSubetapa({...novaSubetapa, percentual_conclusao: e.target.value})} />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowAddSubetapaModal(null)}>Cancelar</button>
                            <button className="btn-save" onClick={handleAddSubetapa}>Criar Subetapa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Etapa */}
            {editingEtapaPai && (
                <div className="modal-overlay" onClick={() => setEditingEtapaPai(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar Etapa</h3>
                        <div className="form-group">
                            <label>Nome *</label>
                            <input type="text" value={editingEtapaPai.nome} onChange={(e) => setEditingEtapaPai({...editingEtapaPai, nome: e.target.value})} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingEtapaPai(null)}>Cancelar</button>
                            <button className="btn-save" onClick={handleUpdateEtapaPai}>Salvar</button>
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
                            <label>Nome *</label>
                            <input type="text" value={editingSubetapa.nome} onChange={(e) => setEditingSubetapa({...editingSubetapa, nome: e.target.value})} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Duração (dias)</label>
                                <input type="number" min="1" value={editingSubetapa.duracao_dias} onChange={(e) => setEditingSubetapa({...editingSubetapa, duracao_dias: parseInt(e.target.value) || 1})} />
                            </div>
                            <div className="form-group">
                                <label>Percentual</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="range" min="0" max="100" value={editingSubetapa.percentual_conclusao || 0} onChange={(e) => setEditingSubetapa({...editingSubetapa, percentual_conclusao: parseFloat(e.target.value)})} style={{ flex: 1 }} />
                                    <span style={{ minWidth: '40px', fontWeight: 'bold' }}>{editingSubetapa.percentual_conclusao || 0}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingSubetapa(null)}>Cancelar</button>
                            <button className="btn-save" onClick={handleUpdateSubetapa}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Serviço */}
            {editingServico && (
                <div className="modal-overlay" onClick={() => setEditingServico(null)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Editar: {editingServico.servico_nome}</h3>
                        <div className="form-group">
                            <label>Nome do Serviço *</label>
                            <input type="text" value={editingServico.servico_nome} onChange={(e) => setEditingServico({...editingServico, servico_nome: e.target.value})} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Início Previsto</label>
                                <input type="date" value={editingServico.data_inicio || ''} onChange={(e) => setEditingServico({...editingServico, data_inicio: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Término Previsto</label>
                                <input type="date" value={editingServico.data_fim_prevista || ''} onChange={(e) => setEditingServico({...editingServico, data_fim_prevista: e.target.value})} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Início Real</label>
                                <input type="date" value={editingServico.data_inicio_real || ''} onChange={(e) => setEditingServico({...editingServico, data_inicio_real: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Término Real</label>
                                <input type="date" value={editingServico.data_fim_real || ''} onChange={(e) => setEditingServico({...editingServico, data_fim_real: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Tipo de Medição</label>
                            <select
                                value={editingServico.tipo_medicao || 'empreitada'}
                                onChange={(e) => setEditingServico({...editingServico, tipo_medicao: e.target.value})}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                            >
                                <option value="etapas">📋 Por Etapas</option>
                                <option value="empreitada">🔧 Empreitada (% manual)</option>
                                <option value="area">📐 Por Área</option>
                            </select>
                        </div>
                        
                        {/* Progresso por tipo */}
                        {editingServico.tipo_medicao === 'area' && (
                            <div className="form-group" style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#1565c0', fontWeight: 'bold' }}>📐 Medição por Área</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: '#555' }}>Área Total</label>
                                        <input type="number" min="0" step="0.1"
                                            value={editingServico.area_total || ''}
                                            onChange={(e) => setEditingServico({...editingServico, area_total: parseFloat(e.target.value) || 0})}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #90caf9' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: '#555' }}>Unidade</label>
                                        <select value={editingServico.unidade_medida || 'm²'}
                                            onChange={(e) => setEditingServico({...editingServico, unidade_medida: e.target.value})}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #90caf9' }}>
                                            <option value="m²">m²</option>
                                            <option value="m³">m³</option>
                                            <option value="m">m</option>
                                            <option value="un">un</option>
                                        </select>
                                    </div>
                                </div>
                                <label style={{ fontSize: '12px', color: '#555' }}>Área Executada</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                    <input type="range" min="0" max={editingServico.area_total || 100} step="0.1" value={editingServico.area_executada || 0} 
                                        onChange={(e) => {
                                            const areaExec = parseFloat(e.target.value) || 0;
                                            const areaTotal = editingServico.area_total || 1;
                                            setEditingServico({...editingServico, area_executada: areaExec, percentual_conclusao: Math.min(100, (areaExec / areaTotal) * 100)});
                                        }} style={{ flex: 1 }} />
                                    <span style={{ minWidth: '120px', textAlign: 'right' }}>{(editingServico.area_executada || 0).toFixed(1)} / {editingServico.area_total || 0} {editingServico.unidade_medida}</span>
                                </div>
                            </div>
                        )}
                        
                        {editingServico.tipo_medicao === 'etapas' && (
                            <div className="form-group" style={{ backgroundColor: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#e65100', fontWeight: 'bold' }}>📋 Medição por Etapas</label>
                                <p style={{ margin: '10px 0', color: '#666' }}>O percentual é calculado automaticamente pelas etapas.</p>
                                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Execução: {(editingServico.percentual_conclusao || 0).toFixed(1)}%</div>
                            </div>
                        )}
                        
                        {(editingServico.tipo_medicao === 'empreitada' || !editingServico.tipo_medicao) && (
                            <div className="form-group" style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
                                <label style={{ color: '#2e7d32', fontWeight: 'bold' }}>🔧 Execução (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <input type="range" min="0" max="100" value={editingServico.percentual_conclusao || 0} 
                                        onChange={(e) => setEditingServico({...editingServico, percentual_conclusao: parseFloat(e.target.value)})} style={{ flex: 1 }} />
                                    <span style={{ fontWeight: 'bold' }}>{(editingServico.percentual_conclusao || 0).toFixed(0)}%</span>
                                </div>
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditingServico(null)}>Cancelar</button>
                            <button className="btn-save" onClick={async () => {
                                try {
                                    const response = await fetchWithAuth(`${API_URL}/cronograma/${editingServico.id}`, { method: 'PUT', body: JSON.stringify(editingServico) });
                                    if (!response.ok) throw new Error('Erro ao atualizar');
                                    fetchCronograma();
                                    setEditingServico(null);
                                } catch (err) { alert(err.message); }
                            }}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhes */}
            {servicoDetalhes && (
                <div className="modal-overlay" onClick={() => setServicoDetalhes(null)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <h3>{servicoDetalhes.servico_nome}</h3>
                        <div className="detalhes-grid">
                            <div className="detalhe-item">
                                <span className="detalhe-label">Status</span>
                                <span className="status-badge" style={{ backgroundColor: getStatus(servicoDetalhes).color }}>{getStatus(servicoDetalhes).icon} {getStatus(servicoDetalhes).label}</span>
                            </div>
                            <div className="detalhe-item">
                                <span className="detalhe-label">Execução</span>
                                <span className="detalhe-value">{(servicoDetalhes.percentual_conclusao || 0).toFixed(1)}%</span>
                            </div>
                            <div className="detalhe-item">
                                <span className="detalhe-label">Início</span>
                                <span className="detalhe-value">{formatDate(servicoDetalhes.data_inicio)}</span>
                            </div>
                            <div className="detalhe-item">
                                <span className="detalhe-label">Término</span>
                                <span className="detalhe-value">{formatDate(servicoDetalhes.data_fim_prevista)}</span>
                            </div>
                        </div>
                        {evmData[servicoDetalhes.servico_nome] && (
                            <div className="evm-detalhes-section">
                                <h4>📊 Executado vs Pago</h4>
                                <EVMProgressBars servico={servicoDetalhes} compact={false} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <span>Orçado: {formatCurrency(evmData[servicoDetalhes.servico_nome].valor_total)}</span>
                                    <span>Pago: {formatCurrency(evmData[servicoDetalhes.servico_nome].valor_pago)}</span>
                                </div>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setServicoDetalhes(null)}>Fechar</button>
                            <button className="btn-save" onClick={() => { setEditingServico(servicoDetalhes); setServicoDetalhes(null); }}>✏️ Editar</button>
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
                <button className="btn-back" onClick={onClose}>← Voltar</button>
            </div>
            {content}
        </div>
    );
};

export default CronogramaObra;
