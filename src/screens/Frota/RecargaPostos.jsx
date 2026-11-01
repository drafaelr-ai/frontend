import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR } from './frotaFormat';
import RecargaPostoModal from '../../components/modals/RecargaPostoModal';
import ExtratoPostoModal from '../../components/modals/ExtratoPostoModal';
import PostoCombustivelModal from '../../components/modals/PostoCombustivelModal';

const litros = (v, casas = 2) =>
    (v == null ? '—' : `${Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: casas, maximumFractionDigits: casas,
    })} L`);

// Cada posto tem sua unidade: somar litro com real daria um número sem
// significado, então a formatação sempre segue a unidade do próprio posto.
const quantidade = (valor, unidade) =>
    (unidade === 'litros' ? litros(valor) : brl(valor));

export default function RecargaPostos() {
    const { user } = useContext(AuthContext) || {};
    const ehMaster = user?.role === 'master';
    const ehGestor = ehMaster || user?.role === 'administrador';
    const [saldos, setSaldos] = useState([]);
    const [resumo, setResumo] = useState(null);
    const [recargas, setRecargas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [modalRecarga, setModalRecarga] = useState(null);   // null | {} | posto
    const [extratoPosto, setExtratoPosto] = useState(null);
    const [modalPosto, setModalPosto] = useState(null);       // null | {} | posto
    // Edição do saldo direto na linha: o operador digita o que o posto diz que
    // ele tem e a API grava a diferença como ajuste.
    const [editando, setEditando] = useState(null);           // posto_id
    const [rascunho, setRascunho] = useState('');
    const [salvandoSaldo, setSalvandoSaldo] = useState(false);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        setErro(null);
        try {
            const [sRes, rRes] = await Promise.allSettled([
                frotaApi.saldosPostos(), frotaApi.recargasPostos(),
            ]);
            if (reqIdRef.current !== reqId) return;
            if (sRes.status === 'fulfilled') {
                setSaldos(Array.isArray(sRes.value?.postos) ? sRes.value.postos : []);
                setResumo(sRes.value?.resumo || null);
            }
            if (rRes.status === 'fulfilled') {
                setRecargas(Array.isArray(rRes.value) ? rRes.value : []);
            }
            // Falha tem de ficar distinta de "não há nada": a tabela afirmando
            // que não existe posto cadastrado quando a busca falhou é mentira —
            // e é o que se vê na janela em que o frontend já subiu e a API não.
            const falha = [sRes, rRes].find(r => r.status === 'rejected');
            if (falha) {
                const msg = falha.reason?.message || 'Erro ao carregar o saldo dos postos.';
                logger.error('Frota recarga de postos', falha.reason);
                setErro(msg);
                notify.error(msg);
            }
        } catch (e) {
            logger.error('Frota recarga de postos', e);
            setErro(e.message || 'Erro ao carregar o saldo dos postos.');
            notify.error(e.message || 'Erro ao carregar o saldo dos postos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    const abrirEdicao = (p) => {
        setEditando(p.posto_id);
        // Pré-preenche com o saldo atual: o caso comum é um ajuste pequeno.
        setRascunho(String(p.saldo).replace('.', ','));
    };

    const fecharEdicao = () => { setEditando(null); setRascunho(''); };

    const salvarSaldo = async (p) => {
        if (!rascunho.trim()) { fecharEdicao(); return; }
        setSalvandoSaldo(true);
        try {
            const r = await frotaApi.ajustarSaldoPosto(p.posto_id, { saldo: rascunho });
            notify.success(r.ajuste
                ? `Saldo de ${p.posto_nome} ajustado para ${quantidade(r.saldo, p.unidade)}.`
                : 'O saldo já era esse — nada a ajustar.');
            fecharEdicao();
            carregar();
        } catch (e) {
            logger.error('ajustar saldo do posto', e);
            notify.error(e.message || 'Erro ao ajustar o saldo.');
        } finally {
            setSalvandoSaldo(false);
        }
    };

    const removerRecarga = async (r) => {
        const un = r.unidade === 'litros' ? litros(r.litros) : brl(r.valor);
        const rotulo = r.tipo === 'ajuste' ? 'o ajuste de' : 'a recarga de';
        const ok = await confirmDialog(
            `Excluir ${rotulo} ${un} em ${r.posto_nome}? `
            + 'O saldo do posto volta a desconsiderar esse movimento.',
            { danger: true, confirmText: 'Excluir' },
        );
        if (!ok) return;
        try {
            await frotaApi.removerRecargaPosto(r.id);
            notify.success('Movimento excluído.');
            carregar();
        } catch (e) {
            logger.error('remover recarga', e);
            notify.error(e.message || 'Erro ao excluir o movimento.');
        }
    };

    const semLitros = saldos.reduce((s, p) => s + (p.abastecimentos_sem_litros || 0), 0);

    return (
        <>
            {resumo && (
                <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className={`frota-kpi${resumo.saldo < 0 ? ' alert' : ' accent'}`}>
                        <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Saldo em reais</div>
                        <div className="frota-kpi-val">{brlShort(resumo.saldo)}</div>
                    </div>
                    <div className={`frota-kpi${resumo.saldo_litros < 0 ? ' alert' : ''}`}>
                        <div className="frota-kpi-lbl"><i className="ti ti-droplet" /> Saldo em litros</div>
                        <div className="frota-kpi-val">
                            {resumo.postos_em_litros
                                ? litros(resumo.saldo_litros, 0)
                                : '—'}
                        </div>
                    </div>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-building-store" /> Postos</div>
                        <div className="frota-kpi-val">{saldos.length}</div>
                    </div>
                    <div className={`frota-kpi${resumo.postos_negativos ? ' alert' : ''}`}>
                        <div className="frota-kpi-lbl">
                            <i className="ti ti-alert-triangle" /> No negativo
                        </div>
                        <div className="frota-kpi-val">{resumo.postos_negativos}</div>
                    </div>
                </div>
            )}

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title">
                        <i className="ti ti-building-store" /> Saldo por posto
                    </div>
                    <div className="frota-card-actions">
                        {ehGestor && (
                            <>
                                <button className="frota-btn frota-btn-secondary frota-btn-sm"
                                    onClick={() => setModalPosto({})}>
                                    <i className="ti ti-plus" /> Novo posto
                                </button>
                                <button className="frota-btn frota-btn-primary frota-btn-sm"
                                    onClick={() => setModalRecarga({})}>
                                    <i className="ti ti-wallet" /> Nova recarga
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <div className="frota-table-wrap">
                        <table className="frota-table">
                            <thead>
                                <tr>
                                    <th>Posto</th>
                                    <th className="frota-right">Recarregado</th>
                                    <th className="frota-right">Consumido</th>
                                    <th className="frota-right">Saldo atual</th>
                                    <th>Última recarga</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {saldos.length === 0 && (
                                    <tr><td colSpan={6} className="frota-empty">
                                        {erro ? (
                                            <>
                                                Não foi possível carregar o saldo dos postos: {erro}
                                                <div style={{ marginTop: 10 }}>
                                                    <button className="frota-btn frota-btn-secondary frota-btn-sm"
                                                        onClick={carregar}>
                                                        <i className="ti ti-refresh" /> Tentar de novo
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                Nenhum posto cadastrado. Use "Novo posto" e depois
                                                informe o saldo que já existe na conta dele.
                                            </>
                                        )}
                                    </td></tr>
                                )}
                                {saldos.map(p => (
                                    <tr key={p.posto_id}>
                                        <td>
                                            <div className="frota-cell-main">{p.posto_nome}</div>
                                            <div className="frota-cell-sub">
                                                {p.unidade === 'litros' ? 'em litros' : 'em reais'}
                                                {' · '}{p.recargas} movimento(s)
                                                {' · '}{p.abastecimentos} abastecimento(s)
                                                {!!p.abastecimentos_sem_litros && (
                                                    <> · <span className="frota-badge frota-b-warning">
                                                        {p.abastecimentos_sem_litros} sem litros
                                                    </span></>
                                                )}
                                            </div>
                                        </td>
                                        <td className="frota-muted frota-right">
                                            {quantidade(p.total_recarregado, p.unidade)}
                                            {p.total_pago != null && (
                                                <div className="frota-cell-sub">
                                                    pago {brl(p.total_pago)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="frota-muted frota-right">
                                            {quantidade(p.total_consumido, p.unidade)}
                                            {p.litros_consumidos != null && (
                                                <div className="frota-cell-sub">
                                                    {litros(p.litros_consumidos, 0)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="frota-right">
                                            {editando === p.posto_id ? (
                                                <div style={{
                                                    display: 'flex', gap: 4,
                                                    justifyContent: 'flex-end', alignItems: 'center',
                                                }}>
                                                    <input
                                                        className="frota-inp"
                                                        style={{ maxWidth: 120, textAlign: 'right' }}
                                                        autoFocus
                                                        aria-label={`Saldo de ${p.posto_nome}`}
                                                        value={rascunho}
                                                        onChange={e => setRascunho(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') salvarSaldo(p);
                                                            if (e.key === 'Escape') fecharEdicao();
                                                        }}
                                                    />
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Salvar saldo" disabled={salvandoSaldo}
                                                        onClick={() => salvarSaldo(p)}>
                                                        <i className="ti ti-check" />
                                                    </button>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Cancelar" onClick={fecharEdicao}>
                                                        <i className="ti ti-x" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="frota-btn frota-btn-text frota-btn-sm"
                                                    title={ehGestor
                                                        ? 'Clique para informar o saldo do posto'
                                                        : undefined}
                                                    disabled={!ehGestor}
                                                    onClick={() => abrirEdicao(p)}
                                                >
                                                    <span className={`frota-badge ${p.saldo < 0
                                                        ? 'frota-b-danger'
                                                        : (p.saldo === 0 ? 'frota-b-neutral' : 'frota-b-success')}`}>
                                                        {quantidade(p.saldo, p.unidade)}
                                                    </span>
                                                    {ehGestor && (
                                                        <i className="ti ti-pencil" style={{ marginLeft: 4 }} />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="frota-muted">
                                            {p.ultima_recarga ? dataBR(p.ultima_recarga) : '—'}
                                        </td>
                                        <td>
                                            {ehGestor && (
                                                <>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Ver extrato do posto"
                                                        onClick={() => setExtratoPosto(p)}>
                                                        <i className="ti ti-receipt" />
                                                    </button>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Recarregar este posto"
                                                        onClick={() => setModalRecarga(p)}>
                                                        <i className="ti ti-wallet" />
                                                    </button>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Editar posto"
                                                        onClick={() => setModalPosto(p)}>
                                                        <i className="ti ti-edit" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="frota-hint">
                    <i className="ti ti-info-circle" /> Clique no saldo para informar quanto
                    o posto diz que você tem — o sistema grava a diferença como ajuste, sem
                    apagar o histórico, e o saldo continua caindo sozinho a cada
                    abastecimento lançado naquele posto.
                </div>
                {!!semLitros && (
                    <div className="frota-callout frota-callout-warning">
                        <i className="ti ti-alert-triangle" />
                        <span>
                            {semLitros} abastecimento(s) em posto de litros estão sem os litros
                            informados, então não puderam ser descontados do saldo. Edite esses
                            lançamentos na aba Abastecimentos para o saldo ficar fiel.
                        </span>
                    </div>
                )}
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title">
                        <i className="ti ti-history" /> Últimos movimentos
                    </div>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <div className="frota-table-wrap">
                        <table className="frota-table">
                            <thead>
                                <tr>
                                    <th>Data</th><th>Posto</th><th>Tipo</th>
                                    <th>Observação</th><th>Lançado por</th>
                                    <th className="frota-right">Quantidade</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recargas.length === 0 && (
                                    <tr><td colSpan={7} className="frota-empty">
                                        {erro ? 'Não foi possível carregar os movimentos.'
                                            : 'Nenhum movimento lançado.'}
                                    </td></tr>
                                )}
                                {recargas.map(r => (
                                    <tr key={r.id}>
                                        <td className="frota-muted">{dataBR(r.data)}</td>
                                        <td className="frota-cell-main">{r.posto_nome || '—'}</td>
                                        <td>
                                            <span className={`frota-badge ${r.tipo === 'ajuste'
                                                ? 'frota-b-info' : 'frota-b-success'}`}>
                                                <i className={`ti ${r.tipo === 'ajuste'
                                                    ? 'ti-equal' : 'ti-wallet'}`} />
                                                {r.tipo === 'ajuste' ? 'Ajuste' : 'Recarga'}
                                            </span>
                                        </td>
                                        <td className="frota-muted">{r.observacao || '—'}</td>
                                        <td className="frota-muted">{r.criado_por_nome || '—'}</td>
                                        <td className="frota-valor frota-right">
                                            {quantidade(r.quantidade, r.unidade)}
                                            {r.unidade === 'litros' && r.valor != null && (
                                                <div className="frota-cell-sub">
                                                    pago {brl(r.valor)}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {ehMaster && (
                                                <button className="frota-btn frota-btn-text frota-btn-sm"
                                                    title="Excluir movimento"
                                                    onClick={() => removerRecarga(r)}>
                                                    <i className="ti ti-trash" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RecargaPostoModal
                isOpen={!!modalRecarga}
                postoFixo={modalRecarga?.posto_id ? modalRecarga : null}
                saldos={saldos}
                onClose={() => setModalRecarga(null)}
                onSaved={() => { setModalRecarga(null); carregar(); }}
            />
            <ExtratoPostoModal
                isOpen={!!extratoPosto}
                posto={extratoPosto}
                onClose={() => setExtratoPosto(null)}
                onChanged={carregar}
            />
            <PostoCombustivelModal
                isOpen={!!modalPosto}
                posto={modalPosto?.posto_id ? modalPosto : null}
                onClose={() => setModalPosto(null)}
                onSaved={() => { setModalPosto(null); carregar(); }}
            />
        </>
    );
}
