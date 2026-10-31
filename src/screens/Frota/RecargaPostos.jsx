import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR } from './frotaFormat';
import RecargaPostoModal from '../../components/modals/RecargaPostoModal';
import ExtratoPostoModal from '../../components/modals/ExtratoPostoModal';

export default function RecargaPostos() {
    const { user } = useContext(AuthContext) || {};
    const ehMaster = user?.role === 'master';
    const ehGestor = ehMaster || user?.role === 'administrador';
    const [saldos, setSaldos] = useState([]);
    const [resumo, setResumo] = useState(null);
    const [recargas, setRecargas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalRecarga, setModalRecarga] = useState(null);   // null | {} | posto
    const [extratoPosto, setExtratoPosto] = useState(null);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
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
            if ([sRes, rRes].some(r => r.status === 'rejected')) {
                notify.error('Erro ao carregar o saldo dos postos.');
            }
        } catch (e) {
            logger.error('Frota recarga de postos', e);
            notify.error('Erro ao carregar o saldo dos postos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    const removerRecarga = async (r) => {
        const ok = await confirmDialog(
            `Excluir a recarga de ${brl(r.valor)} em ${r.posto_nome}? `
            + 'O saldo do posto volta a subtrair esse valor.',
            { danger: true, confirmText: 'Excluir recarga' },
        );
        if (!ok) return;
        try {
            await frotaApi.removerRecargaPosto(r.id);
            notify.success('Recarga excluída.');
            carregar();
        } catch (e) {
            logger.error('remover recarga', e);
            notify.error(e.message || 'Erro ao excluir a recarga.');
        }
    };

    return (
        <>
            {resumo && (
                <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className={`frota-kpi${resumo.saldo < 0 ? ' alert' : ' accent'}`}>
                        <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Saldo total</div>
                        <div className="frota-kpi-val">{brlShort(resumo.saldo)}</div>
                    </div>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-wallet" /> Já recarregado</div>
                        <div className="frota-kpi-val">{brlShort(resumo.total_recarregado)}</div>
                    </div>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-gas-station" /> Já consumido</div>
                        <div className="frota-kpi-val">{brlShort(resumo.total_consumido)}</div>
                    </div>
                    <div className={`frota-kpi${resumo.postos_negativos ? ' alert' : ''}`}>
                        <div className="frota-kpi-lbl">
                            <i className="ti ti-alert-triangle" /> Postos no negativo
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
                            <button className="frota-btn frota-btn-primary frota-btn-sm"
                                onClick={() => setModalRecarga({})}>
                                <i className="ti ti-plus" /> Nova recarga
                            </button>
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
                                    <th className="frota-right">Saldo</th>
                                    <th>Última recarga</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {saldos.length === 0 && (
                                    <tr><td colSpan={6} className="frota-empty">
                                        Nenhum posto cadastrado. Use "Nova recarga" para cadastrar
                                        o posto e lançar o saldo que já existe na conta dele.
                                    </td></tr>
                                )}
                                {saldos.map(p => (
                                    <tr key={p.posto_id}>
                                        <td>
                                            <div className="frota-cell-main">{p.posto_nome}</div>
                                            <div className="frota-cell-sub">
                                                {p.recargas} recarga(s) · {p.abastecimentos} abastecimento(s)
                                            </div>
                                        </td>
                                        <td className="frota-muted frota-right">
                                            {brl(p.total_recarregado)}
                                        </td>
                                        <td className="frota-muted frota-right">
                                            {brl(p.total_consumido)}
                                        </td>
                                        <td className="frota-right">
                                            <span className={`frota-badge ${p.saldo < 0
                                                ? 'frota-b-danger'
                                                : (p.saldo === 0 ? 'frota-b-neutral' : 'frota-b-success')}`}>
                                                {brl(p.saldo)}
                                            </span>
                                        </td>
                                        <td className="frota-muted">
                                            {p.ultima_recarga ? dataBR(p.ultima_recarga) : '—'}
                                        </td>
                                        <td>
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Ver extrato do posto"
                                                onClick={() => setExtratoPosto(p)}>
                                                <i className="ti ti-receipt" />
                                            </button>
                                            {ehGestor && (
                                                <button className="frota-btn frota-btn-text frota-btn-sm"
                                                    title="Recarregar este posto"
                                                    onClick={() => setModalRecarga(p)}>
                                                    <i className="ti ti-wallet" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="frota-hint">
                    <i className="ti ti-info-circle" /> O saldo é calculado na hora: recargas
                    lançadas aqui menos os abastecimentos registrados naquele posto — inclusive
                    os que chegam pelo link do motorista.
                </div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title">
                        <i className="ti ti-history" /> Últimas recargas
                    </div>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <div className="frota-table-wrap">
                        <table className="frota-table">
                            <thead>
                                <tr>
                                    <th>Data</th><th>Posto</th><th>Observação</th>
                                    <th>Lançado por</th>
                                    <th className="frota-right">Valor</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recargas.length === 0 && (
                                    <tr><td colSpan={6} className="frota-empty">
                                        Nenhuma recarga lançada.
                                    </td></tr>
                                )}
                                {recargas.map(r => (
                                    <tr key={r.id}>
                                        <td className="frota-muted">{dataBR(r.data)}</td>
                                        <td className="frota-cell-main">{r.posto_nome || '—'}</td>
                                        <td className="frota-muted">{r.observacao || '—'}</td>
                                        <td className="frota-muted">{r.criado_por_nome || '—'}</td>
                                        <td className="frota-valor frota-right">{brl(r.valor)}</td>
                                        <td>
                                            {ehMaster && (
                                                <button className="frota-btn frota-btn-text frota-btn-sm"
                                                    title="Excluir recarga"
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
        </>
    );
}
