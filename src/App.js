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
const AgendaDemandas = ({ obraId, apiUrl, obaNome }) => {
    // Estados
    const [demandas, setDemandas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState('todos'); // todos, aguardando, atrasado, concluido
    
    // Modais
    const [showModalManual, setShowModalManual] = useState(false);
    const [showModalImportar, setShowModalImportar] = useState(false);
    const [showModalConcluir, setShowModalConcluir] = useState(null);
    const [showModalConfirmar, setShowModalConfirmar] = useState(null);
    const [abaImportar, setAbaImportar] = useState('pagamentos');
    
    // Dados para importação
    const [pagamentosImportar, setPagamentosImportar] = useState([]);
    const [orcamentoImportar, setOrcamentoImportar] = useState([]);
    const [buscaImportar, setBuscaImportar] = useState('');
    
    // Formulário manual
    const [formManual, setFormManual] = useState({
        descricao: '',
        tipo: 'material',
        fornecedor: '',
        telefone: '',
        valor: '',
        data_prevista: '',
        observacoes: ''
    });
    
    // Formulário de importação
    const [formImportar, setFormImportar] = useState({
        descricao: '',
        fornecedor: '',
        telefone: '',
        valor: '',
        data_prevista: '',
        observacoes: '',
        origem: '',
        pagamento_servico_id: null,
        orcamento_item_id: null
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
            default:
                return <span style={{ ...styles.badge, ...styles.badgeManual }}>Manual</span>;
        }
    };

    const getStatusBadge = (status, dataPrevista) => {
        // Calcular dias de atraso
        let diasAtraso = 0;
        if (status === 'atrasado' && dataPrevista) {
            const hoje = new Date();
            const prevista = new Date(dataPrevista + 'T00:00:00');
            diasAtraso = Math.floor((hoje - prevista) / (1000 * 60 * 60 * 24));
        }
        
        switch (status) {
            case 'aguardando':
                return <span style={{ ...styles.badge, ...styles.badgeAguardando }}>⏳ Aguardando</span>;
            case 'concluido':
                return <span style={{ ...styles.badge, ...styles.badgeConcluido }}>✓ Concluído</span>;
            case 'atrasado':
                return <span style={{ ...styles.badge, ...styles.badgeAtrasado }}>⚠️ {diasAtraso}d atraso</span>;
            default:
                return null;
        }
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

    useEffect(() => {
        carregarDemandas();
    }, [carregarDemandas]);

    useEffect(() => {
        if (showModalImportar) {
            carregarPagamentosImportar();
            carregarOrcamentoImportar();
        }
    }, [showModalImportar, carregarPagamentosImportar, carregarOrcamentoImportar]);

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
                    tipo: 'material'
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
                observacoes: '',
                origem: '',
                pagamento_servico_id: null,
                orcamento_item_id: null
            });
            carregarDemandas();
            carregarPagamentosImportar();
            carregarOrcamentoImportar();
        } catch (err) {
            alert(err.message);
        }
    };

    const concluirDemanda = async (demanda, dataConclusao, observacoes) => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/${demanda.id}/concluir`, {
                method: 'PUT',
                body: JSON.stringify({
                    data_conclusao: dataConclusao,
                    observacoes
                })
            });
            
            if (!res.ok) throw new Error('Erro ao concluir demanda');
            
            setShowModalConcluir(null);
            carregarDemandas();
        } catch (err) {
            alert(err.message);
        }
    };

    const reabrirDemanda = async (demanda) => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/agenda/${demanda.id}/reabrir`, {
                method: 'PUT'
            });
            
            if (!res.ok) throw new Error('Erro ao reabrir demanda');
            carregarDemandas();
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

    const selecionarParaImportar = (item, tipo) => {
        if (tipo === 'pagamento') {
            setFormImportar({
                descricao: item.descricao,
                fornecedor: item.fornecedor || '',
                telefone: item.telefone || '',
                valor: item.valor,
                data_prevista: '',
                observacoes: `Serviço: ${item.servico || '-'} | Pago em: ${formatDate(item.data_pagamento)}`,
                origem: 'pagamento',
                pagamento_servico_id: item.id,
                orcamento_item_id: null
            });
        } else {
            setFormImportar({
                descricao: item.descricao,
                fornecedor: '',
                telefone: '',
                valor: item.valor,
                data_prevista: '',
                observacoes: `Etapa: ${item.etapa} | Qtd: ${item.quantidade}`,
                origem: 'orcamento',
                pagamento_servico_id: null,
                orcamento_item_id: item.id
            });
        }
        setShowModalImportar(false);
        setShowModalConfirmar(tipo);
    };

    // =====================================================
    // FILTROS E CÁLCULOS
    // =====================================================
    const demandasFiltradas = demandas.filter(d => {
        if (filtro === 'todos') return true;
        return d.status === filtro;
    });

    const atrasados = demandas.filter(d => d.status === 'atrasado');
    const aguardando = demandas.filter(d => d.status === 'aguardando');
    const concluidos = demandas.filter(d => d.status === 'concluido');

    // Agrupar por período
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    
    const inicioProxSemana = new Date(fimSemana);
    inicioProxSemana.setDate(fimSemana.getDate() + 1);
    const fimProxSemana = new Date(inicioProxSemana);
    fimProxSemana.setDate(inicioProxSemana.getDate() + 6);

    const estaSemana = demandasFiltradas.filter(d => {
        if (d.status !== 'aguardando') return false;
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data >= inicioSemana && data <= fimSemana;
    });

    const proximaSemana = demandasFiltradas.filter(d => {
        if (d.status !== 'aguardando') return false;
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data >= inicioProxSemana && data <= fimProxSemana;
    });

    const futuro = demandasFiltradas.filter(d => {
        if (d.status !== 'aguardando') return false;
        const data = new Date(d.data_prevista + 'T00:00:00');
        return data > fimProxSemana;
    });

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
                        📅 Agenda de Demandas
                    </h1>
                    <p style={styles.subtitle}>{obaNome || 'Obra'}</p>
                </div>
                <div style={styles.headerActions}>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                        onClick={() => setShowModalManual(true)}
                    >
                        ✏️ Cadastrar Manual
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
                <div style={{ ...styles.kpiCard, borderLeftColor: '#f59e0b' }}>
                    <div style={styles.kpiLabel}>⏳ Aguardando</div>
                    <div style={styles.kpiValue}>{aguardando.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#ef4444' }}>
                    <div style={styles.kpiLabel}>⚠️ Atrasados</div>
                    <div style={styles.kpiValue}>{atrasados.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#10b981' }}>
                    <div style={styles.kpiLabel}>✓ Concluídos</div>
                    <div style={styles.kpiValue}>{concluidos.length}</div>
                </div>
                <div style={{ ...styles.kpiCard, borderLeftColor: '#6366f1' }}>
                    <div style={styles.kpiLabel}>📋 Total</div>
                    <div style={styles.kpiValue}>{demandas.length}</div>
                </div>
            </div>

            {/* Filtros */}
            <div style={styles.filterBar}>
                {['todos', 'aguardando', 'atrasado', 'concluido'].map(f => (
                    <button
                        key={f}
                        style={{
                            ...styles.filterChip,
                            ...(filtro === f ? styles.filterChipActive : {})
                        }}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' && `Todos (${demandas.length})`}
                        {f === 'aguardando' && `⏳ Aguardando (${aguardando.length})`}
                        {f === 'atrasado' && `⚠️ Atrasados (${atrasados.length})`}
                        {f === 'concluido' && `✓ Concluídos (${concluidos.length})`}
                    </button>
                ))}
            </div>

            {/* Alerta de Atrasados */}
            {atrasados.length > 0 && filtro !== 'concluido' && (
                <div style={styles.alertBanner}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                            {atrasados.length} {atrasados.length === 1 ? 'item atrasado' : 'itens atrasados'}!
                        </div>
                        <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                            Entre em contato com os fornecedores para atualizar as datas
                        </div>
                    </div>
                </div>
            )}

            {/* Lista vazia */}
            {demandas.length === 0 && (
                <div style={styles.card}>
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <div style={styles.emptyTitle}>Nenhuma demanda agendada</div>
                        <div style={styles.emptyText}>
                            Importe de pagamentos/orçamento ou cadastre manualmente
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
                                ✏️ Cadastrar Manual
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Atrasados */}
            {atrasados.length > 0 && (filtro === 'todos' || filtro === 'atrasado') && (
                <div style={styles.section}>
                    <h3 style={{ ...styles.sectionTitle, color: '#dc2626' }}>🔴 Atrasados</h3>
                    <div style={styles.card}>
                        {atrasados.map(demanda => (
                            <div key={demanda.id} style={{ ...styles.demandaItem, backgroundColor: '#fef2f2' }}>
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>👤 {demanda.fornecedor || 'Sem fornecedor'}</span>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                        {demanda.telefone && <span>📞 {demanda.telefone}</span>}
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                {getStatusBadge(demanda.status, demanda.data_prevista)}
                                <div style={styles.demandaActions}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSuccess, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => setShowModalConcluir(demanda)}
                                    >
                                        ✓ Concluído
                                    </button>
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
            {estaSemana.length > 0 && (filtro === 'todos' || filtro === 'aguardando') && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>📋 Esta Semana</h3>
                    <div style={styles.card}>
                        {estaSemana.map(demanda => (
                            <div key={demanda.id} style={styles.demandaItem}>
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>👤 {demanda.fornecedor || 'Sem fornecedor'}</span>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                {getStatusBadge(demanda.status)}
                                <div style={styles.demandaActions}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSuccess, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => setShowModalConcluir(demanda)}
                                    >
                                        ✓ Concluído
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Próxima Semana */}
            {proximaSemana.length > 0 && (filtro === 'todos' || filtro === 'aguardando') && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>📅 Próxima Semana</h3>
                    <div style={styles.card}>
                        {proximaSemana.map(demanda => (
                            <div key={demanda.id} style={styles.demandaItem}>
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>👤 {demanda.fornecedor || 'Sem fornecedor'}</span>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                {getStatusBadge(demanda.status)}
                                <div style={styles.demandaActions}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSuccess, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => setShowModalConcluir(demanda)}
                                    >
                                        ✓ Concluído
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Futuro */}
            {futuro.length > 0 && (filtro === 'todos' || filtro === 'aguardando') && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>🗓️ Mais Adiante</h3>
                    <div style={styles.card}>
                        {futuro.map(demanda => (
                            <div key={demanda.id} style={styles.demandaItem}>
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>👤 {demanda.fornecedor || 'Sem fornecedor'}</span>
                                        <span>📅 {formatDate(demanda.data_prevista)}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                {getStatusBadge(demanda.status)}
                                <div style={styles.demandaActions}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSuccess, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => setShowModalConcluir(demanda)}
                                    >
                                        ✓ Concluído
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Concluídos */}
            {concluidos.length > 0 && (filtro === 'todos' || filtro === 'concluido') && (
                <div style={styles.section}>
                    <h3 style={{ ...styles.sectionTitle, color: '#059669' }}>✅ Concluídos</h3>
                    <div style={styles.card}>
                        {concluidos.slice(0, filtro === 'concluido' ? undefined : 5).map(demanda => (
                            <div key={demanda.id} style={{ ...styles.demandaItem, opacity: 0.7 }}>
                                <div style={styles.demandaIcon}>{getTipoIcon(demanda.tipo)}</div>
                                <div style={styles.demandaInfo}>
                                    <div style={styles.demandaTitle}>
                                        {demanda.descricao}
                                        {getOrigemBadge(demanda.origem)}
                                    </div>
                                    <div style={styles.demandaMeta}>
                                        <span>👤 {demanda.fornecedor || 'Sem fornecedor'}</span>
                                        <span>📅 Previsto: {formatDateShort(demanda.data_prevista)}</span>
                                        <span>✓ Concluído: {formatDateShort(demanda.data_conclusao)}</span>
                                    </div>
                                </div>
                                <div style={styles.demandaValor}>{formatCurrency(demanda.valor)}</div>
                                {getStatusBadge(demanda.status)}
                                <div style={styles.demandaActions}>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 12px', fontSize: '12px' }}
                                        onClick={() => reabrirDemanda(demanda)}
                                        title="Reabrir"
                                    >
                                        ↩️ Reabrir
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filtro === 'todos' && concluidos.length > 5 && (
                            <div style={{ padding: '16px', textAlign: 'center' }}>
                                <button 
                                    style={{ ...styles.button, ...styles.buttonSecondary }}
                                    onClick={() => setFiltro('concluido')}
                                >
                                    Ver todos os {concluidos.length} concluídos
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Cadastro Manual */}
            {showModalManual && (
                <div style={styles.modalOverlay} onClick={() => setShowModalManual(false)}>
                    <div style={styles.modalSmall} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>✏️ Cadastrar Manualmente</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalManual(false)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>📦 Descrição *</label>
                                <input 
                                    type="text" 
                                    style={styles.input}
                                    value={formManual.descricao}
                                    onChange={(e) => setFormManual({...formManual, descricao: e.target.value})}
                                    placeholder="Ex: Porcelanato 60x60, Visita técnica..."
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>📋 Tipo</label>
                                <select 
                                    style={styles.input}
                                    value={formManual.tipo}
                                    onChange={(e) => setFormManual({...formManual, tipo: e.target.value})}
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
                                            <div style={{ ...styles.listIcon, backgroundColor: '#dbeafe' }}>💳</div>
                                            <div style={styles.listInfo}>
                                                <div style={styles.listTitle}>{item.descricao}</div>
                                                <div style={styles.listMeta}>
                                                    <span>🔧 {item.servico || '-'}</span>
                                                    <span>👤 {item.fornecedor || '-'}</span>
                                                    <span>📅 Pago em {formatDate(item.data_pagamento)}</span>
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
                            )}
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
                                        Dados importados de {showModalConfirmar === 'pagamento' ? 'Pagamento' : 'Orçamento'}
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
                                            style={{ ...styles.input, borderColor: '#fbbf24' }}
                                            value={formImportar.data_prevista}
                                            onChange={(e) => setFormImportar({...formImportar, data_prevista: e.target.value})}
                                        />
                                    </div>
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

            {/* Modal Concluir */}
            {showModalConcluir && (
                <div style={styles.modalOverlay} onClick={() => setShowModalConcluir(null)}>
                    <div style={styles.modalSmall} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>✓ Confirmar Conclusão</h2>
                            <button style={styles.closeBtn} onClick={() => setShowModalConcluir(null)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.infoBox}>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Descrição:</span>
                                    <span style={styles.infoValue}>{showModalConcluir.descricao}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Fornecedor:</span>
                                    <span style={styles.infoValue}>{showModalConcluir.fornecedor || '-'}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Previsão:</span>
                                    <span style={styles.infoValue}>{formatDate(showModalConcluir.data_prevista)}</span>
                                </div>
                                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                                    <span style={styles.infoLabel}>Valor:</span>
                                    <span style={{ ...styles.infoValue, color: '#059669' }}>
                                        {formatCurrency(showModalConcluir.valor)}
                                    </span>
                                </div>
                            </div>

                            <ConcluirForm 
                                onConcluir={(data, obs) => concluirDemanda(showModalConcluir, data, obs)}
                                onCancelar={() => setShowModalConcluir(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente auxiliar para o formulário de conclusão
const ConcluirForm = ({ onConcluir, onCancelar }) => {
    const [dataConclusao, setDataConclusao] = useState(new Date().toISOString().split('T')[0]);
    const [observacoes, setObservacoes] = useState('');

    return (
        <>
            <div style={styles.formGroup}>
                <label style={styles.label}>📅 Data da Conclusão</label>
                <input 
                    type="date" 
                    style={styles.input}
                    value={dataConclusao}
                    onChange={(e) => setDataConclusao(e.target.value)}
                />
            </div>
            <div style={styles.formGroup}>
                <label style={styles.label}>📝 Observações (opcional)</label>
                <textarea 
                    style={{...styles.input, minHeight: '80px'}}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Entregue completo, sem avarias..."
                />
            </div>
            <div style={styles.modalFooter}>
                <button 
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={onCancelar}
                >
                    Cancelar
                </button>
                <button 
                    style={{ ...styles.button, ...styles.buttonSuccess }}
                    onClick={() => onConcluir(dataConclusao, observacoes)}
                >
                    ✓ Confirmar Conclusão
                </button>
            </div>
        </>
    );
};

export default AgendaDemandas;
