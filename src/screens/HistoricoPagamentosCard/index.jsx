import React, { useState, useMemo } from 'react';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';
import NotaFiscalIcon from '../../components/NotaFiscalIcon';

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
            const termoBusca = busca.toLowerCase();
            const matchBusca = !busca ||
                (item.descricao && item.descricao.toLowerCase().includes(termoBusca)) ||
                (item.fornecedor && item.fornecedor.toLowerCase().includes(termoBusca)) ||
                (item.servico_nome && item.servico_nome.toLowerCase().includes(termoBusca)) ||
                (item.orcamento_item_nome && item.orcamento_item_nome.toLowerCase().includes(termoBusca));

            const tipoItem = (item.tipo || item.tipo_pagamento || '').toLowerCase();
            const matchTipo = filtroTipo === 'todos' ||
                (filtroTipo === 'mao_de_obra' && (tipoItem.includes('mão') || tipoItem.includes('mao') || tipoItem === 'mao_de_obra')) ||
                (filtroTipo === 'material' && tipoItem.includes('material')) ||
                (filtroTipo === 'equipamento' && (tipoItem.includes('equipamento') || tipoItem.includes('despesa')));

            const matchFornecedor = !filtroFornecedor ||
                (item.fornecedor && item.fornecedor.toLowerCase().includes(filtroFornecedor.toLowerCase()));

            return matchBusca && matchTipo && matchFornecedor;
        });
    }, [itemsPagos, busca, filtroTipo, filtroFornecedor]);

    // Lista de fornecedores únicos para o filtro
    const fornecedoresUnicos = useMemo(() => {
        const fornecedores = [...new Set(itemsPagos.map(item => item.fornecedor).filter(Boolean))];
        return fornecedores.sort();
    }, [itemsPagos]);

    const pagamentosExibidos = mostrarTodos ? pagamentosFiltrados : pagamentosFiltrados.slice(0, ITENS_INICIAIS);
    const totalPago = pagamentosFiltrados.reduce((sum, item) => sum + (item.valor_pago || item.valor_total || 0), 0);
    const totalPendente = itemsAPagar.reduce((sum, item) => sum + ((item.valor_total || 0) - (item.valor_pago || 0)), 0);

    const isAdmin = user && (user.role === 'administrador' || user.role === 'master');

    // Buscar itens do orçamento quando abrir modal de edição
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
            logger.error('Erro ao buscar itens do orçamento:', err);
        } finally {
            setLoadingItens(false);
        }
    };

    // Abrir modal de edição
    const handleEditarItem = (item) => {
        let tipoNorm = item.tipo || item.segmento || item.tipo_pagamento || 'Material';
        if (tipoNorm === 'mao_de_obra' || tipoNorm === 'mao_obra') tipoNorm = 'Mão de Obra';
        if (tipoNorm === 'material') tipoNorm = 'Material';
        setEditandoItem({
            ...item,
            orcamento_item_id: item.orcamento_item_id || '',
            tipo_edit: tipoNorm
        });
        fetchItensOrcamento();
    };

    // Salvar edição (vincular item do orçamento)
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

            const tipoEdit = editandoItem.tipo_edit || 'Material';
            const tipoMaoDeObra = tipoEdit === 'Mão de Obra';

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
                    throw new Error('ID do pagamento parcelado não encontrado');
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
                toast.textContent = '✅ Pagamento atualizado com sucesso!';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
                if (fetchObraData && obraId) fetchObraData(obraId);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.erro || 'Erro ao atualizar');
            }
        } catch (err) {
            logger.error('Erro ao salvar edição:', err);
            notify.error(`Erro ao salvar: ${err.message}`);
        }
    };

    // Função para exportar CSV
    const exportarCSV = () => {
        if (itemsPagos.length === 0) {
            notify.info('Nenhum pagamento para exportar');
            return;
        }

        const headers = ['Data', 'Descrição', 'Fornecedor', 'Serviço', 'Valor', 'Status'];

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

        const totalFormatado = totalPago.toFixed(2).replace('.', ',');
        rows.push('');
        rows.push(`;;;"TOTAL";"R$ ${totalFormatado}";`);

        const csvContent = '﻿' + headers.join(';') + '\n' + rows.join('\n');

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

    // Reverter parcela paga (voltar para pendente)
    const handleRevertParcela = async (item) => {
        if (!await confirmDialog(`Deseja reverter o pagamento "${item.descricao}"? A parcela voltará ao status "Pendente".`, { confirmText: 'Reverter' })) return;

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

            const extractNumericId = (id) => {
                const strId = String(id);
                if (strId.startsWith('lanc-')) return strId.replace('lanc-', '');
                if (strId.startsWith('serv-pag-')) return strId.replace('serv-pag-', '');
                if (strId.startsWith('parcela-')) return null;
                return strId;
            };

            const numericId = extractNumericId(item.id);

            if (!numericId) {
                notify.error('Parcelas de pagamentos parcelados não podem ser excluídas individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            }

            if (item.tipo_registro === 'lancamento') {
                endpoint = `${API_URL}/lancamentos/${numericId}`;
            } else if (item.tipo_registro === 'pagamento_servico') {
                endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
            } else if (item.tipo_registro === 'parcela_individual') {
                notify.error('Parcelas de pagamentos parcelados não podem ser excluídas individualmente.\n\nUse "Reverter Pagamento" para voltar a parcela ao status Pendente.');
                return;
            } else {
                if (String(item.id).startsWith('serv-pag-')) {
                    endpoint = `${API_URL}/pagamentos-servico/${numericId}`;
                } else {
                    endpoint = `${API_URL}/lancamentos/${numericId}`;
                }
            }

            logger.debug('Deletando:', endpoint);
            const response = await fetchWithAuth(endpoint, { method: 'DELETE' });

            if (response.ok) {
                notify.success('Item excluído com sucesso!');
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

    const isParcela = (item) => {
        return item.tipo_registro === 'parcela_individual' || String(item.id).startsWith('parcela-');
    };

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
                💰 Histórico de Pagamentos
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
                        title="Exportar histórico para CSV"
                    >
                        📥 Exportar CSV
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
                        <span style={{ fontSize: '13px', color: 'var(--cor-texto)' }}>Mão de Obra</span>
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
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        {/* Campo de Busca Rápida */}
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
                            }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por descrição, fornecedor ou serviço..."
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
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Botão Filtros */}
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
                            <span>⚙️</span>
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
                                        🏷️ Tipo
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
                                        <option value="mao_de_obra">👷 Mão de Obra</option>
                                        <option value="material">🧱 Material</option>
                                        <option value="equipamento">🔧 Equipamento</option>
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
                                        🏢 Fornecedor
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

                            {/* Botão Limpar Filtros */}
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
                                        ✕ Limpar todos os filtros
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
                            <span>🔎</span>
                            Exibindo <strong>{pagamentosFiltrados.length}</strong> de <strong>{itemsPagos.length}</strong> pagamentos
                            {busca && <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>Busca: "{busca}"</span>}
                            {filtroTipo !== 'todos' && <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>Tipo: {filtroTipo === 'mao_de_obra' ? 'Mão de Obra' : filtroTipo === 'material' ? 'Material' : 'Equipamento'}</span>}
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
                    <div style={{ fontSize: '2em', marginBottom: '10px' }}>💸</div>
                    <p>Nenhum pagamento registrado</p>
                </div>
            ) : (
                <>
                    <div className="tabela-scroll-container" style={{ maxHeight: mostrarTodos ? '600px' : '400px', overflowY: 'auto' }}>
                        <table className="tabela-pagamentos" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Fornecedor</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th style={{width: '50px', textAlign: 'center'}}>NF</th>
                                    {isAdmin && <th style={{width: '50px'}}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosExibidos.map((item, idx) => {
                                    const getTipoColor = () => {
                                        const tipo = item.tipo || item.tipo_pagamento || '';
                                        const tipoLower = tipo.toLowerCase();
                                        if (tipoLower.includes('mão') || tipoLower.includes('mao') || tipoLower === 'mao_de_obra') return '#6366f1';
                                        if (tipoLower.includes('material')) return '#10b981';
                                        if (tipoLower.includes('equipamento')) return '#f59e0b';
                                        return '#94a3b8';
                                    };
                                    const tipoColor = getTipoColor();

                                    return (
                                    <tr key={item.id || idx} style={{ position: 'relative' }}>
                                        <td style={{ position: 'relative', paddingLeft: '16px' }}>
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
                                                    🔗 {item.orcamento_item_nome}
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
                                                ✅ Pago
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'center'}}>
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
                                                    title="Editar / Vincular a serviço"
                                                >
                                                    ✏️
                                                </button>
                                                {isParcela(item) ? (
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
                                                        ↩️
                                                    </button>
                                                ) : (
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
                                                        🗑️
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
                                    ? '↑ Mostrar menos'
                                    : `Ver todos os ${pagamentosFiltrados.length} pagamentos ↓`
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

            {/* Modal de Edição - Vincular Serviço */}
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
                            ✏️ Editar Pagamento
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em' }}>Descrição:</label>
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
                                🏷️ Tipo:
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['Mão de Obra', 'Material'].map(opcao => (
                                    <button
                                        key={opcao}
                                        onClick={() => setEditandoItem({...editandoItem, tipo_edit: opcao})}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '2px solid',
                                            borderColor: editandoItem.tipo_edit === opcao ? (opcao === 'Mão de Obra' ? '#6366f1' : '#f59e0b') : '#e5e7eb',
                                            backgroundColor: editandoItem.tipo_edit === opcao ? (opcao === 'Mão de Obra' ? '#eef2ff' : '#fffbeb') : '#fff',
                                            color: editandoItem.tipo_edit === opcao ? (opcao === 'Mão de Obra' ? '#4f46e5' : '#d97706') : '#6b7280',
                                            fontWeight: editandoItem.tipo_edit === opcao ? '700' : '400',
                                            cursor: 'pointer',
                                            fontSize: '0.9em',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {opcao === 'Mão de Obra' ? '👷 Mão de Obra' : '🧱 Material'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: '500', color: '#666', fontSize: '0.9em', display: 'block', marginBottom: '8px' }}>
                                🔗 Vincular a Item do Orçamento:
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
                                💡 Vincular a um item faz o valor contar no orçamento
                            </small>
                        </div>

                        {/* Comprovante de pagamento */}
                        {editandoItem.comprovante_url && (
                            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <label style={{ fontWeight: '600', color: '#166534', fontSize: '0.9em', display: 'block', marginBottom: '10px' }}>
                                    🧾 Comprovante de Pagamento
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
                                                🔍 Ampliar imagem
                                            </a>
                                        </div>
                                    </div>
                                ) : editandoItem.comprovante_url.startsWith('data:application/pdf') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                                        <a href={editandoItem.comprovante_url}
                                            download={`comprovante_${editandoItem.descricao || 'pagamento'}.pdf`}
                                            style={{ padding: '8px 16px', background: '#166534', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                                            ⬇️ Baixar PDF
                                        </a>
                                    </div>
                                ) : (
                                    <a href={editandoItem.comprovante_url} target="_blank" rel="noreferrer"
                                        style={{ color: '#166534', fontWeight: '600', fontSize: '13px' }}>
                                        🔗 Ver comprovante
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
                                💾 Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricoPagamentosCard;
