import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Imports do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// MUDAN�A 1: Import do componente DiarioObras
import DiarioObras from './components/DiarioObras';

// MUDAN�A 2: Import do componente CronogramaObra
import CronogramaObra from './components/CronogramaObra';

// NOVO: Import do Dashboard com gr�ficos
import DashboardObra from './components/DashboardObra';
import './components/DashboardObra.css';

// Import para compress�o de imagens
import { compressImages } from './utils/imageCompression';

// ?? M�DULO BI - Import do Business Intelligence Dashboard
// NOTA: Coloque o arquivo BiModule.js na pasta src/
import { BiDashboard } from './BiModule';

// ?? M�DULO OR�AMENTO DE ENGENHARIA
import OrcamentoEngenharia from './components/OrcamentoEngenharia';

// ?? M�DULO AGENDA DE DEMANDAS
import AgendaDemandas from './components/AgendaDemandas';

// ?? M�DULO ADMINISTRA��O (Gest�o Patrimonial)
import AppAdmin from './AppAdmin';
import { API_URL } from './config';
import { ToastContainer, notify, confirmDialog } from './utils/notify';
import { logger } from './utils/logger';
import { formatCurrency, getTodayString } from './utils/format';
import PrioridadeBadge from './components/PrioridadeBadge';
import { AuthContext, useAuth } from './auth/AuthContext';
import { fetchWithAuth, fetchWithAuthTimeout } from './auth/fetchWithAuth';
import Modal from './components/modals/Modal';
import EditPrioridadeModal from './components/modals/EditPrioridadeModal';
import ViewAnexosModal from './components/modals/ViewAnexosModal';
import PartialPaymentModal from './components/modals/PartialPaymentModal';
import ExportReportModal from './components/modals/ExportReportModal';
import UploadNotaFiscalModal from './components/modals/UploadNotaFiscalModal';
import EditLancamentoModal from './components/modals/EditLancamentoModal';
import VisualizarNotaFiscalModal from './components/modals/VisualizarNotaFiscalModal';
import CadastrarPagamentoFuturoModal from './components/modals/CadastrarPagamentoFuturoModal';
import EditarPagamentoFuturoModal from './components/modals/EditarPagamentoFuturoModal';
import ModalAprovarOrcamento from './components/modals/ModalAprovarOrcamento';
import AddLancamentoModal from './components/modals/AddLancamentoModal';
import UserPermissionsModal from './components/modals/UserPermissionsModal';
import AddOrcamentoModal from './components/modals/AddOrcamentoModal';
import EditOrcamentoModal from './components/modals/EditOrcamentoModal';
import AdminPanelModal from './components/modals/AdminPanelModal';
import NotaFiscalIcon from './components/NotaFiscalIcon';
import ModalRelatorioCronograma from './components/modals/ModalRelatorioCronograma';
import ModalWhatsAppCronograma from './components/modals/ModalWhatsAppCronograma';
import ModalNovaMovimentacaoCaixa from './components/modals/ModalNovaMovimentacaoCaixa';
import RelatoriosModal from './components/modals/RelatoriosModal';
import CadastrarPagamentoParceladoModal from './components/modals/CadastrarPagamentoParceladoModal';
import ModalOrcamentos from './components/modals/ModalOrcamentos';
import OrcamentosModal from './components/modals/OrcamentosModal';
import CadastrarBoletoModal from './components/modals/CadastrarBoletoModal';
import CaixaObraModal from './components/modals/CaixaObraModal';
import EditarParcelasModal from './components/modals/EditarParcelasModal';
import InserirPagamentoModal from './components/modals/InserirPagamentoModal';
import LoginScreen from './auth/LoginScreen';
import ModuleSelectorScreen from './layout/ModuleSelectorScreen';
import WindowsNavBar, { WindowsNavStyles } from './layout/WindowsNavBar';
import QuadroAlertasVencimento from './components/QuadroAlertasVencimento';
import GestaoBoletos from './components/GestaoBoletos';

// Registrar os componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// --- CONFIGURA��O INICIAL ---





// --- CONTEXTO DE AUTENTICA��O + FETCH ---
// fetchWithAuth, fetchWithAuthTimeout ? src/auth/fetchWithAuth.js
// AuthContext, useAuth              ? src/auth/AuthContext.jsx




