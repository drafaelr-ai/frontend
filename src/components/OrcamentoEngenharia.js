/**
 * =====================================================
 * OBRALY - MÓDULO DE ORÇAMENTO DE ENGENHARIA
 * =====================================================
 * 
 * Componente para gerenciar orçamento detalhado de obras
 * com integração ao Cronograma de Obras
 * 
 * =====================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { notify, confirmDialog } from '../utils/notify';
import { logger } from '../utils/logger';
import { fetchWithAuth } from '../auth/fetchWithAuth';

// =====================================================
// ESTILOS
// =====================================================

const styles = {
    container: {
        padding: '20px',
        backgroundColor: 'var(--surface-page)',
        minHeight: '100%'
    },
    header: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    subtitle: {
        fontSize: 'var(--text-md)',
        color: 'var(--text-muted)',
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
        borderRadius: 'var(--radius-md)',
        border: 'none',
        fontSize: 'var(--text-md)',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s'
    },
    buttonPrimary: {
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--surface-card)'
    },
    buttonSecondary: {
        backgroundColor: 'var(--surface-muted)',
        color: 'var(--text-muted)'
    },
    buttonSuccess: {
        backgroundColor: 'var(--status-success)',
        color: 'var(--surface-card)'
    },
    buttonInfo: {
        backgroundColor: 'var(--status-info)',
        color: 'var(--surface-card)'
    },
    buttonDanger: {
        backgroundColor: 'var(--status-danger)',
        color: 'var(--surface-card)'
    },
    buttonSmall: {
        padding: '6px 12px',
        fontSize: 'var(--text-sm)'
    },
    // Cards de Resumo
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
    },
    summaryCard: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)'
    },
    summaryLabel: {
        fontSize: 'var(--text-xs)',
        fontWeight: '600',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px'
    },
    summaryValue: {
        fontSize: '22px',
        fontWeight: '700',
        color: 'var(--text-primary)'
    },
    summarySubtext: {
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
        marginTop: '4px'
    },
    // BDI Config
    bdiConfig: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--status-warning-bg)',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-base)',
        color: 'var(--status-warning-text)'
    },
    bdiInput: {
        width: '50px',
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid var(--status-warning)',
        fontSize: 'var(--text-base)',
        textAlign: 'center'
    },
    // Progress Bar
    progressContainer: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)'
    },
    progressBar: {
        height: '12px',
        backgroundColor: 'var(--border-subtle)',
        borderRadius: '6px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'var(--status-success)',
        borderRadius: '6px',
        transition: 'width 0.5s'
    },
    // Tabela
    tableContainer: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 'var(--text-base)'
    },
    th: {
        backgroundColor: 'var(--surface-subtle)',
        padding: '12px 12px',
        textAlign: 'left',
        fontWeight: '600',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid var(--border-subtle)',
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
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--surface-card)',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    etapaTd: {
        padding: '12px',
        fontWeight: '600',
        fontSize: 'var(--text-base)'
    },
    // Item Row
    itemRow: {
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background-color 0.2s',
        cursor: 'pointer'
    },
    td: {
        padding: '10px 12px',
        color: 'var(--text-secondary)',
        verticalAlign: 'middle'
    },
    tdCodigo: {
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        fontSize: 'var(--text-xs)'
    },
    tdDescricao: {
        fontWeight: '500',
        maxWidth: '250px'
    },
    tdUnidade: {
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)'
    },
    tdNumero: {
        textAlign: 'right',
        fontFamily: 'monospace',
        fontSize: 'var(--text-sm)'
    },
    tdTotal: {
        textAlign: 'right',
        fontWeight: '600',
        color: 'var(--text-primary)'
    },
    // Status
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: 'var(--text-xs)',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },
    statusPago: {
        backgroundColor: 'var(--status-success-bg)',
        color: 'var(--status-success)'
    },
    statusEmAndamento: {
        backgroundColor: 'var(--status-warning-bg)',
        color: 'var(--status-warning)'
    },
    statusAFazer: {
        backgroundColor: 'var(--surface-muted)',
        color: 'var(--text-muted)'
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
        backgroundColor: 'var(--status-info-bg)',
        color: 'var(--status-info)',
        marginLeft: '6px'
    },
    // Subtotal Row
    subtotalRow: {
        backgroundColor: 'var(--surface-muted)',
        fontWeight: '600'
    },
    subtotalTd: {
        padding: '8px 12px',
        fontSize: 'var(--text-sm)'
    },
    // Total Row
    totalRow: {
        backgroundColor: 'var(--text-primary)',
        color: 'var(--surface-card)'
    },
    totalTd: {
        padding: '14px 12px',
        fontSize: 'var(--text-md)',
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
        backgroundColor: 'var(--surface-card)',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-modal)'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        margin: 0
    },
    modalBody: {
        padding: '24px'
    },
    modalFooter: {
        padding: '16px 24px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        padding: '0'
    },
    // Form
    formGroup: {
        marginBottom: '16px'
    },
    formLabel: {
        display: 'block',
        fontSize: 'var(--text-base)',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        marginBottom: '6px'
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        fontSize: 'var(--text-md)',
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
        backgroundColor: 'var(--surface-subtle)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
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
        backgroundColor: 'var(--status-info-bg)'
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
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 100
    },
    autocompleteSection: {
        padding: '8px 12px',
        backgroundColor: 'var(--surface-subtle)',
        fontSize: 'var(--text-xs)',
        fontWeight: '600',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--border-subtle)'
    },
    autocompleteItem: {
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background-color 0.2s'
    },
    autocompleteItemHover: {
        backgroundColor: 'var(--surface-muted)'
    },
    // Info Box
    infoBox: {
        padding: '12px 16px',
        backgroundColor: 'var(--status-info-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--status-info)',
        fontSize: 'var(--text-base)',
        color: 'var(--status-info)',
        marginTop: '16px'
    },
    // Empty State
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: 'var(--text-muted)'
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
        fontSize: 'var(--text-sm)',
        transition: 'background-color 0.2s'
    },
    // Valor Pago
    valorPago: {
        fontSize: 'var(--text-xs)',
        color: 'var(--status-success)',
        fontWeight: '500'
    },
    // Célula com Progresso (MO e Material)
    celulaComProgresso: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        position: 'relative',
        cursor: 'pointer',
        padding: '4px'
    },
    miniProgressBar: {
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--border-subtle)',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    miniProgressFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.3s ease'
    },
    hoverTooltip: {
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '8px 12px',
        backgroundColor: 'var(--text-primary)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        zIndex: 100,
        whiteSpace: 'nowrap'
    },
    hoverPercentual: {
        fontSize: 'var(--text-md)',
        fontWeight: '700'
    },
    hoverValor: {
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)'
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
// COMPONENTE: CÉLULA COM PROGRESSO (MO e Material)
// =====================================================

const CelulaComProgresso = ({ valorTotal, valorPago, cor, corTexto }) => {
    const [hover, setHover] = React.useState(false);
    
    // Calcular percentual
    const percentual = valorTotal > 0 ? Math.round((valorPago / valorTotal) * 100) : 0;
    const corBarra = percentual >= 100 ? 'var(--status-success)' : cor;

    if (!valorTotal || valorTotal === 0) {
        if (!valorPago || valorPago === 0) {
            return <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>R$ 0,00</div>;
        }
        // Tem pagamento mas sem orçamento — mostra o pago em destaque
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--status-danger)', fontWeight: '600', fontSize: '13px' }}>
                    {formatCurrency(valorPago)}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--status-danger)', opacity: 0.7 }}>s/ orçamento</div>
            </div>
        );
    }
    
    return (
        <div 
            style={styles.celulaComProgresso}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {/* Valor Total */}
            <div style={{ color: corTexto, fontWeight: '500', fontSize: '13px' }}>
                {formatCurrency(valorTotal)}
            </div>
            
            {/* Barra de Progresso */}
            <div style={styles.miniProgressBar}>
                <div style={{
                    ...styles.miniProgressFill,
                    width: `${Math.min(percentual, 100)}%`,
                    backgroundColor: corBarra
                }} />
            </div>
            
            {/* Tooltip no Hover */}
            {hover && (
                <div style={styles.hoverTooltip}>
                    <span style={{ ...styles.hoverPercentual, color: corBarra }}>
                        {percentual}%
                    </span>
                    <span style={styles.hoverValor}>
                        {formatCurrency(valorPago)}
                    </span>
                </div>
            )}
        </div>
    );
};

