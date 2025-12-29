/**
 * =====================================================
 * OBRALY - MÓDULO DE ORÇAMENTO DE ENGENHARIA
 * =====================================================
 * 
 * Componente para gerenciar orçamento detalhado de obras
 * com integração automática ao Kanban de serviços
 * 
 * =====================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import UploadPlantaModal from './UploadPlantaModal';

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
    buttonInfo: {
        backgroundColor: '#3b82f6',
        color: '#fff'
    },
    buttonDanger: {
        backgroundColor: '#ef4444',
        color: '#fff'
    },
    buttonSmall: {
        padding: '6px 12px',
        fontSize: '12px'
    },
    // Cards de Resumo
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    summaryLabel: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px'
    },
    summaryValue: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1e293b'
    },
    summarySubtext: {
        fontSize: '11px',
        color: '#94a3b8',
        marginTop: '4px'
    },
    // BDI Config
    bdiConfig: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#92400e'
    },
    bdiInput: {
        width: '50px',
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid #fcd34d',
        fontSize: '13px',
        textAlign: 'center'
    },
    // Progress Bar
    progressContainer: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    progressBar: {
        height: '12px',
        backgroundColor: '#e2e8f0',
        borderRadius: '6px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#16a34a',
        borderRadius: '6px',
        transition: 'width 0.5s'
    },
    // Tabela
    tableContainer: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
    },
    th: {
        backgroundColor: '#f8fafc',
        padding: '12px 12px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#475569',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        whiteSpace: 'nowrap'
    },
    thRight: {
        textAlign: 'right'
    },
    thCenter: {
        textAlign: 'center'
    },
    // Etapa Row
    etapaRow: {
        backgroundColor: '#4f46e5',
        color: '#fff',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    etapaTd: {
        padding: '12px',
        fontWeight: '600',
        fontSize: '13px'
    },
    // Item Row
    itemRow: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s',
        cursor: 'pointer'
    },
    td: {
        padding: '10px 12px',
        color: '#334155',
        verticalAlign: 'middle'
    },
    tdCodigo: {
        color: '#64748b',
        fontFamily: 'monospace',
        fontSize: '11px'
    },
    tdDescricao: {
        fontWeight: '500',
        maxWidth: '250px'
    },
    tdUnidade: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: '11px'
    },
    tdNumero: {
        textAlign: 'right',
        fontFamily: 'monospace',
        fontSize: '12px'
    },
    tdTotal: {
        textAlign: 'right',
        fontWeight: '600',
        color: '#1e293b'
    },
    // Status
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    statusPago: {
        backgroundColor: '#dcfce7',
        color: '#16a34a'
    },
    statusEmAndamento: {
        backgroundColor: '#fef3c7',
        color: '#d97706'
    },
    statusAFazer: {
        backgroundColor: '#f1f5f9',
        color: '#64748b'
    },
    // Serviço Badge
    servicoBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: '600',
        backgroundColor: '#dbeafe',
        color: '#2563eb',
        marginLeft: '6px'
    },
    // Subtotal Row
    subtotalRow: {
        backgroundColor: '#f1f5f9',
        fontWeight: '600'
    },
    subtotalTd: {
        padding: '8px 12px',
        fontSize: '12px'
    },
    // Total Row
    totalRow: {
        backgroundColor: '#1e293b',
        color: '#fff'
    },
    totalTd: {
        padding: '14px 12px',
        fontSize: '14px',
        fontWeight: '700'
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
        backgroundColor: '#fff',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0
    },
    modalBody: {
        padding: '24px'
    },
    modalFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#9ca3af',
        padding: '0'
    },
    // Form
    formGroup: {
        marginBottom: '16px'
    },
    formLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '6px'
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
    },
    formRow3: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px'
    },
    // Radio Group
    radioGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
    },
    radioOption: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '6px',
        transition: 'background-color 0.2s'
    },
    radioOptionSelected: {
        backgroundColor: '#eff6ff'
    },
    // Autocomplete
    autocompleteContainer: {
        position: 'relative'
    },
    autocompleteDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 100
    },
    autocompleteSection: {
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        fontSize: '11px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        borderBottom: '1px solid #e2e8f0'
    },
    autocompleteItem: {
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s'
    },
    autocompleteItemHover: {
        backgroundColor: '#f1f5f9'
    },
    // Info Box
    infoBox: {
        padding: '12px 16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe',
        fontSize: '13px',
        color: '#1e40af',
        marginTop: '16px'
    },
    // Empty State
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#9ca3af'
    },
    // Actions
    actionsCell: {
        display: 'flex',
        gap: '4px',
        justifyContent: 'flex-end'
    },
    actionBtn: {
        padding: '4px 6px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        fontSize: '12px',
        transition: 'background-color 0.2s'
    },
    // Valor Pago
    valorPago: {
        fontSize: '10px',
        color: '#16a34a',
        fontWeight: '500'
    }
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value || 0);
};

const formatNumber = (value, decimals = 2) => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value || 0);
};

// =====================================================
// COMPONENTE: MODAL NOVA ETAPA
// =====================================================

const NovaEtapaModal = ({ onClose, onSave }) => {
    const [nome, setNome] = useState('');
    const [codigo, setCodigo] = useState('');
    const [salvando, setSalvando] = useState(false);

    const handleSalvar = async () => {
        if (!nome.trim()) return;
        setSalvando(true);
        await onSave({ nome: nome.trim(), codigo: codigo.trim() });
        setSalvando(false);
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>➕ Nova Etapa</h2>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Código (opcional)</label>
                            <input 
                                type="text" 
                                style={styles.formInput}
                                value={codigo}
                                onChange={e => setCodigo(e.target.value)}
                                placeholder="Ex: 01"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Nome da Etapa *</label>
                            <input 
                                type="text" 
                                style={styles.formInput}
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Ex: FUNDAÇÃO"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSecondary }} 
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSuccess }}
                        onClick={handleSalvar}
                        disabled={!nome.trim() || salvando}
                    >
                        {salvando ? 'Salvando...' : '💾 Salvar Etapa'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =====================================================
// COMPONENTE: MODAL NOVO ITEM
// =====================================================

const NovoItemModal = ({ onClose, onSave, etapas, etapaId, apiUrl, itemParaEditar = null }) => {
    const isEdicao = !!itemParaEditar;
    
    const [form, setForm] = useState({
        etapa_id: itemParaEditar?.etapa_id || etapaId || '',
        codigo: itemParaEditar?.codigo || '',
        descricao: itemParaEditar?.descricao || '',
        unidade: itemParaEditar?.unidade || 'm²',
        quantidade: itemParaEditar?.quantidade?.toString() || '',
        tipo_composicao: itemParaEditar?.tipo_composicao || 'separado',
        preco_mao_obra: itemParaEditar?.preco_mao_obra?.toString() || '',
        preco_material: itemParaEditar?.preco_material?.toString() || '',
        preco_unitario: itemParaEditar?.preco_unitario?.toString() || '',
        rateio_mo: itemParaEditar?.rateio_mo || 50,
        rateio_mat: itemParaEditar?.rateio_mat || 50,
        opcao_servico: 'criar',
        servico_id: itemParaEditar?.servico_id || null,
        responsavel: '',
        salvar_biblioteca: !isEdicao
    });
    
    const [salvando, setSalvando] = useState(false);
    const [autocomplete, setAutocomplete] = useState({ show: false, results: { usuario: [], base: [] } });
    const [buscando, setBuscando] = useState(false);

    // Resetar form para novo item
    const resetForm = () => {
        setForm({
            etapa_id: etapaId || form.etapa_id,
            codigo: '',
            descricao: '',
            unidade: 'm²',
            quantidade: '',
            tipo_composicao: 'separado',
            preco_mao_obra: '',
            preco_material: '',
            preco_unitario: '',
            rateio_mo: 50,
            rateio_mat: 50,
            opcao_servico: 'criar',
            servico_id: null,
            responsavel: '',
            salvar_biblioteca: true
        });
    };

    // Buscar autocomplete
    const buscarAutocomplete = useCallback(async (termo) => {
        if (termo.length < 2) {
            setAutocomplete({ show: false, results: { usuario: [], base: [] } });
            return;
        }
        
        setBuscando(true);
        try {
            const res = await localFetchWithAuth(`${apiUrl}/servicos-autocomplete?q=${encodeURIComponent(termo)}`);
            if (res.ok) {
                const data = await res.json();
                setAutocomplete({
                    show: true,
                    results: {
                        usuario: data.servicos_usuario || [],
                        base: data.servicos_base || []
                    }
                });
            }
        } catch (e) {
            console.error('Erro no autocomplete:', e);
        }
        setBuscando(false);
    }, [apiUrl]);

    // Debounce para autocomplete
    useEffect(() => {
        const timer = setTimeout(() => {
            if (form.descricao.length >= 2) {
                buscarAutocomplete(form.descricao);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [form.descricao, buscarAutocomplete]);

    // Selecionar item do autocomplete
    const selecionarAutocomplete = (servico) => {
        setForm(prev => ({
            ...prev,
            descricao: servico.descricao,
            unidade: servico.unidade,
            tipo_composicao: servico.tipo_composicao,
            preco_mao_obra: servico.preco_mao_obra || '',
            preco_material: servico.preco_material || '',
            preco_unitario: servico.preco_unitario || '',
            rateio_mo: servico.rateio_mo || 50,
            rateio_mat: servico.rateio_mat || 50
        }));
        setAutocomplete({ show: false, results: { usuario: [], base: [] } });
    };

    // Calcular total
    const calcularTotal = () => {
        const qtd = parseFloat(form.quantidade) || 0;
        if (form.tipo_composicao === 'composto') {
            return qtd * (parseFloat(form.preco_unitario) || 0);
        } else {
            const mo = qtd * (parseFloat(form.preco_mao_obra) || 0);
            const mat = qtd * (parseFloat(form.preco_material) || 0);
            return mo + mat;
        }
    };

    const handleSalvar = async (continuarAdicionando = false) => {
        if (!form.etapa_id || !form.descricao || !form.unidade) return;
        setSalvando(true);
        const sucesso = await onSave(form, isEdicao, itemParaEditar?.id);
        setSalvando(false);
        
        if (sucesso && continuarAdicionando) {
            resetForm();
        } else if (sucesso) {
            onClose();
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{ ...styles.modal, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{isEdicao ? '✏️ Editar Item do Orçamento' : '➕ Novo Item do Orçamento'}</h2>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                
                <div style={styles.modalBody}>
                    {/* Etapa */}
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Etapa *</label>
                        <select 
                            style={styles.formInput}
                            value={form.etapa_id}
                            onChange={e => setForm({...form, etapa_id: e.target.value})}
                        >
                            <option value="">Selecione a etapa...</option>
                            {etapas.map(e => (
                                <option key={e.id} value={e.id}>{e.codigo} - {e.nome}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Código e Descrição */}
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Código (auto)</label>
                            <input 
                                type="text" 
                                style={styles.formInput}
                                value={form.codigo}
                                onChange={e => setForm({...form, codigo: e.target.value})}
                                placeholder="Ex: 01.01"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Unidade *</label>
                            <select 
                                style={styles.formInput}
                                value={form.unidade}
                                onChange={e => setForm({...form, unidade: e.target.value})}
                            >
                                <option value="m²">m² - Metro quadrado</option>
                                <option value="m³">m³ - Metro cúbico</option>
                                <option value="m">m - Metro linear</option>
                                <option value="kg">kg - Quilograma</option>
                                <option value="un">un - Unidade</option>
                                <option value="pt">pt - Ponto</option>
                                <option value="vb">vb - Verba</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Descrição com Autocomplete */}
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Descrição do Serviço *</label>
                        <div style={styles.autocompleteContainer}>
                            <input 
                                type="text" 
                                style={styles.formInput}
                                value={form.descricao}
                                onChange={e => setForm({...form, descricao: e.target.value})}
                                placeholder="Digite para buscar ou criar..."
                                onFocus={() => form.descricao.length >= 2 && buscarAutocomplete(form.descricao)}
                                onBlur={() => setTimeout(() => setAutocomplete(prev => ({...prev, show: false})), 200)}
                            />
                            {buscando && <span style={{ position: 'absolute', right: 12, top: 12, fontSize: '12px', color: '#9ca3af' }}>Buscando...</span>}
                            
                            {autocomplete.show && (autocomplete.results.usuario.length > 0 || autocomplete.results.base.length > 0) && (
                                <div style={styles.autocompleteDropdown}>
                                    {autocomplete.results.usuario.length > 0 && (
                                        <>
                                            <div style={styles.autocompleteSection}>📋 Meus Serviços</div>
                                            {autocomplete.results.usuario.map(s => (
                                                <div 
                                                    key={`u-${s.id}`}
                                                    style={styles.autocompleteItem}
                                                    onClick={() => selecionarAutocomplete(s)}
                                                    onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                                                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '500' }}>{s.descricao}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        {s.unidade} • {s.tipo_composicao === 'composto' 
                                                            ? formatCurrency(s.preco_unitario)
                                                            : `MO: ${formatCurrency(s.preco_mao_obra)} | Mat: ${formatCurrency(s.preco_material)}`
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {autocomplete.results.base.length > 0 && (
                                        <>
                                            <div style={styles.autocompleteSection}>📚 Base de Referência</div>
                                            {autocomplete.results.base.map(s => (
                                                <div 
                                                    key={`b-${s.id}`}
                                                    style={styles.autocompleteItem}
                                                    onClick={() => selecionarAutocomplete(s)}
                                                    onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                                                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '500' }}>{s.descricao}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        {s.unidade} • {s.tipo_composicao === 'composto' 
                                                            ? formatCurrency(s.preco_unitario)
                                                            : `MO: ${formatCurrency(s.preco_mao_obra)} | Mat: ${formatCurrency(s.preco_material)}`
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Tipo de Composição */}
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>💰 Tipo de Composição</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    checked={form.tipo_composicao === 'separado'}
                                    onChange={() => setForm({...form, tipo_composicao: 'separado'})}
                                />
                                Separado (MO + Material)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    checked={form.tipo_composicao === 'composto'}
                                    onChange={() => setForm({...form, tipo_composicao: 'composto'})}
                                />
                                Composto (Preço fechado)
                            </label>
                        </div>
                    </div>
                    
                    {/* Quantidade e Valores */}
                    {form.tipo_composicao === 'separado' ? (
                        <div style={styles.formRow3}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Quantidade</label>
                                <input 
                                    type="number" 
                                    style={styles.formInput}
                                    value={form.quantidade}
                                    onChange={e => setForm({...form, quantidade: e.target.value})}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Mão de Obra (R$/{form.unidade})</label>
                                <input 
                                    type="number" 
                                    style={styles.formInput}
                                    value={form.preco_mao_obra}
                                    onChange={e => setForm({...form, preco_mao_obra: e.target.value})}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Material (R$/{form.unidade})</label>
                                <input 
                                    type="number" 
                                    style={styles.formInput}
                                    value={form.preco_material}
                                    onChange={e => setForm({...form, preco_material: e.target.value})}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Quantidade</label>
                                    <input 
                                        type="number" 
                                        style={styles.formInput}
                                        value={form.quantidade}
                                        onChange={e => setForm({...form, quantidade: e.target.value})}
                                        placeholder="0,00"
                                        step="0.01"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Preço Unitário (R$/{form.unidade})</label>
                                    <input 
                                        type="number" 
                                        style={styles.formInput}
                                        value={form.preco_unitario}
                                        onChange={e => setForm({...form, preco_unitario: e.target.value})}
                                        placeholder="0,00"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Rateio Estimado (para relatórios)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '13px' }}>MO:</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={form.rateio_mo}
                                        onChange={e => setForm({
                                            ...form, 
                                            rateio_mo: parseInt(e.target.value),
                                            rateio_mat: 100 - parseInt(e.target.value)
                                        })}
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ fontSize: '13px', minWidth: '80px' }}>
                                        {form.rateio_mo}% / {form.rateio_mat}%
                                    </span>
                                    <span style={{ fontSize: '13px' }}>:Mat</span>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Resumo do Item */}
                    <div style={{ 
                        padding: '12px 16px', 
                        backgroundColor: '#f0fdf4', 
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0',
                        marginBottom: '16px'
                    }}>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', marginBottom: '4px' }}>
                            📊 TOTAL DO ITEM
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#15803d' }}>
                            {formatCurrency(calcularTotal())}
                        </div>
                        {form.tipo_composicao === 'separado' && (
                            <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                                MO: {formatCurrency((parseFloat(form.quantidade) || 0) * (parseFloat(form.preco_mao_obra) || 0))} | 
                                Mat: {formatCurrency((parseFloat(form.quantidade) || 0) * (parseFloat(form.preco_material) || 0))}
                            </div>
                        )}
                    </div>
                    
                    {/* Opções de Serviço */}
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>📦 Criação de Serviço no Kanban</label>
                        <div style={styles.radioGroup}>
                            <label style={{
                                ...styles.radioOption,
                                ...(form.opcao_servico === 'criar' ? styles.radioOptionSelected : {})
                            }}>
                                <input 
                                    type="radio" 
                                    checked={form.opcao_servico === 'criar'}
                                    onChange={() => setForm({...form, opcao_servico: 'criar'})}
                                />
                                <div>
                                    <strong>Criar serviço automaticamente</strong>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        Um novo card será criado no Kanban com os valores deste item
                                    </div>
                                </div>
                            </label>
                            
                            <label style={{
                                ...styles.radioOption,
                                ...(form.opcao_servico === 'nao' ? styles.radioOptionSelected : {})
                            }}>
                                <input 
                                    type="radio" 
                                    checked={form.opcao_servico === 'nao'}
                                    onChange={() => setForm({...form, opcao_servico: 'nao'})}
                                />
                                <div>
                                    <strong>Não criar serviço agora</strong>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        Apenas salvar no orçamento (pode vincular depois)
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    {/* Responsável */}
                    {form.opcao_servico === 'criar' && (
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Responsável pelo Serviço (opcional)</label>
                            <input 
                                type="text" 
                                style={styles.formInput}
                                value={form.responsavel}
                                onChange={e => setForm({...form, responsavel: e.target.value})}
                                placeholder="Nome do responsável"
                            />
                        </div>
                    )}
                    
                    {/* Salvar na Biblioteca */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <input 
                            type="checkbox" 
                            id="salvarBiblioteca"
                            checked={form.salvar_biblioteca}
                            onChange={e => setForm({...form, salvar_biblioteca: e.target.checked})}
                        />
                        <label htmlFor="salvarBiblioteca" style={{ fontSize: '13px', color: '#4b5563', cursor: 'pointer' }}>
                            Salvar este serviço na minha biblioteca para uso futuro
                        </label>
                    </div>
                </div>
                
                <div style={styles.modalFooter}>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSecondary }} 
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    {!isEdicao && (
                        <button 
                            style={{ ...styles.button, ...styles.buttonInfo }}
                            onClick={() => handleSalvar(true)}
                            disabled={!form.etapa_id || !form.descricao || salvando}
                        >
                            {salvando ? 'Salvando...' : '💾 Salvar e Adicionar Outro'}
                        </button>
                    )}
                    <button 
                        style={{ ...styles.button, ...styles.buttonSuccess }}
                        onClick={() => handleSalvar(false)}
                        disabled={!form.etapa_id || !form.descricao || salvando}
                    >
                        {salvando ? 'Salvando...' : isEdicao ? '💾 Salvar Alterações' : '💾 Salvar Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =====================================================
// COMPONENTE PRINCIPAL: ORÇAMENTO DE ENGENHARIA
// =====================================================

const OrcamentoEngenharia = ({ obraId, obraNome, apiUrl, onClose }) => {
    const [dados, setDados] = useState({ etapas: [], resumo: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bdi, setBdi] = useState(0);
    const [etapasExpandidas, setEtapasExpandidas] = useState({});
    
    // Modais
    const [showNovaEtapa, setShowNovaEtapa] = useState(false);
    const [showNovoItem, setShowNovoItem] = useState(false);
    const [etapaParaNovoItem, setEtapaParaNovoItem] = useState(null);
    const [showUploadPlanta, setShowUploadPlanta] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);  // NOVO: para edição

    // Carregar dados
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng`);
            if (res.ok) {
                const data = await res.json();
                setDados(data);
                setBdi(data.resumo.bdi || 0);
                
                // Expandir todas as etapas por padrão
                const expandidas = {};
                data.etapas.forEach(e => expandidas[e.id] = true);
                setEtapasExpandidas(expandidas);
            } else {
                setError('Erro ao carregar orçamento');
            }
        } catch (e) {
            setError('Erro ao carregar orçamento');
            console.error(e);
        }
        setLoading(false);
    }, [apiUrl, obraId]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    // Toggle etapa
    const toggleEtapa = (etapaId) => {
        setEtapasExpandidas(prev => ({
            ...prev,
            [etapaId]: !prev[etapaId]
        }));
    };

    // Criar etapa
    const criarEtapa = async (dados) => {
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/etapas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                setShowNovaEtapa(false);
                carregarDados();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Criar/Editar item
    const salvarItem = async (form, isEdicao = false, itemId = null) => {
        try {
            const url = isEdicao 
                ? `${apiUrl}/obras/${obraId}/orcamento-eng/itens/${itemId}`
                : `${apiUrl}/obras/${obraId}/orcamento-eng/itens`;
            
            const res = await localFetchWithAuth(url, {
                method: isEdicao ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etapa_id: parseInt(form.etapa_id),
                    codigo: form.codigo,
                    descricao: form.descricao,
                    unidade: form.unidade,
                    quantidade: parseFloat(form.quantidade) || 0,
                    tipo_composicao: form.tipo_composicao,
                    preco_mao_obra: parseFloat(form.preco_mao_obra) || null,
                    preco_material: parseFloat(form.preco_material) || null,
                    preco_unitario: parseFloat(form.preco_unitario) || null,
                    rateio_mo: form.rateio_mo,
                    rateio_mat: form.rateio_mat,
                    opcao_servico: form.opcao_servico,
                    servico_id: form.servico_id,
                    responsavel: form.responsavel,
                    salvar_biblioteca: form.salvar_biblioteca
                })
            });
            if (res.ok) {
                carregarDados();
                return true;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    };
    
    // Handler para abrir edição de item
    const abrirEdicaoItem = (item) => {
        setItemParaEditar(item);
        setShowNovoItem(true);
    };
    
    // Handler para fechar modal
    const fecharModalItem = () => {
        setShowNovoItem(false);
        setItemParaEditar(null);
        setEtapaParaNovoItem(null);
    };

    // Deletar item
    const deletarItem = async (itemId) => {
        if (!window.confirm('Excluir este item e o serviço vinculado?')) return;
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/itens/${itemId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarDados();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Deletar etapa
    const deletarEtapa = async (etapaId) => {
        if (!window.confirm('Excluir esta etapa e todos os seus itens?')) return;
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/etapas/${etapaId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarDados();
            }
        } catch (e) {
            console.error(e);
        }
    };
    
    // Exportar para Excel
    const exportarExcel = () => {
        // Criar dados para CSV
        let csv = 'CÓDIGO;DESCRIÇÃO;UNIDADE;QTD;PREÇO MO;PREÇO MAT;TOTAL MO;TOTAL MAT;TOTAL\n';
        
        dados.etapas.forEach(etapa => {
            // Linha da etapa (header)
            csv += `${etapa.codigo};${etapa.nome};;;;;;;\n`;
            
            // Itens da etapa
            etapa.itens.forEach(item => {
                const totalMO = (item.quantidade || 0) * (item.preco_mao_obra || 0);
                const totalMat = (item.quantidade || 0) * (item.preco_material || 0);
                const total = item.total_geral || (totalMO + totalMat);
                
                csv += `${item.codigo};${item.descricao};${item.unidade};${item.quantidade || 0};`;
                csv += `${item.preco_mao_obra || 0};${item.preco_material || 0};`;
                csv += `${totalMO};${totalMat};${total}\n`;
            });
        });
        
        // Adicionar resumo
        csv += '\n;;;;;;;\n';
        csv += `RESUMO;;;;;;\n`;
        csv += `Total Mão de Obra;${resumoComBdi.total_mao_obra || 0};;;;;\n`;
        csv += `Total Material;${resumoComBdi.total_material || 0};;;;;\n`;
        csv += `Subtotal;${resumoComBdi.subtotal || 0};;;;;\n`;
        csv += `BDI (${bdi}%);${resumoComBdi.valor_bdi || 0};;;;;\n`;
        csv += `TOTAL GERAL;${resumoComBdi.total_geral || 0};;;;;\n`;
        
        // Download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `orcamento_${obraNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };
    
    // Importar de Excel/CSV
    const importarExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const linhas = text.split('\n').filter(l => l.trim());
            
            // Pular cabeçalho
            let etapaAtual = null;
            let itensParaImportar = [];
            
            for (let i = 1; i < linhas.length; i++) {
                const cols = linhas[i].split(';');
                if (cols.length < 3) continue;
                
                const codigo = cols[0]?.trim();
                const descricao = cols[1]?.trim();
                const unidade = cols[2]?.trim();
                
                // Linha de etapa (não tem unidade)
                if (codigo && descricao && !unidade) {
                    // Criar etapa se não existir
                    const etapaExistente = dados.etapas.find(e => e.codigo === codigo);
                    if (etapaExistente) {
                        etapaAtual = etapaExistente;
                    } else {
                        // Criar nova etapa
                        const resEtapa = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/etapas`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ codigo, nome: descricao })
                        });
                        if (resEtapa.ok) {
                            const novaEtapa = await resEtapa.json();
                            etapaAtual = novaEtapa;
                        }
                    }
                } else if (etapaAtual && descricao && unidade) {
                    // Linha de item
                    itensParaImportar.push({
                        etapa_id: etapaAtual.id,
                        codigo,
                        descricao,
                        unidade,
                        quantidade: parseFloat(cols[3]?.replace(',', '.')) || 0,
                        preco_mao_obra: parseFloat(cols[4]?.replace(',', '.')) || 0,
                        preco_material: parseFloat(cols[5]?.replace(',', '.')) || 0,
                        tipo_composicao: 'separado',
                        opcao_servico: 'nao'
                    });
                }
            }
            
            // Criar itens
            for (const item of itensParaImportar) {
                await salvarItem(item);
            }
            
            carregarDados();
            alert(`Importação concluída! ${itensParaImportar.length} itens importados.`);
        };
        
        reader.readAsText(file, 'UTF-8');
        event.target.value = ''; // Reset input
    };
    
    // Sincronizar valores dos Serviços do Kanban com o Orçamento de Engenharia
    const sincronizarServicos = async () => {
        if (!window.confirm('Atualizar os valores de todos os Serviços do Kanban com os valores do Orçamento de Engenharia?')) return;
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/sincronizar-servicos`, {
                method: 'POST'
            });
            
            if (res.ok) {
                const data = await res.json();
                alert(data.mensagem || 'Sincronização concluída!');
                carregarDados();
            } else {
                const data = await res.json();
                alert(data.erro || 'Erro ao sincronizar');
            }
        } catch (e) {
            console.error('Erro ao sincronizar:', e);
            alert('Erro ao sincronizar serviços');
        }
    };
    
    // Apagar todo o orçamento de engenharia
    const apagarOrcamentoCompleto = async () => {
        const confirmacao = window.prompt(
            '⚠️ ATENÇÃO: Esta ação irá APAGAR TODO o orçamento de engenharia!\n\n' +
            'Isso inclui:\n' +
            '- Todas as etapas\n' +
            '- Todos os itens\n' +
            '- Serviços vinculados (sem pagamentos)\n\n' +
            'Digite "APAGAR" para confirmar:'
        );
        
        if (confirmacao !== 'APAGAR') {
            if (confirmacao !== null) {
                alert('Operação cancelada. Digite exatamente "APAGAR" para confirmar.');
            }
            return;
        }
        
        try {
            const res = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/apagar-tudo`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                const data = await res.json();
                alert(`${data.mensagem}\n\nEtapas: ${data.etapas_deletadas}\nItens: ${data.itens_deletados}\nServiços: ${data.servicos_deletados}`);
                carregarDados();
            } else {
                const data = await res.json();
                alert(data.erro || 'Erro ao apagar orçamento');
            }
        } catch (e) {
            console.error('Erro ao apagar:', e);
            alert('Erro ao apagar orçamento');
        }
    };

    // Renderizar status
    const renderStatus = (item) => {
        const percent = item.percentual_executado || 0;
        if (percent >= 100) {
            return <span style={{ ...styles.statusBadge, ...styles.statusPago }}>✅ Pago</span>;
        } else if (percent > 0) {
            return <span style={{ ...styles.statusBadge, ...styles.statusEmAndamento }}>🔄 {percent.toFixed(0)}%</span>;
        } else {
            return <span style={{ ...styles.statusBadge, ...styles.statusAFazer }}>⏳ A Fazer</span>;
        }
    };

    // Calcular totais com BDI
    const resumoComBdi = useMemo(() => {
        const r = dados.resumo || {};
        const subtotal = r.subtotal || 0;
        const valorBdi = subtotal * (bdi / 100);
        const total = subtotal + valorBdi;
        return { ...r, bdi, valor_bdi: valorBdi, total_geral: total };
    }, [dados.resumo, bdi]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <p>Carregando orçamento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    <p>❌ {error}</p>
                    <button 
                        style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '12px' }}
                        onClick={carregarDados}
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
                    <h1 style={styles.title}>📋 Orçamento de Engenharia</h1>
                    <p style={styles.subtitle}>{obraNome}</p>
                </div>
                <div style={styles.headerActions}>
                    <div style={styles.bdiConfig}>
                        <span>📊 BDI:</span>
                        <input 
                            type="number" 
                            value={bdi}
                            onChange={e => setBdi(parseFloat(e.target.value) || 0)}
                            style={styles.bdiInput}
                            step="0.5"
                        />
                        <span>%</span>
                    </div>
                    <button 
                        style={{ 
                            ...styles.button, 
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            color: '#fff'
                        }}
                        onClick={() => setShowUploadPlanta(true)}
                        title="Gerar orçamento automaticamente a partir de uma planta baixa"
                    >
                        🤖 IA - Planta Baixa
                    </button>
                    <button 
                        style={{ ...styles.button, ...styles.buttonSuccess }}
                        onClick={() => setShowNovaEtapa(true)}
                    >
                        ➕ Nova Etapa
                    </button>
                    <button 
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                        onClick={() => setShowNovoItem(true)}
                    >
                        ➕ Novo Item
                    </button>
                    
                    {/* Botões de Excel */}
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid #e2e8f0' }}>
                        <button 
                            style={{ ...styles.button, ...styles.buttonSecondary, ...styles.buttonSmall }}
                            onClick={exportarExcel}
                            title="Exportar orçamento para CSV/Excel"
                        >
                            📥 Exportar
                        </button>
                        <label style={{ margin: 0 }}>
                            <input 
                                type="file" 
                                accept=".csv,.txt"
                                onChange={importarExcel}
                                style={{ display: 'none' }}
                            />
                            <span 
                                style={{ 
                                    ...styles.button, 
                                    ...styles.buttonSecondary, 
                                    ...styles.buttonSmall,
                                    cursor: 'pointer',
                                    display: 'inline-block'
                                }}
                                title="Importar orçamento de CSV/Excel"
                            >
                                📤 Importar
                            </span>
                        </label>
                        <button 
                            style={{ ...styles.button, ...styles.buttonSecondary, ...styles.buttonSmall }}
                            onClick={sincronizarServicos}
                            title="Sincronizar valores dos Serviços do Kanban com o Orçamento de Engenharia"
                        >
                            🔄 Sincronizar Kanban
                        </button>
                        <button 
                            style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonSmall }}
                            onClick={apagarOrcamentoCompleto}
                            title="Apagar todo o orçamento de engenharia"
                        >
                            🗑️ Apagar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Mão de Obra</div>
                    <div style={{ ...styles.summaryValue, color: '#4f46e5', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_mao_obra)}
                    </div>
                    <div style={styles.summarySubtext}>
                        Pago: {formatCurrency(resumoComBdi.total_pago_mo)}
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Material</div>
                    <div style={{ ...styles.summaryValue, color: '#10b981', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_material)}
                    </div>
                    <div style={styles.summarySubtext}>
                        Pago: {formatCurrency(resumoComBdi.total_pago_mat)}
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>BDI ({bdi}%)</div>
                    <div style={{ ...styles.summaryValue, color: '#f59e0b', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.valor_bdi)}
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Executado</div>
                    <div style={{ ...styles.summaryValue, color: '#16a34a', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_pago)}
                    </div>
                    <div style={styles.summarySubtext}>
                        {formatNumber(resumoComBdi.percentual_executado || 0, 1)}% do orçamento
                    </div>
                </div>
                <div style={{ ...styles.summaryCard, backgroundColor: '#1e293b' }}>
                    <div style={{ ...styles.summaryLabel, color: '#94a3b8' }}>Total Geral</div>
                    <div style={{ ...styles.summaryValue, color: '#fff', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_geral)}
                    </div>
                    <div style={{ ...styles.summarySubtext, color: '#64748b' }}>
                        {resumoComBdi.total_etapas || 0} etapas • {resumoComBdi.total_itens || 0} itens
                    </div>
                </div>
            </div>

            {/* Barra de Progresso */}
            <div style={styles.progressContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>📊 Progresso Geral</span>
                    <span style={{ fontWeight: '700', color: '#16a34a' }}>
                        {formatNumber(resumoComBdi.percentual_executado || 0, 1)}%
                    </span>
                </div>
                <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${resumoComBdi.percentual_executado || 0}%` }} />
                </div>
            </div>

            {/* Tabela */}
            {dados.etapas.length === 0 ? (
                <div style={{ ...styles.tableContainer, ...styles.emptyState }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma etapa cadastrada</p>
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>Clique em "Nova Etapa" para começar</p>
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: '70px' }}>Código</th>
                                    <th style={styles.th}>Descrição</th>
                                    <th style={{ ...styles.th, ...styles.thCenter, width: '50px' }}>Un.</th>
                                    <th style={{ ...styles.th, ...styles.thRight, width: '70px' }}>Qtd.</th>
                                    <th style={{ ...styles.th, ...styles.thRight, width: '90px' }}>M. Obra</th>
                                    <th style={{ ...styles.th, ...styles.thRight, width: '90px' }}>Material</th>
                                    <th style={{ ...styles.th, ...styles.thRight, width: '100px' }}>Total</th>
                                    <th style={{ ...styles.th, ...styles.thRight, width: '90px' }}>Pago</th>
                                    <th style={{ ...styles.th, ...styles.thCenter, width: '80px' }}>Status</th>
                                    <th style={{ ...styles.th, width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.etapas.map(etapa => (
                                    <React.Fragment key={etapa.id}>
                                        {/* Linha da Etapa */}
                                        <tr 
                                            style={styles.etapaRow}
                                            onClick={() => toggleEtapa(etapa.id)}
                                        >
                                            <td style={styles.etapaTd}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {etapasExpandidas[etapa.id] ? '▼' : '▶'} {etapa.codigo}
                                                </span>
                                            </td>
                                            <td style={styles.etapaTd} colSpan={5}>{etapa.nome}</td>
                                            <td style={{ ...styles.etapaTd, textAlign: 'right', fontWeight: '700' }}>
                                                {formatCurrency(etapa.total)}
                                            </td>
                                            <td style={{ ...styles.etapaTd, textAlign: 'right' }}>
                                                {formatCurrency(etapa.total_pago)}
                                            </td>
                                            <td style={{ ...styles.etapaTd, textAlign: 'center' }}>
                                                <span style={{ 
                                                    display: 'inline-block',
                                                    padding: '2px 8px', 
                                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                                    borderRadius: '10px',
                                                    fontSize: '11px'
                                                }}>
                                                    {formatNumber(etapa.percentual, 0)}%
                                                </span>
                                            </td>
                                            <td style={styles.etapaTd}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button 
                                                        style={{ ...styles.actionBtn, color: '#fff' }}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setEtapaParaNovoItem(etapa.id);
                                                            setShowNovoItem(true); 
                                                        }}
                                                        title="Adicionar item"
                                                    >
                                                        ➕
                                                    </button>
                                                    <button 
                                                        style={{ ...styles.actionBtn, color: '#fca5a5' }}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            deletarEtapa(etapa.id); 
                                                        }}
                                                        title="Excluir etapa"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        {/* Itens da Etapa */}
                                        {etapasExpandidas[etapa.id] && etapa.itens.map((item, idx) => (
                                            <tr 
                                                key={item.id}
                                                style={{
                                                    ...styles.itemRow,
                                                    backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => abrirEdicaoItem(item)}
                                                title="Clique para editar"
                                            >
                                                <td style={{ ...styles.td, ...styles.tdCodigo }}>{item.codigo}</td>
                                                <td style={{ ...styles.td, ...styles.tdDescricao }}>
                                                    {item.descricao}
                                                    {item.servico_id && (
                                                        <span style={styles.servicoBadge}>📦 Kanban</span>
                                                    )}
                                                    {item.tipo_composicao === 'composto' && (
                                                        <span style={{ ...styles.servicoBadge, backgroundColor: '#fef3c7', color: '#92400e' }}>
                                                            Composto
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdUnidade }}>{item.unidade}</td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    {formatNumber(item.quantidade, item.unidade === 'vb' || item.unidade === 'un' ? 0 : 2)}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    <div style={{ color: '#4f46e5' }}>{formatCurrency(item.total_mao_obra)}</div>
                                                    {item.valor_pago_mo > 0 && (
                                                        <div style={styles.valorPago}>✓ {formatCurrency(item.valor_pago_mo)}</div>
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    <div style={{ color: '#10b981' }}>{formatCurrency(item.total_material)}</div>
                                                    {item.valor_pago_mat > 0 && (
                                                        <div style={styles.valorPago}>✓ {formatCurrency(item.valor_pago_mat)}</div>
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdTotal }}>{formatCurrency(item.total)}</td>
                                                <td style={{ ...styles.td, ...styles.tdNumero, color: '#16a34a', fontWeight: '600' }}>
                                                    {formatCurrency(item.total_pago)}
                                                </td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    {renderStatus(item)}
                                                </td>
                                                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button 
                                                            style={{ ...styles.actionBtn, color: '#3b82f6' }}
                                                            onClick={() => abrirEdicaoItem(item)}
                                                            title="Editar item"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            style={{ ...styles.actionBtn, color: '#ef4444' }}
                                                            onClick={() => deletarItem(item.id)}
                                                            title="Excluir item"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                                
                                {/* Subtotal */}
                                <tr style={{ ...styles.subtotalRow, backgroundColor: '#e2e8f0' }}>
                                    <td style={{ ...styles.subtotalTd, fontWeight: '700' }} colSpan={6}>
                                        SUBTOTAL (sem BDI)
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'right', fontWeight: '700' }}>
                                        {formatCurrency(resumoComBdi.subtotal)}
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                                        {formatCurrency(resumoComBdi.total_pago)}
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'center', fontWeight: '700' }}>
                                        {formatNumber(resumoComBdi.percentual_executado || 0, 0)}%
                                    </td>
                                    <td></td>
                                </tr>
                                
                                {/* BDI */}
                                <tr style={{ backgroundColor: '#fef3c7' }}>
                                    <td style={{ ...styles.td, fontWeight: '600' }} colSpan={6}>
                                        BDI ({bdi}%)
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#92400e' }}>
                                        {formatCurrency(resumoComBdi.valor_bdi)}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                                
                                {/* Total Geral */}
                                <tr style={styles.totalRow}>
                                    <td style={styles.totalTd} colSpan={6}>💰 TOTAL GERAL</td>
                                    <td style={{ ...styles.totalTd, textAlign: 'right', fontSize: '16px' }}>
                                        {formatCurrency(resumoComBdi.total_geral)}
                                    </td>
                                    <td style={{ ...styles.totalTd, textAlign: 'right', color: '#22c55e' }}>
                                        {formatCurrency(resumoComBdi.total_pago)}
                                    </td>
                                    <td style={{ ...styles.totalTd, textAlign: 'center' }}>
                                        {formatNumber(resumoComBdi.percentual_executado || 0, 0)}%
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Legenda */}
            <div style={{ 
                marginTop: '20px', 
                padding: '16px 20px', 
                backgroundColor: '#fff', 
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap',
                fontSize: '12px'
            }}>
                <span style={{ fontWeight: '600' }}>Legenda:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={styles.servicoBadge}>📦 Kanban</span> Vinculado ao Kanban
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ ...styles.statusBadge, ...styles.statusPago }}>✅ Pago</span> 100%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ ...styles.statusBadge, ...styles.statusEmAndamento }}>🔄 %</span> Em andamento
                </span>
            </div>

            {/* Modais */}
            {showNovaEtapa && (
                <NovaEtapaModal 
                    onClose={() => setShowNovaEtapa(false)}
                    onSave={criarEtapa}
                />
            )}
            
            {showNovoItem && (
                <NovoItemModal 
                    onClose={fecharModalItem}
                    onSave={salvarItem}
                    etapas={dados.etapas}
                    etapaId={etapaParaNovoItem}
                    apiUrl={apiUrl}
                    itemParaEditar={itemParaEditar}
                />
            )}
            
            {showUploadPlanta && (
                <UploadPlantaModal 
                    onClose={() => setShowUploadPlanta(false)}
                    onImportar={carregarDados}
                    obraId={obraId}
                    apiUrl={apiUrl}
                />
            )}
        </div>
    );
};

export default OrcamentoEngenharia;
