/**
 * =====================================================
 * OBRALY - UPLOAD DE PLANTA BAIXA COM IA
 * =====================================================
 * 
 * Componente para upload de planta baixa e geração
 * automática de orçamento usando Claude Vision
 * 
 * =====================================================
 */

import React, { useState, useCallback } from 'react';

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
        backgroundColor: '#fff',
        borderRadius: '16px',
        maxWidth: '95vw',
        width: '1200px',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    modalTitle: {
        fontSize: '20px',
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
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: '#9ca3af',
        padding: '0',
        lineHeight: 1
    },
    // Buttons
    button: {
        padding: '12px 20px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
    },
    buttonPrimary: {
        backgroundColor: '#4f46e5',
        color: '#fff'
    },
    buttonSuccess: {
        backgroundColor: '#10b981',
        color: '#fff'
    },
    buttonSecondary: {
        backgroundColor: '#f1f5f9',
        color: '#475569'
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    },
    // Upload Area
    uploadArea: {
        border: '3px dashed #cbd5e1',
        borderRadius: '16px',
        padding: '60px 40px',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        cursor: 'pointer',
        transition: 'all 0.3s'
    },
    uploadAreaHover: {
        borderColor: '#4f46e5',
        backgroundColor: '#eef2ff'
    },
    uploadAreaWithImage: {
        padding: '20px',
        borderStyle: 'solid',
        borderColor: '#10b981'
    },
    uploadIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    uploadTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '8px'
    },
    uploadSubtitle: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '16px'
    },
    uploadFormats: {
        fontSize: '12px',
        color: '#94a3b8'
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
        color: '#374151',
        marginBottom: '6px'
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
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
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #4f46e5',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 24px'
    },
    processingTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '8px'
    },
    processingSubtitle: {
        fontSize: '14px',
        color: '#64748b',
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
        backgroundColor: '#dcfce7',
        color: '#16a34a'
    },
    stepCurrent: {
        backgroundColor: '#dbeafe',
        color: '#2563eb'
    },
    stepPending: {
        backgroundColor: '#f1f5f9',
        color: '#94a3b8'
    },
    // Results
    resultsContainer: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: '24px',
        height: '100%'
    },
    resultsSidebar: {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        height: 'fit-content'
    },
    resultsMain: {
        overflow: 'auto'
    },
    // Info Cards
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    infoCardTitle: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: '8px'
    },
    infoCardValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b'
    },
    infoCardSubtext: {
        fontSize: '12px',
        color: '#64748b',
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
        backgroundColor: '#e0e7ff',
        color: '#4338ca',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500'
    },
    // Table
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
    },
    th: {
        backgroundColor: '#f8fafc',
        padding: '10px 12px',
        textAlign: 'left',
        fontWeight: '600',
        color: '#475569',
        fontSize: '11px',
        textTransform: 'uppercase',
        borderBottom: '2px solid #e2e8f0',
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
        backgroundColor: '#4f46e5',
        color: '#fff'
    },
    etapaTd: {
        padding: '10px 12px',
        fontWeight: '600'
    },
    itemRow: {
        borderBottom: '1px solid #f1f5f9'
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
        border: '1px solid #d1d5db',
        fontSize: '13px',
        textAlign: 'right'
    },
    // Justificativa
    justificativa: {
        fontSize: '11px',
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: '2px'
    },
    // Warning
    warningBox: {
        padding: '12px 16px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #fcd34d',
        fontSize: '13px',
        color: '#92400e',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
    },
    // Total
    totalRow: {
        backgroundColor: '#1e293b',
        color: '#fff',
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
        backgroundColor: '#dcfce7',
        color: '#16a34a'
    },
    fonteAproximado: {
        backgroundColor: '#fef3c7',
        color: '#92400e'
    },
    fonteNaoEncontrado: {
        backgroundColor: '#fee2e2',
        color: '#dc2626'
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
// COMPONENTE PRINCIPAL
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
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!tiposPermitidos.includes(file.type)) {
            setErro('Formato não suportado. Use JPG, PNG, WEBP ou GIF.');
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
            // Converter imagem para base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imagem);
            });
            
            // Extrair dados do base64
            const [header, data] = base64.split(',');
            const mediaType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
            
            // Chamar API
            const response = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/gerar-por-planta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imagem_base64: data,
                    media_type: mediaType,
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
            console.error('Erro:', err);
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
            const response = await localFetchWithAuth(`${apiUrl}/obras/${obraId}/orcamento-eng/importar-gerado`, {
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
            alert(`✅ Orçamento importado!\n\n${data.etapas_criadas} etapas\n${data.itens_criados} itens\n${data.servicos_criados} serviços no Kanban`);
            
            if (onImportar) onImportar();
            onClose();
            
        } catch (err) {
            console.error('Erro:', err);
            setErro(err.message || 'Erro ao importar orçamento');
        }
    };

    // Renderizar badge de fonte de preço
    const renderFonteBadge = (fonte) => {
        switch (fonte) {
            case 'base':
                return <span style={{ ...styles.fonteBadge, ...styles.fonteBase }}>✓ Base</span>;
            case 'base_aproximado':
                return <span style={{ ...styles.fonteBadge, ...styles.fonteAproximado }}>~ Aproximado</span>;
            default:
                return <span style={{ ...styles.fonteBadge, ...styles.fonteNaoEncontrado }}>⚠ Sem preço</span>;
        }
    };

    const totais = calcularTotais();

    return (
        <>
            <style>{spinnerStyle}</style>
            <div style={styles.modalOverlay} onClick={onClose}>
                <div style={styles.modal} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={styles.modalHeader}>
                        <h2 style={styles.modalTitle}>
                            🤖 Gerar Orçamento por Planta Baixa
                            {etapa === 'results' && <span style={{ fontSize: '14px', fontWeight: '400', color: '#64748b' }}> - Revisão</span>}
                        </h2>
                        <button style={styles.closeBtn} onClick={onClose}>×</button>
                    </div>
                    
                    {/* Body */}
                    <div style={styles.modalBody}>
                        {/* ETAPA: UPLOAD */}
                        {etapa === 'upload' && (
                            <>
                                {erro && (
                                    <div style={{ ...styles.warningBox, backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
                                        ⚠️ {erro}
                                    </div>
                                )}
                                
                                {!imagem ? (
                                    // Área de upload
                                    <div
                                        style={{
                                            ...styles.uploadArea,
                                            ...(dragOver ? styles.uploadAreaHover : {})
                                        }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById('fileInput').click()}
                                    >
                                        <div style={styles.uploadIcon}>📐</div>
                                        <div style={styles.uploadTitle}>Arraste a planta baixa aqui</div>
                                        <div style={styles.uploadSubtitle}>ou clique para selecionar o arquivo</div>
                                        <div style={styles.uploadFormats}>Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 20MB)</div>
                                        <input
                                            id="fileInput"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={handleInputChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                ) : (
                                    // Preview e configurações
                                    <div style={styles.previewContainer}>
                                        <div>
                                            <img 
                                                src={imagemPreview} 
                                                alt="Preview da planta" 
                                                style={styles.previewImage}
                                            />
                                            <button
                                                style={{ ...styles.button, ...styles.buttonSecondary, marginTop: '12px', width: '100%', justifyContent: 'center' }}
                                                onClick={() => { setImagem(null); setImagemPreview(null); }}
                                            >
                                                🔄 Trocar imagem
                                            </button>
                                        </div>
                                        
                                        <div style={styles.previewInfo}>
                                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>
                                                📋 Informações adicionais (opcional)
                                            </h3>
                                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                                Essas informações ajudam a IA a gerar um orçamento mais preciso. Se não souber, deixe em branco.
                                            </p>
                                            
                                            <div style={styles.formRow}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Área Total (m²)</label>
                                                    <input
                                                        type="number"
                                                        style={styles.formInput}
                                                        value={areaTotal}
                                                        onChange={e => setAreaTotal(e.target.value)}
                                                        placeholder="Ex: 120"
                                                    />
                                                </div>
                                                
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Pavimentos</label>
                                                    <select
                                                        style={styles.formInput}
                                                        value={pavimentos}
                                                        onChange={e => setPavimentos(e.target.value)}
                                                    >
                                                        <option value="1">1 (Térreo)</option>
                                                        <option value="2">2 (Térreo + Superior)</option>
                                                        <option value="3">3</option>
                                                    </select>
                                                </div>
                                                
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Padrão de Acabamento</label>
                                                    <select
                                                        style={styles.formInput}
                                                        value={padrao}
                                                        onChange={e => setPadrao(e.target.value)}
                                                    >
                                                        <option value="econômico">Econômico</option>
                                                        <option value="médio">Médio</option>
                                                        <option value="alto">Alto Padrão</option>
                                                    </select>
                                                </div>
                                                
                                                <div style={styles.formGroup}>
                                                    <label style={styles.formLabel}>Tipo de Construção</label>
                                                    <select
                                                        style={styles.formInput}
                                                        value={tipoConstrucao}
                                                        onChange={e => setTipoConstrucao(e.target.value)}
                                                    >
                                                        <option value="residencial">Residencial</option>
                                                        <option value="comercial">Comercial</option>
                                                        <option value="industrial">Industrial</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div style={styles.warningBox}>
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
                            <div style={styles.processingContainer}>
                                <div style={styles.processingSpinner}></div>
                                <div style={styles.processingTitle}>Analisando planta baixa...</div>
                                <div style={styles.processingSubtitle}>Isso pode levar alguns segundos</div>
                                
                                <div style={styles.processingSteps}>
                                    {steps.map((step, idx) => (
                                        <div key={idx} style={styles.processingStep}>
                                            <div style={{
                                                ...styles.stepIcon,
                                                ...(idx < stepAtual ? styles.stepDone : 
                                                    idx === stepAtual ? styles.stepCurrent : 
                                                    styles.stepPending)
                                            }}>
                                                {idx < stepAtual ? '✓' : idx === stepAtual ? '...' : '○'}
                                            </div>
                                            <span style={{ color: idx <= stepAtual ? '#1e293b' : '#94a3b8' }}>
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
                                <div style={styles.warningBox}>
                                    <span>⚠️</span>
                                    <div>
                                        <strong>Revise os quantitativos antes de confirmar!</strong>
                                        <br />
                                        Os valores foram estimados pela IA e podem precisar de ajustes. Clique na quantidade para editar.
                                    </div>
                                </div>
                                
                                <div style={styles.resultsContainer}>
                                    {/* Sidebar */}
                                    <div style={styles.resultsSidebar}>
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoCardTitle}>Área Identificada</div>
                                            <div style={styles.infoCardValue}>
                                                {resultado.dados_identificados?.area_estimada || '?'} m²
                                            </div>
                                        </div>
                                        
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoCardTitle}>Ambientes</div>
                                            <div style={styles.infoCardValue}>
                                                {resultado.dados_identificados?.total_ambientes || resultado.dados_identificados?.ambientes?.length || '?'}
                                            </div>
                                            <div style={styles.ambientesList}>
                                                {resultado.dados_identificados?.ambientes?.slice(0, 8).map((amb, idx) => (
                                                    <span key={idx} style={styles.ambienteBadge}>
                                                        {amb.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoCardTitle}>Banheiros</div>
                                            <div style={styles.infoCardValue}>
                                                {resultado.dados_identificados?.banheiros || '?'}
                                            </div>
                                        </div>
                                        
                                        <div style={styles.infoCard}>
                                            <div style={styles.infoCardTitle}>Paredes</div>
                                            <div style={styles.infoCardValue}>
                                                {resultado.dados_identificados?.paredes_lineares_m || '?'} m
                                            </div>
                                        </div>
                                        
                                        <div style={{ ...styles.infoCard, backgroundColor: '#1e293b', color: '#fff' }}>
                                            <div style={{ ...styles.infoCardTitle, color: '#94a3b8' }}>Total Selecionado</div>
                                            <div style={{ ...styles.infoCardValue, color: '#fff' }}>
                                                {formatCurrency(totais.total)}
                                            </div>
                                            <div style={{ ...styles.infoCardSubtext, color: '#64748b' }}>
                                                {totais.itens} itens selecionados
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                            <button
                                                style={{ ...styles.button, ...styles.buttonSecondary, flex: 1, justifyContent: 'center', padding: '8px' }}
                                                onClick={() => toggleTodos(true)}
                                            >
                                                ✓ Todos
                                            </button>
                                            <button
                                                style={{ ...styles.button, ...styles.buttonSecondary, flex: 1, justifyContent: 'center', padding: '8px' }}
                                                onClick={() => toggleTodos(false)}
                                            >
                                                ✗ Nenhum
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Tabela de itens */}
                                    <div style={styles.resultsMain}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ ...styles.th, width: '40px' }}>✓</th>
                                                    <th style={{ ...styles.th, width: '60px' }}>Código</th>
                                                    <th style={styles.th}>Descrição</th>
                                                    <th style={{ ...styles.th, ...styles.thCenter, width: '50px' }}>Un.</th>
                                                    <th style={{ ...styles.th, ...styles.thRight, width: '80px' }}>Qtd.</th>
                                                    <th style={{ ...styles.th, ...styles.thRight, width: '100px' }}>Preço Un.</th>
                                                    <th style={{ ...styles.th, ...styles.thRight, width: '100px' }}>Total</th>
                                                    <th style={{ ...styles.th, ...styles.thCenter, width: '60px' }}>Kanban</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resultado.etapas.map((etapa, etapaIdx) => (
                                                    <React.Fragment key={etapa.codigo}>
                                                        {/* Linha da etapa */}
                                                        <tr style={styles.etapaRow}>
                                                            <td style={styles.etapaTd} colSpan={8}>
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
                                                                        ...styles.itemRow,
                                                                        opacity: item.selecionado ? 1 : 0.5,
                                                                        backgroundColor: item.selecionado ? '#fff' : '#f8fafc'
                                                                    }}
                                                                >
                                                                    <td style={styles.td}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.selecionado}
                                                                            onChange={() => toggleItem(etapaIdx, itemIdx)}
                                                                            style={styles.checkbox}
                                                                        />
                                                                    </td>
                                                                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                                                        {item.codigo}
                                                                    </td>
                                                                    <td style={styles.td}>
                                                                        <div style={{ fontWeight: '500' }}>
                                                                            {item.descricao}
                                                                            {renderFonteBadge(item.fonte_preco)}
                                                                        </div>
                                                                        {item.justificativa && (
                                                                            <div style={styles.justificativa}>
                                                                                💡 {item.justificativa}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ ...styles.td, ...styles.tdCenter }}>
                                                                        {item.unidade}
                                                                    </td>
                                                                    <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                                        <input
                                                                            type="number"
                                                                            value={item.quantidade}
                                                                            onChange={e => atualizarQuantidade(etapaIdx, itemIdx, e.target.value)}
                                                                            style={styles.inputInline}
                                                                            disabled={!item.selecionado}
                                                                            step="0.01"
                                                                        />
                                                                    </td>
                                                                    <td style={{ ...styles.td, ...styles.tdNumero }}>
                                                                        {formatCurrency(precoUn)}
                                                                    </td>
                                                                    <td style={{ ...styles.td, ...styles.tdNumero, fontWeight: '600' }}>
                                                                        {formatCurrency(item.total_estimado)}
                                                                    </td>
                                                                    <td style={{ ...styles.td, ...styles.tdCenter }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.criar_servico}
                                                                            onChange={() => toggleCriarServico(etapaIdx, itemIdx)}
                                                                            style={styles.checkbox}
                                                                            disabled={!item.selecionado}
                                                                            title="Criar serviço no Kanban"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                ))}
                                                
                                                {/* Total */}
                                                <tr style={styles.totalRow}>
                                                    <td style={styles.totalTd} colSpan={6}>
                                                        💰 TOTAL DO ORÇAMENTO
                                                    </td>
                                                    <td style={{ ...styles.totalTd, textAlign: 'right', fontSize: '16px' }}>
                                                        {formatCurrency(totais.total)}
                                                    </td>
                                                    <td style={styles.totalTd}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div style={styles.modalFooter}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {etapa === 'upload' && imagem && '✓ Imagem carregada'}
                            {etapa === 'results' && `${totais.itens} itens selecionados`}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {etapa === 'upload' && (
                                <>
                                    <button 
                                        style={{ ...styles.button, ...styles.buttonSecondary }}
                                        onClick={onClose}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        style={{ 
                                            ...styles.button, 
                                            ...styles.buttonPrimary,
                                            ...(imagem ? {} : styles.buttonDisabled)
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
                                        style={{ ...styles.button, ...styles.buttonSecondary }}
                                        onClick={() => setEtapa('upload')}
                                    >
                                        ← Voltar
                                    </button>
                                    <button 
                                        style={{ 
                                            ...styles.button, 
                                            ...styles.buttonSuccess,
                                            ...(totais.itens === 0 ? styles.buttonDisabled : {})
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

export default UploadPlantaModal;