// =====================================================
// COMPONENTE: MODAL NOVA ETAPA
// =====================================================

const NovaEtapaModal = ({ onClose, onSave, etapaParaEditar = null }) => {
    const isEdicao = !!etapaParaEditar;
    const [nome, setNome] = useState(etapaParaEditar?.nome || '');
    const [codigo, setCodigo] = useState(etapaParaEditar?.codigo || '');
    const [salvando, setSalvando] = useState(false);
    const [adicionarOutra, setAdicionarOutra] = useState(false);

    const handleSalvar = async () => {
        if (!nome.trim()) return;
        setSalvando(true);
        const sucesso = isEdicao
            ? await onSave({ nome: nome.trim(), codigo: codigo.trim() }, true, etapaParaEditar.id)
            : await onSave({ nome: nome.trim(), codigo: codigo.trim() });
        setSalvando(false);
        if (!sucesso) return;

        if (!isEdicao && adicionarOutra) {
            // Limpa os campos para adicionar outra
            setNome('');
            setCodigo('');
        } else {
            onClose();
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{isEdicao ? '✏️ Editar Etapa' : '➕ Nova Etapa'}</h2>
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
                    {!isEdicao && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={adicionarOutra}
                                onChange={e => setAdicionarOutra(e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Adicionar outra</span>
                        </label>
                    )}
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
                        {salvando ? 'Salvando...' : (isEdicao ? '💾 Salvar Alterações' : '💾 Salvar Etapa')}
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
        servico_id: itemParaEditar?.servico_id || null,
        salvar_biblioteca: !isEdicao
    });
    
    // NOVO: Estados para modo de entrada (unitário ou total)
    const [modoEntradaMO, setModoEntradaMO] = useState('unitario'); // 'unitario' ou 'total'
    const [modoEntradaMat, setModoEntradaMat] = useState('unitario'); // 'unitario' ou 'total'
    const [valorTotalMO, setValorTotalMO] = useState('');
    const [valorTotalMat, setValorTotalMat] = useState('');
    
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
            servico_id: null,
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
            const res = await fetchWithAuth(`${apiUrl}/servicos-autocomplete?q=${encodeURIComponent(termo)}`);
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
            logger.error('Erro no autocomplete:', e);
        }
        setBuscando(false);
    }, [apiUrl]);

    // Debounce para autocomplete - CORREÇÃO: não mostrar em modo edição inicial
    const [descricaoEditada, setDescricaoEditada] = useState(false);
    
    useEffect(() => {
        // Só buscar autocomplete se:
        // 1. Não está em modo edição OU
        // 2. Está em modo edição mas o usuário já editou a descrição
        if (isEdicao && !descricaoEditada) {
            return; // Não buscar autocomplete se está editando e não mudou a descrição
        }
        
        const timer = setTimeout(() => {
            if (form.descricao.length >= 2) {
                buscarAutocomplete(form.descricao);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [form.descricao, buscarAutocomplete, isEdicao, descricaoEditada]);

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
        if (!form.etapa_id) {
            notify.warning('Selecione uma etapa');
            return;
        }
        if (!form.descricao || !form.descricao.trim()) {
            notify.warning('Preencha a descrição do serviço');
            return;
        }
        if (!form.unidade) {
            notify.warning('Selecione uma unidade');
            return;
        }
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
                                onChange={e => {
                                    setForm({...form, descricao: e.target.value});
                                    setDescricaoEditada(true); // Marcar que usuário está editando
                                }}
                                placeholder="Digite para buscar ou criar..."
                                onFocus={() => {
                                    // Só mostrar autocomplete no foco se NÃO está em modo edição
                                    if (!isEdicao && form.descricao.length >= 2) {
                                        buscarAutocomplete(form.descricao);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setAutocomplete(prev => ({...prev, show: false})), 200)}
                            />
                            {buscando && <span style={{ position: 'absolute', right: 12, top: 12, fontSize: '12px', color: 'var(--text-muted)' }}>Buscando...</span>}
                            
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
                                                    onMouseEnter={e => e.target.style.backgroundColor = 'var(--surface-muted)'}
                                                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '500' }}>{s.descricao}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                                                    onMouseEnter={e => e.target.style.backgroundColor = 'var(--surface-muted)'}
                                                    onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '500' }}>{s.descricao}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                            
                            {/* Mão de Obra */}
                            <div style={styles.formGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={styles.formLabel}>Mão de Obra</label>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={modoEntradaMO === 'unitario'} 
                                                onChange={() => setModoEntradaMO('unitario')}
                                                style={{ margin: 0 }}
                                            />
                                            Por {form.unidade}
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={modoEntradaMO === 'total'} 
                                                onChange={() => setModoEntradaMO('total')}
                                                style={{ margin: 0 }}
                                            />
                                            Valor Total
                                        </label>
                                    </div>
                                </div>
                                {modoEntradaMO === 'unitario' ? (
                                    <input 
                                        type="number" 
                                        style={styles.formInput}
                                        value={form.preco_mao_obra}
                                        onChange={e => setForm({...form, preco_mao_obra: e.target.value})}
                                        placeholder={`R$ por ${form.unidade}`}
                                        step="0.01"
                                    />
                                ) : (
                                    <input 
                                        type="number" 
                                        style={{...styles.formInput, backgroundColor: 'var(--status-warning-bg)'}}
                                        value={valorTotalMO}
                                        onChange={e => {
                                            setValorTotalMO(e.target.value);
                                            const qtd = parseFloat(form.quantidade) || 0;
                                            if (qtd > 0) {
                                                const unitario = (parseFloat(e.target.value) || 0) / qtd;
                                                setForm({...form, preco_mao_obra: unitario.toFixed(2)});
                                            }
                                        }}
                                        placeholder="Valor total da MO"
                                        step="0.01"
                                    />
                                )}
                                {modoEntradaMO === 'total' && form.preco_mao_obra && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        = R$ {parseFloat(form.preco_mao_obra).toFixed(2)}/{form.unidade}
                                    </div>
                                )}
                            </div>
                            
                            {/* Material */}
                            <div style={styles.formGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={styles.formLabel}>Material</label>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={modoEntradaMat === 'unitario'} 
                                                onChange={() => setModoEntradaMat('unitario')}
                                                style={{ margin: 0 }}
                                            />
                                            Por {form.unidade}
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                checked={modoEntradaMat === 'total'} 
                                                onChange={() => setModoEntradaMat('total')}
                                                style={{ margin: 0 }}
                                            />
                                            Valor Total
                                        </label>
                                    </div>
                                </div>
                                {modoEntradaMat === 'unitario' ? (
                                    <input 
                                        type="number" 
                                        style={styles.formInput}
                                        value={form.preco_material}
                                        onChange={e => setForm({...form, preco_material: e.target.value})}
                                        placeholder={`R$ por ${form.unidade}`}
                                        step="0.01"
                                    />
                                ) : (
                                    <input 
                                        type="number" 
                                        style={{...styles.formInput, backgroundColor: 'var(--status-warning-bg)'}}
                                        value={valorTotalMat}
                                        onChange={e => {
                                            setValorTotalMat(e.target.value);
                                            const qtd = parseFloat(form.quantidade) || 0;
                                            if (qtd > 0) {
                                                const unitario = (parseFloat(e.target.value) || 0) / qtd;
                                                setForm({...form, preco_material: unitario.toFixed(2)});
                                            }
                                        }}
                                        placeholder="Valor total do material"
                                        step="0.01"
                                    />
                                )}
                                {modoEntradaMat === 'total' && form.preco_material && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        = R$ {parseFloat(form.preco_material).toFixed(2)}/{form.unidade}
                                    </div>
                                )}
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
                            {/* Composto: Não mostra rateio - valor vai direto para "Serviço" */}
                            <div style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--status-warning-bg)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--status-warning-text)',
                                marginBottom: '8px'
                            }}>
                                💡 Itens compostos são contabilizados como <strong>SERVIÇO</strong> no orçamento (não são divididos em MO/Material)
                            </div>
                        </>
                    )}
                    
                    {/* Resumo do Item */}
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--status-success-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--status-success)',
                        marginBottom: '16px'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--status-success-text)', fontWeight: '600', marginBottom: '4px' }}>
                            📊 TOTAL DO ITEM
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--status-success-text)' }}>
                            {formatCurrency(calcularTotal())}
                        </div>
                        {form.tipo_composicao === 'separado' && (
                            <div style={{ fontSize: '11px', color: 'var(--status-success-text)', marginTop: '4px' }}>
                                MO: {formatCurrency((parseFloat(form.quantidade) || 0) * (parseFloat(form.preco_mao_obra) || 0))} | 
                                Mat: {formatCurrency((parseFloat(form.quantidade) || 0) * (parseFloat(form.preco_material) || 0))}
                            </div>
                        )}
                    </div>
                    
                    {/* Salvar na Biblioteca */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <input 
                            type="checkbox" 
                            id="salvarBiblioteca"
                            checked={form.salvar_biblioteca}
                            onChange={e => setForm({...form, salvar_biblioteca: e.target.checked})}
                        />
                        <label htmlFor="salvarBiblioteca" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
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
// UPLOAD PLANTA MODAL - ESTILOS
// =====================================================

const uploadStyles = {
    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modal: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: '16px',
        maxWidth: '95vw',
        width: '1200px',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)',
        display: 'flex',
        flexDirection: 'column'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--surface-subtle)'
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: 'var(--text-primary)',
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
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--surface-subtle)'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        padding: '0',
        lineHeight: 1
    },
    // Buttons
    button: {
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        fontSize: 'var(--text-md)',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
    },
    buttonPrimary: {
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--surface-card)'
    },
    buttonSuccess: {
        backgroundColor: 'var(--status-success)',
        color: 'var(--surface-card)'
    },
    buttonSecondary: {
        backgroundColor: 'var(--surface-muted)',
        color: 'var(--text-muted)'
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    // Upload Area
    uploadArea: {
        border: '3px dashed var(--border-default)',
        borderRadius: '16px',
        padding: '60px 40px',
        textAlign: 'center',
        backgroundColor: 'var(--surface-subtle)',
        cursor: 'pointer',
        transition: 'all 0.3s'
    },
    uploadAreaHover: {
        borderColor: 'var(--brand-primary)',
        backgroundColor: 'var(--status-info-bg)'
    },
    uploadAreaWithImage: {
        padding: '20px',
        borderStyle: 'solid',
        borderColor: 'var(--status-success)'
    },
    uploadIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    uploadTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: '8px'
    },
    uploadSubtitle: {
        fontSize: 'var(--text-md)',
        color: 'var(--text-muted)',
        marginBottom: '16px'
    },
    uploadFormats: {
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)'
    },
    // Preview Image
    previewContainer: {
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start'
    },
    previewImage: {
        maxWidth: '300px',
        maxHeight: '300px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    previewInfo: {
        flex: 1
    },
    // Form
    formGroup: {
        marginBottom: '16px'
    },
    formLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        marginBottom: '6px'
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-default)',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
    },
    // Processing
    processingContainer: {
        textAlign: 'center',
        padding: '60px 40px'
    },
    processingSpinner: {
        width: '80px',
        height: '80px',
        border: '4px solid var(--border-subtle)',
        borderTop: '4px solid var(--brand-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 24px'
    },
    processingTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        marginBottom: '8px'
    },
    processingSubtitle: {
        fontSize: 'var(--text-md)',
        color: 'var(--text-muted)',
        marginBottom: '24px'
    },
    processingSteps: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
        margin: '0 auto'
    },
    processingStep: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px'
    },
    stepIcon: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px'
    },
    stepDone: {
        backgroundColor: 'var(--status-success-bg)',
        color: 'var(--status-success)'
    },
    stepCurrent: {
        backgroundColor: 'var(--status-info-bg)',
        color: 'var(--status-info)'
    },
    stepPending: {
        backgroundColor: 'var(--surface-muted)',
        color: 'var(--text-muted)'
    },
    // Results
    resultsContainer: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '24px',
        height: '100%'
    },
    resultsSidebar: {
        backgroundColor: 'var(--surface-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px',
        height: 'fit-content'
    },
    resultsMain: {
        overflow: 'auto'
    },
    // Info Cards
    infoCard: {
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        marginBottom: '12px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)'
    },
    infoCardTitle: {
        fontSize: 'var(--text-xs)',
        fontWeight: '600',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginBottom: '8px'
    },
    infoCardValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: 'var(--text-primary)'
    },
    infoCardSubtext: {
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)',
        marginTop: '4px'
    },
    // Ambientes List
    ambientesList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '8px'
    },
    ambienteBadge: {
        padding: '4px 8px',
        backgroundColor: 'var(--status-purple-bg)',
        color: 'var(--status-purple-text)',
        borderRadius: '4px',
        fontSize: 'var(--text-xs)',
        fontWeight: '500'
    },
    // Table
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
    },
    th: {
        backgroundColor: 'var(--surface-subtle)',
        padding: '10px 12px',
        textAlign: 'left',
        fontWeight: '600',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)',
        textTransform: 'uppercase',
        borderBottom: '2px solid var(--border-subtle)',
        position: 'sticky',
        top: 0
    },
    thRight: {
        textAlign: 'right'
    },
    thCenter: {
        textAlign: 'center'
    },
    etapaRow: {
        backgroundColor: 'var(--brand-primary)',
        color: 'var(--surface-card)'
    },
    etapaTd: {
        padding: '10px 12px',
        fontWeight: '600'
    },
    itemRow: {
        borderBottom: '1px solid var(--border-subtle)'
    },
    td: {
        padding: '10px 12px',
        verticalAlign: 'middle'
    },
    tdNumero: {
        textAlign: 'right',
        fontFamily: 'monospace'
    },
    tdCenter: {
        textAlign: 'center'
    },
    // Checkbox
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer'
    },
    // Input inline
    inputInline: {
        width: '80px',
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-default)',
        fontSize: 'var(--text-base)',
        textAlign: 'right'
    },
    // Justificativa
    justificativa: {
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        marginTop: '2px'
    },
    // Warning
    warningBox: {
        padding: '12px 16px',
        backgroundColor: 'var(--status-warning-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--status-warning)',
        fontSize: 'var(--text-base)',
        color: 'var(--status-warning-text)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
    },
    // Total
    totalRow: {
        backgroundColor: 'var(--text-primary)',
        color: 'var(--surface-card)',
        fontWeight: '700'
    },
    totalTd: {
        padding: '14px 12px'
    },
    // Fonte preço badge
    fonteBadge: {
        fontSize: '9px',
        padding: '2px 6px',
        borderRadius: '4px',
        marginLeft: '6px'
    },
    fonteBase: {
        backgroundColor: 'var(--status-success-bg)',
        color: 'var(--status-success)'
    },
    fonteAproximado: {
        backgroundColor: 'var(--status-warning-bg)',
        color: 'var(--status-warning-text)'
    },
    fonteNaoEncontrado: {
        backgroundColor: 'var(--status-danger-bg)',
        color: 'var(--status-danger)'
    }
};

