import React, { useState, useMemo } from 'react';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';
import NotaFiscalIcon from '../../components/NotaFiscalIcon';
import './HistoricoPagamentos.css';

const HistoricoPagamentosCard = ({ itemsPagos, itemsAPagar, user, onDeleteItem, fetchObraData, obraId }) => {
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [editandoItem, setEditandoItem] = useState(null);
    const [itensOrcamento, setItensOrcamento] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    const [busca, setBusca] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, mao_de_obra, material, equipamento
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
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

    const hasActiveFilters = busca || filtroTipo !== 'todos' || filtroFornecedor;

    // Resolves tipo key for a payment item
    const getTipoKey = (item) => {
        const tipo = (item.tipo || item.tipo_pagamento || '').toLowerCase();
        if (tipo.includes('mão') || tipo.includes('mao') || tipo === 'mao_de_obra') return 'mao_de_obra';
        if (tipo.includes('equipamento') || tipo.includes('despesa')) return 'equipamento';
        return 'material';
    };

    const TIPO_LABELS = { mao_de_obra: 'Mão de Obra', material: 'Material', equipamento: 'Equipamento' };

    const TIPO_CHIPS = [
        { key: 'todos', label: 'Todos' },
        { key: 'mao_de_obra', label: 'Mão de Obra' },
        { key: 'material', label: 'Material' },
        { key: 'equipamento', label: 'Equipamento' },
    ];

    return (
        <div className="card" style={{ marginTop: '20px' }}>

            {/* === HEADER === */}
            <div className="hpc-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="hpc-title">Histórico de Pagamentos</h2>
                    <span className="hpc-count-badge">{itemsPagos.length} pagos</span>
                </div>
                {itemsPagos.length > 0 && (
                    <button onClick={exportarCSV} className="hpc-export-btn">
                        <i className="ti ti-download" aria-hidden="true" />
                        Exportar CSV
                    </button>
                )}
            </div>

            {/* === STAT CARDS === */}
            {(itemsPagos.length > 0 || totalPendente > 0) && (
                <div className="hpc-stats-row">
                    <div className="hpc-stat-card">
                        <div className="hpc-stat-label">Total Pago</div>
                        <div className="hpc-stat-value" style={{ color: 'var(--status-success)' }}>
                            {formatCurrency(totalPago)}
                        </div>
                        <div className="hpc-stat-caption">{itemsPagos.length} itens</div>
                    </div>
                    <div className="hpc-stat-card">
                        <div className="hpc-stat-label">Pendente</div>
                        <div className="hpc-stat-value" style={{ color: totalPendente > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                            {formatCurrency(totalPendente)}
                        </div>
                        <div className="hpc-stat-caption">{itemsAPagar.length} itens</div>
                    </div>
                </div>
            )}

            {/* === TOOLBAR === */}
            {itemsPagos.length > 0 && (
                <div className="hpc-toolbar">
                    <div className="hpc-search-wrap">
                        <i className="ti ti-search hpc-search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            className="hpc-search-input"
                            placeholder="Buscar descrição, fornecedor..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                        {busca && (
                            <button className="hpc-search-clear" onClick={() => setBusca('')} title="Limpar busca">
                                <i className="ti ti-x" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <div className="hpc-chips">
                        {TIPO_CHIPS.map(opt => (
                            <button
                                key={opt.key}
                                className={`hpc-chip${filtroTipo === opt.key ? ' active' : ''}`}
                                onClick={() => setFiltroTipo(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {fornecedoresUnicos.length > 0 && (
                        <select
                            className="hpc-filter-select"
                            value={filtroFornecedor}
                            onChange={(e) => setFiltroFornecedor(e.target.value)}
                            title="Filtrar por fornecedor"
                        >
                            <option value="">Todos os fornecedores</option>
                            {fornecedoresUnicos.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    )}

                    {hasActiveFilters && (
                        <button
                            className="hpc-clear-btn"
                            onClick={() => { setBusca(''); setFiltroTipo('todos'); setFiltroFornecedor(''); }}
                        >
                            <i className="ti ti-x" aria-hidden="true" /> Limpar
                        </button>
                    )}
                </div>
            )}

            {/* === FILTER INFO === */}
            {hasActiveFilters && (
                <div className="hpc-filter-info">
                    <i className="ti ti-filter" aria-hidden="true" />
                    {pagamentosFiltrados.length} de {itemsPagos.length} resultados
                    {busca && <span> · busca: "{busca}"</span>}
                    {filtroTipo !== 'todos' && <span> · {TIPO_LABELS[filtroTipo]}</span>}
                    {filtroFornecedor && <span> · {filtroFornecedor}</span>}
                </div>
            )}

            {/* === TABLE === */}
            {itemsPagos.length === 0 ? (
                <div className="hpc-empty">
                    <i className="ti ti-cash-off" aria-hidden="true" />
                    <p>Nenhum pagamento registrado</p>
                </div>
            ) : (
                <div className="hpc-table-container">
                    <table className="hpc-table">
                        <thead>
                            <tr>
                                <th style={{ width: 72 }}>Data</th>
                                <th>Descrição</th>
                                <th style={{ width: 110 }}>Tipo</th>
                                <th style={{ width: 110, textAlign: 'right' }}>Valor</th>
                                <th style={{ width: 90 }}>Status</th>
                                <th style={{ width: 36, textAlign: 'center' }}>NF</th>
                                {isAdmin && <th style={{ width: 64, textAlign: 'center' }}>Ações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {pagamentosExibidos.map((item, idx) => {
                                const tipoKey = getTipoKey(item);
                                const dataStr = item.data_vencimento || item.data;
                                const dataFmt = dataStr
                                    ? new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                    : '-';

                                return (
                                    <tr
                                        key={item.id || idx}
                                        className={isAdmin ? 'hpc-row-clickable' : ''}
                                        onClick={isAdmin ? () => handleEditarItem(item) : undefined}
                                    >
                                        <td className="hpc-cell-date">{dataFmt}</td>
                                        <td>
                                            <div className="hpc-desc-main">{item.descricao}</div>
                                            {(item.fornecedor || item.orcamento_item_nome) && (
                                                <div className="hpc-desc-sub">
                                                    {item.fornecedor || ''}
                                                    {item.fornecedor && item.orcamento_item_nome && ' · '}
                                                    {item.orcamento_item_nome || ''}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`hpc-tipo-pill hpc-tipo-${tipoKey}`}>
                                                {TIPO_LABELS[tipoKey]}
                                            </span>
                                        </td>
                                        <td className="hpc-cell-valor">
                                            {formatCurrency(item.valor_pago || item.valor_total || 0)}
                                        </td>
                                        <td>
                                            <span className="hpc-status-pill hpc-status-pago">
                                                <span className="hpc-status-dot" />
                                                Pago
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
                                            <td className="hpc-actions-cell" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleEditarItem(item)}
                                                    className="hpc-action-btn"
                                                    title="Editar / Vincular a serviço"
                                                >
                                                    <i className="ti ti-pencil" aria-hidden="true" />
                                                </button>
                                                {isParcela(item) ? (
                                                    <button
                                                        onClick={() => handleRevertParcela(item)}
                                                        className="hpc-action-btn hpc-action-warning"
                                                        title="Reverter pagamento"
                                                    >
                                                        <i className="ti ti-arrow-back-up" aria-hidden="true" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="hpc-action-btn hpc-action-danger"
                                                        title="Excluir"
                                                    >
                                                        <i className="ti ti-trash" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="hpc-footer">
                        <span className="hpc-footer-count">
                            Exibindo {pagamentosExibidos.length} de {pagamentosFiltrados.length} registros
                        </span>
                        {pagamentosFiltrados.length > ITENS_INICIAIS && (
                            <button
                                className="hpc-show-more-btn"
                                onClick={() => setMostrarTodos(!mostrarTodos)}
                            >
                                {mostrarTodos
                                    ? <><i className="ti ti-chevron-up" aria-hidden="true" /> Mostrar menos</>
                                    : <><i className="ti ti-chevron-down" aria-hidden="true" /> Ver todos ({pagamentosFiltrados.length})</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* === EDIT MODAL — lógica preservada, tokens aplicados === */}
            {editandoItem && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', /* BUG: sem token para overlay — NOTAS_REFACTOR */
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }} onClick={() => setEditandoItem(null)}>
                    <div style={{
                        backgroundColor: 'var(--surface-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '25px',
                        width: '90%',
                        maxWidth: '450px',
                        boxShadow: 'var(--shadow-card)',
                        border: '0.5px solid var(--border-subtle)',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                            <i className="ti ti-pencil" aria-hidden="true" /> Editar Pagamento
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Descrição:</label>
                            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', marginTop: '3px', color: 'var(--text-primary)' }}>
                                {editandoItem.descricao}
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Valor:</label>
                            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', marginTop: '3px', color: 'var(--status-success)' }}>
                                {formatCurrency(editandoItem.valor_pago || editandoItem.valor_total || 0)}
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', display: 'block', marginBottom: '8px' }}>
                                <i className="ti ti-tag" aria-hidden="true" /> Tipo:
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['Mão de Obra', 'Material'].map(opcao => {
                                    const isActive = editandoItem.tipo_edit === opcao;
                                    const isMao = opcao === 'Mão de Obra';
                                    return (
                                        <button
                                            key={opcao}
                                            onClick={() => setEditandoItem({...editandoItem, tipo_edit: opcao})}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1.5px solid',
                                                borderColor: isActive
                                                    ? (isMao ? 'var(--status-warning)' : 'var(--brand-accent)')
                                                    : 'var(--border-subtle)',
                                                backgroundColor: isActive
                                                    ? (isMao ? 'var(--status-warning-bg)' : 'var(--surface-subtle)')
                                                    : 'var(--surface-card)',
                                                color: isActive
                                                    ? (isMao ? 'var(--status-warning)' : 'var(--text-primary)')
                                                    : 'var(--text-muted)',
                                                fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                                                cursor: 'pointer',
                                                fontSize: 'var(--text-sm)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {isMao ? <><i className="ti ti-helmet" aria-hidden="true" /> Mão de Obra</> : <><i className="ti ti-wall" aria-hidden="true" /> Material</>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', display: 'block', marginBottom: '8px' }}>
                                <i className="ti ti-link" aria-hidden="true" /> Vincular a Item do Orçamento:
                            </label>
                            {loadingItens ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Carregando itens...</div>
                            ) : (
                                <select
                                    value={editandoItem.orcamento_item_id || ''}
                                    onChange={(e) => setEditandoItem({...editandoItem, orcamento_item_id: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '0.5px solid var(--border-default)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-primary)',
                                        background: 'var(--surface-card)',
                                    }}
                                >
                                    <option value="">-- Nenhum item (Despesa Geral) --</option>
                                    {itensOrcamento.map(item => (
                                        <option key={item.id} value={item.id}>{item.nome_completo}</option>
                                    ))}
                                </select>
                            )}
                            <small style={{ color: 'var(--text-muted)', marginTop: '5px', display: 'block', fontSize: 'var(--text-xs)' }}>
                                Vincular a um item faz o valor contar no orçamento
                            </small>
                        </div>

                        {/* Comprovante de pagamento */}
                        {editandoItem.comprovante_url && (
                            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--status-success-bg)', border: '0.5px solid var(--border-subtle)' }}>
                                <label style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--status-success)', fontSize: 'var(--text-sm)', display: 'block', marginBottom: '10px' }}>
                                    <i className="ti ti-receipt" aria-hidden="true" /> Comprovante de Pagamento
                                </label>
                                {editandoItem.comprovante_url.startsWith('data:image') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <img
                                            src={editandoItem.comprovante_url}
                                            alt="Comprovante"
                                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)', objectFit: 'contain', cursor: 'pointer' }}
                                            onClick={() => window.open(editandoItem.comprovante_url, '_blank')}
                                            title="Clique para ampliar"
                                        />
                                        <div style={{ marginTop: '8px' }}>
                                            <a href={editandoItem.comprovante_url} target="_blank" rel="noreferrer"
                                                style={{ fontSize: 'var(--text-xs)', color: 'var(--status-success)', textDecoration: 'none', fontWeight: 'var(--weight-semibold)' }}>
                                                <i className="ti ti-zoom-in" aria-hidden="true" /> Ampliar imagem
                                            </a>
                                        </div>
                                    </div>
                                ) : editandoItem.comprovante_url.startsWith('data:application/pdf') ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <i className="ti ti-file-type-pdf" style={{ fontSize: '32px', color: 'var(--status-danger)', marginBottom: '8px', display: 'block' }} aria-hidden="true" />
                                        <a href={editandoItem.comprovante_url}
                                            download={`comprovante_${editandoItem.descricao || 'pagamento'}.pdf`}
                                            style={{ padding: '8px 16px', background: 'var(--status-success)', color: 'var(--surface-card)', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
                                            <i className="ti ti-download" aria-hidden="true" /> Baixar PDF
                                        </a>
                                    </div>
                                ) : (
                                    <a href={editandoItem.comprovante_url} target="_blank" rel="noreferrer"
                                        style={{ color: 'var(--status-success)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
                                        <i className="ti ti-external-link" aria-hidden="true" /> Ver comprovante
                                    </a>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditandoItem(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '0.5px solid var(--border-default)',
                                    backgroundColor: 'var(--surface-card)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--text-sm)',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarEdicao}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    backgroundColor: 'var(--status-info)',
                                    color: 'var(--surface-card)',
                                    cursor: 'pointer',
                                    fontWeight: 'var(--weight-medium)',
                                    fontSize: 'var(--text-sm)',
                                }}
                            >
                                <i className="ti ti-device-floppy" aria-hidden="true" /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricoPagamentosCard;
