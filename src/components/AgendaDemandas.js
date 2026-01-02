/**
 * =====================================================
 * OBRALY - MÓDULO AGENDA DE DEMANDAS
 * =====================================================
 * 
 * Componente para gerenciar agenda de entregas, visitas,
 * serviços contratados e outras demandas da obra.
 * Permite importar de Pagamentos ou Orçamento de Engenharia.
 * 
 * =====================================================
 */

import React, { useState, useEffect, useCallback } from 'react';

// =====================================================
// FUNÇÃO DE FETCH AUTENTICADO (LOCAL)
// =====================================================
const localFetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, { ...options, headers });
};

// =====================================================
// ESTILOS
// =====================================================
const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#f8fafc',
        minHeight: '100%'
    },
    header: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '4px 0 0 0'
    },
    headerActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
    },
    button: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s'
    },
    buttonPrimary: {
        backgroundColor: '#4f46e5',
        color: '#fff'
    },
    buttonSecondary: {
        backgroundColor: '#f1f5f9',
        color: '#475569'
    },
    buttonSuccess: {
        backgroundColor: '#10b981',
        color: '#fff'
    },
    buttonWarning: {
        backgroundColor: '#f59e0b',
        color: '#fff'
    },
    buttonDanger: {
        backgroundColor: '#ef4444',
        color: '#fff'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        marginBottom: '20px'
    },
    cardHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#374151',
        margin: 0
    },
    // KPIs
    kpiContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
    },
    kpiCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: '4px solid #4f46e5'
    },
    kpiLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '4px'
    },
    kpiValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b'
    },
    // Filtros
    filterBar: {
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    },
    filterChip: {
        padding: '8px 16px',
        backgroundColor: 'white',
        color: '#64748b',
        border: '1px solid #e5e7eb',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    filterChipActive: {
        backgroundColor: '#4f46e5',
        color: 'white',
        border: 'none'
    },
    // Lista de demandas
    demandaItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        gap: '16px',
        transition: 'background-color 0.2s'
    },
    demandaIcon: {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px'
    },
    demandaInfo: {
        flex: 1,
        minWidth: 0
    },
    demandaTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
    },
    demandaMeta: {
        fontSize: '12px',
        color: '#64748b',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    demandaValor: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#059669',
        minWidth: '100px',
        textAlign: 'right'
    },
    demandaActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    // Badges
    badge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600'
    },
    badgePagamento: {
        backgroundColor: '#dbeafe',
        color: '#1e40af'
    },
    badgeOrcamento: {
        backgroundColor: '#fef3c7',
        color: '#92400e'
    },
    badgeCronograma: {
        backgroundColor: '#dbeafe',
        color: '#1e40af'
    },
    badgeManual: {
        backgroundColor: '#f3e8ff',
        color: '#7c3aed'
    },
    badgeAguardando: {
        backgroundColor: '#fef3c7',
        color: '#92400e'
    },
    badgeConcluido: {
        backgroundColor: '#d1fae5',
        color: '#065f46'
    },
    badgeAtrasado: {
        backgroundColor: '#fee2e2',
        color: '#991b1b'
    },
    // Seções
    section: {
        marginBottom: '24px'
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    // Alert banner
    alertBanner: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    infoBanner: {
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
    },
    // Empty state
    emptyState: {
        padding: '60px 20px',
        textAlign: 'center'
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    emptyTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    },
    emptyText: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '24px'
    },
    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    modalSmall: {
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    modalBody: {
        padding: '24px',
        overflow: 'auto',
        flex: 1
    },
    modalFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#9ca3af'
    },
    // Tabs
    tabs: {
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#f8fafc'
    },
    tab: {
        flex: 1,
        padding: '16px 24px',
        backgroundColor: 'transparent',
        color: '#64748b',
        border: 'none',
        borderBottom: '2px solid transparent',
        marginBottom: '-2px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    },
    tabActive: {
        color: '#4f46e5',
        borderBottom: '2px solid #4f46e5'
    },
    // Form
    formGroup: {
        marginBottom: '16px'
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '6px'
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s'
    },
    inputDisabled: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
        backgroundColor: '#f8fafc',
        color: '#64748b'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
    },
    searchBox: {
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb'
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    // Lista de importação
    listItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        gap: '16px'
    },
    listIcon: {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px'
    },
    listInfo: {
        flex: 1
    },
    listTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '4px'
    },
    listMeta: {
        fontSize: '12px',
        color: '#64748b',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    listValor: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#059669',
        minWidth: '100px',
        textAlign: 'right'
    },
    listAction: {
        padding: '8px 16px',
        backgroundColor: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    // Highlight
    highlightField: {
        backgroundColor: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '20px'
    },
    highlightLabel: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#92400e',
        textTransform: 'uppercase',
        marginBottom: '12px'
    },
    importedBox: {
        backgroundColor: '#f0fdf4',
        border: '2px solid #86efac',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    // Info Box
    infoBox: {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '14px'
    },
    infoLabel: {
        color: '#64748b'
    },
    infoValue: {
        fontWeight: '600',
        color: '#1e293b'
    }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
const AgendaDemandas = ({ obraId, apiUrl, obraNome }) => {
    // Estados
    const [demandas, setDemandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState('todos'); // todos, hoje, semana, futuro
    
    // Modais
    const [showModalManual, setShowModalManual] = useState(false);
    const [showModalImportar, setShowModalImportar] = useState(false);
    const [showModalConfirmar, setShowModalConfirmar] = useState(null);
    const [showModalEditar, setShowModalEditar] = useState(null);
    const [abaImportar, setAbaImportar] = useState('pagamentos');
    
    // Dados para importação
    const [pagamentosImportar, setPagamentosImportar] = useState([]);
    const [orcamentoImportar, setOrcamentoImportar] = useState([]);
    const [servicosImportar, setServicosImportar] = useState([]);
    const [buscaImportar, setBuscaImportar] = useState('');
    
    // Formulário manual
    const [formManual, setFormManual] = useState({
        descricao: '',
        tipo: 'material',
        fornecedor: '',
        telefone: '',
        valor: '',
        data_prevista: '',
        horario: '',
        observacoes: ''
    });
    
    // Formulário de importação
    const [formImportar, setFormImportar] = useState({
        descricao: '',
        fornecedor: '',
        telefone: '',
        valor: '',
        data_prevista: '',
        horario: '',
        observacoes: '',
        origem: '',
        pagamento_servico_id: null,
        orcamento_item_id: null,
        servico_id: null,
        tipo: 'material'
    });

    // =====================================================
    // FUNÇÕES AUXILIARES
    // =====================================================
    const formatCurrency = (value) => {
        if (!value && value !== 0) return '-';
        return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const getTipoIcon = (tipo) => {
        switch (tipo) {
            case 'material': return '📦';
            case 'servico': return '🔧';
            case 'visita': return '👷';
            default: return '📋';
        }
    };

    const getOrigemBadge = (origem) => {
        switch (origem) {
            case 'pagamento':
                return <span style={{ ...styles.badge, ...styles.badgePagamento }}>Pagamento</span>;
            case 'orcamento':
                return <span style={{ ...styles.badge, ...styles.badgeOrcamento }}>Orçamento</span>;
            case 'cronograma':
                return <span style={{ ...styles.badge, ...styles.badgeCronograma }}>Cronograma</span>;
            default:
                return <span style={{ ...styles.badge, ...styles.badgeManual }}>Manual</span>;
        }
    };

    const formatHorario = (horario) => {
        if (!horario) return '';
        return horario.substring(0, 5); // HH:MM
    };

    // Verificar se evento é hoje
    const isHoje = (dateStr) => {
        if (!dateStr) return false;
        const hoje = new Date();
        const data = new Date(dateStr + 'T00:00:00');
        return data.toDateString() === hoje.toDateString();
    };

    // Verificar se evento já passou
    const isPassado = (dateStr) => {
        if (!dateStr) return false;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const data = new Date(dateStr + 'T00:00:00');
        return data < hoje;
    };

    // =====================================================
    // CARREGAR DADOS
    // =====================================================
    const carregarDemandas = useCallback(async () => {
        try {
            setLoading(true);
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda`);
            if (!res.ok) throw new Error('Erro ao carregar demandas');
            const data = await res.json();
            setDemandas(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Erro ao carregar demandas:', err);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, obraId]);

    const carregarPagamentosImportar = useCallback(async () => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/importar/pagamentos`);
            if (res.ok) {
                const data = await res.json();
                setPagamentosImportar(data);
            }
        } catch (err) {
            console.error('Erro ao carregar pagamentos:', err);
        }
    }, [apiUrl, obraId]);

    const carregarOrcamentoImportar = useCallback(async () => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/importar/orcamento`);
            if (res.ok) {
                const data = await res.json();
                setOrcamentoImportar(data);
            }
        } catch (err) {
            console.error('Erro ao carregar orçamento:', err);
        }
    }, [apiUrl, obraId]);

    const carregarServicosImportar = useCallback(async () => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/importar/servicos`);
            if (res.ok) {
                const data = await res.json();
                setServicosImportar(data);
            }
        } catch (err) {
            console.error('Erro ao carregar serviços:', err);
        }
    }, [apiUrl, obraId]);

    useEffect(() => {
        carregarDemandas();
    }, [carregarDemandas]);

    useEffect(() => {
        if (showModalImportar) {
            carregarPagamentosImportar();
            carregarOrcamentoImportar();
            carregarServicosImportar();
        }
    }, [showModalImportar, carregarPagamentosImportar, carregarOrcamentoImportar, carregarServicosImportar]);

    // =====================================================
    // AÇÕES
    // =====================================================
    const criarDemandaManual = async () => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda`, {
                method: 'POST',
                body: JSON.stringify({
                    ...formManual,
                    valor: formManual.valor ? parseFloat(formManual.valor.replace(/\D/g, '')) / 100 : null,
                    origem: 'manual'
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.erro || 'Erro ao criar demanda');
            }
            
            setShowModalManual(false);
            setFormManual({
                descricao: '',
                tipo: 'material',
                fornecedor: '',
                telefone: '',
                valor: '',
                data_prevista: '',
                horario: '',
                observacoes: ''
            });
            carregarDemandas();
        } catch (err) {
            alert(err.message);
        }
    };

    const criarDemandaImportada = async () => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda`, {
                method: 'POST',
                body: JSON.stringify({
                    ...formImportar,
                    tipo: formImportar.tipo || 'material'
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.erro || 'Erro ao criar demanda');
            }
            
            setShowModalConfirmar(null);
            setFormImportar({
                descricao: '',
                fornecedor: '',
                telefone: '',
                valor: '',
                data_prevista: '',
                horario: '',
                observacoes: '',
                origem: '',
                pagamento_servico_id: null,
                orcamento_item_id: null,
                servico_id: null,
                tipo: 'material'
            });
            carregarDemandas();
            carregarPagamentosImportar();
            carregarOrcamentoImportar();
            carregarServicosImportar();
        } catch (err) {
            alert(err.message);
        }
    };

    const excluirDemanda = async (demanda) => {
        if (!window.confirm(`Excluir "${demanda.descricao}"?`)) return;
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/${demanda.id}`, {
                method: 'DELETE'
            });
            
            if (!res.ok) throw new Error('Erro ao excluir demanda');
            carregarDemandas();
        } catch (err) {
            alert(err.message);
        }
    };

    const abrirModalEditar = (demanda) => {
        setShowModalEditar({
            ...demanda,
            data_prevista: demanda.data_prevista || ''
        });
    };

    const salvarEdicao = async () => {
        if (!showModalEditar) return;
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/${showModalEditar.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    descricao: showModalEditar.descricao,
                    tipo: showModalEditar.tipo,
                    fornecedor: showModalEditar.fornecedor,
                    telefone: showModalEditar.telefone,
                    valor: showModalEditar.valor,
                    data_prevista: showModalEditar.data_prevista,
                    horario: showModalEditar.horario,
                    observacoes: showModalEditar.observacoes
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.erro || 'Erro ao salvar');
            }
            
            setShowModalEditar(null);
            carregarDemandas();
        } catch (err) {
            alert(err.message);
        }
    };

    const selecionarParaImportar = (item, tipo) => {
        if (tipo === 'pagamento') {
            let tipoDemanda = 'material';
            if (item.tipo === 'mao_de_obra' || item.tipo === 'Mão de Obra') {
                tipoDemanda = 'servico';
            }
            
            setFormImportar({
                descricao: item.descricao,
                fornecedor: item.fornecedor || '',
                telefone: item.telefone || '',
                valor: item.valor,
                data_prevista: '',
                horario: '',
                observacoes: `Serviço: ${item.servico || '-'} | Status: ${item.status} | Data: ${formatDate(item.data_pagamento)}`,
                origem: 'pagamento',
                pagamento_servico_id: typeof item.id === 'number' ? item.id : null,
                orcamento_item_id: null,
                servico_id: null,
                tipo: tipoDemanda
            });
        } else if (tipo === 'orcamento') {
            setFormImportar({
                descricao: item.descricao,
                fornecedor: '',
                telefone: '',
                valor: item.valor,
                data_prevista: '',
                horario: '',
                observacoes: `Etapa: ${item.etapa} | Qtd: ${item.quantidade}`,
                origem: 'orcamento',
                pagamento_servico_id: null,
                orcamento_item_id: item.id,
                servico_id: null,
                tipo: 'material'
            });
        } else if (tipo === 'cronograma') {
            setFormImportar({
                descricao: `Início: ${item.nome}`,
                fornecedor: item.responsavel || '',
                telefone: '',
                valor: null,
                data_prevista: item.data_inicio || '',
                horario: '',
                observacoes: item.etapa ? `Etapa: ${item.etapa}` : '',
                origem: 'cronograma',
                pagamento_servico_id: null,
                orcamento_item_id: null,
                servico_id: item.id,
                tipo: 'servico'
            });
        }
        setShowModalImportar(false);
        setShowModalConfirmar(tipo);
    };

    // =====================================================
    // FILTROS E CÁLCULOS
    // =====================================================
    
    // Filtrar apenas eventos futuros (incluindo hoje) - eventos passados somem automaticamente
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const eventosAtivos = demandas.filter(d => {
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data >= hoje; // Só mostra eventos de hoje em diante
    });

    // Agrupar por período
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    
    const inicioProxSemana = new Date(fimSemana);
    inicioProxSemana.setDate(fimSemana.getDate() + 1);
    const fimProxSemana = new Date(inicioProxSemana);
    fimProxSemana.setDate(inicioProxSemana.getDate() + 6);

    // Eventos de hoje
    const eventosHoje = eventosAtivos.filter(d => {
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data.toDateString() === hoje.toDateString();
    }).sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

    // Eventos desta semana (exceto hoje)
    const estaSemana = eventosAtivos.filter(d => {
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data > hoje && data <= fimSemana;
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista));

    // Eventos da próxima semana
    const proximaSemana = eventosAtivos.filter(d => {
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data >= inicioProxSemana && data <= fimProxSemana;
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista));

    // Eventos futuros (após próxima semana)
    const futuro = eventosAtivos.filter(d => {
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data > fimProxSemana;
    }).sort((a, b) => new Date(a.data_prevista) - new Date(b.data_prevista));

    // Aplicar filtro de visualização
    const aplicarFiltro = (eventos) => {
        if (filtro === 'todos') return eventos;
        if (filtro === 'hoje') return eventos.filter(d => isHoje(d.data_prevista));
        if (filtro === 'semana') {
            return eventos.filter(d => {
                const data = new Date(d.data_prevista + 'T00:00:00');
                return data >= hoje && data <= fimSemana;
            });
        }
        return eventos;
    };

    // Filtrar lista de importação
    const pagamentosFiltrados = pagamentosImportar.filter(p => 
        p.descricao?.toLowerCase().includes(buscaImportar.toLowerCase()) ||
        p.fornecedor?.toLowerCase().includes(buscaImportar.toLowerCase()) ||
        p.servico?.toLowerCase().includes(buscaImportar.toLowerCase())
    );

    const orcamentoFiltrados = orcamentoImportar.filter(o => 
        o.descricao?.toLowerCase().includes(buscaImportar.toLowerCase()) ||
        o.etapa?.toLowerCase().includes(buscaImportar.toLowerCase())
    );

    const servicosFiltrados = servicosImportar.filter(s => 
        s.nome?.toLowerCase().includes(buscaImportar.toLowerCase()) ||
        s.etapa?.toLowerCase().includes(buscaImportar.toLowerCase()) ||
        s.responsavel?.toLowerCase().includes(buscaImportar.toLowerCase())
    );

    // =====================================================
    // RENDER
    // =====================================================
    if (loading && demandas.length === 0) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
                    <div>Carregando agenda...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626' }}>
                    <div style={{ fontSize: '24px', marginBottom: '16px' }}>❌</div>
                    <div>{error}</div>
                    <button 
                        style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '16px' }}
                        onClick={carregarDemandas}
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        📅 Agenda de Eventos
                    </h1>
                    <p style={styles.subtitle}>{obraNome || 'Obra'}</p>
                </div>
                <div style={styles.headerActions}>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                        onClick={() => setShowModalManual(true)}
                    >
                        ✏️ Novo Evento
                    </button>
                    <button 
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                        onClick={() => setShowModalImportar(true)}
                    >
                        📥 Importar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={styles.kpiContainer}>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#ef4444' }}>
                    <div style={styles.kpiLabel}>🔴 Hoje</div>
                    <div style={styles.kpiValue}>{eventosHoje.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#f59e0b' }}>
                    <div style={styles.kpiLabel}>📅 Esta Semana</div>
                    <div style={styles.kpiValue}>{eventosHoje.length + estaSemana.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#3b82f6' }}>
                    <div style={styles.kpiLabel}>🗓️ Próx. Semana</div>
                    <div style={styles.kpiValue}>{proximaSemana.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#6366f1' }}>
                    <div style={styles.kpiLabel}>📋 Total Ativos</div>
                    <div style={styles.kpiValue}>{eventosAtivos.length}</div>
                </div>
            </div>

            {/* Filtros */}
            <div style={styles.filterBar}>
                {['todos', 'hoje', 'semana'].map(f => (
                    <button
                        key={f}
                        style={{
                            ...styles.filterChip,
                            ...(filtro === f ? styles.filterChipActive : {})
                        }}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' && `Todos (${eventosAtivos.length})`}
                        {f === 'hoje' && `🔴 Hoje (${eventosHoje.length})`}
                        {f === 'semana' && `📅 Esta Semana (${eventosHoje.length + estaSemana.length})`}
                    </button>
                ))}
            </div>

            {/* Alerta de Eventos Hoje */}
            {eventosHoje.length > 0 && (
                <div style={{ ...styles.alertBanner, backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                    <span style={{ fontSize: '24px' }}>📌</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                            {eventosHoje.length} {eventosHoje.length === 1 ? 'evento hoje' : 'eventos hoje'}!
                        </div>
                        <div style={{ fontSize: '13px', color: '#b45309' }}>
                            Confira os eventos programados para hoje
                        </div>
                    </div>
                </div>
            )}

            {/* Lista vazia */}
            {eventosAtivos.length === 0 && (
                <div style={styles.card}>
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <div style={styles.emptyTitle}>Nenhum evento agendado</div>
                        <div style={styles.emptyText}>
                            Importe de pagamentos, orçamento, cronograma ou cadastre manualmente
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                style={{ ...styles.button, ...styles.buttonPrimary }}
                                onClick={() => setShowModalImportar(true)}
                            >
                                📥 Importar
                            </button>
                            <button 
                                style={{ ...styles.button, ...styles.buttonSecondary }}
                                onClick={() => setShowModalManual(true)}
                            >
                                ✏️ Novo Evento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hoje */}
            {eventosHoje.length > 0 && (filtro === 'todos' || filtro === 'hoje' || filtro === 'semana') && (
                <div style={styles.section}>
                    <h3 style={{ ...styles.sectionTitle, color: '#dc2626' }}>🔴 Hoje</h3>
                    <div style={styles.card}>
                        {eventosHoje.map(demanda => (
                            <div 
                                key={demanda.id} 
                                style={{ ...styles.demandaItem, backgroundColor: '#fef2f2', cursor: 'pointer' }}
                                onClick={() => abrirModalEditar(demanda)}
                            >
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        {demanda.horario && <span>🕐 {formatHorario(demanda.horario)}</span>}
                                        <span>👤 {demanda.fornecedor || '-'}</span>
                                        {demanda.telefone && <span>📞 {demanda.telefone}</span>}
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                <div style={styles.demandaActions} onClick={e => e.stopPropagation()}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonDanger, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => excluirDemanda(demanda)}
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

            {/* Esta Semana */}
            {estaSemana.length > 0 && (filtro === 'todos' || filtro === 'semana') && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>📋 Esta Semana</h3>
                    <div style={styles.card}>
                        {estaSemana.map(demanda => (
                            <div 
                                key={demanda.id} 
                                style={{ ...styles.demandaItem, cursor: 'pointer' }}
                                onClick={() => abrirModalEditar(demanda)}
                            >
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                        {demanda.horario && <span>🕐 {formatHorario(demanda.horario)}</span>}
                                        <span>👤 {demanda.fornecedor || '-'}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                <div style={styles.demandaActions} onClick={e => e.stopPropagation()}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonDanger, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => excluirDemanda(demanda)}
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

            {/* Próxima Semana */}
            {proximaSemana.length > 0 && filtro === 'todos' && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>📅 Próxima Semana</h3>
                    <div style={styles.card}>
                        {proximaSemana.map(demanda => (
                            <div 
                                key={demanda.id} 
                                style={{ ...styles.demandaItem, cursor: 'pointer' }}
                                onClick={() => abrirModalEditar(demanda)}
                            >
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                        {demanda.horario && <span>🕐 {formatHorario(demanda.horario)}</span>}
                                        <span>👤 {demanda.fornecedor || '-'}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                <div style={styles.demandaActions} onClick={e => e.stopPropagation()}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonDanger, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => excluirDemanda(demanda)}
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

            {/* Futuro */}
            {futuro.length > 0 && filtro === 'todos' && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>🗓️ Mais Adiante</h3>
                    <div style={styles.card}>
                        {futuro.map(demanda => (
                            <div 
                                key={demanda.id} 
                                style={{ ...styles.demandaItem, cursor: 'pointer' }}
                                onClick={() => abrirModalEditar(demanda)}
                            >
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                        {demanda.horario && <span>🕐 {formatHorario(demanda.horario)}</span>}
                                        <span>👤 {demanda.fornecedor || '-'}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                <div style={styles.demandaActions} onClick={e => e.stopPropagation()}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonDanger, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => excluirDemanda(demanda)}
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

            {/* Modal Cadastro Manual */}
            {showModalManual && (
                <div style={styles.modalOverlay} onClick={() => setShowModalManual(false)}>
                    <div style={styles.modalSmall} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>✏️ Novo Evento</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalManual(false)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>📝 Descrição *</label>
                                <input 
                                    type="text" 
                                    style={styles.input}
                                    value={formManual.descricao}
                                    onChange={(e) => setFormManual({...formManual, descricao: e.target.value})}
                                    placeholder="Ex: Entrega porcelanato, Visita técnica..."
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>📋 Tipo</label>
                                <select 
                                    style={styles.input}
                                    value={formManual.tipo}
                                    onChange={(e) => setFormManual({...formManual, tipo: e.target.value})}
                                >
                                    <option value="material">📦 Material / Entrega</option>
                                    <option value="servico">🔧 Início de Serviço</option>
                                    <option value="visita">👷 Visita / Reunião</option>
                                    <option value="outro">📋 Outro</option>
                                </select>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>👤 Fornecedor</label>
                                    <input 
                                        type="text" 
                                        style={styles.input}
                                        value={formManual.fornecedor}
                                        onChange={(e) => setFormManual({...formManual, fornecedor: e.target.value})}
                                        placeholder="Nome do fornecedor"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>📞 Telefone</label>
                                    <input 
                                        type="text" 
                                        style={styles.input}
                                        value={formManual.telefone}
                                        onChange={(e) => setFormManual({...formManual, telefone: e.target.value})}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>💰 Valor (R$)</label>
                                    <input 
                                        type="text" 
                                        style={styles.input}
                                        value={formManual.valor}
                                        onChange={(e) => setFormManual({...formManual, valor: e.target.value})}
                                        placeholder="0,00"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>📅 Data *</label>
                                    <input 
                                        type="date" 
                                        style={styles.input}
                                        value={formManual.data_prevista}
                                        onChange={(e) => setFormManual({...formManual, data_prevista: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>🕐 Horário</label>
                                    <input 
                                        type="time" 
                                        style={styles.input}
                                        value={formManual.horario}
                                        onChange={(e) => setFormManual({...formManual, horario: e.target.value})}
                                    />
                                </div>
                                <div style={styles.formGroup}></div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>📝 Observações</label>
                                <textarea 
                                    style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                                    value={formManual.observacoes}
                                    onChange={(e) => setFormManual({...formManual, observacoes: e.target.value})}
                                    placeholder="Detalhes adicionais..."
                                />
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button 
                                style={{ ...styles.button, ...styles.buttonSecondary }}
                                onClick={() => setShowModalManual(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                style={{ 
                                    ...styles.button, 
                                    ...styles.buttonSuccess,
                                    opacity: (formManual.descricao && formManual.data_prevista) ? 1 : 0.5
                                }}
                                onClick={criarDemandaManual}
                                disabled={!formManual.descricao || !formManual.data_prevista}
                            >
                                ✅ Adicionar à Agenda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Importar */}
            {showModalImportar && (
                <div style={styles.modalOverlay} onClick={() => setShowModalImportar(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>📥 Importar para Agenda</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalImportar(false)}>×</button>
                        </div>
                        
                        {/* Tabs */}
                        <div style={styles.tabs}>
                            <button 
                                style={{ ...styles.tab, ...(abaImportar === 'pagamentos' ? styles.tabActive : {}) }}
                                onClick={() => setAbaImportar('pagamentos')}
                            >
                                💳 Pagamentos ({pagamentosImportar.length})
                            </button>
                            <button 
                                style={{ ...styles.tab, ...(abaImportar === 'orcamento' ? styles.tabActive : {}) }}
                                onClick={() => setAbaImportar('orcamento')}
                            >
                                📋 Orçamento ({orcamentoImportar.length})
                            </button>
                            <button 
                                style={{ ...styles.tab, ...(abaImportar === 'cronograma' ? styles.tabActive : {}) }}
                                onClick={() => setAbaImportar('cronograma')}
                            >
                                🔧 Serviços a Iniciar ({servicosImportar.length})
                            </button>
                        </div>

                        {/* Search */}
                        <div style={styles.searchBox}>
                            <input 
                                type="text" 
                                style={styles.searchInput}
                                placeholder="🔍 Buscar..."
                                value={buscaImportar}
                                onChange={(e) => setBuscaImportar(e.target.value)}
                            />
                        </div>

                        {/* Lista */}
                        <div style={{ ...styles.modalBody, padding: 0, maxHeight: '400px' }}>
                            {abaImportar === 'pagamentos' ? (
                                pagamentosFiltrados.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        {pagamentosImportar.length === 0 
                                            ? 'Nenhum pagamento de material disponível para importar'
                                            : 'Nenhum resultado encontrado'
                                        }
                                    </div>
                                ) : (
                                    pagamentosFiltrados.map(item => (
                                        <div key={item.id} style={styles.listItem}>
                                            <div style={{ 
                                                ...styles.listIcon, 
                                                backgroundColor: item.tipo === 'material' ? '#d1fae5' : item.tipo === 'mao_de_obra' ? '#dbeafe' : '#fef3c7'
                                            }}>
                                                {item.tipo === 'material' ? '📦' : item.tipo === 'mao_de_obra' ? '👷' : '💳'}
                                            </div>
                                            <div style={styles.listInfo}>
                                                <div style={styles.listTitle}>
                                                    {item.descricao}
                                                    {item.fonte === 'pagamento_futuro' && (
                                                        <span style={{ 
                                                            marginLeft: '8px', 
                                                            fontSize: '10px', 
                                                            background: '#fef3c7', 
                                                            color: '#92400e',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px'
                                                        }}>Futuro</span>
                                                    )}
                                                    {item.fonte === 'pagamento_parcelado' && (
                                                        <span style={{ 
                                                            marginLeft: '8px', 
                                                            fontSize: '10px', 
                                                            background: '#e0e7ff', 
                                                            color: '#3730a3',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px'
                                                        }}>Parcelado</span>
                                                    )}
                                                </div>
                                                <div style={styles.listMeta}>
                                                    <span>🔧 {item.servico || '-'}</span>
                                                    <span>👤 {item.fornecedor || '-'}</span>
                                                    <span>📅 {item.status === 'Pago' ? `Pago em ${formatDate(item.data_pagamento)}` : formatDate(item.data_pagamento)}</span>
                                                    <span style={{ 
                                                        color: item.status === 'Pago' ? '#059669' : item.status === 'Previsto' ? '#d97706' : '#6b7280'
                                                    }}>
                                                        {item.status === 'Pago' ? '✅' : item.status === 'Previsto' ? '⏳' : '📋'} {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={styles.listValor}>{formatCurrency(item.valor)}</div>
                                            <button 
                                                style={styles.listAction}
                                                onClick={() => selecionarParaImportar(item, 'pagamento')}
                                            >
                                                + Importar
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : (
                                orcamentoFiltrados.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        {orcamentoImportar.length === 0 
                                            ? 'Nenhum item do orçamento disponível para importar'
                                            : 'Nenhum resultado encontrado'
                                        }
                                    </div>
                                ) : (
                                    orcamentoFiltrados.map(item => (
                                        <div key={item.id} style={styles.listItem}>
                                            <div style={{ ...styles.listIcon, backgroundColor: '#fef3c7' }}>📋</div>
                                            <div style={styles.listInfo}>
                                                <div style={styles.listTitle}>{item.descricao}</div>
                                                <div style={styles.listMeta}>
                                                    <span>📁 {item.etapa}</span>
                                                    <span>📦 {item.quantidade}</span>
                                                </div>
                                            </div>
                                            <div style={styles.listValor}>{formatCurrency(item.valor)}</div>
                                            <button 
                                                style={styles.listAction}
                                                onClick={() => selecionarParaImportar(item, 'orcamento')}
                                            >
                                                + Importar
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : abaImportar === 'cronograma' ? (
                                servicosFiltrados.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        {servicosImportar.length === 0 
                                            ? 'Nenhum serviço com data de início disponível'
                                            : 'Nenhum resultado encontrado'
                                        }
                                    </div>
                                ) : (
                                    servicosFiltrados.map(item => (
                                        <div key={item.id} style={styles.listItem}>
                                            <div style={{ ...styles.listIcon, backgroundColor: '#dbeafe' }}>🔧</div>
                                            <div style={styles.listInfo}>
                                                <div style={styles.listTitle}>{item.nome}</div>
                                                <div style={styles.listMeta}>
                                                    <span>📁 {item.etapa || '-'}</span>
                                                    <span>📅 Início: {formatDate(item.data_inicio)}</span>
                                                    {item.responsavel && <span>👤 {item.responsavel}</span>}
                                                </div>
                                            </div>
                                            <div style={{ ...styles.listValor, color: '#3b82f6' }}>
                                                {item.status || 'A Iniciar'}
                                            </div>
                                            <button 
                                                style={styles.listAction}
                                                onClick={() => selecionarParaImportar(item, 'cronograma')}
                                            >
                                                + Importar
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : null}
                        </div>

                        <div style={styles.modalFooter}>
                            <button 
                                style={{ ...styles.button, ...styles.buttonSecondary }}
                                onClick={() => setShowModalImportar(false)}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmar Importação */}
            {showModalConfirmar && (
                <div style={styles.modalOverlay} onClick={() => setShowModalConfirmar(null)}>
                    <div style={styles.modalSmall} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>📅 Adicionar à Agenda</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalConfirmar(null)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            {/* Banner de importação */}
                            <div style={styles.importedBox}>
                                <span style={{ fontSize: '24px' }}>✅</span>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                                        Dados importados de {showModalConfirmar === 'pagamento' ? 'Pagamento' : showModalConfirmar === 'orcamento' ? 'Orçamento' : 'Cronograma'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#15803d' }}>
                                        Campos preenchidos automaticamente
                                    </div>
                                </div>
                            </div>

                            {/* Campos preenchidos automaticamente */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>📦 Descrição</label>
                                <input 
                                    type="text" 
                                    style={styles.inputDisabled}
                                    value={formImportar.descricao}
                                    readOnly
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>👤 Fornecedor</label>
                                    <input 
                                        type="text" 
                                        style={showModalConfirmar === 'pagamento' ? styles.inputDisabled : styles.input}
                                        value={formImportar.fornecedor}
                                        onChange={(e) => setFormImportar({...formImportar, fornecedor: e.target.value})}
                                        placeholder={showModalConfirmar === 'orcamento' ? 'Informe o fornecedor' : ''}
                                        readOnly={showModalConfirmar === 'pagamento'}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>💰 Valor</label>
                                    <input 
                                        type="text" 
                                        style={styles.inputDisabled}
                                        value={formatCurrency(formImportar.valor)}
                                        readOnly
                                    />
                                </div>
                            </div>

                            {formImportar.observacoes && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>📝 Informações Importadas</label>
                                    <input 
                                        type="text" 
                                        style={styles.inputDisabled}
                                        value={formImportar.observacoes}
                                        readOnly
                                    />
                                </div>
                            )}

                            {/* Campo obrigatório destacado */}
                            <div style={styles.highlightField}>
                                <div style={styles.highlightLabel}>⚠️ Preencha a data</div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>📅 Data *</label>
                                        <input 
                                            type="date" 
                                            style={{ ...styles.input, borderColor: formImportar.data_prevista ? '#10b981' : '#fbbf24' }}
                                            value={formImportar.data_prevista}
                                            onChange={(e) => setFormImportar({...formImportar, data_prevista: e.target.value})}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>🕐 Horário</label>
                                        <input 
                                            type="time" 
                                            style={styles.input}
                                            value={formImportar.horario}
                                            onChange={(e) => setFormImportar({...formImportar, horario: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>📞 Telefone</label>
                                        <input 
                                            type="text" 
                                            style={styles.input}
                                            value={formImportar.telefone}
                                            onChange={(e) => setFormImportar({...formImportar, telefone: e.target.value})}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div style={styles.formGroup}></div>
                                </div>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button 
                                style={{ ...styles.button, ...styles.buttonSecondary }}
                                onClick={() => setShowModalConfirmar(null)}
                            >
                                Cancelar
                            </button>
                            <button 
                                style={{ 
                                    ...styles.button, 
                                    ...styles.buttonSuccess,
                                    opacity: formImportar.data_prevista ? 1 : 0.5
                                }}
                                onClick={criarDemandaImportada}
                                disabled={!formImportar.data_prevista}
                            >
                                ✅ Adicionar à Agenda
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar */}
            {showModalEditar && (
                <div style={styles.modalOverlay} onClick={() => setShowModalEditar(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>✏️ Editar Demanda</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalEditar(null)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>📝 Descrição *</label>
                                <input 
                                    type="text" 
                                    style={styles.input}
                                    value={showModalEditar.descricao || ''}
                                    onChange={(e) => setShowModalEditar({...showModalEditar, descricao: e.target.value})}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>📋 Tipo</label>
                                <select 
                                    style={styles.input}
                                    value={showModalEditar.tipo || 'material'}
                                    onChange={(e) => setShowModalEditar({...showModalEditar, tipo: e.target.value})}
                                >
                                    <option value="material">📦 Material / Compra</option>
                                    <option value="servico">🔧 Serviço Contratado</option>
                                    <option value="visita">👷 Visita / Reunião</option>
                                    <option value="outro">📋 Outro</option>
                                </select>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>👤 Fornecedor</label>
                                    <input 
                                        type="text" 
                                        style={styles.input}
                                        value={showModalEditar.fornecedor || ''}
                                        onChange={(e) => setShowModalEditar({...showModalEditar, fornecedor: e.target.value})}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>📞 Telefone</label>
                                    <input 
                                        type="text" 
                                        style={styles.input}
                                        value={showModalEditar.telefone || ''}
                                        onChange={(e) => setShowModalEditar({...showModalEditar, telefone: e.target.value})}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>💰 Valor (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        style={styles.input}
                                        value={showModalEditar.valor || ''}
                                        onChange={(e) => setShowModalEditar({...showModalEditar, valor: e.target.value})}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>📅 Data Prevista *</label>
                                    <input 
                                        type="date" 
                                        style={styles.input}
                                        value={showModalEditar.data_prevista || ''}
                                        onChange={(e) => setShowModalEditar({...showModalEditar, data_prevista: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>📝 Observações</label>
                                <textarea 
                                    style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                                    value={showModalEditar.observacoes || ''}
                                    onChange={(e) => setShowModalEditar({...showModalEditar, observacoes: e.target.value})}
                                />
                            </div>

                            {/* Info de origem */}
                            <div style={{ 
                                padding: '12px', 
                                background: '#f1f5f9', 
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#64748b',
                                marginTop: '8px'
                            }}>
                                <span>Origem: {showModalEditar.origem === 'manual' ? '✍️ Manual' : showModalEditar.origem === 'pagamento' ? '💳 Pagamento' : showModalEditar.origem === 'cronograma' ? '🔧 Cronograma' : '📋 Orçamento'}</span>
                                {showModalEditar.created_at && (
                                    <span style={{ marginLeft: '16px' }}>Criado em: {formatDate(showModalEditar.created_at)}</span>
                                )}
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button 
                                style={{ ...styles.button, ...styles.buttonDanger }}
                                onClick={() => {
                                    if (window.confirm(`Excluir "${showModalEditar.descricao}"?`)) {
                                        excluirDemanda(showModalEditar);
                                        setShowModalEditar(null);
                                    }
                                }}
                            >
                                🗑️ Excluir
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    style={{ ...styles.button, ...styles.buttonSecondary }}
                                    onClick={() => setShowModalEditar(null)}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    style={{ ...styles.button, ...styles.buttonPrimary }}
                                    onClick={salvarEdicao}
                                >
                                    💾 Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaDemandas;