// CSS para animação de spinner
const spinnerStyle = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

// =====================================================
// UPLOAD PLANTA MODAL - COMPONENTE
// =====================================================

const UploadPlantaModal = ({ onClose, onImportar, obraId, apiUrl }) => {
    // Estados
    const [etapa, setEtapa] = useState('upload'); // upload | processing | results
    const [imagem, setImagem] = useState(null);
    const [imagemPreview, setImagemPreview] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    
    // Dados do formulário
    const [areaTotal, setAreaTotal] = useState('');
    const [padrao, setPadrao] = useState('médio');
    const [pavimentos, setPavimentos] = useState('1');
    const [tipoConstrucao, setTipoConstrucao] = useState('residencial');
    
    // Resultados
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);
    
    // Processamento
    const [stepAtual, setStepAtual] = useState(0);
    const steps = [
        'Enviando imagem...',
        'Analisando planta baixa...',
        'Identificando ambientes...',
        'Calculando quantitativos...',
        'Buscando preços na base...',
        'Finalizando orçamento...'
    ];

    // Handler de arquivo
    const handleFile = useCallback((file) => {
        if (!file) return;
        
        // Verificar tipo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (!tiposPermitidos.includes(file.type)) {
            setErro('Formato não suportado. Use JPG, PNG, WEBP, GIF ou PDF.');
            return;
        }
        
        // Verificar tamanho (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            setErro('Arquivo muito grande. Máximo 20MB.');
            return;
        }
        
        setErro(null);
        setImagem(file);
        
        // Criar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagemPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }, []);

    // Drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    // Input file
    const handleInputChange = (e) => {
        const file = e.target.files[0];
        handleFile(file);
    };

    // Processar com IA
    const processarComIA = async () => {
        if (!imagem) return;
        
        setEtapa('processing');
        setErro(null);
        
        // Simular progresso dos steps
        const stepInterval = setInterval(() => {
            setStepAtual(prev => {
                if (prev < steps.length - 1) return prev + 1;
                return prev;
            });
        }, 2000);
        
        try {
            let arquivoParaEnviar = imagem;
            let mediaType = imagem.type;
            
            // Comprimir imagem se não for PDF (para acelerar a análise)
            if (imagem.type !== 'application/pdf') {
                logger.debug('[IA] Comprimindo imagem...');
                
                // Criar canvas para compressão
                const img = new Image();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = URL.createObjectURL(imagem);
                });
                
                // Redimensionar se muito grande (max 1500px no maior lado)
                const maxSize = 1500;
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para blob com qualidade 0.8
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/jpeg', 0.8);
                });
                
                arquivoParaEnviar = blob;
                mediaType = 'image/jpeg';
                
                URL.revokeObjectURL(img.src);
                logger.debug(`[IA] Imagem comprimida: ${imagem.size} -> ${blob.size} bytes`);
            }
            
            // Converter para base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(arquivoParaEnviar);
            });
            
            // Extrair dados do base64
            const [header, data] = base64.split(',');
            const finalMediaType = header.match(/data:(.*?);/)?.[1] || mediaType;
            
            // Chamar API
            const response = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/gerar-por-planta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imagem_base64: data,
                    media_type: finalMediaType,
                    area_total: areaTotal ? parseFloat(areaTotal) : null,
                    padrao,
                    pavimentos: parseInt(pavimentos),
                    tipo_construcao: tipoConstrucao
                })
            });
            
            clearInterval(stepInterval);
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.erro || 'Erro ao processar imagem');
            }
            
            const data_result = await response.json();
            
            // Marcar todos os itens como selecionados por padrão
            data_result.etapas = data_result.etapas.map(etapa => ({
                ...etapa,
                selecionada: true,
                itens: etapa.itens.map(item => ({
                    ...item,
                    selecionado: true,
                    criar_servico: true
                }))
            }));
            
            setResultado(data_result);
            setEtapa('results');
            
        } catch (err) {
            clearInterval(stepInterval);
            logger.error('Erro:', err);
            setErro(err.message || 'Erro ao processar planta');
            setEtapa('upload');
        }
    };

    // Toggle seleção de item
    const toggleItem = (etapaIdx, itemIdx) => {
        setResultado(prev => {
            const newEtapas = [...prev.etapas];
            newEtapas[etapaIdx] = {
                ...newEtapas[etapaIdx],
                itens: newEtapas[etapaIdx].itens.map((item, idx) => 
                    idx === itemIdx ? { ...item, selecionado: !item.selecionado } : item
                )
            };
            return { ...prev, etapas: newEtapas };
        });
    };

    // Toggle criar serviço
    const toggleCriarServico = (etapaIdx, itemIdx) => {
        setResultado(prev => {
            const newEtapas = [...prev.etapas];
            newEtapas[etapaIdx] = {
                ...newEtapas[etapaIdx],
                itens: newEtapas[etapaIdx].itens.map((item, idx) => 
                    idx === itemIdx ? { ...item, criar_servico: !item.criar_servico } : item
                )
            };
            return { ...prev, etapas: newEtapas };
        });
    };

    // Atualizar quantidade
    const atualizarQuantidade = (etapaIdx, itemIdx, novaQtd) => {
        setResultado(prev => {
            const newEtapas = [...prev.etapas];
            const item = newEtapas[etapaIdx].itens[itemIdx];
            const qtd = parseFloat(novaQtd) || 0;
            
            let total = 0;
            if (item.tipo_composicao === 'composto' && item.preco_unitario) {
                total = qtd * item.preco_unitario;
            } else {
                total = qtd * ((item.preco_mao_obra || 0) + (item.preco_material || 0));
            }
            
            newEtapas[etapaIdx].itens[itemIdx] = {
                ...item,
                quantidade: qtd,
                total_estimado: total
            };
            
            // Recalcular total da etapa
            newEtapas[etapaIdx].total_etapa = newEtapas[etapaIdx].itens
                .filter(i => i.selecionado)
                .reduce((sum, i) => sum + (i.total_estimado || 0), 0);
            
            return { ...prev, etapas: newEtapas };
        });
    };

    // Selecionar/Deselecionar todos
    const toggleTodos = (selecionar) => {
        setResultado(prev => ({
            ...prev,
            etapas: prev.etapas.map(etapa => ({
                ...etapa,
                itens: etapa.itens.map(item => ({ ...item, selecionado: selecionar }))
            }))
        }));
    };

    // Calcular totais
    const calcularTotais = () => {
        if (!resultado) return { itens: 0, total: 0 };
        
        let itens = 0;
        let total = 0;
        
        resultado.etapas.forEach(etapa => {
            etapa.itens.forEach(item => {
                if (item.selecionado) {
                    itens++;
                    total += item.total_estimado || 0;
                }
            });
        });
        
        return { itens, total };
    };

    // Confirmar importação
    const confirmarImportacao = async () => {
        if (!resultado) return;
        
        try {
            const response = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/importar-gerado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etapas: resultado.etapas.map(etapa => ({
                        ...etapa,
                        itens: etapa.itens.filter(item => item.selecionado)
                    })).filter(etapa => etapa.itens.length > 0),
                    criar_servicos: true
                })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.erro || 'Erro ao importar');
            }
            
            const data = await response.json();
            notify.success(`Orçamento importado! ${data.etapas_criadas} etapas, ${data.itens_criados} itens`);
            
            if (onImportar) onImportar();
            onClose();
            
        } catch (err) {
            logger.error('Erro:', err);
            setErro(err.message || 'Erro ao importar orçamento');
        }
    };

    // Renderizar badge de fonte de preço
    const renderFonteBadge = (fonte) => {
        switch (fonte) {
            case 'base':
                return <span style={{ ...uploadStyles.fonteBadge, ...uploadStyles.fonteBase }}>✓ Base</span>;
            case 'base_aproximado':
                return <span style={{ ...uploadStyles.fonteBadge, ...uploadStyles.fonteAproximado }}>~ Aproximado</span>;
            default:
                return <span style={{ ...uploadStyles.fonteBadge, ...uploadStyles.fonteNaoEncontrado }}>⚠ Sem preço</span>;
        }
    };

    const totais = calcularTotais();

    return (
        <>
            <style>{spinnerStyle}</style>
            <div style={uploadStyles.modalOverlay} onClick={onClose}>
                <div style={uploadStyles.modal} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={uploadStyles.modalHeader}>
                        <h2 style={uploadStyles.modalTitle}>
                            🤖 Gerar Orçamento por Planta Baixa
                            {etapa === 'results' && <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}> - Revisão</span>}
                        </h2>
                        <button style={uploadStyles.closeBtn} onClick={onClose}>×</button>
                    </div>
                    
                    {/* Body */}
                    <div style={uploadStyles.modalBody}>
                        {/* ETAPA: UPLOAD */}
                        {etapa === 'upload' && (
                            <>
                                {erro && (
                                    <div style={{ ...uploadStyles.warningBox, backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}>
                                        ⚠️ {erro}
                                    </div>
                                )}
                                
                                {!imagem ? (
                                    // Área de upload
                                    <div
                                        style={{
                                            ...uploadStyles.uploadArea,
                                            ...(dragOver ? uploadStyles.uploadAreaHover : {})
                                        }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById('fileInput').click()}
                                    >
                                        <div style={uploadStyles.uploadIcon}>📐</div>
                                        <div style={uploadStyles.uploadTitle}>Arraste a planta baixa aqui</div>
                                        <div style={uploadStyles.uploadSubtitle}>ou clique para selecionar o arquivo</div>
                                        <div style={uploadStyles.uploadFormats}>Formatos aceitos: JPG, PNG, WEBP, GIF, PDF (máx. 20MB)</div>
                                        <input
                                            id="fileInput"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                            onChange={handleInputChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                ) : (
                                    // Preview e configurações
                                    <div style={uploadStyles.previewContainer}>
                                        <div>
                                            <img 
                                                src={imagemPreview} 
                                                alt="Preview da planta" 
                                                style={uploadStyles.previewImage}
                                            />
                                            <button
                                                style={{ ...uploadStyles.button, ...uploadStyles.buttonSecondary, marginTop: '12px', width: '100%', justifyContent: 'center' }}
                                                onClick={() => { setImagem(null); setImagemPreview(null); }}
                                            >
                                                🔄 Trocar imagem
                                            </button>
                                        </div>
                                        
                                        <div style={uploadStyles.previewInfo}>
                                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                                📋 Informações adicionais (opcional)
                                            </h3>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                                Essas informações ajudam a IA a gerar um orçamento mais preciso. Se não souber, deixe em branco.
                                            </p>
                                            
                                            <div style={uploadStyles.formRow}>
                                                <div style={uploadStyles.formGroup}>
                                                    <label style={uploadStyles.formLabel}>Área Total (m²)</label>
                                                    <input
                                                        type="number"
                                                        style={uploadStyles.formInput}
                                                        value={areaTotal}
                                                        onChange={e => setAreaTotal(e.target.value)}
                                                        placeholder="Ex: 120"
                                                    />
                                                </div>
                                                
                                                <div style={uploadStyles.formGroup}>
                                                    <label style={uploadStyles.formLabel}>Pavimentos</label>
                                                    <select
                                                        style={uploadStyles.formInput}
                                                        value={pavimentos}
                                                        onChange={e => setPavimentos(e.target.value)}
                                                    >
                                                        <option value="1">1 (Térreo)</option>
                                                        <option value="2">2 (Térreo + Superior)</option>
                                                        <option value="3">3</option>
                                                    </select>
                                                </div>
                                                
                                                <div style={uploadStyles.formGroup}>
                                                    <label style={uploadStyles.formLabel}>Padrão de Acabamento</label>
                                                    <select
                                                        style={uploadStyles.formInput}
                                                        value={padrao}
                                                        onChange={e => setPadrao(e.target.value)}
                                                    >
                                                        <option value="econômico">Econômico</option>
                                                        <option value="médio">Médio</option>
                                                        <option value="alto">Alto Padrão</option>
                                                    </select>
                                                </div>
                                                
                                                <div style={uploadStyles.formGroup}>
                                                    <label style={uploadStyles.formLabel}>Tipo de Construção</label>
                                                    <select
                                                        style={uploadStyles.formInput}
                                                        value={tipoConstrucao}
                                                        onChange={e => setTipoConstrucao(e.target.value)}
                                                    >
                                                        <option value="residencial">Residencial</option>
                                                        <option value="comercial">Comercial</option>
                                                        <option value="industrial">Industrial</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div style={uploadStyles.warningBox}>
                                                <span>💡</span>
                                                <div>
                                                    <strong>Como funciona:</strong>
                                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', fontSize: '12px' }}>
                                                        <li>A IA analisa a planta e identifica os ambientes</li>
                                                        <li>Calcula quantitativos estimados para cada serviço</li>
                                                        <li>Busca preços na base de referência</li>
                                                        <li>Você revisa e ajusta antes de confirmar</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {/* ETAPA: PROCESSANDO */}
                        {etapa === 'processing' && (
                            <div style={uploadStyles.processingContainer}>
                                <div style={uploadStyles.processingSpinner}></div>
                                <div style={uploadStyles.processingTitle}>Analisando planta baixa...</div>
                                <div style={uploadStyles.processingSubtitle}>Isso pode levar alguns segundos</div>
                                
                                <div style={uploadStyles.processingSteps}>
                                    {steps.map((step, idx) => (
                                        <div key={idx} style={uploadStyles.processingStep}>
                                            <div style={{
                                                ...uploadStyles.stepIcon,
                                                ...(idx < stepAtual ? uploadStyles.stepDone : 
                                                    idx === stepAtual ? uploadStyles.stepCurrent : 
                                                    uploadStyles.stepPending)
                                            }}>
                                                {idx < stepAtual ? '✓' : idx === stepAtual ? '...' : '○'}
                                            </div>
                                            <span style={{ color: idx <= stepAtual ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {step}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* ETAPA: RESULTADOS */}
                        {etapa === 'results' && resultado && (
                            <>
                                <div style={uploadStyles.warningBox}>
                                    <span>⚠️</span>
                                    <div>
                                        <strong>Atenção: Dados aproximados!</strong>
                                        <br />
                                        Os quantitativos foram estimados pela IA com base na análise visual da planta e <strong>devem ser conferidos</strong>.
                                        Este recurso agiliza a montagem inicial do orçamento, mas um engenheiro deve revisar e ajustar os valores.
                                        <br />
                                        <span style={{ fontSize: '12px', color: 'var(--status-warning-text)' }}>💡 Clique na quantidade para editar antes de importar.</span>
                                    </div>
                                </div>
                                
                                <div style={uploadStyles.resultsContainer}>
                                    {/* Sidebar */}
                                    <div style={uploadStyles.resultsSidebar}>
                                        <div style={uploadStyles.infoCard}>
                                            <div style={uploadStyles.infoCardTitle}>Área Identificada</div>
                                            <div style={uploadStyles.infoCardValue}>
                                                {resultado.dados_identificados?.area_estimada || '?'} m²
                                            </div>
                                        </div>
                                        
                                        <div style={uploadStyles.infoCard}>
                                            <div style={uploadStyles.infoCardTitle}>Ambientes</div>
                                            <div style={uploadStyles.infoCardValue}>
                                                {resultado.dados_identificados?.total_ambientes || resultado.dados_identificados?.ambientes?.length || '?'}
                                            </div>
                                            <div style={uploadStyles.ambientesList}>
                                                {resultado.dados_identificados?.ambientes?.slice(0, 8).map((amb, idx) => (
                                                    <span key={idx} style={uploadStyles.ambienteBadge}>
                                                        {amb.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div style={uploadStyles.infoCard}>
                                            <div style={uploadStyles.infoCardTitle}>Banheiros</div>
                                            <div style={uploadStyles.infoCardValue}>
                                                {resultado.dados_identificados?.banheiros || '?'}
                                            </div>
                                        </div>
                                        
                                        <div style={uploadStyles.infoCard}>
                                            <div style={uploadStyles.infoCardTitle}>Paredes</div>
                                            <div style={uploadStyles.infoCardValue}>
                                                {resultado.dados_identificados?.paredes_lineares_m || '?'} m
                                            </div>
                                        </div>
                                        
                                        <div style={{ ...uploadStyles.infoCard, backgroundColor: 'var(--brand-primary)', color: 'var(--text-on-dark)' }}>
                                            <div style={{ ...uploadStyles.infoCardTitle, color: 'var(--text-on-dark-muted)' }}>Total Selecionado</div>
                                            <div style={{ ...uploadStyles.infoCardValue, color: 'var(--text-on-dark)' }}>
                                                {formatCurrency(totais.total)}
                                            </div>
                                            <div style={{ ...uploadStyles.infoCardSubtext, color: 'var(--text-muted)' }}>
                                                {totais.itens} itens selecionados
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                            <button
                                                style={{ ...uploadStyles.button, ...uploadStyles.buttonSecondary, flex: 1, justifyContent: 'center', padding: '8px' }}
                                                onClick={() => toggleTodos(true)}
                                            >
                                                ✓ Todos
                                            </button>
                                            <button
                                                style={{ ...uploadStyles.button, ...uploadStyles.buttonSecondary, flex: 1, justifyContent: 'center', padding: '8px' }}
                                                onClick={() => toggleTodos(false)}
                                            >
                                                ✗ Nenhum
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Tabela de itens */}
                                    <div style={uploadStyles.resultsMain}>
                                        <table style={uploadStyles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ ...uploadStyles.th, width: '40px' }}>✓</th>
                                                    <th style={{ ...uploadStyles.th, width: '60px' }}>Código</th>
                                                    <th style={uploadStyles.th}>Descrição</th>
                                                    <th style={{ ...uploadStyles.th, ...uploadStyles.thCenter, width: '50px' }}>Un.</th>
                                                    <th style={{ ...uploadStyles.th, ...uploadStyles.thRight, width: '80px' }}>Qtd.</th>
                                                    <th style={{ ...uploadStyles.th, ...uploadStyles.thRight, width: '100px' }}>Preço Un.</th>
                                                    <th style={{ ...uploadStyles.th, ...uploadStyles.thRight, width: '100px' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resultado.etapas.map((etapa, etapaIdx) => (
                                                    <React.Fragment key={etapa.codigo}>
                                                        {/* Linha da etapa */}
                                                        <tr style={uploadStyles.etapaRow}>
                                                            <td style={uploadStyles.etapaTd} colSpan={7}>
                                                                {etapa.codigo} - {etapa.nome}
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Itens */}
                                                        {etapa.itens.map((item, itemIdx) => {
                                                            const precoUn = item.tipo_composicao === 'composto' 
                                                                ? (item.preco_unitario || 0)
                                                                : ((item.preco_mao_obra || 0) + (item.preco_material || 0));
                                                            
                                                            return (
                                                                <tr 
                                                                    key={item.codigo} 
                                                                    style={{
                                                                        ...uploadStyles.itemRow,
                                                                        opacity: item.selecionado ? 1 : 0.5,
                                                                        backgroundColor: item.selecionado ? 'var(--surface-card)' : 'var(--surface-subtle)'
                                                                    }}
                                                                >
                                                                    <td style={uploadStyles.td}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.selecionado}
                                                                            onChange={() => toggleItem(etapaIdx, itemIdx)}
                                                                            style={uploadStyles.checkbox}
                                                                        />
                                                                    </td>
                                                                    <td style={{ ...uploadStyles.td, fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                        {item.codigo}
                                                                    </td>
                                                                    <td style={uploadStyles.td}>
                                                                        <div style={{ fontWeight: '500' }}>
                                                                            {item.descricao}
                                                                            {renderFonteBadge(item.fonte_preco)}
                                                                        </div>
                                                                        {item.justificativa && (
                                                                            <div style={uploadStyles.justificativa}>
                                                                                💡 {item.justificativa}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ ...uploadStyles.td, ...uploadStyles.tdCenter }}>
                                                                        {item.unidade}
                                                                    </td>
                                                                    <td style={{ ...uploadStyles.td, ...uploadStyles.tdNumero }}>
                                                                        <input
                                                                            type="number"
                                                                            value={item.quantidade}
                                                                            onChange={e => atualizarQuantidade(etapaIdx, itemIdx, e.target.value)}
                                                                            style={uploadStyles.inputInline}
                                                                            disabled={!item.selecionado}
                                                                            step="0.01"
                                                                        />
                                                                    </td>
                                                                    <td style={{ ...uploadStyles.td, ...uploadStyles.tdNumero }}>
                                                                        {formatCurrency(precoUn)}
                                                                    </td>
                                                                    <td style={{ ...uploadStyles.td, ...uploadStyles.tdNumero, fontWeight: '600' }}>
                                                                        {formatCurrency(item.total_estimado)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                ))}
                                                
                                                {/* Total */}
                                                <tr style={uploadStyles.totalRow}>
                                                    <td style={uploadStyles.totalTd} colSpan={6}>
                                                        💰 TOTAL DO ORÇAMENTO
                                                    </td>
                                                    <td style={{ ...uploadStyles.totalTd, textAlign: 'right', fontSize: '16px' }}>
                                                        {formatCurrency(totais.total)}
                                                    </td>
                                                    <td style={uploadStyles.totalTd}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div style={uploadStyles.modalFooter}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {etapa === 'upload' && imagem && '✓ Imagem carregada'}
                            {etapa === 'results' && `${totais.itens} itens selecionados`}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {etapa === 'upload' && (
                                <>
                                    <button 
                                        style={{ ...uploadStyles.button, ...uploadStyles.buttonSecondary }}
                                        onClick={onClose}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        style={{ 
                                            ...uploadStyles.button, 
                                            ...uploadStyles.buttonPrimary,
                                            ...(imagem ? {} : uploadStyles.buttonDisabled)
                                        }}
                                        onClick={processarComIA}
                                        disabled={!imagem}
                                    >
                                        🤖 Analisar com IA
                                    </button>
                                </>
                            )}
                            
                            {etapa === 'results' && (
                                <>
                                    <button 
                                        style={{ ...uploadStyles.button, ...uploadStyles.buttonSecondary }}
                                        onClick={() => setEtapa('upload')}
                                    >
                                        ← Voltar
                                    </button>
                                    <button 
                                        style={{ 
                                            ...uploadStyles.button, 
                                            ...uploadStyles.buttonSuccess,
                                            ...(totais.itens === 0 ? uploadStyles.buttonDisabled : {})
                                        }}
                                        onClick={confirmarImportacao}
                                        disabled={totais.itens === 0}
                                    >
                                        ✓ Importar {totais.itens} Itens
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};


// =====================================================
// MODAL: PAGAMENTOS QUE COMPÕEM O VALOR PAGO DE UM ITEM
// =====================================================

const DetalhePagamentosModal = ({ item, obraId, apiUrl, onClose }) => {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/itens/${item.id}/pagamentos`)
            .then(res => {
                if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro ao carregar'); });
                return res.json();
            })
            .then(setDados)
            .catch(err => {
                logger.error('Erro ao carregar pagamentos do item:', err);
                notify.error(err.message || 'Erro ao carregar pagamentos do item.');
                onClose();
            })
            .finally(() => setCarregando(false));
    }, [item.id, obraId, apiUrl, onClose]);

    const fonteLabel = {
        lancamento: 'Lançamento',
        pagamento_futuro: 'Cronograma',
        parcela: 'Parcela',
        boleto: 'Boleto',
    };

    const fmtData = (iso) => {
        if (!iso) return '—';
        const [y, m, d] = iso.slice(0, 10).split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={styles.modalTitle}>💰 Pagamentos do item</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {item.codigo ? `${item.codigo} · ` : ''}{item.descricao}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                </div>
                <div style={styles.modalBody}>
                    {carregando ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando…</p>
                    ) : !dados || dados.pagamentos.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                            Nenhum pagamento vinculado a este item.
                        </p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                                    {['Data', 'Origem', 'Descrição', 'Tipo', 'Valor'].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Valor' ? 'right' : 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dados.pagamentos.map((p, i) => (
                                    <tr key={`${p.fonte}-${p.id}-${i}`} style={{ borderBottom: '1px solid var(--surface-muted)' }}>
                                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtData(p.data)}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                                                borderRadius: '999px', background: 'var(--surface-muted)',
                                                color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                                            }}>
                                                {fonteLabel[p.fonte] || p.fonte}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            {p.descricao}
                                            {p.fornecedor && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.fornecedor}</div>}
                                        </td>
                                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.tipo || '—'}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--status-success-text)', whiteSpace: 'nowrap' }}>
                                            {formatCurrency(p.valor)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Total pago</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--status-success-text)', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(dados.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
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
    const [etapaParaEditar, setEtapaParaEditar] = useState(null);  // NOVO: para edição de etapa
    const [detalhePagamentos, setDetalhePagamentos] = useState(null); // item p/ ver composição do pago

    // Carregar dados
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng`);
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
            logger.error(e);
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

    // Criar/Editar etapa
    const salvarEtapa = async (dados, isEdicao = false, etapaId = null) => {
        try {
            const url = isEdicao
                ? `${apiUrl}/obras/${obraId}/orcamento-eng/etapas/${etapaId}`
                : `${apiUrl}/obras/${obraId}/orcamento-eng/etapas`;

            const res = await fetchWithAuth(url, {
                method: isEdicao ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                // Não fecha o modal aqui - o modal controla isso internamente
                carregarDados();
                return true;
            }
            const err = await res.json().catch(() => ({}));
            notify.error(err.erro || (isEdicao ? 'Erro ao editar etapa' : 'Erro ao criar etapa'));
            return false;
        } catch (e) {
            logger.error(e);
            notify.error(isEdicao ? 'Erro ao editar etapa' : 'Erro ao criar etapa');
            return false;
        }
    };

    // Criar/Editar item
    const salvarItem = async (form, isEdicao = false, itemId = null) => {
        try {
            const url = isEdicao 
                ? `${apiUrl}/obras/${obraId}/orcamento-eng/itens/${itemId}`
                : `${apiUrl}/obras/${obraId}/orcamento-eng/itens`;
            
            const res = await fetchWithAuth(url, {
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
                    servico_id: form.servico_id,
                    salvar_biblioteca: form.salvar_biblioteca
                })
            });
            if (res.ok) {
                carregarDados();
                return true;
            }
            return false;
        } catch (e) {
            logger.error(e);
            return false;
        }
    };
    
    // Handler para abrir edição de item
    const abrirEdicaoItem = (item) => {
        setItemParaEditar(item);
        setShowNovoItem(true);
    };

    // Handler para abrir edição de etapa
    const abrirEdicaoEtapa = (etapa) => {
        setEtapaParaEditar(etapa);
        setShowNovaEtapa(true);
    };

    // Handler para fechar modal de etapa
    const fecharModalEtapa = () => {
        setShowNovaEtapa(false);
        setEtapaParaEditar(null);
    };

    // Handler para fechar modal
    const fecharModalItem = () => {
        setShowNovoItem(false);
        setItemParaEditar(null);
        setEtapaParaNovoItem(null);
    };

    // Deletar item
    const deletarItem = async (itemId) => {
        if (!await confirmDialog('Excluir este item e o serviço vinculado?', { danger: true, confirmText: 'Excluir' })) return;

        try {
            const res = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/itens/${itemId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarDados();
            } else {
                const err = await res.json().catch(() => ({}));
                notify.error(err.erro || 'Erro ao excluir item');
            }
        } catch (e) {
            logger.error(e);
            notify.error('Erro ao excluir item');
        }
    };

    // Deletar etapa
    const deletarEtapa = async (etapaId) => {
        if (!await confirmDialog('Excluir esta etapa e todos os seus itens?', { danger: true, confirmText: 'Excluir' })) return;

        try {
            const res = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/etapas/${etapaId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                carregarDados();
            } else {
                const err = await res.json().catch(() => ({}));
                notify.error(err.erro || 'Erro ao excluir etapa');
            }
        } catch (e) {
            logger.error(e);
            notify.error('Erro ao excluir etapa');
        }
    };

    // Mover etapa para cima ou para baixo
    const moverEtapa = async (etapaId, direcao) => {
        const etapas = [...dados.etapas];
        const index = etapas.findIndex(e => e.id === etapaId);
        
        if (index === -1) return;
        if (direcao === 'cima' && index === 0) return;
        if (direcao === 'baixo' && index === etapas.length - 1) return;
        
        const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
        
        // Trocar posições
        [etapas[index], etapas[novoIndex]] = [etapas[novoIndex], etapas[index]];
        
        // Atualizar ordem e códigos
        const etapasOrdem = etapas.map((etapa, idx) => ({
            id: etapa.id,
            ordem: idx,
            codigo: String(idx + 1).padStart(2, '0')
        }));
        
        try {
            const res = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/reordenar-etapas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etapas: etapasOrdem })
            });
            if (res.ok) {
                carregarDados();
            } else {
                const err = await res.json().catch(() => ({}));
                notify.error(err.erro || 'Erro ao reordenar etapas');
            }
        } catch (e) {
            logger.error(e);
            notify.error('Erro ao reordenar etapas');
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
                        const resEtapa = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/etapas`, {
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
                        tipo_composicao: 'separado'
                    });
                }
            }
            
            // Criar itens
            for (const item of itensParaImportar) {
                await salvarItem(item);
            }
            
            carregarDados();
            notify.success(`Importação concluída! ${itensParaImportar.length} itens importados.`);
        };
        
        reader.readAsText(file, 'UTF-8');
        event.target.value = ''; // Reset input
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
                notify.warning('Operação cancelada. Digite exatamente "APAGAR" para confirmar.');
            }
            return;
        }

        try {
            const res = await fetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/apagar-tudo`, {
                method: 'DELETE'
            });

            if (res.ok) {
                const data = await res.json();
                notify.success(`${data.mensagem} — Etapas: ${data.etapas_deletadas}, Itens: ${data.itens_deletados}, Serviços: ${data.servicos_deletados}`);
                carregarDados();
            } else {
                const data = await res.json();
                notify.error(data.erro || 'Erro ao apagar orçamento');
            }
        } catch (e) {
            logger.error('Erro ao apagar:', e);
            notify.error('Erro ao apagar orçamento');
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
            <div className="m-section-card" style={{ minHeight: '100%' }}>
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
        <div className="m-section-card" style={{ minHeight: '100%' }}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}><i className="ti ti-clipboard-data" aria-hidden="true" /> Orçamento de Engenharia</h1>
                    <p style={styles.subtitle}>{obraNome}</p>
                </div>
                <div style={styles.headerActions}>
                    <div style={styles.bdiConfig}>
                        <span><i className="ti ti-chart-bar" aria-hidden="true" /> BDI:</span>
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
                            backgroundColor: 'var(--status-purple-text)',
                            color: 'var(--surface-card)'
                        }}
                        onClick={() => setShowUploadPlanta(true)}
                        title="Gerar orçamento automaticamente a partir de uma planta baixa"
                    >
                        <i className="ti ti-robot" aria-hidden="true" /> IA - Planta Baixa
                    </button>
                    <button
                        style={{ ...styles.button, ...styles.buttonSuccess }}
                        onClick={() => setShowNovaEtapa(true)}
                    >
                        <i className="ti ti-plus" aria-hidden="true" /> Nova Etapa
                    </button>
                    <button
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                        onClick={() => setShowNovoItem(true)}
                    >
                        <i className="ti ti-plus" aria-hidden="true" /> Novo Item
                    </button>
                    
                    {/* Botões de Excel */}
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-subtle)' }}>
                        <button 
                            style={{ ...styles.button, ...styles.buttonSecondary, ...styles.buttonSmall }}
                            onClick={exportarExcel}
                            title="Exportar orçamento para CSV/Excel"
                        >
                            <i className="ti ti-download" aria-hidden="true" /> Exportar
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
                                    display: 'inline-flex'
                                }}
                                title="Importar orçamento de CSV/Excel"
                            >
                                <i className="ti ti-upload" aria-hidden="true" /> Importar
                            </span>
                        </label>
                        <button
                            style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonSmall }}
                            onClick={apagarOrcamentoCompleto}
                            title="Apagar todo o orçamento de engenharia"
                        >
                            <i className="ti ti-trash" aria-hidden="true" /> Apagar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Mão de Obra</div>
                    <div style={{ ...styles.summaryValue, color: 'var(--brand-primary)', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_mao_obra)}
                    </div>
                    <div style={styles.summarySubtext}>
                        Pago: {formatCurrency(resumoComBdi.total_pago_mo)}
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Material</div>
                    <div style={{ ...styles.summaryValue, color: 'var(--status-success)', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_material)}
                    </div>
                    <div style={styles.summarySubtext}>
                        Pago: {formatCurrency(resumoComBdi.total_pago_mat)}
                    </div>
                </div>
                {/* NOVO: Card de Serviço (itens compostos) */}
                {(resumoComBdi.total_servico || 0) > 0 && (
                    <div style={styles.summaryCard}>
                        <div style={styles.summaryLabel}>Serviço</div>
                        <div style={{ ...styles.summaryValue, color: 'var(--status-purple-text)', fontSize: '20px' }}>
                            {formatCurrency(resumoComBdi.total_servico || 0)}
                        </div>
                        <div style={styles.summarySubtext}>
                            Pago: {formatCurrency(resumoComBdi.total_pago_servico || 0)}
                        </div>
                    </div>
                )}
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>BDI ({bdi}%)</div>
                    <div style={{ ...styles.summaryValue, color: 'var(--status-warning)', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.valor_bdi)}
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryLabel}>Executado</div>
                    <div style={{ ...styles.summaryValue, color: 'var(--status-success)', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_pago)}
                    </div>
                    <div style={styles.summarySubtext}>
                        {formatNumber(resumoComBdi.percentual_executado || 0, 1)}% do orçamento
                    </div>
                </div>
                <div style={{ ...styles.summaryCard, backgroundColor: 'var(--text-primary)', border: 'none' }}>
                    <div style={{ ...styles.summaryLabel, color: 'var(--text-muted)' }}>Total Geral</div>
                    <div style={{ ...styles.summaryValue, color: 'var(--surface-card)', fontSize: '20px' }}>
                        {formatCurrency(resumoComBdi.total_geral)}
                    </div>
                    <div style={{ ...styles.summarySubtext, color: 'var(--text-muted)' }}>
                        {dados.etapas.length || 0} etapas • {resumoComBdi.total_itens || 0} itens
                    </div>
                </div>
            </div>

            {/* Barra de Progresso */}
            <div style={styles.progressContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="ti ti-chart-bar" aria-hidden="true" /> Progresso Geral</span>
                    <span style={{ fontWeight: '700', color: 'var(--status-success)' }}>
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
                    <i className="ti ti-clipboard-data" aria-hidden="true" style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--text-muted)', display: 'block' }} />
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma etapa cadastrada</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Clique em "Nova Etapa" para começar</p>
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
                                                        style={{ ...styles.actionBtn, color: 'var(--text-on-dark)', opacity: dados.etapas.indexOf(etapa) === 0 ? 0.3 : 1 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moverEtapa(etapa.id, 'cima');
                                                        }}
                                                        title="Mover para cima"
                                                        disabled={dados.etapas.indexOf(etapa) === 0}
                                                    >
                                                        ⬆️
                                                    </button>
                                                    <button
                                                        style={{ ...styles.actionBtn, color: 'var(--text-on-dark)', opacity: dados.etapas.indexOf(etapa) === dados.etapas.length - 1 ? 0.3 : 1 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moverEtapa(etapa.id, 'baixo');
                                                        }}
                                                        title="Mover para baixo"
                                                        disabled={dados.etapas.indexOf(etapa) === dados.etapas.length - 1}
                                                    >
                                                        ⬇️
                                                    </button>
                                                    <button
                                                        style={{ ...styles.actionBtn, color: 'var(--text-on-dark)' }}
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
                                                        style={{ ...styles.actionBtn, color: 'var(--text-on-dark)' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            abrirEdicaoEtapa(etapa);
                                                        }}
                                                        title="Editar etapa"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        style={{ ...styles.actionBtn, color: 'var(--status-danger)' }}
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
                                                    backgroundColor: idx % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-subtle)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => abrirEdicaoItem(item)}
                                                title="Clique para editar"
                                            >
                                                <td style={{ ...styles.td, ...styles.tdCodigo }}>{item.codigo}</td>
                                                <td style={{ ...styles.td, ...styles.tdDescricao }}>
                                                    {item.descricao}
                                                    {item.tipo_composicao === 'composto' && (
                                                        <span style={{ ...styles.servicoBadge, backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' }}>
                                                            Composto
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdUnidade }}>{item.unidade}</td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    {formatNumber(item.quantidade, item.unidade === 'vb' || item.unidade === 'un' ? 0 : 2)}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    {item.tipo_composicao === 'composto' ? (
                                                        <div style={{ color: 'var(--text-muted)' }}>-</div>
                                                    ) : (
                                                        <CelulaComProgresso
                                                            valorTotal={item.total_mao_obra}
                                                            valorPago={item.valor_pago_mo || 0}
                                                            cor="var(--status-info)"
                                                            corTexto="var(--brand-primary)"
                                                        />
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                    {item.tipo_composicao === 'composto' ? (
                                                        <div style={{ color: 'var(--text-muted)' }}>-</div>
                                                    ) : (
                                                        <CelulaComProgresso
                                                            valorTotal={item.total_material}
                                                            valorPago={item.valor_pago_mat || 0}
                                                            cor="var(--status-warning)"
                                                            corTexto="var(--status-success)"
                                                        />
                                                    )}
                                                </td>
                                                <td style={{ ...styles.td, ...styles.tdTotal }}>
                                                    {item.tipo_composicao === 'composto' ? (
                                                        <div style={{ color: 'var(--status-purple-text)', fontWeight: '600' }}>
                                                            {formatCurrency(item.total)}
                                                            <div style={{ fontSize: '9px', color: 'var(--status-purple-text)' }}>serviço</div>
                                                        </div>
                                                    ) : (
                                                        formatCurrency(item.total)
                                                    )}
                                                </td>
                                                <td
                                                    style={{
                                                        ...styles.td, ...styles.tdNumero,
                                                        color: 'var(--status-success-text)', fontWeight: '600',
                                                        cursor: item.total_pago > 0 ? 'pointer' : 'default',
                                                        textDecoration: item.total_pago > 0 ? 'underline dotted' : 'none',
                                                    }}
                                                    title={item.total_pago > 0 ? 'Ver pagamentos que compõem este valor' : undefined}
                                                    onClick={(e) => {
                                                        if (item.total_pago > 0) {
                                                            e.stopPropagation();
                                                            setDetalhePagamentos(item);
                                                        }
                                                    }}
                                                >
                                                    {formatCurrency(item.total_pago)}
                                                </td>
                                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                                    {renderStatus(item)}
                                                </td>
                                                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            style={{ ...styles.actionBtn, color: 'var(--status-info)' }}
                                                            onClick={() => abrirEdicaoItem(item)}
                                                            title="Editar item"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            style={{ ...styles.actionBtn, color: 'var(--status-danger)' }}
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
                                <tr style={{ ...styles.subtotalRow, backgroundColor: 'var(--border-subtle)' }}>
                                    <td style={{ ...styles.subtotalTd, fontWeight: '700' }} colSpan={6}>
                                        SUBTOTAL (sem BDI)
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'right', fontWeight: '700' }}>
                                        {formatCurrency(resumoComBdi.subtotal)}
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'right', fontWeight: '700', color: 'var(--status-success-text)' }}>
                                        {formatCurrency(resumoComBdi.total_pago)}
                                    </td>
                                    <td style={{ ...styles.subtotalTd, textAlign: 'center', fontWeight: '700' }}>
                                        {formatNumber(resumoComBdi.percentual_executado || 0, 0)}%
                                    </td>
                                    <td></td>
                                </tr>
                                
                                {/* BDI */}
                                <tr style={{ backgroundColor: 'var(--status-warning-bg)' }}>
                                    <td style={{ ...styles.td, fontWeight: '600' }} colSpan={6}>
                                        BDI ({bdi}%)
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: 'var(--status-warning-text)' }}>
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
                                    <td style={{ ...styles.totalTd, textAlign: 'right', color: 'var(--status-success)' }}>
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
                backgroundColor: 'var(--surface-card)',
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
                    <span style={{ ...styles.statusBadge, ...styles.statusPago }}>✅ Pago</span> 100%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ ...styles.statusBadge, ...styles.statusEmAndamento }}>🔄 %</span> Em andamento
                </span>
            </div>

            {/* Modais */}
            {showNovaEtapa && (
                <NovaEtapaModal
                    onClose={fecharModalEtapa}
                    onSave={salvarEtapa}
                    etapaParaEditar={etapaParaEditar}
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

            {detalhePagamentos && (
                <DetalhePagamentosModal
                    item={detalhePagamentos}
                    obraId={obraId}
                    apiUrl={apiUrl}
                    onClose={() => setDetalhePagamentos(null)}
                />
            )}
        </div>
    );
};

export default OrcamentoEngenharia;