// --- COMPONENTE: HIST�RICO DE PAGAMENTOS (Card para Home) ---
const HistoricoPagamentosCard = ({ itemsPagos, itemsAPagar, user, onDeleteItem, fetchObraData, obraId }) => {
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [editandoItem, setEditandoItem] = useState(null);
    const [itensOrcamento, setItensOrcamento] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    const [busca, setBusca] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, mao_de_obra, material, equipamento
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const ITENS_INICIAIS = 10;
    
    // Filtrar pagamentos baseado na busca e filtros
    const pagamentosFiltrados = useMemo(() => {
        return itemsPagos.filter(item => {
            // Filtro de busca por texto
            const termoBusca = busca.toLowerCase();
            const matchBusca = !busca || 
                (item.descricao && item.descricao.toLowerCase().includes(termoBusca)) ||
                (item.fornecedor && item.fornecedor.toLowerCase().includes(termoBusca)) ||
                (item.servico_nome && item.servico_nome.toLowerCase().includes(termoBusca)) ||
                (item.orcamento_item_nome && item.orcamento_item_nome.toLowerCase().includes(termoBusca));
            
            // Filtro por tipo
            const tipoItem = (item.tipo || item.tipo_pagamento || '').toLowerCase();
            const matchTipo = filtroTipo === 'todos' || 
                (filtroTipo === 'mao_de_obra' && (tipoItem.includes('m�o') || tipoItem.includes('mao') || tipoItem === 'mao_de_obra')) ||
                (filtroTipo === 'material' && tipoItem.includes('material')) ||
                (filtroTipo === 'equipamento' && (tipoItem.includes('equipamento') || tipoItem.includes('despesa')));
            
            // Filtro por fornecedor
            const matchFornecedor = !filtroFornecedor || 
                (item.fornecedor && item.fornecedor.toLowerCase().includes(filtroFornecedor.toLowerCase()));
            
            return matchBusca && matchTipo && matchFornecedor;
        });
    }, [itemsPagos, busca, filtroTipo, filtroFornecedor]);
    
    // Lista de fornecedores �nicos para o filtro
    const fornecedoresUnicos = useMemo(() => {
        const fornecedores = [...new Set(itemsPagos.map(item => item.fornecedor).filter(Boolean))];
        return fornecedores.sort();
    }, [itemsPagos]);
    
    const pagamentosExibidos = mostrarTodos ? pagamentosFiltrados : pagamentosFiltrados.slice(0, ITENS_INICIAIS);
    const totalPago = pagamentosFiltrados.reduce((sum, item) => sum + (item.valor_pago || item.valor_total || 0), 0);
    const totalPendente = itemsAPagar.reduce((sum, item) => sum + ((item.valor_total || 0) - (item.valor_pago || 0)), 0);
    
    const isAdmin = user && (user.role === 'administrador' || user.role === 'master');
    const isMaster = user && user.role === 'master';
    
    // Buscar itens do or�amento quando abrir modal de edi��o
    const fetchItensOrcamento = async () => {
        if (!obraId) return;
        setLoadingItens(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`);
            if (response.ok) {
                const data = await response.json();
                setItensOrcamento(data);
            }
        } catch (err) {
            logger.error('Erro ao buscar itens do or�amento:', err);
        } finally {
            setLoadingItens(false);
        }
    };
    
    // Abrir modal de edi��o
    const handleEditarItem = (item) => {
        // Normalizar o tipo para 'M�o de Obra' ou 'Material'
        let tipoNorm = item.tipo || item.segmento || item.tipo_pagamento || 'Material';
        if (tipoNorm === 'mao_de_obra' || tipoNorm === 'mao_obra') tipoNorm = 'M�o de Obra';
        if (tipoNorm === 'material') tipoNorm = 'Material';
        setEditandoItem({
            ...item,
            orcamento_item_id: item.orcamento_item_id || '',
            tipo_edit: tipoNorm
        });
        fetchItensOrcamento();
    };
    
    // Salvar edi��o (vincular item do or�amento)
    const handleSalvarEdicao = async () => {
        if (!editandoItem) return;
        
        try {
            const strId = String(editandoItem.id);
            let endpoint = '';
            let numericId = strId;
            let method = 'PATCH';
            let body = {
                orcamento_item_id: editandoItem.orcamento_item_id || null
            };
            
            // Extrair ID num�rico
            const tipoEdit = editandoItem.tipo_edit || 'Material';
            const tipoMaoDeObra = tipoEdit === 'M�o de Obra';

            if (strId.startsWith('lanc-')) {
                numericId = strId.replace('lanc-', '');
                endpoint = `${API_URL}/lancamentos/${numericId}`;
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null, tipo: tipoEdit };
            } else if (strId.startsWith('serv-pag-')) {
                numericId = strId.replace('serv-pag-', '');
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null, tipo_pagamento: tipoMaoDeObra ? 'mao_de_obra' : 'material' };
            } else if (editandoItem.tipo_registro === 'lancamento') {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null, tipo: tipoEdit };
            } else if (editandoItem.tipo_registro === 'pagamento_servico') {
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null, tipo_pagamento: tipoMaoDeObra ? 'mao_de_obra' : 'material' };
            } else if (editandoItem.tipo_registro === 'boleto') {
                const boletoId = editandoItem.boleto_id || strId.replace('boleto-', '');
                endpoint = `${API_URL}/obras/${obraId}/boletos/${boletoId}`;
                method = 'PUT';
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null };
            } else if (editandoItem.tipo_registro === 'parcela_individual') {
                const pagParceladoId = editandoItem.pagamento_parcelado_id;
                if (pagParceladoId) {
                    endpoint = `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagParceladoId}`;
                    method = 'PUT';
                    body = { 
                        orcamento_item_id: editandoItem.orcamento_item_id || null,
                        segmento: tipoEdit
                    };
                } else {
                    throw new Error('ID do pagamento parcelado n�o encontrado');
                }
            } else {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
                body = { orcamento_item_id: editandoItem.orcamento_item_id || null, tipo: tipoEdit };
            }
            
            const response = await fetchWithAuth(endpoint, {
                method: method,
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                const toast = document.createElement('div');
                toast.className = 'cf-toast';
                toast.textContent = '? Pagamento atualizado com sucesso!';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao atualizar');
            }
        } catch (err) {
            logger.error('Erro ao salvar edi��o:', err);
            notify.error(`Erro ao salvar: ${err.message}`);
        }
    };
    
    // Fun��o para exportar CSV
    const exportarCSV = () => {
        if (itemsPagos.length === 0) {
            notify.info('Nenhum pagamento para exportar');
            return;
        }
        
        // Cabe�alho CSV
        const headers = ['Data', 'Descri��o', 'Fornecedor', 'Servi�o', 'Valor', 'Status'];
        
        // Linhas de dados
        const rows = itemsPagos.map(item => {
            const data = item.data_vencimento || item.data || '';
            const dataFormatada = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            const valor = (item.valor_pago || item.valor_total || 0).toFixed(2).replace('.', ',');
            
            return [
                dataFormatada,
                `"${(item.descricao || '').replace(/"/g, '""')}"`,
                `"${(item.fornecedor || '-').replace(/"/g, '""')}"`,
                `"${(item.servico_nome || '-').replace(/"/g, '""')}"`,
                `"R$ ${valor}"`,
                'Pago'
            ].join(';');
        });
        
        // Adicionar linha de total
        const totalFormatado = totalPago.toFixed(2).replace('.', ',');
        rows.push('');
        rows.push(`;;;"TOTAL";"R$ ${totalFormatado}";`);
        
        // Montar CSV
        const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historico_pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Fun��o para reverter parcela paga (voltar para pendente)
    const handleRevertParcela = async (item) => {
        if (!await confirmDialog(`Deseja reverter o pagamento "${item.descricao}"? A parcela voltar� ao status "Pendente".`, { confirmText: 'Reverter' })) return;
        
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${item.pagamento_parcelado_id}/parcelas/${item.parcela_id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'Pendente',
                        data_pagamento: null
                    })
                }
            );
            
            if (response.ok) {
                notify.success('Pagamento revertido com sucesso!');
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao reverter pagamento');
            }
        } catch (err) {
            logger.error('Erro ao reverter parcela:', err);
            notify.error(`Erro ao reverter: ${err.message}`);
        }
    };
    
    const handleDelete = async (item) => {
        if (!await confirmDialog(`Deseja excluir "${item.descricao}"?`, { danger: true, confirmText: 'Excluir' })) return;
        
        try {
            let endpoint = '';
            
            // Extrair ID num�rico (remover prefixos como "lanc-", "serv-pag-")
            const extractNumericId = (id) => {
                const strId = String(id);
                if (strId.startsWith('lanc-')) return strId.replace('lanc-', '');
                if (strId.startsWith('serv-pag-')) return strId.replace('serv-pag-', '');
                if (strId.startsWith('parcela-')) return null; // Parcelas n�o podem ser deletadas
                return strId;
            };
            
            const numericId = extractNumericId(item.id);
            
            if (!numericId) {
                notify.error('Parcelas de pagamentos parcelados n�o podem ser exclu�das individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            }
            
            // Determinar qual endpoint usar baseado no tipo de registro
            if (item.tipo_registro === 'lancamento') {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            } else if (item.tipo_registro === 'pagamento_servico') {
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
            } else if (item.tipo_registro === 'parcela_individual') {
                notify.error('Parcelas de pagamentos parcelados n�o podem ser exclu�das individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            } else {
                // Tentar identificar pelo prefixo do ID
                if (String(item.id).startsWith('serv-pag-')) {
                    endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
                } else {
                    endpoint = `${API_URL}/lancamentos/${numericId}`;
                }
            }
            
            logger.debug('Deletando:', endpoint);
            const response = await fetchWithAuth(endpoint, { method: 'DELETE' });
            
            if (response.ok) {
                notify.success('Item exclu�do com sucesso!');
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao excluir');
            }
        } catch (err) {
            logger.error('Erro ao excluir:', err);
            notify.error(`Erro ao excluir: ${err.message}`);
        }
    };
    
    // Helper para verificar se � parcela
    const isParcela = (item) => {
        return item.tipo_registro === 'parcela_individual' || String(item.id).startsWith('parcela-');
    };
    
    // Helper para extrair dados para NotaFiscal
    const getNotaFiscalData = (item) => {
        const strId = String(item.id);
        let numericId = strId;
        let itemType = 'lancamento';
        
        if (strId.startsWith('lanc-')) {
            numericId = strId.replace('lanc-', '');
            itemType = 'lancamento';
        } else if (strId.startsWith('serv-pag-')) {
            numericId = strId.replace('serv-pag-', '');
            itemType = 'pagamento_servico';
        } else if (strId.startsWith('parcela-') || item.tipo_registro === 'parcela_individual') {
            numericId = item.parcela_id || strId.replace('parcela-', '');
            itemType = 'parcela_individual';
        } else if (item.tipo_registro === 'pagamento_servico') {
            itemType = 'pagamento_servico';
        }
        
        return { numericId: parseInt(numericId), itemType };
    };
    
    return (
        <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ 
                fontSize: '1.5em', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                ?? Hist�rico de Pagamentos
                <span style={{ 
                    fontSize: '0.6em', 
                    backgroundColor: '#4CAF50', 
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px'
                }}>
                    {itemsPagos.length} pagos
                </span>
                {itemsPagos.length > 0 && (
                    <button
                        onClick={exportarCSV}
                        style={{
                            marginLeft: 'auto',
                            padding: '6px 12px',
                            fontSize: '0.55em',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '500'
                        }}
                        title="Exportar hist�rico para CSV"
                    >
                        ?? Exportar CSV
                    </button>
                )}
            </h2>
            
            {/* Legenda de Tipos */}
            {itemsPagos.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    marginBottom: '16px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--cor-fundo-secundario)',
                    borderRadius: '8px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#6366f1',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>M�o de Obra</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#10b981',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Material</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '4px', 
                            backgroundColor: '#f59e0b',
                            display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Equipamento</span>
                    </div>
                </div>
            )}
            
            {/* Barra de Busca e Filtros */}
            {itemsPagos.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    {/* Linha principal: Busca + Bot�o Filtros */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        {/* Campo de Busca R�pida */}
                        <div style={{ 
                            flex: '1', 
                            minWidth: '250px',
                            position: 'relative'
                        }}>
                            <span style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '16px',
                                color: '#9ca3af'
                            }}>??</span>
                            <input
                                type="text"
                                placeholder="Buscar por descri��o, fornecedor ou servi�o..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 40px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            {busca && (
                                <button
                                    onClick={() => setBusca('')}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        color: '#9ca3af',
                                        padding: '4px'
                                    }}
                                    title="Limpar busca"
                                >
                                    ?
                                </button>
                            )}
                        </div>
                        
                        {/* Bot�o Filtros */}
                        <button
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            style={{
                                padding: '10px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                backgroundColor: mostrarFiltros ? '#eff6ff' : '#fff',
                                borderColor: mostrarFiltros ? '#3b82f6' : '#e2e8f0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: mostrarFiltros ? '#3b82f6' : '#64748b',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span>???</span>
                            Filtros
                            {(filtroTipo !== 'todos' || filtroFornecedor || busca) && (
                                <span style={{
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {(filtroTipo !== 'todos' ? 1 : 0) + (filtroFornecedor ? 1 : 0) + (busca ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    {/* Painel de Filtros Expandido */}
                    {mostrarFiltros && (
                        <div style={{
                            marginTop: '12px',
                            padding: '16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                marginBottom: '12px'
                            }}>
                                {/* Filtro por Tipo */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '12px', 
                                        fontWeight: '600',
                                        color: '#64748b',
                                        marginBottom: '6px'
                                    }}>
                                        ?? Tipo
                                    </label>
                                    <select
                                        value={filtroTipo}
                                        onChange={(e) => setFiltroTipo(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="todos">Todos os tipos</option>
                                        <option value="mao_de_obra">?? M�o de Obra</option>
                                        <option value="material">?? Material</option>
                                        <option value="equipamento">?? Equipamento</option>
                                    </select>
                                </div>
                                
                                {/* Filtro por Fornecedor */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '12px', 
                                        fontWeight: '600',
                                        color: '#64748b',
                                        marginBottom: '6px'
                                    }}>
                                        ?? Fornecedor
                                    </label>
                                    <select
                                        value={filtroFornecedor}
                                        onChange={(e) => setFiltroFornecedor(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">Todos os fornecedores</option>
                                        {fornecedoresUnicos.map(fornecedor => (
                                            <option key={fornecedor} value={fornecedor}>
                                                {fornecedor}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Bot�o Limpar Filtros */}
                            {(filtroTipo !== 'todos' || filtroFornecedor || busca) && (
                                <div style={{ 
                                    borderTop: '1px solid #e2e8f0', 
                                    paddingTop: '12px',
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}>
                                    <button
                                        onClick={() => {
                                            setBusca('');
                                            setFiltroTipo('todos');
                                            setFiltroFornecedor('');
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            backgroundColor: '#fee2e2',
                                            color: '#dc2626',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ? Limpar todos os filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Indicador de resultados filtrados */}
                    {(busca || filtroTipo !== 'todos' || filtroFornecedor) && (
                        <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#eff6ff',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                        }}>
                            <span>??</span>
                            Exibindo <strong>{pagamentosFiltrados.length}</strong> de <strong>{itemsPagos.length}</strong> pagamentos
                            {busca && <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>Busca: "{busca}"</span>}
                            {filtroTipo !== 'todos' && <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>Tipo: {filtroTipo === 'mao_de_obra' ? 'M�o de Obra' : filtroTipo === 'material' ? 'Material' : 'Equipamento'}</span>}
                            {filtroFornecedor && <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>Fornecedor: {filtroFornecedor}</span>}
                        </div>
                    )}
                </div>
            )}
            
            {itemsPagos.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '30px', 
                    color: '#999',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '2em', marginBottom: '10px' }}>??</div>
                    <p>Nenhum pagamento registrado</p>
                </div>
            ) : (
                <>
                    <div className="tabela-scroll-container" style={{ maxHeight: mostrarTodos ? '600px' : '400px', overflowY: 'auto' }}>
                        <table className="tabela-pagamentos" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descri��o</th>
                                    <th>Fornecedor</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th style={{width: '50px', textAlign: 'center'}}>NF</th>
                                    {isAdmin && <th style={{width: '50px'}}>A��es</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosExibidos.map((item, idx) => {
                                    // Determinar cor baseada no tipo
                                    const getTipoColor = () => {
                                        const tipo = item.tipo || item.tipo_pagamento || '';
                                        const tipoLower = tipo.toLowerCase();
                                        if (tipoLower.includes('m�o') || tipoLower.includes('mao') || tipoLower === 'mao_de_obra') return '#6366f1'; // Indigo
                                        if (tipoLower.includes('material')) return '#10b981'; // Verde
                                        if (tipoLower.includes('equipamento')) return '#f59e0b'; // Laranja
                                        return '#94a3b8'; // Cinza padr�o
                                    };
                                    const tipoColor = getTipoColor();
                                    
                                    return (
                                    <tr key={item.id || idx} style={{ position: 'relative' }}>
                                        <td style={{ position: 'relative', paddingLeft: '16px' }}>
                                            {/* Indicador colorido */}
                                            <span style={{
                                                position: 'absolute',
                                                left: '0',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '4px',
                                                height: '70%',
                                                borderRadius: '2px',
                                                backgroundColor: tipoColor
                                            }}></span>
                                            {new Date((item.data_vencimento || item.data) + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{item.descricao}</div>
                                            {item.orcamento_item_nome && (
                                                <div style={{ fontSize: '0.85em', color: '#666' }}>
                                                    ?? {item.orcamento_item_nome}
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.fornecedor || '-'}</td>
                                        <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                            {formatCurrency(item.valor_pago || item.valor_total || 0)}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                fontSize: '0.8em'
                                            }}>
                                                ? Pago
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            {/* Nota Fiscal - para todos os tipos incluindo parcelas */}
                                            {obraId && (() => {
                                                const { numericId, itemType } = getNotaFiscalData(item);
                                                
                                                return (
                                                    <NotaFiscalIcon 
                                                        item={{ ...item, id: numericId }}
                                                        itemType={itemType}
                                                        obraId={obraId}
                                                        onNotaAdded={() => fetchObraData && obraId && fetchObraData(obraId)}
                                                    />
                                                );
                                            })()}
                                        </td>
                                        {isAdmin && (
                                            <td style={{textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                {/* Bot�o de editar (vincular servi�o) */}
                                                <button 
                                                    onClick={() => handleEditarItem(item)}
                                                    style={{ 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        cursor: 'pointer', 
                                                        fontSize: '1.1em', 
                                                        padding: '3px', 
                                                        color: '#1976d2' 
                                                    }}
                                                    title="Editar / Vincular a servi�o"
                                                >
                                                    ??
                                                </button>
                                                {isParcela(item) ? (
                                                    /* Para parcelas: bot�o de reverter pagamento (admin e master) */
                                                    <button 
                                                        onClick={() => handleRevertParcela(item)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: 'pointer', 
                                                            fontSize: '1.1em', 
                                                            padding: '3px', 
                                                            color: '#ff9800' 
                                                        }}
                                                        title="Reverter pagamento (voltar para Pendente)"
                                                    >
                                                        ??
                                                    </button>
                                                ) : (
                                                    /* Para outros itens: bot�o de excluir */
                                                    <button 
                                                        onClick={() => handleDelete(item)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            cursor: 'pointer', 
                                                            fontSize: '1.1em', 
                                                            padding: '3px', 
                                                            color: '#dc3545' 
                                                        }}
                                                        title="Excluir"
                                                    >
                                                        ???
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {pagamentosFiltrados.length > ITENS_INICIAIS && (
                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <button 
                                onClick={() => setMostrarTodos(!mostrarTodos)}
                                className="voltar-btn"
                            >
                                {mostrarTodos 
                                    ? '? Mostrar menos' 
                                    : `Ver todos os ${pagamentosFiltrados.length} pagamentos ?`
                                }
                            </button>
                        </div>
                    )}
                    
                    {/* Resumo de totais */}
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '15px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap',
                        gap: '15px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Pago</div>
                            <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.2em' }}>
                                {formatCurrency(totalPago)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85em', color: '#666' }}>Pendente</div>
                            <div style={{ fontWeight: 'bold', color: '#f57c00', fontSize: '1.2em' }}>
                                {formatCurrency(totalPendente)}
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            {/* Modal de Edi��o - Vincular Servi�o */}
            {editandoItem && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }} onClick={() => setEditandoItem(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '25px',
                        width: '90%',
                        maxWidth: '450px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            ?? Editar Pagamento
                        </h3>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em' }}>Descri��o:</label>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', marginTop: '3px' }}>
                                {editandoItem.descricao}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em' }}>Valor:</label>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', marginTop: '3px', color: '#2e7d32' }}>
                                {formatCurrency(editandoItem.valor_pago || editandoItem.valor_total || 0)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em', display: 'block', marginBottom: '8px' }}>
                                ??? Tipo:
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['M�o de Obra', 'Material'].map(opcao => (
                                    <button
                                        key={opcao}
                                        onClick={() => setEditandoItem({...editandoItem, tipo_edit: opcao})}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '2px solid',
                                            borderColor: editandoItem.tipo_edit === opcao ? (opcao === 'M�o de Obra' ? '#6366f1' : '#f59e0b') : '#e5e7eb',
                                            backgroundColor: editandoItem.tipo_edit === opcao ? (opcao === 'M�o de Obra' ? '#eef2ff' : '#fffbeb') : '#fff',
                                            color: editandoItem.tipo_edit === opcao ? (opcao === 'M�o de Obra' ? '#4f46e5' : '#d97706') : '#6b7280',
                                            fontWeight: editandoItem.tipo_edit === opcao ? '700' : '400',
                                            cursor: 'pointer',
                                            fontSize: '0.9em',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {opcao === 'M�o de Obra' ? '?? M�o de Obra' : '?? Material'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em', display: 'block', marginBottom: '8px' }}>
                                ?? Vincular a Item do Or�amento:
                            </label>
                            {loadingItens ? (
                                <div style={{ color: '#666' }}>Carregando itens...</div>
                            ) : (
                                <select
                                    value={editandoItem.orcamento_item_id || ''}
                                    onChange={(e) => setEditandoItem({...editandoItem, orcamento_item_id: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '1em'
                                    }}
                                >
                                    <option value="">-- Nenhum item (Despesa Geral) --</option>
                                    {itensOrcamento.map(item => (
                                        <option key={item.id} value={item.id}>{item.nome_completo}</option>
                                    ))}
                                </select>
                            )}
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                ?? Vincular a um item faz o valor contar no or�amento
                            </small>
                        </div>

                        {/* Comprovante de pagamento */}
                        {editandoItem.comprovante_url && (
                            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <label style={{ fontWeight: '600', color: '#166534', fontSize: '0.9em', display: 'block', marginBottom: '10px' }}>
                                    ?? Comprovante de Pagamento
                                </label>
                                {editandoItem.comprovante_url.startsWith('data:image') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <img
                                            src={editandoItem.comprovante_url}
                                            alt="Comprovante"
                                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain', cursor: 'pointer' }}
                                            onClick={() => window.open(editandoItem.comprovante_url, '_blank')}
                                            title="Clique para ampliar"
                                        />
                                        <div style={{ marginTop: '8px' }}>
                                            <a href={editandoItem.comprovante_url} target="_blank" rel="noreferrer"
                                                style={{ fontSize: '12px', color: '#166534', textDecoration: 'none', fontWeight: '600' }}>
                                                ?? Ampliar imagem
                                            </a>
                                        </div>
                                    </div>
                                ) : editandoItem.comprovante_url.startsWith('data:application/pdf') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>??</div>
                                        <a href={editandoItem.comprovante_url}
                                            download={`comprovante_${editandoItem.descricao || 'pagamento'}.pdf`}
                                            style={{ padding: '8px 16px', background: '#166534', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                                            ?? Baixar PDF
                                        </a>
                                    </div>
                                ) : (
                                    <a href={editandoItem.comprovante_url} target="_blank" rel="noreferrer"
                                        style={{ color: '#166534', fontWeight: '600', fontSize: '13px' }}>
                                        ?? Ver comprovante
                                    </a>
                                )}
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditandoItem(null)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarEdicao}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                ?? Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- COMPONENTES DE MODAL (Existentes) ---
// <--- MUDAN�A: Modal de Edi��o (com valor_total e valor_pago) -->
// --- MODAIS DE ADMINISTRA��O ---

// ----------------------------------------------------

// Modal "Exportar Relat�rio Geral"
// ----------------------------------------------------


// ----------------------------------------------------


// Modal para Editar Prioridade
// ----------------------------------------------------




// --- NOVO MODAL PARA VER ANEXOS ---
// --- FIM DO NOVO MODAL ---


// --- FIM DO NOVO MODAL ---


// --- FIM DO MODAL DE UPLOAD DE NOTA FISCAL ---

// --- FIM DOS COMPONENTES DE NOTAS FISCAIS ---



// --- FIM DO MODAL DE RELAT�RIOS ---




// --- COMPONENTE DO DASHBOARD (Atualizado) ---
function Dashboard() {
    const { user, logout } = useAuth();
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [servicos, setServicos] = useState([]); // Mantido para compatibilidade
    const [itensOrcamento, setItensOrcamento] = useState([]); // NOVO: Itens do or�amento para dropdown
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    
    // CORRE��O: Verificar URL uma �nica vez no in�cio
    const urlParamsInicial = new URLSearchParams(window.location.search);
    const obraIdDaUrl = urlParamsInicial.get('obra');
    const temObraNaUrl = !!obraIdDaUrl;
    
    // CORRE��O: Iniciar loading se tiver obra na URL
    const [isLoading, setIsLoading] = useState(temObraNaUrl);
    // NOVO: Flag para saber se estamos carregando obra da URL (usar useRef para n�o causar re-render)
    const [carregandoObraDaUrl, setCarregandoObraDaUrl] = useState(temObraNaUrl);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [isAdminPanelVisible, setAdminPanelVisible] = useState(false);
    
    const [isExportModalVisible, setExportModalVisible] = useState(false);
    const [isRelatorioCronogramaVisible, setRelatorioCronogramaVisible] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [orcamentos, setOrcamentos] = useState([]);
    const [isAddOrcamentoModalVisible, setAddOrcamentoModalVisible] = useState(false);
    
    // NOVO: Estado para cronograma de obras (Gantt)
    const [cronogramaObras, setCronogramaObras] = useState([]);
    
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);
    
    // <--- MUDAN�A: Novo estado para o modal de pagamento -->
    const [payingItem, setPayingItem] = useState(null);
    
    const [isServicosCollapsed, setIsServicosCollapsed] = useState(false);
    const [editingServicoPrioridade, setEditingServicoPrioridade] = useState(null);
    const [filtroPendencias, setFiltroPendencias] = useState('');
    
    // <--- NOVO: Estados para Notas Fiscais -->
    const [notasFiscais, setNotasFiscais] = useState([]);
    const [uploadingNFFor, setUploadingNFFor] = useState(null);
    const isLoadingNotasFiscais = React.useRef(false); // Prote��o contra m�ltiplas requisi��es
    
    // <--- NOVO: Estado para controlar meses expandidos/recolhidos -->
    const [mesesExpandidos, setMesesExpandidos] = useState({}); // Item que est� recebendo upload
    
    // <--- NOVO: Estado para modal de relat�rios -->
    const [isRelatoriosModalVisible, setRelatoriosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal de or�amentos -->
    const [isOrcamentosModalVisible, setOrcamentosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal do Cronograma Financeiro -->
    const [isCronogramaFinanceiroVisible, setCronogramaFinanceiroVisible] = useState(false);
    
    // MUDAN�A 2: Estado para modal do Di�rio de Obras
    const [isDiarioVisible, setDiarioVisible] = useState(false);
    
    // MUDAN�A 3: NOVO estado para modal de Inserir Pagamento
    const [isInserirPagamentoModalVisible, setInserirPagamentoModalVisible] = useState(false);
    
    // NOVO: Estado para modal do Caixa de Obra
    const [isCaixaObraVisible, setCaixaObraVisible] = useState(false);
    
    // NOVO: Estado para mostrar obras conclu�das
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
    
    // === NOVO: Estados para Sidebar ===
    // CORRE��O: Iniciar como null para n�o piscar na tela de obras
    const [currentPage, setCurrentPage] = useState(() => {
        // Ler da URL imediatamente para evitar flash
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const obraFromUrl = urlParams.get('obra');
        if (obraFromUrl) return pageFromUrl || 'home';
        if (pageFromUrl) return pageFromUrl;
        return 'obras';
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // === NAVEGA��O COM HIST�RICO DO BROWSER ===
    // Fun��o para navegar COM hist�rico do browser (bot�o voltar funciona)
    const navigateTo = (page, obraId = null) => {
        const state = { page, obraId };
        const url = obraId ? `?obra=${obraId}&page=${page}` : `?page=${page}`;
        window.history.pushState(state, '', url);
        setCurrentPage(page);
    };

    // Expor navigateTo globalmente para uso no Sidebar
    window.navigateTo = navigateTo;
    
    // Estado para controlar se a URL inicial j� foi processada
    const [urlProcessada, setUrlProcessada] = useState(false);

    // Escutar bot�o voltar do navegador
    useEffect(() => {
        const handlePopState = (event) => {
            logger.debug('PopState event:', event.state);
            if (event.state) {
                setCurrentPage(event.state.page || 'obras');
                if (event.state.obraId) {
                    // fetchObraData ser� chamado pelo useEffect abaixo
                    const obraId = event.state.obraId;
                    setIsLoading(true);
                    fetchWithAuth(`${API_URL}/obras/${obraId}`)
                        .then(res => res.json())
                        .then(data => {
                            setObraSelecionada(data.obra || null);
                            setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                            const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                                ...serv,
                                pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                            }));
                            setServicos(servicosComPagamentosArray);
                            setSumarios(data.sumarios || null);
                            setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                            setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                        })
                        .catch(error => logger.error('Erro popstate:', error))
                        .finally(() => setIsLoading(false));
                } else {
                    setObraSelecionada(null);
                }
            } else {
                // Se n�o tem estado, voltar para lista de obras
                setCurrentPage('obras');
                setObraSelecionada(null);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

const totalOrcamentosPendentes = useMemo(() => {
        // A vari�vel 'orcamentos' j� cont�m
        // apenas os or�amentos com status 'Pendente' vindos do backend.
        return (Array.isArray(orcamentos) ? orcamentos : [])
            .reduce((total, orc) => total + (orc.valor || 0), 0);
    }, [orcamentos]);

   const itemsAPagar = useMemo(() => {
    // <--- MUDAN�A: Filtros de 'A Pagar' e 'Pagos' atualizados -->
    return (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item =>
        (item.valor_total || 0) > (item.valor_pago || 0)
    )
},
[historicoUnificado]
);
    
    const itemsAPagarFiltrados = useMemo(() => {
        if (!filtroPendencias) {
            return itemsAPagar;
        }
        const lowerCaseFiltro = filtroPendencias.toLowerCase();
        return itemsAPagar.filter(item => 
            (item.descricao && item.descricao.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.fornecedor && item.fornecedor.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.tipo && item.tipo.toLowerCase().includes(lowerCaseFiltro))
        );
    }, [itemsAPagar, filtroPendencias]);

 // --- NOVO BLOCO DO CRONOGRAMA (LUGAR CORRETO) ---
    const cronogramaPagamentos = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para compara��o de datas

        const data7Dias = new Date(hoje);
        data7Dias.setDate(hoje.getDate() + 7);

        const data30Dias = new Date(hoje);
        data30Dias.setDate(hoje.getDate() + 30);

        const totais = {
            atrasados: 0,
            hoje: 0,
            prox7dias: 0,
            prox30dias: 0,
            totalAPagar: 0
        };

        // Usa a vari�vel 'itemsAPagar' que j� foi definida ANTES
        (Array.isArray(itemsAPagar) ? itemsAPagar : []).forEach(item => {
            const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
            // Usa data_vencimento se existir, sen�o usa data como fallback
            const dataParaUsar = item.data_vencimento || item.data;
            const dataVencimento = new Date(dataParaUsar + 'T00:00:00'); 
            
            totais.totalAPagar += valorRestante;

            if (dataVencimento < hoje) {
                totais.atrasados += valorRestante;
            } else if (dataVencimento.getTime() === hoje.getTime()) {
                totais.hoje += valorRestante;
            } else if (dataVencimento <= data7Dias) {
                totais.prox7dias += valorRestante;
            } else if (dataVencimento <= data30Dias) {
                totais.prox30dias += valorRestante;
            }
        });

        return totais;
    }, [itemsAPagar]); // A depend�ncia � 'itemsAPagar'
    // --- FIM DO NOVO BLOCO ---


    const itemsPagos = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => 
            (item.valor_total || 0) - (item.valor_pago || 0) < 0.01 // Totalmente pago
        ),
        [historicoUnificado]
    );
    
    // <--- NOVO: Fun��o para agrupar pagamentos por m�s -->
    const pagamentosPorMes = useMemo(() => {
        const grupos = {};
        
        itemsPagos.forEach(item => {
            const dataItem = new Date((item.data_vencimento || item.data) + 'T00:00:00');
            const mesAno = `${dataItem.getFullYear()}-${String(dataItem.getMonth() + 1).padStart(2, '0')}`;
            const mesAnoLabel = dataItem.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase()); // Capitalizar primeira letra
            
            if (!grupos[mesAno]) {
                grupos[mesAno] = {
                    label: mesAnoLabel,
                    items: [],
                    total: 0,
                    dataOrdem: dataItem // Para ordena��o
                };
            }
            
            grupos[mesAno].items.push(item);
            grupos[mesAno].total += item.valor_pago || 0;
        });
        
        // Ordenar por data (mais recente primeiro)
        return Object.entries(grupos)
            .sort(([, a], [, b]) => b.dataOrdem - a.dataOrdem)
            .map(([mesAno, dados]) => ({ mesAno, ...dados }));
    }, [itemsPagos]);
    
    // <--- NOVO: Fun��o para toggle de expandir/recolher m�s -->
    const toggleMes = (mesAno) => {
        setMesesExpandidos(prev => ({
            ...prev,
            [mesAno]: !prev[mesAno]
        }));
    };


    // Efeito para buscar obras
    useEffect(() => {
        logger.debug("Buscando lista de obras...");
        const url = mostrarConcluidas 
            ? `${API_URL}/obras?mostrar_concluidas=true` 
            : `${API_URL}/obras`;
        fetchWithAuth(url)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => { logger.debug("Obras recebidas:", data); setObras(Array.isArray(data) ? data : []); })
            .catch(error => { logger.error("Erro ao buscar obras:", error); setObras([]); });
    }, [mostrarConcluidas]); 
    
    // Callback para abrir modal de or�amentos
    useEffect(() => {
        window.abrirModalOrcamentos = () => {
            setOrcamentosModalVisible(true);
        };
        return () => {
            delete window.abrirModalOrcamentos;
        };
    }, []);

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        logger.debug(`Buscando dados da obra ID: ${obraId}`);
        
        // OTIMIZA��O: Carregar dados principais primeiro, secund�rios em paralelo
        fetchWithAuth(`${API_URL}/obras/${obraId}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                logger.debug("Dados da obra recebidos:", data);
                
                setObraSelecionada(data.obra || null);
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                    ...serv,
                    pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                }));
                setServicos(servicosComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                
                // Carregar dados secund�rios (n�o bloqueia a tela principal)
                fetchCronogramaObras(obraId);
                fetchItensOrcamento(obraId);
                
                // Notas fiscais - tentar carregar mas n�o falhar se n�o existir
                try {
                    fetchNotasFiscais(obraId);
                } catch (error) {
                    logger.debug("Notas fiscais n�o dispon�veis");
                }
            })
            .catch(error => { logger.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); setOrcamentos([]); setItensOrcamento([]); })
            .finally(() => { setIsLoading(false); setCarregandoObraDaUrl(false); });
    };
    
    // NOVO: Buscar itens do or�amento para dropdown
    const fetchItensOrcamento = async (obraId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`);
            if (response.ok) {
                const data = await response.json();
                setItensOrcamento(data);
            }
        } catch (error) {
            logger.debug("Itens do or�amento n�o dispon�veis:", error);
            setItensOrcamento([]);
        }
    };
    
    // CORRE��O: Processar URL inicial ao montar o componente
    useEffect(() => {
        if (urlProcessada) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const obraFromUrl = urlParams.get('obra');
        
        logger.debug("[URL INIT] Par�metros:", { page: pageFromUrl, obra: obraFromUrl });
        
        if (obraFromUrl) {
            const obraId = parseInt(obraFromUrl);
            if (!isNaN(obraId)) {
                logger.debug("[URL INIT] Carregando obra:", obraId);
                fetchObraData(obraId);
                setCurrentPage(pageFromUrl || 'home');
            } else {
                setCarregandoObraDaUrl(false);
            }
        } else {
            setCarregandoObraDaUrl(false);
            if (pageFromUrl) {
                setCurrentPage(pageFromUrl);
            }
        }
        
        // Atualizar history state
        window.history.replaceState(
            { page: pageFromUrl || 'obras', obraId: obraFromUrl ? parseInt(obraFromUrl) : null },
            '',
            window.location.href
        );
        
        setUrlProcessada(true);
    }, [urlProcessada]);
    
    // NOVO: Fun��o para buscar cronograma de obras (etapas para Gantt)
    const fetchCronogramaObras = async (obraId) => {
        try {
            // Buscar cronogramas da obra (CronogramaObra = servi�os com cronograma)
            // As etapas j� v�m inclu�das na resposta do backend via to_dict()
            const response = await fetchWithAuth(`${API_URL}/cronograma/${obraId}`);
            if (!response.ok) {
                setCronogramaObras([]);
                return;
            }
            
            const cronogramasData = await response.json();
            logger.debug("Cronogramas da obra (raw):", cronogramasData);
            
            if (!Array.isArray(cronogramasData) || cronogramasData.length === 0) {
                setCronogramaObras([]);
                return;
            }
            
            // As etapas j� v�m na resposta do backend, n�o precisa buscar separadamente
            const cronogramasFormatados = cronogramasData.map((cron) => ({
                servico_id: cron.servico_id,
                servico_nome: cron.servico_nome || cron.nome || `Cronograma ${cron.id}`,
                cronograma_id: cron.id,
                // Usar diretamente as etapas que j� vieram na resposta
                etapas: Array.isArray(cron.etapas) ? cron.etapas : [],
                // Incluir dados adicionais do cronograma para o Gantt
                data_inicio: cron.data_inicio,
                data_fim_prevista: cron.data_fim_prevista,
                percentual_conclusao: cron.percentual_conclusao || 0
            }));
            
            logger.debug("Cronogramas de obras carregados:", cronogramasFormatados);
            setCronogramaObras(cronogramasFormatados);
        } catch (error) {
            // Silencioso � cronograma de obras � feature secund�ria
            setCronogramaObras([]);
        }
    };
    
    // <--- NOVO: Fun��o para buscar notas fiscais -->
    const fetchNotasFiscais = (obraId) => {
        // Prote��o contra m�ltiplas requisi��es simult�neas
        if (isLoadingNotasFiscais.current) {
            logger.debug("J� est� carregando notas fiscais, ignorando requisi��o duplicada");
            return;
        }
        
        isLoadingNotasFiscais.current = true;
        
        // CORRE��O: Verificar se a rota existe antes de fazer a requisi��o
        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`)
            .then(res => {
                if (!res.ok) {
                    // Se for 404, significa que a rota n�o existe - ignorar silenciosamente
                    if (res.status === 404) {
                        logger.debug("Rota de notas fiscais n�o dispon�vel (404) - ignorando");
                        throw new Error('NOT_FOUND');
                    }
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                logger.debug("Notas fiscais recebidas:", data);
                setNotasFiscais(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                // CORRE��O: N�o logar erro se for NOT_FOUND ou erro de rede
                if (error.message === 'NOT_FOUND') {
                    // Silencioso - rota n�o implementada ainda
                    setNotasFiscais([]);
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    // Erro de rede - n�o logar (evita spam no console)
                    logger.warn("Notas fiscais: rota n�o dispon�vel");
                    setNotasFiscais([]);
                } else {
                    // Outros erros - logar normalmente
                    logger.error("Erro ao buscar notas fiscais:", error);
                    setNotasFiscais([]);
                }
            })
            .finally(() => {
                isLoadingNotasFiscais.current = false;
            });
    };
    
    // <--- NOVO: Helper para verificar se item tem nota fiscal -->
    const itemHasNotaFiscal = (item) => {
        // <-- CORRE��O: Usar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;
            
        return notasFiscais.some(nf => 
            nf.item_id === realItemId && nf.item_type === item.tipo_registro
        );
    };

    // --- FUN��ES DE A��O (CRUD) ---
    const handleAddObra = (e) => {
        // ... (c�digo inalterado)
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, { method: 'POST', body: JSON.stringify({ nome, cliente }) })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => { setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); e.target.reset(); })
        .catch(error => logger.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        // ... (c�digo inalterado)
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => logger.error('Erro ao deletar obra:', error));
    };
    
    // NOVO: Fun��o para marcar obra como conclu�da/reabrir
    const handleConcluirObra = async (obraId, concluida) => {
        const acao = concluida ? 'reabrir' : 'concluir';
        if (!await confirmDialog(`Deseja ${acao} esta obra?`, { confirmText: 'Confirmar' })) return;
        
        fetchWithAuth(`${API_URL}/obras/${obraId}/concluir`, { 
            method: 'PATCH',
            body: JSON.stringify({ concluida: !concluida })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then((data) => { 
            notify.success(data.sucesso);
            // Atualiza a lista de obras
            setObras(prevObras => prevObras.map(o => 
                o.id === obraId ? { ...o, concluida: !concluida } : o
            ).filter(o => mostrarConcluidas || !o.concluida));
        })
        .catch(error => { logger.error('Erro ao concluir obra:', error); notify.error('Erro: ' + error.message); });
    };
    
    // <--- MUDAN�A: Esta fun��o (marcar pago 100%) ser� chamada pelo modal de edi��o, n�o mais pelo bot�o -->
    const handleMarcarComoPago = (itemId) => {
        const isLancamento = String(itemId).startsWith('lanc-');
        const isServicoPag = String(itemId).startsWith('serv-pag-');
        const actualId = String(itemId).split('-').pop(); 

        let url = '';
        if (isLancamento) {
            url = `${API_URL}/lancamentos/${actualId}/pago`;
        } else if (isServicoPag) {
            url = `${API_URL}/servicos/pagamentos/${actualId}/status`;
        } else {
            return; 
        }

        logger.debug("Alternando status para:", itemId);
        fetchWithAuth(url, { method: 'PATCH' })
             .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
             .then(() => fetchObraData(obraSelecionada.id))
             .catch(error => logger.error("Erro ao marcar como pago:", error));
    };

    const handleDeletarLancamento = (itemId) => {
         // ... (c�digo inalterado)
         const isLancamento = String(itemId).startsWith('lanc-');
         const actualId = String(itemId).split('-').pop();
        if (isLancamento) {
            logger.debug("Deletando lan�amento geral:", actualId);
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
                .then(() => { fetchObraData(obraSelecionada.id); })
                .catch(error => logger.error('Erro ao deletar lan�amento:', error));
        }
    };
    
    const handleEditLancamento = (item) => {
        if (item.tipo_registro === 'lancamento') { setEditingLancamento(item); }
    };
    
    // <--- MUDAN�A: Atualizado para enviar valor_total e valor_pago -->
    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { 
            ...updatedLancamento, 
            valor_total: parseFloat(updatedLancamento.valor_total) || 0, // <-- MUDAN�A
            valor_pago: parseFloat(updatedLancamento.valor_pago) || 0, // <-- MUDAN�A
            servico_id: updatedLancamento.servico_id || null 
        };
        // Remove 'valor' se existir por acidente
        delete dataToSend.valor;
        
        fetchWithAuth(`${API_URL}/lancamentos/${updatedLancamento.lancamento_id}`, { 
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => logger.error("Erro ao salvar edi��o:", error));
    };
    
    // <--- MUDAN�A: handleSaveLancamento (o 'valor' do formul�rio � o 'valor_total') -->
    const handleSaveLancamento = (lancamentoData) => {
        logger.debug("Salvando novo lan�amento:", lancamentoData);
        // O formul�rio envia 'valor', mas o backend espera 'valor'
        // A l�gica do backend j� converte 'valor' para 'valor_total' e 'valor_pago'
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => logger.error("Erro ao salvar lan�amento:", error));
    };
    
    // MUDAN�A 3: NOVO handler para Inserir Pagamento
    const handleInserirPagamento = async (pagamentoData) => {
        logger.debug("Inserindo novo pagamento:", pagamentoData);
        
        const response = await fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/inserir-pagamento`, {
            method: 'POST',
            body: JSON.stringify(pagamentoData)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.erro || 'Erro ao inserir pagamento');
        }
        
        await response.json();
        fetchObraData(obraSelecionada.id); // Atualiza dados em background
        // N�o mostra alert - o modal cuida do toast
        // N�o fecha modal - isso � controlado pelo callback onSave
    };

    // --- Handlers de Or�amento (inalterados) ---
    const handleSaveOrcamento = (formData) => {
        // ... (c�digo inalterado)
        logger.debug("Salvando novo or�amento...");
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/orcamentos`, {
            method: 'POST',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setAddOrcamentoModalVisible(false);
            fetchObraData(obraSelecionada.id); 
        })
        .catch(error => {
            logger.error("Erro ao salvar or�amento:", error);
            notify.error(`Erro ao salvar or�amento: ${error.message}\n\nVerifique o console para mais detalhes (F12).`);
        });
    };
    const handleSaveEditOrcamento = (orcamentoId, formData, newFiles) => {
        // ... (c�digo inalterado)
        logger.debug("Salvando edi��o do or�amento:", orcamentoId);
        
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, {
            method: 'PUT',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                return fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/anexos`, {
                    method: 'POST',
                    body: fileFormData
                });
            }
            
            return Promise.resolve();
            
        }).then(fileRes => {
            if (fileRes && !fileRes.ok) {
                 return fileRes.json().then(err => { throw new Error(err.erro || 'Erro ao enviar anexos') });
            }
            
            setEditingOrcamento(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            logger.error("Erro ao salvar edi��o do or�amento:", error);
            notify.error(`Erro ao salvar edi��o: ${error.message}`);
        });
    };
    const handleAprovarOrcamento = (orcamentoId) => {
        // ... (c�digo inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/aprovar`, { method: 'POST' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => logger.error("Erro ao aprovar or�amento:", error));
    };
    const handleRejeitarOrcamento = (orcamentoId) => {
        // ... (c�digo inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => logger.error("Erro ao rejeitar solicita��o:", error));
    };

    // Handler do PDF da Obra
    const handleExportObraPDF = () => {
        // ... (c�digo inalterado)
        if (!obraSelecionada) return;
        
        setIsExportingPDF(true);
        const url = `${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o PDF da obra.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                setIsExportingPDF(false);
            })
            .catch(err => {
                logger.error("Erro ao gerar PDF da obra:", err);
                notify.error("N�o foi poss�vel gerar o PDF. Verifique o console para mais detalhes.");
                setIsExportingPDF(false);
            });
    };

    // Handler de Prioridade
    const handleSaveServicoPrioridade = (novaPrioridade) => {
        // ... (c�digo inalterado)
        if (!editingServicoPrioridade) return;

        const pagamentoId = editingServicoPrioridade.pagamento_id;
        
        fetchWithAuth(`${API_URL}/servicos/pagamentos/${pagamentoId}/prioridade`, {
            method: 'PATCH',
            body: JSON.stringify({ prioridade: novaPrioridade })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setEditingServicoPrioridade(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            logger.error("Erro ao salvar prioridade do servi�o:", error);
            notify.error(`Erro ao salvar prioridade: ${error.message}`);
        });
    };

    // <--- MUDAN�A: NOVA FUN��O HANDLER PARA PAGAMENTO PARCIAL ---
    const handleSavePartialPayment = (valor_a_pagar) => {
        if (!payingItem) return;

        const { tipo_registro, id } = payingItem;
        // O ID vem como "lanc-123" ou "serv-pag-456"
        const item_type = tipo_registro === 'lancamento' ? 'lancamento' : 'pagamento_servico';
        const item_id = id.split('-').pop();

        logger.debug(`Registrando pagamento de ${valor_a_pagar} para ${item_type} ${item_id}`);

        fetchWithAuth(`${API_URL}/pagamentos/${item_type}/${item_id}/pagar`, {
            method: 'PATCH',
            body: JSON.stringify({ valor_a_pagar })
        })
        .then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') }); }
            return res.json();
        })
        .then(() => {
            setPayingItem(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            logger.error("Erro ao registrar pagamento parcial:", error);
            // Mostra o erro de valida��o (ex: "valor maior que o restante")
            // Precisamos garantir que o modal esteja aberto para mostrar o erro
            if (payingItem) {
                notify.error(`Erro: ${error.message}`);
            }
        });
    };
    // <--- FIM DA NOVA FUN��O ---


    // --- RENDERIZA��O ---
    
    // Fun��o para selecionar obra e ir para cronograma financeiro
    const handleSelectObra = (obraId) => {
        fetchObraData(obraId);
        // Usar navigateTo para atualizar hist�rico do browser
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('home', obraId);
        } else {
            setCurrentPage('home');
        }
    };
    
    // Expor handleSelectObra globalmente para o Sidebar
    window.handleSelectObra = handleSelectObra;

    // === TELA INICIAL (SEM OBRA SELECIONADA) - SEM SIDEBAR ===
    // CORRE��O: Se estiver carregando obra da URL, mostrar loading
    if (carregandoObraDaUrl) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: 'var(--cor-fundo, #f5f5f5)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #e0e0e0',
                        borderTop: '4px solid var(--cor-primaria, #6c5ce7)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                    }} />
                    <p style={{ color: '#666' }}>Carregando...</p>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!obraSelecionada) {
        // ?? Se estiver na p�gina de BI, mostrar dashboard
        if (currentPage === 'bi') {
            return (
                <BiDashboard
                    apiUrl={API_URL}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setCurrentPage('obras')}
                />
            );
        }
        
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                {isRelatorioCronogramaVisible && <ModalRelatorioCronograma 
                    obras={obras}
                    onClose={() => setRelatorioCronogramaVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
                        {/* ?? Bot�o BI Dashboard */}
                        <button 
                            onClick={() => setCurrentPage('bi')} 
                            className="export-btn" 
                            style={{marginRight: '10px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6'}}
                        >
                            ?? BI Dashboard
                        </button>
                        
                        <button 
                            onClick={() => setRelatorioCronogramaVisible(true)} 
                            className="export-btn pdf" 
                            style={{marginRight: '10px'}}
                        >
                            ?? Relat�rio Financeiro
                        </button>
                        
                        {user.role === 'master' && (
                            <button onClick={() => setAdminPanelVisible(true)} className="submit-btn" style={{marginRight: '10px'}}>
                                Gerenciar Usu�rios
                            </button>
                        )}
                        <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                    </div>
                </header>

                {(user.role === 'administrador' || user.role === 'master') && (
                    <div className="card-full">
                        <h3>Cadastrar Nova Obra</h3>
                        <form onSubmit={handleAddObra} className="form-add-obra">
                            <input type="text" name="nome" placeholder="Nome da Obra" required />
                            <input type="text" name="cliente" placeholder="Nome do Cliente" />
                            <button type="submit" className="submit-btn">Adicionar Obra</button>
                        </form>
                    </div>
                )}
                
                {/* Toggle para mostrar obras conclu�das */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginBottom: '15px',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--cor-texto-secundario)',
                        fontSize: '0.9em'
                    }}>
                        <input 
                            type="checkbox"
                            checked={mostrarConcluidas}
                            onChange={(e) => setMostrarConcluidas(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Mostrar obras conclu�das
                    </label>
                </div>
                
                <div className="lista-obras">
                    {obras.length > 0 ? (
                        obras.map(obra => (
                            <div 
                                key={obra.id} 
                                className="card-obra"
                                style={{
                                    opacity: obra.concluida ? 0.7 : 1,
                                    border: obra.concluida ? '2px solid #22c55e' : undefined,
                                    position: 'relative'
                                }}
                            >
                                {obra.concluida && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        backgroundColor: '#22c55e',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75em',
                                        fontWeight: 'bold'
                                    }}>
                                        ? CONCLU�DA
                                    </div>
                                )}
                                
                                {(user.role === 'administrador' || user.role === 'master') && (
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleConcluirObra(obra.id, obra.concluida); }}
                                            className="card-obra-action-btn"
                                            title={obra.concluida ? 'Reabrir Obra' : 'Marcar como Conclu�da'}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.1em',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                opacity: 0.7
                                            }}
                                        >
                                            {obra.concluida ? '??' : '?'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeletarObra(obra.id, obra.nome); }}
                                            className="card-obra-delete-btn"
                                            title="Excluir Obra"
                                        >
                                            ???
                                        </button>
                                    </div>
                                )}
                                
                                <div onClick={() => handleSelectObra(obra.id)} className="card-obra-content">
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p>
                                    
                                    <div className="obra-kpi-summary">
                                        <div>
                                            <span>Or�amento Total</span>
                                            <strong style={{ color: 'var(--cor-vermelho)' }}>
                                                {formatCurrency(obra.orcamento_total || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Valores Pagos</span>
                                            <strong style={{ color: 'var(--cor-primaria)' }}>
                                                {formatCurrency(obra.total_pago || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Liberado (Fila)</span>
                                            <strong style={{ color: 'var(--cor-acento)' }}>
                                                {formatCurrency(obra.liberado_pagamento || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Despesas Extras</span>
                                            <strong style={{ color: '#9333ea' }}>
                                                {formatCurrency(obra.despesas_extras || 0)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma obra cadastrada ou voc� ainda n�o tem permiss�o para ver nenhuma.</p>
                    )}
                </div>
            </div>
        );
    }

    // === TELA DE LOADING ===
    if (isLoading || !sumarios) {
        return <div className="loading-screen">Carregando dados da obra...</div>;
    }

    // === LAYOUT COM NAVEGA��O WINDOWS (OBRA SELECIONADA) ===
    return (
        <>
            <WindowsNavStyles />
            <div className="app-layout-windows">
                {/* Navega��o Windows */}
                <WindowsNavBar 
                    user={user}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    obraSelecionada={obraSelecionada}
                    setObraSelecionada={setObraSelecionada}
                    obras={obras}
                    onLogout={logout}
                />
                
                {/* Conte�do Principal */}
                <main className="main-content-windows">

                    {/* === P�GINA: HOME (Dashboard + Quadro Informativo) === */}
                    {currentPage === 'home' && (
                        <div className="home-page-container">
                            {/* Header com T�tulo + Cards de Resumo */}
                           {/* Header com T�tulo + Cards de Resumo */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                background: '#fff',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                {/* T�tulo */}
                                <h1 style={{ 
                                    margin: 0,
                                    fontSize: '1.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#1e293b'
                                }}>
                                    ?? In�cio - {obraSelecionada.nome}
                                </h1>

                                {/* Cards de Resumo - Usando valores do backend (sumarios) */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #ef4444',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Or�amento Total</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444' }}>
                                            {formatCurrency(sumarios?.orcamento_total || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #3b82f6',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Valores Pagos</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#3b82f6' }}>
                                            {formatCurrency(sumarios?.valores_pagos || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #22c55e',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Liberado (Fila)</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e' }}>
                                            {formatCurrency(sumarios?.liberado_pagamento || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #a855f7',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Despesas Extras</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#a855f7' }}>
                                            {formatCurrency(sumarios?.despesas_extras || 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Dashboard com Gr�ficos */}
                            <DashboardObra 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                servicos={servicos}
                                lancamentos={lancamentos}
                                cronograma={cronogramaObras}
                            />
                            
                            {/* Cronograma Financeiro Simplificado */}
                            <CronogramaFinanceiro 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                onClose={() => {
                                    setObraSelecionada(null);
                                    setCurrentPage('obras');
                                }}
                                embedded={true}
                                simplified={true}
                            />
                            
                            {/* Hist�rico de Pagamentos */}
                            <HistoricoPagamentosCard 
                                itemsPagos={itemsPagos}
                                itemsAPagar={itemsAPagar}
                                user={user}
                                fetchObraData={fetchObraData}
                                obraId={obraSelecionada.id}
                            />
                        </div>
                    )}

                    {/* === P�GINA: CRONOGRAMA DE OBRAS (com EVM e Etapas) === */}
                    {currentPage === 'cronograma-obra' && (
                        <CronogramaObra 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: OR�AMENTO DE ENGENHARIA === */}
                    {currentPage === 'orcamento-eng' && (
                        <OrcamentoEngenharia 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            apiUrl={API_URL}
                            onClose={() => setCurrentPage('home')}
                        />
                    )}

                    {/* === P�GINA: CRONOGRAMA FINANCEIRO (Completo) === */}
                    {currentPage === 'financeiro' && (
                        <CronogramaFinanceiro 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => {
                                setObraSelecionada(null);
                                setCurrentPage('obras');
                            }}
                            embedded={true}
                            simplified={false}
                        />
                    )}

                    {/* === P�GINA: INSERIR PAGAMENTO === */}
                    {currentPage === 'pagamento' && (
                        <InserirPagamentoModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            onSave={async (formData, salvarENovo = false) => {
                                await handleInserirPagamento(formData);
                                if (!salvarENovo) {
                                    setCurrentPage('home');
                                }
                            }}
                            itensOrcamento={itensOrcamento}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: RELAT�RIOS === */}
                    {currentPage === 'relatorios' && (
                        <RelatoriosModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            sumarios={sumarios}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: OR�AMENTOS === */}
                    {currentPage === 'orcamentos' && (
                        <OrcamentosModal
                            obraId={obraSelecionada.id}
                            onClose={() => setCurrentPage('home')}
                            onSave={() => fetchObraData(obraSelecionada.id)}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: DI�RIO DE OBRAS === */}
                    {currentPage === 'diario' && (
                        <DiarioObras 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: AGENDA DE DEMANDAS === */}
                    {currentPage === 'agenda' && (
                        <AgendaDemandas 
                            obraId={obraSelecionada.id}
                            apiUrl={API_URL}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: CAIXA DE OBRA === */}
                    {currentPage === 'caixa' && (
                        <CaixaObraModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === P�GINA: GEST�O DE BOLETOS === */}
                    {currentPage === 'boletos' && (
                        <GestaoBoletos
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onUpdate={() => fetchObraData(obraSelecionada.id)}
                        />
                    )}

                    {/* === P�GINA: GERENCIAR USU�RIOS === */}
                    {currentPage === 'usuarios' && (
                        <AdminPanelModal 
                            allObras={obras}
                            onClose={() => setCurrentPage('home')} 
                            embedded={true}
                        />
                    )}

                    {/* Modais que aparecem por cima */}
                    {payingItem && (
                        <PagamentoModal
                            item={payingItem}
                            onClose={() => setPayingItem(null)}
                            onSave={handleSavePartialPayment}
                        />
                    )}

                    {editingServicoPrioridade && (
                        <PrioridadeModal
                            currentValue={editingServicoPrioridade.prioridade}
                            onClose={() => setEditingServicoPrioridade(null)}
                            onSave={handleSaveServicoPrioridade}
                        />
                    )}
                    
                    {editingLancamento && <EditLancamentoModal 
                        lancamento={editingLancamento} 
                        onClose={() => setEditingLancamento(null)} 
                        onSave={handleSaveEdit}
                        itensOrcamento={itensOrcamento}
                    />}

                    {isAddLancamentoModalVisible && <AddLancamentoModal 
                        onClose={() => setAddLancamentoModalVisible(false)} 
                        onSave={handleSaveLancamento}
                        itensOrcamento={itensOrcamento}
                    />}
                </main>

                {/* Barra de Status */}
                <div className="windows-status-bar">
                    <div className="status-bar-left">
                        <span className="status-bar-item">?? {obraSelecionada.nome}</span>
                        <span className="status-bar-item">�</span>
                        <span className="status-bar-item">P�gina: {currentPage}</span>
                    </div>
                    <div className="status-bar-right">
                        <span className="status-bar-item">?? {user.nome} ({user.role === 'master' ? 'Master' : user.role === 'administrador' ? 'Admin' : 'Operador'})</span>
                        <span className="status-bar-item">�</span>
                        <span className="status-bar-item">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            {/* Estilos adicionais */}
            <style>{`
                .page-top-header {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                    padding: 0 10px;
                }
                
                .page-top-header .submit-btn {
                    padding: 10px 20px;
                    font-size: 14px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.3);
                }
                
                @media (max-width: 768px) {
                    .page-top-header {
                        margin-top: 10px;
                    }
                }
            `}</style>
        </>
    );
}


// Modal Principal do Cronograma Financeiro

const CronogramaFinanceiro = ({ onClose, obraId, obraNome, embedded = false, simplified = false }) => {
    const [pagamentosFuturos, setPagamentosFuturos] = useState([]);
    const [pagamentosParcelados, setPagamentosParcelados] = useState([]);
    const [pagamentosServicoPendentes, setPagamentosServicoPendentes] = useState([]); // NOVO
    const [isEditarParcelasVisible, setEditarParcelasVisible] = useState(false);
    const [pagamentoParceladoSelecionado, setPagamentoParceladoSelecionado] = useState(null);
    const [previsoes, setPrevisoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // NOVO: Itens do or�amento para dropdown de vincula��o
    const [itensOrcamento, setItensOrcamento] = useState([]);
    
    // NOVO: Estados para Expandir/Recolher se��es
    const [isPagamentosFuturosCollapsed, setIsPagamentosFuturosCollapsed] = useState(false);
    const [isPagamentosParceladosCollapsed, setIsPagamentosParceladosCollapsed] = useState(false);
    
    // MUDAN�A 5: Estados para sele��o m�ltipla
    const [itensSelecionados, setItensSelecionados] = useState([]); // [{tipo: 'futuro'|'parcela'|'servico', id: X}]
    const [isMarcarPagosVisible, setMarcarPagosVisible] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

    const [processingIds, setProcessingIds] = useState(() => new Set());
    const isProcessing = (key) => processingIds.has(key);
    const startProcessing = (key) => setProcessingIds(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
    });
    const stopProcessing = (key) => setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
    });

    const showCronogramaToast = (msg, color = '#10b981') => {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `position:fixed;top:20px;right:20px;background:${color};color:white;padding:15px 25px;border-radius:8px;z-index:10000;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    };

    const handleAbrirEditarParcelas = (pagamento) => {
        setPagamentoParceladoSelecionado(pagamento);
        setEditarParcelasVisible(true);
    };
    const [isCadastrarFuturoVisible, setCadastrarFuturoVisible] = useState(false);
    const [isCadastrarParceladoVisible, setCadastrarParceladoVisible] = useState(false);
    const [isEditarFuturoVisible, setEditarFuturoVisible] = useState(false);
    const [pagamentoFuturoSelecionado, setPagamentoFuturoSelecionado] = useState(null);
    
    // MUDAN�A 5: Fun��es de sele��o
    const toggleSelecao = (tipo, id) => {
        // CORRE��O CR�TICA: Detectar IDs tipo "servico-71" e converter
        let tipoFinal = tipo;
        let idFinal = id;
        
        // Se o ID � uma string tipo "servico-X", extrair o ID num�rico
        if (typeof id === 'string' && id.startsWith('servico-')) {
            const idNumerico = parseInt(id.split('-')[1], 10);
            tipoFinal = 'servico';
            idFinal = idNumerico;
            logger.debug(`[CORRE��O] Convertido de tipo="${tipo}" id="${id}" para tipo="${tipoFinal}" id=${idFinal}`);
        }
        
        setItensSelecionados(prev => {
            const exists = prev.find(item => item.tipo === tipoFinal && item.id === idFinal);
            if (exists) {
                return prev.filter(item => !(item.tipo === tipoFinal && item.id === idFinal));
            } else {
                return [...prev, { tipo: tipoFinal, id: idFinal }];
            }
        });
    };
    
    const isItemSelecionado = (tipo, id) => {
        // CORRE��O CR�TICA: Verificar com convers�o tamb�m
        let tipoCheck = tipo;
        let idCheck = id;
        
        if (typeof id === 'string' && id.startsWith('servico-')) {
            const idNumerico = parseInt(id.split('-')[1], 10);
            tipoCheck = 'servico';
            idCheck = idNumerico;
        }
        
        return itensSelecionados.some(item => item.tipo === tipoCheck && item.id === idCheck);
    };
    
    const selecionarTodos = () => {
        const todos = [];
        
        // Pagamentos Futuros
        pagamentosFuturos.forEach(pag => {
            if (pag.status === 'Previsto') {
                // CORRE��O CR�TICA: Detectar IDs tipo "servico-X"
                if (typeof pag.id === 'string' && pag.id.startsWith('servico-')) {
                    const idNumerico = parseInt(pag.id.split('-')[1], 10);
                    todos.push({ tipo: 'servico', id: idNumerico });
                    logger.debug(`[SELECIONAR TODOS] Convertido ${pag.id} para tipo=servico, id=${idNumerico}`);
                } else {
                    todos.push({ tipo: 'futuro', id: pag.id });
                }
            }
        });
        
        // Pagamentos de Servi�o Pendentes
        pagamentosServicoPendentes.forEach(pag => {
            todos.push({ tipo: 'servico', id: pag.id });
        });
        
        // Parcelas
        pagamentosParcelados.forEach(pagParcelado => {
            pagParcelado.parcelas?.forEach(parcela => {
                if (parcela.status === 'Previsto') {
                    todos.push({ tipo: 'parcela', id: parcela.id });
                }
            });
        });
        
        setItensSelecionados(todos);
    };
    
    const desselecionarTodos = () => {
        setItensSelecionados([]);
    };
    
    // MUDAN�A 5: Handler para marcar m�ltiplos como pagos
    const handleMarcarMultiplosComoPago = async () => {
        if (itensSelecionados.length === 0) {
            notify.warning('Selecione pelo menos um item para marcar como pago.');
            return;
        }
        
        try {
            const res = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        itens: itensSelecionados,
                        data_pagamento: new Date().toISOString().split('T')[0]
                    })
                }
            );
            
            if (res.ok) {
                const data = await res.json();
                const sucessos = data.resultados.filter(r => r.status === 'success').length;
                const erros = data.resultados.filter(r => r.status === 'error').length;
                
                notify.success(`${sucessos} item(ns) marcado(s) como pago. ${erros > 0 ? erros + ' erro(s).' : ''}`);
                setItensSelecionados([]);
                fetchData();
            } else {
                const errorData = await res.json();
                notify.error('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao marcar itens como pagos:', error);
            notify.error('Erro ao processar pagamentos');
        }
    };

    // Carregar dados
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // <--- MUDAN�A: Carregar dados principais primeiro (r�pido) -->
            const [futuroRes, parceladoRes, previsoesRes, servicoPendentesRes, itensOrcRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/previsoes`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/obras/${obraId}/pagamentos-servico-pendentes`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`).catch(e => ({ ok: false, error: e }))
            ]);

            // Processar respostas principais
            if (futuroRes.ok) {
                try {
                    const data = await futuroRes.json();
                    setPagamentosFuturos(data);
                } catch (e) {
                    logger.error('Erro ao processar pagamentos futuros:', e);
                }
            }

            if (previsoesRes.ok) {
                try {
                    const data = await previsoesRes.json();
                    setPrevisoes(data);
                } catch (e) {
                    logger.error('Erro ao processar previs�es:', e);
                }
            }
            
            if (servicoPendentesRes.ok) {
                try {
                    const data = await servicoPendentesRes.json();
                    setPagamentosServicoPendentes(data);
                } catch (e) {
                    logger.error('Erro ao processar pagamentos pendentes:', e);
                }
            }
            
            // NOVO: Carregar itens do or�amento para dropdown
            if (itensOrcRes.ok) {
                try {
                    const data = await itensOrcRes.json();
                    setItensOrcamento(data);
                } catch (e) {
                    logger.error('Erro ao processar itens do or�amento:', e);
                }
            }

            // <--- MUDAN�A: Processar parcelados SEM bloquear a tela -->
            if (parceladoRes.ok) {
                try {
                    const data = await parceladoRes.json();
                    
                    // Mostrar dados b�sicos imediatamente (sem parcelas)
                    setPagamentosParcelados(data.map(p => ({ ...p, parcelas: [] })));
                    setIsLoading(false); // <-- Libera a tela AQUI
                    
                    // Buscar parcelas em background (n�o bloqueia mais!)
                    const parceladosComParcelas = await Promise.all(
                        data.map(async (pagParcelado) => {
                            try {
                                const parcelasRes = await fetchWithAuth(
                                    `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagParcelado.id}/parcelas`
                                );
                                if (parcelasRes.ok) {
                                    const parcelas = await parcelasRes.json();
                                    return { ...pagParcelado, parcelas };
                                }
                            } catch (err) {
                                logger.error('Erro ao buscar parcelas:', err);
                            }
                            return { ...pagParcelado, parcelas: [] };
                        })
                    );
                    
                    // Atualiza com parcelas quando dispon�veis
                    const parceladosComCamposCalculados = parceladosComParcelas.map(pag => {
                        const parcelas = pag.parcelas || [];
                        const proxima = parcelas.find(p => p.status !== 'Pago');
                        return {
                            ...pag,
                            proxima_parcela_numero: proxima ? proxima.numero_parcela : null,
                            proxima_parcela_vencimento: proxima ? proxima.data_vencimento : null,
                            valor_proxima_parcela: proxima ? proxima.valor_parcela : null,
                        };
                    });
                    setPagamentosParcelados(parceladosComCamposCalculados);
                } catch (e) {
                    logger.error('Erro ao processar parcelados:', e);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            logger.error('Erro ao carregar cronograma financeiro:', error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [obraId]);

    // Salvar Pagamento Futuro
    const handleSavePagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                notify.success('Pagamento futuro cadastrado com sucesso!');
                setCadastrarFuturoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                notify.error('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao salvar pagamento futuro:', error);
            notify.error('Erro ao salvar pagamento futuro');
        }
    };

    // Editar Pagamento Futuro
    const handleEditarPagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${pagamentoFuturoSelecionado.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                notify.success('Pagamento futuro atualizado com sucesso!');
                setEditarFuturoVisible(false);
                setPagamentoFuturoSelecionado(null);
                fetchData();
            } else {
                const errorData = await res.json();
                notify.error('Erro ao atualizar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao editar pagamento futuro:', error);
            notify.error('Erro ao editar pagamento futuro');
        }
    };

    // Salvar Pagamento Parcelado
    const handleSavePagamentoParcelado = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                notify.success('Pagamento parcelado cadastrado com sucesso!');
                setCadastrarParceladoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                notify.error('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao salvar pagamento parcelado:', error);
            notify.error('Erro ao salvar pagamento parcelado');
        }
    };

    // Deletar Pagamento Futuro
    const handleDeletePagamentoFuturo = async (id) => {
        const idStr = String(id);

        // Se for um pagamento de servi�o (id come�a com "servico-"), n�o pode deletar daqui
        if (idStr.startsWith('servico-')) {
            notify.warning('?? Este pagamento est� vinculado a um servi�o.\n\nPara exclu�-lo, acesse a p�gina do servi�o correspondente.');
            return;
        }

        if (!await confirmDialog('Deseja realmente excluir este pagamento futuro?', { danger: true, confirmText: 'Excluir' })) return;

        const lockKey = `futuro-${id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            const res = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                setPagamentosFuturos(prev => prev.filter(pag => pag.id !== id));
                showCronogramaToast('??? Pagamento futuro exclu�do!');
                setTimeout(() => fetchData(), 500);
            } else {
                const errorData = await res.json().catch(() => ({}));
                notify.error('Erro ao excluir pagamento futuro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao deletar pagamento futuro:', error);
            if (error.name === 'AbortError') {
                notify.error('A exclus�o demorou demais. Verifique a conex�o e recarregue a tela.');
            } else {
                notify.error('Erro ao deletar pagamento futuro: ' + error.message);
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    // Marcar Pagamento Futuro Individual como Pago
    const handleMarcarPagamentoFuturoPago = async (id) => {
        if (!await confirmDialog('Deseja marcar este pagamento como pago?', { confirmText: 'Confirmar pagamento' })) return;

        const idStr = String(id);
        const lockKey = `futuro-${id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            let res;

            if (idStr.startsWith('servico-')) {
                const servPagId = parseInt(idStr.split('-').pop(), 10);
                logger.debug("Marcando pagamento de servi�o futuro como pago:", servPagId);
                res = await fetchWithAuthTimeout(
                    `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            itens: [{ tipo: 'servico', id: servPagId }],
                            data_pagamento: new Date().toISOString().split('T')[0]
                        })
                    }
                );
            } else {
                logger.debug("Marcando pagamento futuro normal como pago:", id);
                res = await fetchWithAuthTimeout(
                    `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}/marcar-pago`,
                    { method: 'POST' }
                );
            }

            if (res.ok) {
                if (idStr.startsWith('servico-')) {
                    const servPagId = parseInt(idStr.split('-').pop(), 10);
                    setPagamentosServicoPendentes(prev =>
                        prev.filter(p => p.id !== servPagId)
                    );
                } else {
                    setPagamentosFuturos(prev =>
                        prev.filter(pag => pag.id !== id)
                    );
                }

                showCronogramaToast('? Pagamento marcado como pago!');
                setTimeout(() => fetchData(), 500);
            } else {
                const errorData = await res.json().catch(() => ({}));
                notify.error('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao marcar pagamento como pago:', error);
            if (error.name === 'AbortError') {
                notify.error('A opera��o demorou demais. Verifique a conex�o e recarregue a tela.');
            } else {
                notify.error('Erro ao processar: ' + error.message);
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    // Deletar Pagamento Parcelado
    const handleDeletePagamentoParcelado = async (id) => {
        if (!await confirmDialog('Deseja realmente excluir este pagamento parcelado?', { danger: true, confirmText: 'Excluir' })) return;

        const lockKey = `parcelado-${id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            const res = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${id}`,
                { method: 'DELETE' },
                60000  // delete cascade pode demorar mais com muitas parcelas
            );

            if (res.ok) {
                setPagamentosParcelados(prev => prev.filter(pag => pag.id !== id));
                showCronogramaToast('??? Pagamento parcelado exclu�do!');
                setTimeout(() => fetchData(), 500);
            } else {
                notify.error('Erro ao excluir pagamento parcelado');
            }
        } catch (error) {
            logger.error('Erro ao deletar pagamento parcelado:', error);
            if (error.name === 'AbortError') {
                notify.error('A exclus�o demorou demais. Verifique a conex�o e recarregue a tela.');
            } else {
                notify.error('Erro ao deletar pagamento parcelado');
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    // Marcar parcela como paga
    const handleMarcarParcelaPaga = async (pagamento) => {
        if (!await confirmDialog(`Confirma o pagamento da pr�xima parcela (${pagamento.proxima_parcela_numero}/${pagamento.numero_parcelas})?`, { confirmText: 'Confirmar pagamento' })) {
            return;
        }

        const lockKey = `parcelado-${pagamento.id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            // 1. Buscar as parcelas individuais
            const resListaParcelas = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}/parcelas`
            );

            if (!resListaParcelas.ok) {
                notify.error('Erro ao buscar parcelas');
                return;
            }

            const parcelas = await resListaParcelas.json();

            // 2. Encontrar a pr�xima parcela n�o paga
            const proximaParcela = parcelas.find(p => p.status !== 'Pago');

            if (!proximaParcela) {
                notify.warning('Todas as parcelas j� foram pagas!');
                return;
            }

            // 3. Marcar a parcela como paga (isso criar� o lan�amento no backend)
            const res = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}/parcelas/${proximaParcela.id}/pagar`,
                {
                    method: 'POST',
                    body: JSON.stringify({ data_pagamento: getTodayString() })
                }
            );

            if (res.ok) {
                const resultado = await res.json();

                setPagamentosParcelados(prev => {
                    return prev.map(pag => {
                        if (pag.id === pagamento.id) {
                            const parcelasAtualizadas = pag.parcelas ? pag.parcelas.map(p =>
                                p.id === proximaParcela.id
                                    ? { ...p, status: 'Pago', data_pagamento: getTodayString() }
                                    : p
                            ) : [];

                            const proxima = parcelasAtualizadas.find(p => p.status !== 'Pago');
                            const numeroProxima = proxima ? proxima.numero_parcela : null;
                            const vencimentoProximo = proxima ? proxima.data_vencimento : null;
                            const todasPagas = parcelasAtualizadas.every(p => p.status === 'Pago');

                            return {
                                ...pag,
                                parcelas: parcelasAtualizadas,
                                proxima_parcela_numero: numeroProxima,
                                proxima_parcela_vencimento: vencimentoProximo,
                                status: todasPagas ? 'Conclu�do' : 'Ativo'
                            };
                        }
                        return pag;
                    });
                });

                showCronogramaToast(`? ${resultado.mensagem}`);
                setTimeout(() => fetchData(), 500);
            } else {
                const erro = await res.json().catch(() => ({}));
                notify.error(`Erro: ${erro.erro || 'Erro ao marcar parcela como paga'}`);
            }
        } catch (error) {
            logger.error('Erro ao marcar parcela:', error);
            if (error.name === 'AbortError') {
                notify.error('A opera��o demorou demais. Verifique a conex�o e recarregue a tela.');
            } else {
                notify.error('Erro ao marcar parcela como paga');
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    if (isLoading) {
        if (embedded) {
            return <div className="loading-screen">Carregando cronograma...</div>;
        }
        return <Modal onClose={onClose}><div className="loading-screen">Carregando cronograma...</div></Modal>;
    }

    const totalPrevisoes = previsoes.reduce((acc, prev) => acc + prev.valor, 0);

    // Conte�do do cronograma (usado tanto em embedded quanto em modal)
    const cronogramaContent = (
        <div style={{ maxHeight: embedded ? 'none' : '85vh', overflowY: embedded ? 'visible' : 'auto' }}>
            <h2>{simplified ? '??' : '??'} {simplified ? 'In�cio' : 'Cronograma Financeiro'} - {obraNome}</h2>
            <QuadroAlertasVencimento obraId={obraId} /> 
            {/* Bot�es de Exporta��o */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {/* REMOVIDO: Bot�es de cadastro movidos para o dashboard principal
                <button 
                    onClick={() => setCadastrarFuturoVisible(true)} 
                    className="submit-btn"
                >
                    ? Cadastrar Pagamento Futuro (�nico)
                </button>
                <button 
                    onClick={() => setCadastrarParceladoVisible(true)} 
                    className="submit-btn"
                    style={{ backgroundColor: 'var(--cor-acento)' }}
                >
                    ? Cadastrar Pagamento Parcelado
                </button>
                */}
                
                {/* NOVO: Bot�o Gerar PDF - apenas no modo completo */}
                {!simplified && (
                <button 
                    onClick={async () => {
                            try {
                                const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-financeiro/pdf`);
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `cronograma_financeiro_obra_${obraId}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } else {
                                    notify.error('Erro ao gerar PDF');
                                }
                            } catch (error) {
                                logger.error('Erro ao exportar PDF:', error);
                                notify.error('Erro ao gerar PDF do cronograma financeiro');
                            }
                        }} 
                        className="export-btn pdf"
                        title="Gerar relat�rio PDF do cronograma financeiro"
                    >
                        ?? Gerar PDF
                    </button>
                )}

                {/* Bot�o WhatsApp - apenas no modo completo */}
                {!simplified && (
                    <button
                        type="button"
                        onClick={() => setShowWhatsAppModal(true)}
                        className="export-btn"
                        style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                        title="Compartilhar cronograma pelo WhatsApp"
                    >
                        ?? WhatsApp
                    </button>
                )}
                    
                    {!simplified && itensSelecionados.length > 0 && (
                        <button 
                            onClick={handleMarcarMultiplosComoPago} 
                            className="cf-btn cf-btn-success"
                        >
                            ? Marcar {itensSelecionados.length} Selecionado(s) como Pago
                        </button>
                    )}
                </div>

                {/* Previs�o de Fluxo de Caixa - NOVO DESIGN */}
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">?? Previs�o de Fluxo de Caixa</div>
                            <div className="cf-section-subtitle">Soma autom�tica de pagamentos futuros e parcelados</div>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/cronograma-financeiro/pdf`);
                                    if (response.ok) {
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `cronograma_financeiro_obra_${obraId}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    }
                                } catch (error) {
                                    logger.error('Erro ao exportar PDF:', error);
                                }
                            }} 
                            className="cf-btn cf-btn-outline"
                        >
                            ?? Gerar PDF
                        </button>
                    </div>
                    
                    {previsoes.length > 0 ? (
                        <>
                            {/* Gr�fico de Barras */}
                            <div className="cf-chart-container">
                                {previsoes.slice(0, 6).map((prev, index) => {
                                    const maxValor = Math.max(...previsoes.map(p => p.valor));
                                    const altura = maxValor > 0 ? (prev.valor / maxValor) * 130 : 0;
                                    
                                    return (
                                        <div key={index} className="cf-chart-bar">
                                            <div className="cf-chart-bar-value">
                                                {formatCurrency(prev.valor).replace('R$', '')}
                                            </div>
                                            <div 
                                                className="cf-chart-bar-fill"
                                                style={{ height: `${Math.max(altura, 20)}px` }}
                                            />
                                            <span className="cf-chart-bar-label">{prev.mes_nome}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total */}
                            <div className="cf-chart-total">
                                <span className="cf-chart-total-label">TOTAL PREVISTO</span>
                                <span className="cf-chart-total-value">{formatCurrency(totalPrevisoes)}</span>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhuma previs�o calculada. Cadastre pagamentos futuros ou parcelados.
                        </p>
                    )}
                </div>

                {/* NOVO: Listagem de Pagamentos de Servi�o Pendentes */}
                {pagamentosServicoPendentes.length > 0 && (
                    <div className="cf-section" style={{ marginBottom: '20px', background: 'var(--cor-warning-bg)', border: '2px solid var(--cor-warning-light)' }}>
                        <h3>?? Pagamentos de Servi�o Pendentes</h3>
                        <p style={{ fontSize: '0.9em', color: '#856404', marginBottom: '15px' }}>
                            Estes s�o pagamentos vinculados a servi�os que ainda n�o foram quitados totalmente.
                        </p>
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>?</th>
                                    <th>Servi�o</th>
                                    <th>Descri��o</th>
                                    <th>Tipo</th>
                                    <th>Valor Total</th>
                                    <th>Pago</th>
                                    <th>Restante</th>
                                    <th>Prior.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosServicoPendentes.map(pag => (
                                    <tr key={pag.id}>
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={isItemSelecionado('servico', pag.id)}
                                                onChange={() => toggleSelecao('servico', pag.id)}
                                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                            />
                                        </td>
                                        <td><strong>{pag.servico_nome}</strong></td>
                                        <td>{pag.descricao}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.tipo_pagamento === 'M�o de Obra' ? '#007bff' : '#28a745',
                                                color: 'white'
                                            }}>
                                                {pag.tipo_pagamento}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(pag.valor_total)}</td>
                                        <td>{formatCurrency(pag.valor_pago)}</td>
                                        <td><strong>{formatCurrency(pag.valor_restante)}</strong></td>
                                        <td>
                                            <PrioridadeBadge prioridade={pag.prioridade} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagamentos Futuros (�nicos) - NOVO DESIGN */}
                {!simplified && (
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                ?? Pagamentos Futuros
                                <span className="cf-badge cf-badge-info">�nicos</span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique na descri��o para editar ou no badge para marcar como pago
                            </div>
                        </div>
                        <button 
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosFuturosCollapsed(prev => !prev)}
                        >
                            {isPagamentosFuturosCollapsed ? '? Expandir' : '? Recolher'}
                        </button>
                    </div>
                    
                    {!isPagamentosFuturosCollapsed && (
                        <>
                    {pagamentosFuturos.filter(pag => pag.status === 'Previsto').length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pagamentosFuturos.filter(pag => pag.status === 'Previsto').map(pag => (
                                <div 
                                    key={pag.id} 
                                    className="cf-pagamento-futuro-item"
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    {/* Checkbox */}
                                    {pag.status === 'Previsto' && (
                                        <input 
                                            type="checkbox" 
                                            checked={isItemSelecionado('futuro', pag.id)}
                                            onChange={() => toggleSelecao('futuro', pag.id)}
                                            style={{ 
                                                cursor: 'pointer', 
                                                width: '18px', 
                                                height: '18px',
                                                marginRight: '12px',
                                                accentColor: 'var(--cor-primaria)'
                                            }}
                                        />
                                    )}
                                    
                                    {/* �cone */}
                                    <div className="cf-pagamento-futuro-icon">
                                        {String(pag.id).startsWith('servico-') ? '??' : '??'}
                                    </div>
                                    
                                    {/* Info */}
                                    <div 
                                        className="cf-pagamento-futuro-info"
                                        onClick={() => {
                                            if (pag.status === 'Previsto' && !String(pag.id).startsWith('servico-')) {
                                                setPagamentoFuturoSelecionado(pag);
                                                setEditarFuturoVisible(true);
                                            }
                                        }}
                                        style={{ 
                                            cursor: pag.status === 'Previsto' && !String(pag.id).startsWith('servico-') ? 'pointer' : 'default' 
                                        }}
                                    >
                                        <div className="cf-pagamento-futuro-desc" style={{ 
                                            color: pag.status === 'Previsto' ? 'var(--cor-primaria)' : 'var(--cor-texto)'
                                        }}>
                                            {pag.descricao}
                                        </div>
                                        <div className="cf-pagamento-futuro-meta">
                                            {pag.fornecedor || 'Sem fornecedor'} � {new Date(pag.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    
                                    {/* Valor */}
                                    <div className="cf-pagamento-futuro-valor">
                                        {formatCurrency(pag.valor)}
                                    </div>
                                    
                                    {/* Badge Status */}
                                    {(() => {
                                        const futuroProcessing = isProcessing(`futuro-${pag.id}`);
                                        return (
                                            <span
                                                onClick={() => {
                                                    if (pag.status === 'Previsto' && !futuroProcessing) {
                                                        handleMarcarPagamentoFuturoPago(pag.id);
                                                    }
                                                }}
                                                className="cf-badge cf-badge-warning"
                                                style={{
                                                    cursor: futuroProcessing ? 'wait' : 'pointer',
                                                    opacity: futuroProcessing ? 0.6 : 1,
                                                    pointerEvents: futuroProcessing ? 'none' : 'auto',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title={futuroProcessing ? 'Processando...' : 'Clique para marcar como pago'}
                                            >
                                                {futuroProcessing ? '? Processando...' : 'Pendente'}
                                            </span>
                                        );
                                    })()}

                                    {/* A��es */}
                                    <div className="cf-pagamento-futuro-actions">
                                        {pag.status === 'Previsto' && !String(pag.id).startsWith('servico-') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePagamentoFuturo(pag.id);
                                                }}
                                                disabled={isProcessing(`futuro-${pag.id}`)}
                                                className="cf-btn cf-btn-danger"
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '12px',
                                                    opacity: isProcessing(`futuro-${pag.id}`) ? 0.5 : 1,
                                                    cursor: isProcessing(`futuro-${pag.id}`) ? 'wait' : 'pointer'
                                                }}
                                                title={isProcessing(`futuro-${pag.id}`) ? 'Processando...' : 'Excluir pagamento'}
                                            >
                                                {isProcessing(`futuro-${pag.id}`) ? '?' : '???'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhum pagamento futuro cadastrado.
                        </p>
                    )}
                    </>
                    )}
                </div>
                )}

                {/* Listagem de Pagamentos Parcelados - CARDS ESTILO POPUP */}
                {!simplified && (
                <div className="cf-section">
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                ?? Pagamentos Parcelados
                                <span className="cf-badge cf-badge-purple">
                                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length} ativos
                                </span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique no card para editar � Bolinhas = parcelas (? paga ? pendente)
                            </div>
                        </div>
                        <button 
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosParceladosCollapsed(prev => !prev)}
                        >
                            {isPagamentosParceladosCollapsed ? '? Expandir' : '? Recolher'}
                        </button>
                    </div>
                    
                    {!isPagamentosParceladosCollapsed && (
                        <>
                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length > 0 ? (
                        <div className="parcelas-cards-grid">
                            {pagamentosParcelados.filter(pag => pag.status === 'Ativo').map(pag => {
                                // CORRE��O: Usar parcelas_pagas do backend, n�o calcular por proxima_parcela_numero
                                const parcelasPagas = pag.parcelas_pagas || 0;
                                const progresso = pag.numero_parcelas > 0 ? Math.round((parcelasPagas / pag.numero_parcelas) * 100) : 0;
                                
                                // Cores por periodicidade
                                const cores = {
                                    'Semanal': { cor: 'var(--cor-warning-light)', corText: '#92400e', corBg: 'var(--cor-warning-bg)' },
                                    'Quinzenal': { cor: 'var(--cor-purple-light)', corText: '#6b21a8', corBg: 'var(--cor-purple-bg)' },
                                    'Mensal': { cor: 'var(--cor-info-light)', corText: '#0369a1', corBg: 'var(--cor-info-bg)' }
                                };
                                const corConfig = cores[pag.periodicidade] || cores['Mensal'];
                                
                                return (
                                    <div 
                                        key={pag.id}
                                        className="parcela-popup-card"
                                        onClick={() => handleAbrirEditarParcelas(pag)}
                                        style={{ borderColor: 'var(--cor-borda)' }}
                                    >
                                        {/* Header com bolinhas */}
                                        <div 
                                            className="parcela-popup-header"
                                            style={{ 
                                                background: corConfig.corBg,
                                                borderBottomColor: corConfig.cor,
                                                color: corConfig.corText
                                            }}
                                        >
                                            <span className="parcela-popup-title">
                                                ?? {pag.descricao}
                                            </span>
                                            
                                            {/* Bolinhas = Parcelas */}
                                            <div className="parcelas-dots" style={{ color: corConfig.cor }}>
                                                {Array.from({ length: Math.min(pag.numero_parcelas, 10) }, (_, i) => (
                                                    <div 
                                                        key={i}
                                                        className={`parcela-dot ${i < parcelasPagas ? 'paga' : 'pendente'}`}
                                                        style={{ borderColor: corConfig.cor, background: i < parcelasPagas ? corConfig.cor : 'transparent' }}
                                                        title={i < parcelasPagas ? `Parcela ${i + 1} - Paga` : `Parcela ${i + 1} - Pendente`}
                                                    />
                                                ))}
                                                {pag.numero_parcelas > 10 && (
                                                    <span style={{ fontSize: '10px', marginLeft: '4px' }}>+{pag.numero_parcelas - 10}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Conte�do */}
                                        <div className="parcela-popup-content">
                                            {/* Valor Total */}
                                            <div className="parcela-popup-valor">
                                                <div className="parcela-popup-valor-number">
                                                    {formatCurrency(pag.valor_total)}
                                                </div>
                                                <div className="parcela-popup-periodo">
                                                    {pag.periodicidade || 'Mensal'}
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="parcela-popup-info-grid">
                                                <div className="parcela-popup-info-item">
                                                    <div className="parcela-popup-info-label">Parcela</div>
                                                    <div className="parcela-popup-info-value">
                                                        {pag.proxima_parcela_numero === 0 ? 'Entrada' : (() => {
                                                            // Bug Extra: entrada conta como pagamento #1; regulares ficam +1
                                                            const baseNum = pag.proxima_parcela_numero || pag.numero_parcelas;
                                                            const num = pag.tem_entrada ? baseNum + 1 : baseNum;
                                                            return `${num}/${pag.numero_parcelas}`;
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="parcela-popup-info-item">
                                                    <div className="parcela-popup-info-label">Valor/Parc</div>
                                                    <div className="parcela-popup-info-value">
                                                        {formatCurrency(pag.valor_proxima_parcela || pag.valor_parcela).replace('R$', '')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Vencimento */}
                                            <div className="parcela-popup-vencimento">
                                                <span className="parcela-popup-vencimento-label">?? Vencimento</span>
                                                <span className="parcela-popup-vencimento-value">
                                                    {pag.proxima_parcela_vencimento ? 
                                                        new Date(pag.proxima_parcela_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') :
                                                        'Quitado'
                                                    }
                                                </span>
                                            </div>

                                            {/* Barra de Progresso */}
                                            <div className="parcela-popup-progress">
                                                <div className="parcela-popup-progress-header">
                                                    <span className="parcela-popup-progress-label">Progresso</span>
                                                    <span className="parcela-popup-progress-percent" style={{ color: corConfig.corText }}>{progresso}%</span>
                                                </div>
                                                <div className="parcela-popup-progress-bar">
                                                    <div 
                                                        className="parcela-popup-progress-fill"
                                                        style={{ width: `${progresso}%`, background: corConfig.cor }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="parcela-popup-footer">
                                            {(() => {
                                                const parceladoProcessing = isProcessing(`parcelado-${pag.id}`);
                                                return (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="parcela-popup-btn"
                                                            style={{
                                                                flex: 1,
                                                                background: corConfig.cor,
                                                                color: corConfig.corText,
                                                                opacity: parceladoProcessing ? 0.6 : 1,
                                                                cursor: parceladoProcessing ? 'wait' : 'pointer'
                                                            }}
                                                            disabled={parceladoProcessing}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarcarParcelaPaga(pag);
                                                            }}
                                                        >
                                                            {parceladoProcessing ? '? Processando...' : (
                                                                <>?? {pag.proxima_parcela_numero === 0 ? 'Pagar Entrada' : (() => {
                                                                    const baseNum = pag.proxima_parcela_numero || pag.numero_parcelas;
                                                                    const num = pag.tem_entrada ? baseNum + 1 : baseNum;
                                                                    return `Pagar Parcela ${num}`;
                                                                })()}</>
                                                            )}
                                                        </button>
                                                        <button
                                                            className="parcela-popup-btn"
                                                            style={{
                                                                background: 'var(--cor-vermelho-bg)',
                                                                color: 'var(--cor-vermelho)',
                                                                padding: '10px 12px',
                                                                opacity: parceladoProcessing ? 0.5 : 1,
                                                                cursor: parceladoProcessing ? 'wait' : 'pointer'
                                                            }}
                                                            disabled={parceladoProcessing}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePagamentoParcelado(pag.id);
                                                            }}
                                                            title={parceladoProcessing ? 'Processando...' : 'Excluir parcelamento'}
                                                        >
                                                            {parceladoProcessing ? '?' : '???'}
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '30px' }}>
                            Nenhum pagamento parcelado cadastrado.
                        </p>
                    )}
                    </>
                    )}
                </div>
                )}

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button onClick={onClose} className="voltar-btn">
                        {embedded ? '? Voltar �s Obras' : 'Fechar'}
                    </button>
                </div>
            </div>
    );

    // Retornar com ou sem Modal dependendo do modo
    if (embedded) {
        return (
            <>
                {cronogramaContent}
                
                {/* Modais de Cadastro */}
                {isCadastrarFuturoVisible && (
                    <CadastrarPagamentoFuturoModal
                        onClose={() => setCadastrarFuturoVisible(false)}
                        onSave={handleSavePagamentoFuturo}
                        obraId={obraId}
                        itensOrcamento={itensOrcamento}
                    />
                )}

                {isCadastrarParceladoVisible && (
                    <CadastrarPagamentoParceladoModal
                        onClose={() => setCadastrarParceladoVisible(false)}
                        onSave={handleSavePagamentoParcelado}
                        obraId={obraId}
                        itensOrcamento={itensOrcamento}
                    />
                )}
                
                {isEditarFuturoVisible && pagamentoFuturoSelecionado && (
                    <EditarPagamentoFuturoModal
                        onClose={() => {
                            setEditarFuturoVisible(false);
                            setPagamentoFuturoSelecionado(null);
                        }}
                        onSave={handleEditarPagamentoFuturo}
                        pagamento={pagamentoFuturoSelecionado}
                        itensOrcamento={itensOrcamento}
                    />
                )}
                
                {isEditarParcelasVisible && pagamentoParceladoSelecionado && (
                    <EditarParcelasModal
                        obraId={obraId}
                        pagamentoParcelado={pagamentoParceladoSelecionado}
                        onClose={() => {
                            setEditarParcelasVisible(false);
                            setPagamentoParceladoSelecionado(null);
                        }}
                        onSave={() => {
                            setEditarParcelasVisible(false);
                            setPagamentoParceladoSelecionado(null);
                            // Recarregar dados para atualizar cards com novos valores de parcela
                            fetchData();
                        }}
                        itensOrcamento={itensOrcamento}
                    />
                )}

                {showWhatsAppModal && (
                    <ModalWhatsAppCronograma
                        obraNome={obraNome}
                        pagamentosFuturos={pagamentosFuturos}
                        pagamentosParcelados={pagamentosParcelados}
                        onClose={() => setShowWhatsAppModal(false)}
                    />
                )}
            </>
        );
    }

    return (
        <Modal onClose={onClose} customWidth="96%">
            {cronogramaContent}

            {/* Modais de Cadastro */}
            {isCadastrarFuturoVisible && (
                <CadastrarPagamentoFuturoModal
                    onClose={() => setCadastrarFuturoVisible(false)}
                    onSave={handleSavePagamentoFuturo}
                    obraId={obraId}
                    itensOrcamento={itensOrcamento}
                />
            )}

            {isCadastrarParceladoVisible && (
                <CadastrarPagamentoParceladoModal
                    onClose={() => setCadastrarParceladoVisible(false)}
                    onSave={handleSavePagamentoParcelado}
                    obraId={obraId}
                    itensOrcamento={itensOrcamento}
                />
            )}
            
            {isEditarFuturoVisible && pagamentoFuturoSelecionado && (
                <EditarPagamentoFuturoModal
                    onClose={() => {
                        setEditarFuturoVisible(false);
                        setPagamentoFuturoSelecionado(null);
                    }}
                    onSave={handleEditarPagamentoFuturo}
                    pagamento={pagamentoFuturoSelecionado}
                    itensOrcamento={itensOrcamento}
                />
            )}
            
            {isEditarParcelasVisible && pagamentoParceladoSelecionado && (
                <EditarParcelasModal
                    obraId={obraId}
                    pagamentoParcelado={pagamentoParceladoSelecionado}
                    onClose={() => {
                        setEditarParcelasVisible(false);
                        setPagamentoParceladoSelecionado(null);
                    }}
                    onSave={() => {
                        setEditarParcelasVisible(false);
                        setPagamentoParceladoSelecionado(null);
                        fetchData();
                    }}
                    itensOrcamento={itensOrcamento}
                />
            )}

            {showWhatsAppModal && (
                <ModalWhatsAppCronograma
                    obraNome={obraNome}
                    pagamentosFuturos={pagamentosFuturos}
                    pagamentosParcelados={pagamentosParcelados}
                    onClose={() => setShowWhatsAppModal(false)}
                />
            )}
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL (ROTEADOR) ---

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState(null); // null = seletor, 'obras' ou 'admin'

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            const savedModule = localStorage.getItem('selectedModule');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
                setSelectedModule(savedModule || 'obras');
            }
        } catch (error) {
            logger.error("Falha ao carregar dados de autentica��o:", error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedModule');
        }
        setIsLoading(false); 
    }, []);

    const handleSelectModule = (moduleId) => {
        setSelectedModule(moduleId);
        localStorage.setItem('selectedModule', moduleId);
    };

    const handleBackToSelector = () => {
        setSelectedModule(null);
        localStorage.removeItem('selectedModule');
    };

    const login = (data) => {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setSelectedModule(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedModule');
    };

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    // Se n�o h� m�dulo selecionado e n�o est� logado, mostrar seletor
    if (!selectedModule && !user) {
        return <ModuleSelectorScreen onSelectModule={handleSelectModule} />;
    }

    // Se selecionou Admin
    if (selectedModule === 'admin') {
        return <AppAdmin onBack={handleBackToSelector} />;
    }

    // Se selecionou Obras ou j� est� logado
    return (
        <>
            <ToastContainer />
            <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                {user ? <Dashboard /> : <LoginScreen onBack={handleBackToSelector} />}
            </AuthContext.Provider>
        </>
    );
}

export default App;
