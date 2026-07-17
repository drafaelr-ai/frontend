import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';
import { brl, dataBR, dataHoraBR, statusBadge } from './solicitacoesFormat';
import CotacaoSolicitacaoModal from '../../components/modals/CotacaoSolicitacaoModal';

const ABERTOS = ['Aberta', 'Em cotação', 'Aguardando aprovação'];

export default function SolicitacaoDetalhe({ solicitacaoId, user, onVoltar }) {
    const [s, setS] = useState(null);            // null = carregando
    const [modalCotacao, setModalCotacao] = useState(false);
    const [cotSelecionada, setCotSelecionada] = useState(null);
    const [rejeitando, setRejeitando] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [agindo, setAgindo] = useState(false);

    const carregar = useCallback(async () => {
        try {
            const data = await solicitacoesApi.detalhe(solicitacaoId);
            setS(data);
        } catch (e) {
            logger.error('detalhe solicitação', e);
            notify.error(e.message || 'Erro ao carregar solicitação.');
            onVoltar?.();
        }
    }, [solicitacaoId, onVoltar]);

    useEffect(() => { carregar(); }, [carregar]);

    if (s == null) return <div className="solc-loading">Carregando…</div>;

    const b = statusBadge(s.status);
    const emAberto = ABERTOS.includes(s.status);
    const decidivel = ['Em cotação', 'Aguardando aprovação'].includes(s.status);
    const linkPublico = `${window.location.origin}/solicitacao/${s.token_publico}`;

    // Efetivação direta: dentro do limite qualquer usuário do módulo pode
    // concluir a compra; acima do limite (ou sem limite) só aprovador/master.
    // O backend revalida — isso aqui é só pra UI mostrar o botão certo.
    const podeDecidirCotacao = (cot) =>
        s.pode_aprovar || (s.limite_valor != null && cot.valor_total <= s.limite_valor);

    const compartilharWhatsApp = () => {
        const texto = `Solicitação de compra #${s.id} — ${s.obra_nome}\n${linkPublico}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    };

    const copiarLink = () => {
        navigator.clipboard.writeText(linkPublico)
            .then(() => notify.success('Link copiado.'))
            .catch(() => notify.error('Não foi possível copiar o link.'));
    };

    const enviarAprovacao = async () => {
        setAgindo(true);
        try {
            await solicitacoesApi.enviarAprovacao(s.id);
            notify.success('Enviada para aprovação — os aprovadores foram avisados.');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao enviar para aprovação.');
        } finally { setAgindo(false); }
    };

    const aprovar = async () => {
        const cot = (s.cotacoes || []).find(c => c.id === cotSelecionada);
        if (!cot) { notify.warning('Selecione a cotação vencedora.'); return; }
        const ok = await confirmDialog(
            `Aprovar a compra com ${cot.fornecedor} por ${brl(cot.valor_total)}? ` +
            'A despesa será lançada como conta a pagar no financeiro da obra.',
            { title: 'Aprovar compra', confirmText: 'Aprovar' },
        );
        if (!ok) return;
        setAgindo(true);
        try {
            await solicitacoesApi.aprovar(s.id, cot.id);
            notify.success('Compra aprovada e lançada no financeiro da obra.');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao aprovar.');
        } finally { setAgindo(false); }
    };

    const rejeitar = async () => {
        if (!motivo.trim()) { notify.warning('Informe o motivo da rejeição.'); return; }
        setAgindo(true);
        try {
            await solicitacoesApi.rejeitar(s.id, motivo.trim());
            notify.success('Solicitação rejeitada.');
            setRejeitando(false);
            setMotivo('');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao rejeitar.');
        } finally { setAgindo(false); }
    };

    const cancelar = async () => {
        const ok = await confirmDialog('Cancelar esta solicitação?', { danger: true, confirmText: 'Cancelar solicitação' });
        if (!ok) return;
        setAgindo(true);
        try {
            await solicitacoesApi.cancelar(s.id);
            notify.success('Solicitação cancelada.');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao cancelar.');
        } finally { setAgindo(false); }
    };

    const removerCotacao = async (cot) => {
        const ok = await confirmDialog(`Remover a cotação de ${cot.fornecedor}?`, { danger: true });
        if (!ok) return;
        try {
            await solicitacoesApi.removerCotacao(s.id, cot.id);
            notify.success('Cotação removida.');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao remover cotação.');
        }
    };

    const abrirAnexo = async (cot) => {
        try {
            const { url } = await solicitacoesApi.arquivoCotacao(s.id, cot.id);
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            notify.error(e.message || 'Erro ao abrir o anexo.');
        }
    };

    return (
        <>
            <div className="solc-card">
                <div className="solc-detail-head">
                    <div>
                        <div className="solc-card-title" style={{ fontSize: 'var(--text-xl)' }}>
                            Solicitação #{s.id}
                            <span className={`solc-badge ${b.cls}`}><i className={`ti ${b.icon}`} /> {b.label}</span>
                        </div>
                        <div className="solc-detail-meta">
                            <span>Obra: <b>{s.obra_nome}</b></span>
                            <span>Tipo: <b>{s.tipo}</b></span>
                            <span>Solicitante: <b>{s.solicitante_nome}</b></span>
                            <span>Solicitada em: <b>{dataHoraBR(s.data_criacao)}</b></span>
                            <span>Necessidade: <b>{dataBR(s.data_necessidade)}</b></span>
                            {s.aprovador_nome && <span>Decisão: <b>{s.aprovador_nome}</b> em <b>{dataHoraBR(s.data_decisao)}</b></span>}
                        </div>
                        {s.observacao && <div className="solc-hint"><i className="ti ti-note" /> {s.observacao}</div>}
                        {s.status === 'Rejeitada' && s.motivo_rejeicao && (
                            <div className="solc-motivo"><i className="ti ti-x" /> Motivo: {s.motivo_rejeicao}</div>
                        )}
                        {s.status === 'Aprovada' && s.pagamento_futuro_id && (
                            <div className="solc-hint">
                                <i className="ti ti-cash" /> Lançada no financeiro da obra como conta a pagar (#{s.pagamento_futuro_id}).
                            </div>
                        )}
                    </div>
                    <div className="solc-card-actions">
                        <button className="solc-btn solc-btn-text" onClick={onVoltar}>
                            <i className="ti ti-arrow-left" /> Voltar à lista
                        </button>
                        <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={copiarLink}>
                            <i className="ti ti-link" /> Copiar link
                        </button>
                        <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={compartilharWhatsApp}>
                            <i className="ti ti-brand-whatsapp" /> WhatsApp
                        </button>
                        {s.pode_cancelar && (
                            <button className="solc-btn solc-btn-danger solc-btn-sm" onClick={cancelar} disabled={agindo}>
                                <i className="ti ti-ban" /> Cancelar
                            </button>
                        )}
                    </div>
                </div>

                <table className="solc-table">
                    <thead>
                        <tr><th>Item</th><th>Quantidade</th><th>Unidade</th><th>Observação</th></tr>
                    </thead>
                    <tbody>
                        {(s.itens || []).map(i => (
                            <tr key={i.id}>
                                <td className="solc-cell-main">{i.descricao}</td>
                                <td>{i.quantidade}</td>
                                <td>{i.unidade || '—'}</td>
                                <td className="solc-cell-sub solc-right">{i.observacao || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="solc-card">
                <div className="solc-card-head">
                    <div className="solc-card-title">
                        <i className="ti ti-report-money" /> Pesquisa de preços
                        <span className="solc-tab-cnt">{(s.cotacoes || []).length}</span>
                    </div>
                    <div className="solc-card-actions">
                        {emAberto && (
                            <button className="solc-btn solc-btn-primary solc-btn-sm" onClick={() => setModalCotacao(true)}>
                                <i className="ti ti-plus" /> Adicionar cotação
                            </button>
                        )}
                    </div>
                </div>

                {(s.cotacoes || []).length === 0 ? (
                    <div className="solc-empty">Nenhuma cotação registrada ainda.</div>
                ) : (
                    (s.cotacoes || []).map(cot => {
                        const vencedora = s.cotacao_aprovada_id === cot.id;
                        const selecionavel = decidivel && podeDecidirCotacao(cot);
                        return (
                            <div
                                key={cot.id}
                                className={`solc-cot${vencedora ? ' vencedora' : ''}${selecionavel ? ' escolhivel' : ''}${cotSelecionada === cot.id ? ' selecionada' : ''}`}
                                onClick={selecionavel ? () => setCotSelecionada(cot.id) : undefined}
                            >
                                {selecionavel && (
                                    <input
                                        type="radio" name="cotacao" checked={cotSelecionada === cot.id}
                                        onChange={() => setCotSelecionada(cot.id)}
                                        style={{ marginTop: 4, accentColor: 'var(--solc-accent)' }}
                                    />
                                )}
                                <div className="solc-cot-body">
                                    <div className="solc-cot-forn">
                                        {cot.fornecedor}
                                        {vencedora && <span className="solc-badge solc-b-success"><i className="ti ti-trophy" /> Escolhida</span>}
                                    </div>
                                    <div className="solc-cot-meta">
                                        {cot.condicao_pagamento && <span><i className="ti ti-credit-card" /> {cot.condicao_pagamento}</span>}
                                        {cot.prazo_entrega && <span><i className="ti ti-truck-delivery" /> {cot.prazo_entrega}</span>}
                                        <span><i className="ti ti-user" /> {cot.criado_por_nome || '—'}</span>
                                        {cot.observacao && <span><i className="ti ti-note" /> {cot.observacao}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    {cot.tem_arquivo && (
                                        <button
                                            className="solc-btn solc-btn-text solc-btn-sm" title="Abrir anexo"
                                            onClick={(e) => { e.stopPropagation(); abrirAnexo(cot); }}
                                        >
                                            <i className="ti ti-paperclip" />
                                        </button>
                                    )}
                                    {emAberto && (user?.role === 'master' || cot.criado_por_id === user?.id) && (
                                        <button
                                            className="solc-btn solc-btn-text solc-btn-sm" title="Remover cotação"
                                            onClick={(e) => { e.stopPropagation(); removerCotacao(cot); }}
                                        >
                                            <i className="ti ti-trash" />
                                        </button>
                                    )}
                                    <span className="solc-cot-valor">{brl(cot.valor_total)}</span>
                                </div>
                            </div>
                        );
                    })
                )}

                {decidivel && (s.cotacoes || []).length > 0 && (
                    <div className="solc-card-actions" style={{ marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
                        {s.status === 'Em cotação' && (
                            <button className="solc-btn solc-btn-secondary" onClick={enviarAprovacao} disabled={agindo}>
                                <i className="ti ti-send" /> Enviar para aprovação
                            </button>
                        )}
                        {s.pode_aprovar && !rejeitando && (
                            <button className="solc-btn solc-btn-danger" onClick={() => setRejeitando(true)} disabled={agindo}>
                                <i className="ti ti-x" /> Rejeitar
                            </button>
                        )}
                        <button
                            className="solc-btn solc-btn-primary"
                            onClick={aprovar}
                            disabled={agindo || !cotSelecionada}
                            title={!cotSelecionada ? 'Selecione uma cotação' : undefined}
                        >
                            <i className="ti ti-check" /> {s.pode_aprovar ? 'Aprovar compra' : 'Efetivar compra'}
                        </button>
                    </div>
                )}

                {!s.pode_aprovar && decidivel && s.limite_valor != null && (
                    <div className="solc-hint">
                        <i className="ti ti-info-circle" />
                        Compras até {brl(s.limite_valor)} podem ser efetivadas direto; acima disso é preciso um aprovador.
                    </div>
                )}

                {rejeitando && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                        <div className="solc-field">
                            <label>Motivo da rejeição</label>
                            <textarea
                                className="solc-inp" rows={2} value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                placeholder="Ex.: Sem orçamento este mês / repetir cotação com outro fornecedor"
                            />
                        </div>
                        <div className="solc-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <button className="solc-btn solc-btn-text" onClick={() => { setRejeitando(false); setMotivo(''); }}>
                                Voltar
                            </button>
                            <button className="solc-btn solc-btn-danger" onClick={rejeitar} disabled={agindo}>
                                <i className="ti ti-x" /> Confirmar rejeição
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CotacaoSolicitacaoModal
                isOpen={modalCotacao}
                solicitacao={s}
                onClose={() => setModalCotacao(false)}
                onSaved={() => { setModalCotacao(false); carregar(); }}
            />
        </>
    );
}
