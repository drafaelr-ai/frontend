import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency, getTodayString } from '../../utils/format';

const EditarParcelasModal = ({ obraId, pagamentoParcelado, onClose, onSave, itensOrcamento = [] }) => {
    const [parcelas, setParcelas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parcelaEditando, setParcelaEditando] = useState(null);
    const [observacaoEditando, setObservacaoEditando] = useState(null);
    const [editandoDadosGerais, setEditandoDadosGerais] = useState(false);
    const [dadosGerais, setDadosGerais] = useState({
        descricao: pagamentoParcelado.descricao,
        fornecedor: pagamentoParcelado.fornecedor || '',
        pix: pagamentoParcelado.pix || '',
        orcamento_item_id: pagamentoParcelado.orcamento_item_id ? String(pagamentoParcelado.orcamento_item_id) : '',
        segmento: pagamentoParcelado.segmento || 'Material'
    });

    useEffect(() => {
        carregarParcelas();
    }, []);

    const carregarParcelas = async () => {
        try {
            setIsLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas`
            );

            if (!response.ok) throw new Error('Erro ao carregar parcelas');

            const data = await response.json();
            setParcelas(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditarParcela = async (parcela, novoValor, novaData, novaObs) => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        valor_parcela: parseFloat(novoValor),
                        data_vencimento: novaData,
                        observacao: novaObs || parcela.observacao
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao editar parcela');

            await carregarParcelas();
            setParcelaEditando(null);
            setObservacaoEditando(null);

            showToast('Parcela atualizada com sucesso!');

            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    const handleMarcarPaga = async (parcela) => {
        if (!await confirmDialog(`Confirma o pagamento da parcela ${parcela.numero_parcela}?`, { confirmText: 'Confirmar pagamento' })) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/pagar`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        data_pagamento: getTodayString()
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao marcar parcela como paga');

            const resultado = await response.json();
            showToast(resultado.mensagem);
            await carregarParcelas();

            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    const handleDesfazerPagamento = async (parcela) => {
        if (!await confirmDialog(`Deseja desfazer o pagamento da parcela ${parcela.numero_parcela}? O lançamento associado será removido.`, { danger: true, confirmText: 'Desfazer' })) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/desfazer`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.erro || 'Erro ao desfazer pagamento');
            }

            showToast('Pagamento desfeito com sucesso!');
            await carregarParcelas();

            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    const handleRecriarLancamentos = async () => {
        if (!await confirmDialog('Deseja recriar os lançamentos de todas as parcelas pagas? Isso é útil se os lançamentos não foram criados corretamente.', { confirmText: 'Recriar' })) {
            return;
        }

        try {
            const parcelasPagas = parcelas.filter(p => p.status === 'Pago');

            if (parcelasPagas.length === 0) {
                notify.warning('Não há parcelas pagas para reprocessar.');
                return;
            }

            let sucessos = 0;
            let erros = 0;

            for (const parcela of parcelasPagas) {
                try {
                    const response = await fetchWithAuth(
                        `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/pagar`,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                data_pagamento: parcela.data_pagamento || getTodayString()
                            })
                        }
                    );

                    if (response.ok) {
                        sucessos++;
                    } else {
                        erros++;
                    }
                } catch (error) {
                    erros++;
                }
            }

            showToast(`${sucessos} lançamentos recriados${erros > 0 ? `, ${erros} erros` : ''}`);

            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    const handleSalvarDadosGerais = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(dadosGerais)
                }
            );

            if (!response.ok) throw new Error('Erro ao salvar dados gerais');

            showToast('Dados atualizados com sucesso!');
            setEditandoDadosGerais(false);

            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    // Inline toast via DOM — candidate for notify.success in fase-6
    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'cf-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const calcularValorTotal = () => {
        return parcelas.reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const calcularValorPago = () => {
        return parcelas.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const calcularValorRestante = () => {
        return parcelas.filter(p => p.status !== 'Pago').reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    const getStatusParcela = (parcela) => {
        if (parcela.status === 'Pago') return 'paga';
        if (new Date(parcela.data_vencimento) < new Date()) return 'vencida';
        return 'pendente';
    };

    if (isLoading) return (
        <Modal isOpen={true} onClose={onClose} title="Parcelas" subtitle={pagamentoParcelado.descricao} width="xlarge">
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando parcelas...</div>
        </Modal>
    );
    if (error) return (
        <Modal isOpen={true} onClose={onClose} title="Parcelas" subtitle={pagamentoParcelado.descricao} width="xlarge">
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--status-danger)' }}>Erro: {error}</div>
        </Modal>
    );

    const parcelasPagas = parcelas.filter(p => p.status === 'Pago').length;
    const progresso = Math.round((parcelasPagas / parcelas.length) * 100);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Parcelas"
            subtitle={pagamentoParcelado.descricao}
            width="xlarge"
            scrollBody={true}
            footer={
                <>
                    <button
                        type="button"
                        className="m-btn-cancel"
                        onClick={handleRecriarLancamentos}
                        title="Recria os lançamentos de parcelas já pagas (útil para corrigir dados)"
                    >
                        Recriar Lançamentos
                    </button>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
                </>
            }
        >
            {/* Header */}
            <div style={{
                padding: '20px 24px',
                background: 'color-mix(in srgb, var(--module-obras) 12%, var(--surface-card))',
                borderBottom: '3px solid var(--module-obras)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <div style={{ flex: 1 }}>
                    {editandoDadosGerais ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="text"
                                value={dadosGerais.descricao}
                                onChange={(e) => setDadosGerais({...dadosGerais, descricao: e.target.value})}
                                style={{
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid var(--module-obras)',
                                    background: 'var(--surface-card)'
                                }}
                                placeholder="Descrição"
                            />
                            <input
                                type="text"
                                value={dadosGerais.fornecedor}
                                onChange={(e) => setDadosGerais({...dadosGerais, fornecedor: e.target.value})}
                                style={{
                                    fontSize: '14px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-default)',
                                    background: 'var(--surface-card)'
                                }}
                                placeholder="Fornecedor"
                            />
                            <input
                                type="text"
                                value={dadosGerais.pix}
                                onChange={(e) => setDadosGerais({...dadosGerais, pix: e.target.value})}
                                style={{
                                    fontSize: '14px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-default)',
                                    background: 'var(--surface-card)'
                                }}
                                placeholder="Chave PIX (CPF, CNPJ, E-mail, Telefone ou Aleatória)"
                            />
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select
                                    value={dadosGerais.orcamento_item_id || ''}
                                    onChange={(e) => setDadosGerais({...dadosGerais, orcamento_item_id: e.target.value || null})}
                                    style={{
                                        flex: 1,
                                        minWidth: '200px',
                                        fontSize: '14px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-default)',
                                        background: 'var(--surface-card)'
                                    }}
                                >
                                    <option value="">Sem vínculo (Despesa Geral)</option>
                                    {itensOrcamento.map(item => (
                                        <option key={item.id} value={String(item.id)}>{item.nome_completo}</option>
                                    ))}
                                </select>
                                <select
                                    value={dadosGerais.segmento || 'Material'}
                                    onChange={(e) => setDadosGerais({...dadosGerais, segmento: e.target.value})}
                                    style={{
                                        fontSize: '14px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-default)',
                                        background: 'var(--surface-card)'
                                    }}
                                >
                                    <option value="Material">Material</option>
                                    <option value="Mão de Obra">Mão de Obra</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleSalvarDadosGerais} className="cf-btn cf-btn-primary" style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--module-obras)' }}>
                                    <i className="ti ti-check" aria-hidden="true"></i> Salvar
                                </button>
                                <button onClick={() => setEditandoDadosGerais(false)} className="cf-btn cf-btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                    <i className="ti ti-x" aria-hidden="true"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <i className="ti ti-package" aria-hidden="true" style={{ color: 'var(--module-obras)' }}></i> {pagamentoParcelado.descricao}
                                <button
                                    onClick={() => setEditandoDadosGerais(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        color: 'var(--module-obras)'
                                    }}
                                    title="Editar dados gerais"
                                >
                                    <i className="ti ti-pencil" aria-hidden="true"></i>
                                </button>
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Fornecedor: {pagamentoParcelado.fornecedor || 'Não informado'} • {pagamentoParcelado.periodicidade || 'Mensal'}
                                {pagamentoParcelado.pix && (
                                    <span style={{ marginLeft: '8px' }}>
                                        • PIX: {pagamentoParcelado.pix}
                                    </span>
                                )}
                                {pagamentoParcelado.orcamento_item_id && (
                                    <span style={{
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        backgroundColor: 'color-mix(in srgb, var(--module-obras) 12%, var(--surface-card))',
                                        color: 'var(--module-obras)',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}>
                                        <i className="ti ti-package" aria-hidden="true"></i> {itensOrcamento.find(item => item.id === pagamentoParcelado.orcamento_item_id)?.nome_completo || pagamentoParcelado.orcamento_item_nome || 'Item vinculado'}
                                    </span>
                                )}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Resumo */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                padding: '20px 24px',
                background: 'var(--surface-subtle)',
                borderBottom: '1px solid var(--border-default)'
            }}>
                <div style={{ background: 'var(--surface-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Valor Total</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{formatCurrency(calcularValorTotal())}</div>
                </div>
                <div style={{ background: 'var(--surface-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Valor Pago</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--status-success)' }}>{formatCurrency(calcularValorPago())}</div>
                </div>
                <div style={{ background: 'var(--surface-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Restante</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--status-warning)' }}>{formatCurrency(calcularValorRestante())}</div>
                </div>
                <div style={{ background: 'var(--surface-card)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Parcelas</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{parcelasPagas} / {parcelas.length}</div>
                </div>
            </div>

            {/* Barra de Progresso */}
            <div style={{ padding: '16px 24px', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Progresso do pagamento</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--module-obras)' }}>{progresso}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-default)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${progresso}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--module-obras) 0%, var(--module-obras-dark) 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                    }} />
                </div>
            </div>

            {/* Lista de Parcelas */}
            <div style={{ padding: '20px 24px', maxHeight: '350px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Parcelas
                    <span style={{ fontSize: '11px', background: 'var(--surface-subtle)', padding: '2px 8px', borderRadius: '10px' }}>
                        Clique para editar
                    </span>
                </h4>

                {parcelas.map(parcela => {
                    const status = getStatusParcela(parcela);
                    const isEditando = parcelaEditando === parcela.id;

                    return (
                        <div
                            key={parcela.id}
                            className={`parcela-item ${status}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                background: status === 'paga' ? 'var(--status-success-bg)' :
                                           status === 'vencida' ? 'var(--status-danger-bg)' : 'var(--surface-subtle)',
                                borderRadius: '10px',
                                marginBottom: '10px',
                                border: `1px solid ${status === 'paga' ? 'var(--status-success)' :
                                                    status === 'vencida' ? 'var(--status-danger)' : 'var(--border-default)'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Número da Parcela */}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    fontSize: parcela.numero_parcela === 0 ? '10px' : '14px',
                                    background: status === 'paga' ? 'var(--status-success)' :
                                               parcela.numero_parcela === 0 ? 'var(--status-success)' : 'var(--surface-card)',
                                    color: status === 'paga' || parcela.numero_parcela === 0 ? 'var(--text-on-dark)' : 'var(--text-muted)',
                                    border: status !== 'paga' && parcela.numero_parcela !== 0 ? '2px solid var(--border-default)' : 'none'
                                }}>
                                    {status === 'paga' ? <i className="ti ti-check" aria-hidden="true"></i> : parcela.numero_parcela === 0 ? 'ENT' : (parcelas.some(p => p.numero_parcela === 0) ? parcela.numero_parcela + 1 : parcela.numero_parcela)}
                                </div>

                                {/* Dados */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {isEditando ? (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                defaultValue={parcela.valor_parcela}
                                                id={`valor-${parcela.id}`}
                                                className="parcela-edit-input"
                                                style={{ width: '110px' }}
                                                placeholder="Valor"
                                            />
                                            <input
                                                type="date"
                                                defaultValue={parcela.data_vencimento}
                                                id={`data-${parcela.id}`}
                                                className="parcela-edit-input"
                                                style={{ width: '140px' }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {formatCurrency(parcela.valor_parcela)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {status === 'paga' && parcela.data_pagamento
                                                    ? `Paga em ${new Date(parcela.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                    : `Vence ${new Date(parcela.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                }
                                                {parcela.observacao && ` • ${parcela.observacao}`}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Ações */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Badge de Status */}
                                <span
                                    className={`parcela-status-badge ${status}`}
                                    style={parcela.numero_parcela === 0 && status !== 'paga' ? { background: 'var(--status-success)', color: 'var(--text-on-dark)' } : {}}
                                >
                                    {status === 'paga' ? 'Paga' :
                                     status === 'vencida' ? 'Vencida' :
                                     parcela.numero_parcela === 0 ? 'Entrada' : 'Pendente'}
                                </span>

                                {isEditando ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                const novoValor = document.getElementById(`valor-${parcela.id}`).value;
                                                const novaData = document.getElementById(`data-${parcela.id}`).value;
                                                handleEditarParcela(parcela, novoValor, novaData);
                                            }}
                                            className="parcela-action-btn primary"
                                            style={{ background: 'var(--module-obras)', borderColor: 'var(--module-obras)' }}
                                        >
                                            <i className="ti ti-check" aria-hidden="true"></i> Salvar
                                        </button>
                                        <button
                                            onClick={() => setParcelaEditando(null)}
                                            className="parcela-action-btn"
                                        >
                                            <i className="ti ti-x" aria-hidden="true"></i>
                                        </button>
                                    </>
                                ) : status === 'paga' ? (
                                    <button
                                        onClick={() => handleDesfazerPagamento(parcela)}
                                        className="parcela-action-btn"
                                        title="Desfazer pagamento"
                                        style={{ color: 'var(--status-danger)' }}
                                    >
                                        <i className="ti ti-arrow-back-up" aria-hidden="true"></i> Desfazer
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setParcelaEditando(parcela.id)}
                                            className="parcela-action-btn"
                                            title="Editar valor e data"
                                        >
                                            <i className="ti ti-pencil" aria-hidden="true"></i>
                                        </button>
                                        <button
                                            onClick={() => handleMarcarPaga(parcela)}
                                            className="parcela-action-btn success"
                                            title="Marcar como paga"
                                        >
                                            <i className="ti ti-cash" aria-hidden="true"></i> Pagar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

export default React.memo(EditarParcelasModal);
