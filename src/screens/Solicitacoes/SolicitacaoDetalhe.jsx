import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';
import { brl, dataBR, dataHoraBR, statusBadge, textoDiasSolicitado } from './solicitacoesFormat';
import { getTodayString } from '../../utils/format';
import CotacaoSolicitacaoModal from '../../components/modals/CotacaoSolicitacaoModal';
import NovaSolicitacaoModal from '../../components/modals/NovaSolicitacaoModal';
import ComentariosSolicitacao from './ComentariosSolicitacao';

const ABERTOS = ['Aberta', 'Em cotação', 'Aguardando aprovação'];

export default function SolicitacaoDetalhe({ solicitacaoId, user, obras, onVoltar, voltarLabel = 'Voltar à lista', iniciarAtendimento = false }) {
    const [s, setS] = useState(null);            // null = carregando
    const [modalCotacao, setModalCotacao] = useState(false);
    const [modalEdicao, setModalEdicao] = useState(false);
    const [cotSelecionada, setCotSelecionada] = useState(null);
    const [rejeitando, setRejeitando] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [atendendo, setAtendendo] = useState(iniciarAtendimento);
    const [dataAtendimento, setDataAtendimento] = useState(getTodayString());
    const [obsAtendimento, setObsAtendimento] = useState('');
    const [agindo, setAgindo] = useState(false);
    const [exportando, setExportando] = useState(null);

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

    const atender = async () => {
        if (!dataAtendimento) {
            notify.warning('Informe a data em que a compra foi atendida.');
            return;
        }
        setAgindo(true);
        try {
            await solicitacoesApi.atender(s.id, {
                data_atendimento: dataAtendimento,
                observacao: obsAtendimento.trim(),
            });
            notify.success('Compra atendida — movida para o histórico de compras.');
            setAtendendo(false);
            setObsAtendimento('');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao marcar a compra como atendida.');
        } finally { setAgindo(false); }
    };

    const reabrir = async () => {
        const ok = await confirmDialog(
            'Reabrir esta compra? Ela volta do histórico para a lista de compras.',
            { title: 'Reabrir compra', confirmText: 'Reabrir' },
        );
        if (!ok) return;
        setAgindo(true);
        try {
            await solicitacoesApi.reabrir(s.id);
            notify.success('Compra reaberta — de volta à lista de compras.');
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao reabrir a compra.');
        } finally { setAgindo(false); }
    };

    const devolver = async () => {
        const ok = await confirmDialog(
            'Desfazer a aprovação? A compra volta para "Em cotação" — o comprador pode '
            + 'ajustar as cotações — e a conta a pagar prevista é removida do financeiro.',
            { title: 'Devolver para cotação', confirmText: 'Devolver' },
        );
        if (!ok) return;
        setAgindo(true);
        try {
            await solicitacoesApi.devolver(s.id);
            notify.success('Aprovação desfeita — a compra voltou para cotação.');
            setCotSelecionada(null);
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao devolver a compra para cotação.');
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

    const abrirAnexoSolicitacao = async () => {
        try {
            const { url } = await solicitacoesApi.arquivoSolicitacao(s.id);
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            notify.error(e.message || 'Erro ao abrir o anexo.');
        }
    };

    const exportarPedido = async (formato) => {
        setExportando(formato);
        try {
            const { blob, nome } = await solicitacoesApi.exportar(s.id, formato);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nome;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            notify.success(`Pedido exportado em ${formato.toUpperCase()}.`);
        } catch (e) {
            logger.error(`exportar solicitação em ${formato}`, e);
            notify.error(e.message || 'Não foi possível exportar a solicitação.');
        } finally {
            setExportando(null);
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
                        {['Aprovada', 'Atendida'].includes(s.status) && s.pagamento_futuro_id && (
                            <div className="solc-hint">
                                <i className="ti ti-cash" /> Lançada no financeiro da obra como conta a pagar (#{s.pagamento_futuro_id}).
                            </div>
                        )}
                        {s.status === 'Atendida' && (
                            <div className="solc-atendida">
                                <i className="ti ti-package" /> Compra atendida por <b>{s.atendida_por_nome || '—'}</b> em <b>{dataHoraBR(s.data_atendimento)}</b>
                                {' '}(<b>{textoDiasSolicitado(s.data_criacao, s.data_atendimento)}</b> após a solicitação)
                                {s.observacao_atendimento && <> — {s.observacao_atendimento}</>}
                            </div>
                        )}
                    </div>
                    <div className="solc-card-actions">
                        <button className="solc-btn solc-btn-text" onClick={onVoltar}>
                            <i className="ti ti-arrow-left" /> {voltarLabel}
                        </button>
                        {s.pode_editar && (
                            <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={() => setModalEdicao(true)} disabled={agindo}>
                                <i className="ti ti-edit" /> Editar
                            </button>
                        )}
                        {s.pode_atender && !atendendo && (
                            <button className="solc-btn solc-btn-primary solc-btn-sm" onClick={() => { setDataAtendimento(getTodayString()); setAtendendo(true); }} disabled={agindo}>
                                <i className="ti ti-package" /> Marcar como atendida
                            </button>
                        )}
                        {s.pode_reabrir && (
                            <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={reabrir} disabled={agindo}>
                                <i className="ti ti-arrow-back-up" /> Reabrir compra
                            </button>
                        )}
                        {s.pode_desaprovar && (
                            <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={devolver} disabled={agindo}>
                                <i className="ti ti-rotate-2" /> Devolver p/ cotação
                            </button>
                        )}
                        {s.tem_arquivo && (
                            <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={abrirAnexoSolicitacao}>
                                <i className="ti ti-paperclip" /> Anexo
                            </button>
                        )}
                        <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={() => exportarPedido('xlsx')} disabled={Boolean(exportando)}>
                            <i className="ti ti-file-spreadsheet" /> {exportando === 'xlsx' ? 'Gerando…' : 'Excel'}
                        </button>
                        <button className="solc-btn solc-btn-secondary solc-btn-sm" onClick={() => exportarPedido('pdf')} disabled={Boolean(exportando)}>
                            <i className="ti ti-file-type-pdf" /> {exportando === 'pdf' ? 'Gerando…' : 'PDF'}
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

                {atendendo && (
                    <div className="solc-atender-form">
                        <div className="solc-field">
                            <label htmlFor={`solc-data-atendimento-${s.id}`}>Data em que foi atendida *</label>
                            <input
                                id={`solc-data-atendimento-${s.id}`}
                                className="solc-inp"
                                type="date"
                                value={dataAtendimento}
                                max={getTodayString()}
                                onChange={e => setDataAtendimento(e.target.value)}
                                required
                            />
                            <div className="solc-hint">
                                <i className="ti ti-clock" />
                                Tempo da solicitação até essa data: <b>{textoDiasSolicitado(s.data_criacao, dataAtendimento)}</b>
                            </div>
                        </div>
                        <div className="solc-field">
                            <label>Observação do atendimento (opcional)</label>
                            <input
                                className="solc-inp" value={obsAtendimento} maxLength={300}
                                onChange={e => setObsAtendimento(e.target.value)}
                                placeholder="Ex.: NF 4521 — material entregue no canteiro"
                            />
                        </div>
                        <div className="solc-hint">
                            <i className="ti ti-info-circle" />
                            A compra sai da lista e vai para o histórico. A conta a pagar no financeiro não é alterada.
                        </div>
                        <div className="solc-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <button className="solc-btn solc-btn-text" onClick={() => { setAtendendo(false); setDataAtendimento(getTodayString()); setObsAtendimento(''); }}>
                                Voltar
                            </button>
                            <button className="solc-btn solc-btn-primary" onClick={atender} disabled={agindo}>
                                <i className="ti ti-package" /> Confirmar atendimento
                            </button>
                        </div>
                    </div>
                )}

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

            <ComentariosSolicitacao solicitacaoId={s.id} user={user} />

            <CotacaoSolicitacaoModal
                isOpen={modalCotacao}
                solicitacao={s}
                onClose={() => setModalCotacao(false)}
                onSaved={() => { setModalCotacao(false); carregar(); }}
            />
            <NovaSolicitacaoModal
                isOpen={modalEdicao}
                obras={obras}
                solicitacao={s}
                onClose={() => setModalEdicao(false)}
                onSaved={() => { setModalEdicao(false); carregar(); }}
            />
        </>
    );
}
