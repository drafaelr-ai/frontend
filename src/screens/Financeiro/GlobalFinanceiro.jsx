import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { formatCurrency } from '../../utils/format';
import { notify } from '../../utils/notify';
import InserirPagamentoModal from '../../components/modals/InserirPagamentoModal';
import DashboardHeader from '../Dashboard/components/DashboardHeader';
import './GlobalFinanceiro.css';


function openWork(obraId, page = 'home') {
    window.location.href = `${window.location.pathname}?obra=${obraId}&page=${page}`;
}

function getFinancialSummary(row) {
    const detail = row.detail?.sumarios;
    return {
        orcamento_total: detail?.orcamento_total ?? row.orcamento_total ?? 0,
        valores_pagos: detail?.valores_pagos ?? row.total_pago ?? 0,
        liberado_pagamento: detail?.liberado_pagamento ?? row.liberado_pagamento ?? 0,
        despesas_extras: detail?.despesas_extras ?? row.despesas_extras ?? 0,
    };
}

function getDueSummary(row) {
    return {
        overdue: row.valor_vencido ?? row.total_vencido ?? 0,
        dueThisMonth: row.valor_a_vencer_mes ?? row.total_a_vencer_mes ?? 0,
    };
}

export default function GlobalFinanceiro() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showNewPayment, setShowNewPayment] = useState(false);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [itensOrcamento, setItensOrcamento] = useState([]);
    const [loadingItensOrcamento, setLoadingItensOrcamento] = useState(false);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const obrasResponse = await fetchWithAuth(`${API_URL}/obras?mostrar_concluidas=true&incluir_arquivadas=true`);
            if (!obrasResponse.ok) throw new Error('Não foi possível carregar as obras.');
            const payload = await obrasResponse.json();
            const obras = Array.isArray(payload) ? payload : (payload.obras || []);
            const details = await Promise.allSettled(obras.map(async obra => {
                const response = await fetchWithAuth(`${API_URL}/obras/${obra.id}`);
                if (!response.ok) throw new Error(`Falha ao carregar ${obra.nome}`);
                return response.json();
            }));
            setRows(obras.map((obra, index) => ({
                ...obra,
                detail: details[index].status === 'fulfilled' ? details[index].value : null,
            })));
        } catch (error) {
            notify.error(error.message || 'Erro ao carregar o painel financeiro.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    useEffect(() => {
        let active = true;
        setItensOrcamento([]);

        if (!showNewPayment || !selectedObraId) {
            setLoadingItensOrcamento(false);
            return () => { active = false; };
        }

        setLoadingItensOrcamento(true);
        fetchWithAuth(`${API_URL}/obras/${selectedObraId}/orcamento-eng/itens-lista`)
            .then(async response => {
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.erro || 'Não foi possível carregar os itens do orçamento.');
                }
                return response.json();
            })
            .then(payload => {
                if (active) setItensOrcamento(Array.isArray(payload) ? payload : []);
            })
            .catch(error => {
                if (active) notify.error(error.message || 'Erro ao carregar os itens do orçamento.');
            })
            .finally(() => {
                if (active) setLoadingItensOrcamento(false);
            });

        return () => { active = false; };
    }, [selectedObraId, showNewPayment]);

    const openNewPayment = () => {
        setSelectedObraId('');
        setItensOrcamento([]);
        setShowNewPayment(true);
    };

    const closeNewPayment = () => {
        setShowNewPayment(false);
        setSelectedObraId('');
        setItensOrcamento([]);
    };

    const savePayment = async (paymentData, saveAndNew = false) => {
        if (!selectedObraId) {
            const error = new Error('Selecione a obra do lançamento.');
            notify.error(error.message);
            throw error;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${selectedObraId}/inserir-pagamento`, {
                method: 'POST',
                body: JSON.stringify(paymentData),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.erro || 'Erro ao inserir o lançamento.');

            if (!saveAndNew) {
                notify.success('Lançamento salvo no financeiro da obra.');
                closeNewPayment();
            }
            await loadRows();
            return payload;
        } catch (error) {
            notify.error(error.message || 'Erro ao inserir o lançamento.');
            throw error;
        }
    };

    const filteredRows = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('pt-BR');
        if (!term) return rows;
        return rows.filter(row => [row.nome, row.cliente]
            .some(value => value?.toLocaleLowerCase('pt-BR').includes(term)));
    }, [rows, search]);

    const activeRows = useMemo(() => rows.filter(row => !row.arquivada), [rows]);

    const totals = useMemo(() => rows.reduce((acc, row) => {
        const summary = getFinancialSummary(row);
        acc.budget += summary.orcamento_total || 0;
        acc.paid += summary.valores_pagos || 0;
        acc.pending += summary.liberado_pagamento || 0;
        acc.extras += summary.despesas_extras || 0;
        return acc;
    }, { budget: 0, paid: 0, pending: 0, extras: 0 }), [rows]);

    return (
        <div className="fin-global-root">
            <DashboardHeader />
            <main className="fin-global-page">
                <header className="fin-global-hero">
                    <div>
                        <span className="fin-global-eyebrow">Todas as obras</span>
                        <h1>Painel financeiro</h1>
                        <p>Pagamentos, compromissos, boletos e caixa em um único módulo.</p>
                    </div>
                    <div className="fin-global-actions">
                        <label className="fin-global-search">
                            <i className="ti ti-search" aria-hidden="true" />
                            <input
                                aria-label="Buscar obra no financeiro"
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Buscar obra..."
                            />
                        </label>
                        <button className="fin-global-new" type="button" onClick={openNewPayment} disabled={loading || !activeRows.length}>
                            <i className="ti ti-plus" aria-hidden="true" />
                            Novo lançamento
                        </button>
                    </div>
                </header>

                <section className="fin-global-kpis" aria-label="Resumo financeiro">
                    <article><i className="ti ti-clipboard-data" /><span>Orçamento das obras</span><strong>{formatCurrency(totals.budget)}</strong></article>
                    <article><i className="ti ti-circle-check" /><span>Total pago</span><strong>{formatCurrency(totals.paid)}</strong></article>
                    <article><i className="ti ti-calendar-dollar" /><span>Liberado e previsto</span><strong>{formatCurrency(totals.pending)}</strong></article>
                    <article><i className="ti ti-receipt" /><span>Fora da planilha</span><strong>{formatCurrency(totals.extras)}</strong></article>
                </section>

                <section className="fin-global-panel">
                    <div className="fin-global-panel__title">
                        <div><span className="fin-global-eyebrow">Acesso rápido por obra</span><h2>Financeiro por obra</h2><p>Valores vencidos e a vencer no mês sem abrir a obra.</p></div>
                        <strong>{filteredRows.length}</strong>
                    </div>
                    {loading ? (
                        <div className="fin-global-empty"><i className="ti ti-loader-2" /><p>Consolidando os pagamentos...</p></div>
                    ) : filteredRows.length ? (
                        <div className="fin-global-list">
                            {filteredRows.map(row => {
                                const summary = getFinancialSummary(row);
                                const due = getDueSummary(row);
                                const percent = summary.orcamento_total > 0
                                    ? summary.valores_pagos / summary.orcamento_total * 100
                                    : 0;
                                return (
                                    <article className={`fin-work-card${row.arquivada ? ' fin-work-card--archived' : ''}`} key={row.id}>
                                        <button className="fin-work-main" onClick={() => openWork(row.id, 'home')}>
                                            <span className="fin-work-icon"><i className="ti ti-building" /></span>
                                            <span className="fin-work-name">
                                                <span className="fin-work-title">
                                                    <strong>{row.nome}</strong>
                                                    {row.arquivada ? <em>Arquivada</em> : null}
                                                </span>
                                                <small>{row.arquivada ? 'Histórico preservado' : `${row.cliente || 'Obra ativa'} · ${percent.toFixed(0)}% pago`}</small>
                                            </span>
                                            <i className="ti ti-chevron-right" />
                                        </button>
                                        <div className="fin-work-due" aria-label={`Vencimentos de ${row.nome}`}>
                                            <div className="fin-work-due__overdue"><small>Vencido</small><strong>{formatCurrency(due.overdue)}</strong></div>
                                            <div className="fin-work-due__month"><small>A vencer no mês</small><strong>{formatCurrency(due.dueThisMonth)}</strong></div>
                                        </div>
                                        <div className="fin-work-links" aria-label={`Atalhos financeiros de ${row.nome}`}>
                                            <button onClick={() => openWork(row.id, 'financeiro')}><i className="ti ti-calendar-dollar" /> Cronograma</button>
                                            <button onClick={() => openWork(row.id, 'boletos')}><i className="ti ti-file-invoice" /> Boletos</button>
                                            <button onClick={() => openWork(row.id, 'caixa')}><i className="ti ti-cash" /> Caixa</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="fin-global-empty"><i className="ti ti-building-off" /><h3>Nenhuma obra encontrada</h3><p>Ajuste a busca ou confira suas permissões.</p></div>
                    )}
                </section>
            </main>

            {showNewPayment && (
                <InserirPagamentoModal
                    obraId={selectedObraId}
                    obras={activeRows.map(({ id, nome, cliente }) => ({ id, nome, cliente }))}
                    onObraChange={setSelectedObraId}
                    onClose={closeNewPayment}
                    onSave={savePayment}
                    itensOrcamento={itensOrcamento}
                    loadingItensOrcamento={loadingItensOrcamento}
                />
            )}
        </div>
    );
}
