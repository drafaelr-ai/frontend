import React, { useState, useEffect } from 'react';
import Modal from '../../components/modals/Modal';
import CadastrarPagamentoFuturoModal from '../../components/modals/CadastrarPagamentoFuturoModal';
import EditarPagamentoFuturoModal from '../../components/modals/EditarPagamentoFuturoModal';
import CadastrarPagamentoParceladoModal from '../../components/modals/CadastrarPagamentoParceladoModal';
import EditarParcelasModal from '../../components/modals/EditarParcelasModal';
import ModalWhatsAppCronograma from '../../components/modals/ModalWhatsAppCronograma';
import QuadroAlertasVencimento from '../../components/QuadroAlertasVencimento';
import PrioridadeBadge from '../../components/PrioridadeBadge';
import { fetchWithAuth, fetchWithAuthTimeout } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency, getTodayString } from '../../utils/format';

const CronogramaFinanceiro = ({ onClose, obraId, obraNome, embedded = false, simplified = false }) => {
    const [pagamentosFuturos, setPagamentosFuturos] = useState([]);
    const [pagamentosParcelados, setPagamentosParcelados] = useState([]);
    const [pagamentosServicoPendentes, setPagamentosServicoPendentes] = useState([]);
    const [isEditarParcelasVisible, setEditarParcelasVisible] = useState(false);
    const [pagamentoParceladoSelecionado, setPagamentoParceladoSelecionado] = useState(null);
    const [previsoes, setPrevisoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [itensOrcamento, setItensOrcamento] = useState([]);

    const [isPagamentosFuturosCollapsed, setIsPagamentosFuturosCollapsed] = useState(false);
    const [isPagamentosParceladosCollapsed, setIsPagamentosParceladosCollapsed] = useState(false);

    const [itensSelecionados, setItensSelecionados] = useState([]);
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

    const toggleSelecao = (tipo, id) => {
        let tipoFinal = tipo;
        let idFinal = id;

        if (typeof id === 'string' && id.startsWith('servico-')) {
            const idNumerico = parseInt(id.split('-')[1], 10);
            tipoFinal = 'servico';
            idFinal = idNumerico;
            logger.debug(`[CORREÇÃO] Convertido de tipo="${tipo}" id="${id}" para tipo="${tipoFinal}" id=${idFinal}`);
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

        pagamentosFuturos.forEach(pag => {
            if (pag.status === 'Previsto') {
                if (typeof pag.id === 'string' && pag.id.startsWith('servico-')) {
                    const idNumerico = parseInt(pag.id.split('-')[1], 10);
                    todos.push({ tipo: 'servico', id: idNumerico });
                    logger.debug(`[SELECIONAR TODOS] Convertido ${pag.id} para tipo=servico, id=${idNumerico}`);
                } else {
                    todos.push({ tipo: 'futuro', id: pag.id });
                }
            }
        });

        pagamentosServicoPendentes.forEach(pag => {
            todos.push({ tipo: 'servico', id: pag.id });
        });

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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [futuroRes, parceladoRes, previsoesRes, servicoPendentesRes, itensOrcRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/previsoes`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/obras/${obraId}/pagamentos-servico-pendentes`).catch(e => ({ ok: false, error: e })),
                fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`).catch(e => ({ ok: false, error: e }))
            ]);

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
                    logger.error('Erro ao processar previsões:', e);
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

            if (itensOrcRes.ok) {
                try {
                    const data = await itensOrcRes.json();
                    setItensOrcamento(data);
                } catch (e) {
                    logger.error('Erro ao processar itens do orçamento:', e);
                }
            }

            if (parceladoRes.ok) {
                try {
                    const data = await parceladoRes.json();

                    setPagamentosParcelados(data.map(p => ({ ...p, parcelas: [] })));
                    setIsLoading(false);

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

    const handleDeletePagamentoFuturo = async (id) => {
        const idStr = String(id);

        if (idStr.startsWith('servico-')) {
            notify.warning('⚠️ Este pagamento está vinculado a um serviço.\n\nPara excluí-lo, acesse a página do serviço correspondente.');
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
                showCronogramaToast('🗑️ Pagamento futuro excluído!');
                setTimeout(() => fetchData(), 500);
            } else {
                const errorData = await res.json().catch(() => ({}));
                notify.error('Erro ao excluir pagamento futuro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao deletar pagamento futuro:', error);
            if (error.name === 'AbortError') {
                notify.error('A exclusão demorou demais. Verifique a conexão e recarregue a tela.');
            } else {
                notify.error('Erro ao deletar pagamento futuro: ' + error.message);
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

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
                logger.debug("Marcando pagamento de serviço futuro como pago:", servPagId);
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

                showCronogramaToast('✅ Pagamento marcado como pago!');
                setTimeout(() => fetchData(), 500);
            } else {
                const errorData = await res.json().catch(() => ({}));
                notify.error('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            logger.error('Erro ao marcar pagamento como pago:', error);
            if (error.name === 'AbortError') {
                notify.error('A operação demorou demais. Verifique a conexão e recarregue a tela.');
            } else {
                notify.error('Erro ao processar: ' + error.message);
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    const handleDeletePagamentoParcelado = async (id) => {
        if (!await confirmDialog('Deseja realmente excluir este pagamento parcelado?', { danger: true, confirmText: 'Excluir' })) return;

        const lockKey = `parcelado-${id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            const res = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${id}`,
                { method: 'DELETE' },
                60000
            );

            if (res.ok) {
                setPagamentosParcelados(prev => prev.filter(pag => pag.id !== id));
                showCronogramaToast('🗑️ Pagamento parcelado excluído!');
                setTimeout(() => fetchData(), 500);
            } else {
                notify.error('Erro ao excluir pagamento parcelado');
            }
        } catch (error) {
            logger.error('Erro ao deletar pagamento parcelado:', error);
            if (error.name === 'AbortError') {
                notify.error('A exclusão demorou demais. Verifique a conexão e recarregue a tela.');
            } else {
                notify.error('Erro ao deletar pagamento parcelado');
            }
        } finally {
            stopProcessing(lockKey);
        }
    };

    const handleMarcarParcelaPaga = async (pagamento) => {
        if (!await confirmDialog(`Confirma o pagamento da próxima parcela (${pagamento.proxima_parcela_numero}/${pagamento.numero_parcelas})?`, { confirmText: 'Confirmar pagamento' })) {
            return;
        }

        const lockKey = `parcelado-${pagamento.id}`;
        if (isProcessing(lockKey)) return;
        startProcessing(lockKey);

        try {
            const resListaParcelas = await fetchWithAuthTimeout(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}/parcelas`
            );

            if (!resListaParcelas.ok) {
                notify.error('Erro ao buscar parcelas');
                return;
            }

            const parcelas = await resListaParcelas.json();

            const proximaParcela = parcelas.find(p => p.status !== 'Pago');

            if (!proximaParcela) {
                notify.warning('Todas as parcelas já foram pagas!');
                return;
            }

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
                                status: todasPagas ? 'Concluído' : 'Ativo'
                            };
                        }
                        return pag;
                    });
                });

                showCronogramaToast(`✅ ${resultado.mensagem}`);
                setTimeout(() => fetchData(), 500);
            } else {
                const erro = await res.json().catch(() => ({}));
                notify.error(`Erro: ${erro.erro || 'Erro ao marcar parcela como paga'}`);
            }
        } catch (error) {
            logger.error('Erro ao marcar parcela:', error);
            if (error.name === 'AbortError') {
                notify.error('A operação demorou demais. Verifique a conexão e recarregue a tela.');
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

    const cronogramaContent = (
        <div style={{ maxHeight: embedded ? 'none' : '85vh', overflowY: embedded ? 'visible' : 'auto' }}>
            <h2>{simplified ? '📋' : '💰'} {simplified ? 'Início' : 'Cronograma Financeiro'} - {obraNome}</h2>
            <QuadroAlertasVencimento obraId={obraId} />
            {/* Botões de Exportação */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {/* REMOVIDO: Botões de cadastro movidos para o dashboard principal */}

                {/* Botão Gerar PDF - apenas no modo completo */}
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
                        title="Gerar relatório PDF do cronograma financeiro"
                    >
                        📊 Gerar PDF
                    </button>
                )}

                {/* Botão WhatsApp - apenas no modo completo */}
                {!simplified && (
                    <button
                        type="button"
                        onClick={() => setShowWhatsAppModal(true)}
                        className="export-btn"
                        style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                        title="Compartilhar cronograma pelo WhatsApp"
                    >
                        📱 WhatsApp
                    </button>
                )}

                    {!simplified && itensSelecionados.length > 0 && (
                        <button
                            onClick={handleMarcarMultiplosComoPago}
                            className="cf-btn cf-btn-success"
                        >
                            ✅ Marcar {itensSelecionados.length} Selecionado(s) como Pago
                        </button>
                    )}
                </div>

                {/* Previsão de Fluxo de Caixa */}
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">📈 Previsão de Fluxo de Caixa</div>
                            <div className="cf-section-subtitle">Soma automática de pagamentos futuros e parcelados</div>
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
                            📊 Gerar PDF
                        </button>
                    </div>

                    {previsoes.length > 0 ? (
                        <>
                            {/* Gráfico de Barras */}
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
                            Nenhuma previsão calculada. Cadastre pagamentos futuros ou parcelados.
                        </p>
                    )}
                </div>

                {/* Listagem de Pagamentos de Serviço Pendentes */}
                {pagamentosServicoPendentes.length > 0 && (
                    <div className="cf-section" style={{ marginBottom: '20px', background: 'var(--cor-warning-bg)', border: '2px solid var(--cor-warning-light)' }}>
                        <h3>⚠️ Pagamentos de Serviço Pendentes</h3>
                        <p style={{ fontSize: '0.9em', color: '#856404', marginBottom: '15px' }}>
                            Estes são pagamentos vinculados a serviços que ainda não foram quitados totalmente.
                        </p>
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>☑</th>
                                    <th>Serviço</th>
                                    <th>Descrição</th>
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
                                                backgroundColor: pag.tipo_pagamento === 'Mão de Obra' ? '#007bff' : '#28a745',
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

                {/* Pagamentos Futuros (Únicos) */}
                {!simplified && (
                <div className="cf-section" style={{ marginBottom: '20px' }}>
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                📅 Pagamentos Futuros
                                <span className="cf-badge cf-badge-info">Únicos</span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique na descrição para editar ou no badge para marcar como pago
                            </div>
                        </div>
                        <button
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosFuturosCollapsed(prev => !prev)}
                        >
                            {isPagamentosFuturosCollapsed ? '▼ Expandir' : '▲ Recolher'}
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

                                    {/* Ícone */}
                                    <div className="cf-pagamento-futuro-icon">
                                        {String(pag.id).startsWith('servico-') ? '🔧' : '💰'}
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
                                            {pag.fornecedor || 'Sem fornecedor'} · {new Date(pag.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                                                {futuroProcessing ? '⏳ Processando...' : 'Pendente'}
                                            </span>
                                        );
                                    })()}

                                    {/* Ações */}
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
                                                {isProcessing(`futuro-${pag.id}`) ? '⏳' : '🗑️'}
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

                {/* Listagem de Pagamentos Parcelados - CARDS */}
                {!simplified && (
                <div className="cf-section">
                    <div className="cf-section-header">
                        <div>
                            <div className="cf-section-title">
                                📋 Pagamentos Parcelados
                                <span className="cf-badge cf-badge-purple">
                                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length} ativos
                                </span>
                            </div>
                            <div className="cf-section-subtitle">
                                Clique no card para editar · Bolinhas = parcelas (● paga ○ pendente)
                            </div>
                        </div>
                        <button
                            className="cf-btn cf-btn-outline"
                            onClick={() => setIsPagamentosParceladosCollapsed(prev => !prev)}
                        >
                            {isPagamentosParceladosCollapsed ? '▼ Expandir' : '▲ Recolher'}
                        </button>
                    </div>

                    {!isPagamentosParceladosCollapsed && (
                        <>
                    {pagamentosParcelados.filter(pag => pag.status === 'Ativo').length > 0 ? (
                        <div className="parcelas-cards-grid">
                            {pagamentosParcelados.filter(pag => pag.status === 'Ativo').map(pag => {
                                const parcelasPagas = pag.parcelas_pagas || 0;
                                const progresso = pag.numero_parcelas > 0 ? Math.round((parcelasPagas / pag.numero_parcelas) * 100) : 0;

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
                                                📦 {pag.descricao}
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

                                        {/* Conteúdo */}
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
                                                <span className="parcela-popup-vencimento-label">📅 Vencimento</span>
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
                                                            {parceladoProcessing ? '⏳ Processando...' : (
                                                                <>💳 {pag.proxima_parcela_numero === 0 ? 'Pagar Entrada' : (() => {
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
                                                            {parceladoProcessing ? '⏳' : '🗑️'}
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
                        {embedded ? '← Voltar às Obras' : 'Fechar'}
                    </button>
                </div>
            </div>
    );

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

export default CronogramaFinanceiro;
