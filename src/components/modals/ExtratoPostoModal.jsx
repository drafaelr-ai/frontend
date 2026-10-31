import React, { useState, useEffect, useCallback, useContext } from 'react';
import Modal from '../Modal/Modal';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, dataBR, placaBR } from '../../screens/Frota/frotaFormat';

const litrosFmt = (v) => (v == null ? '' : `${Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
})} L`);

export default function ExtratoPostoModal({ isOpen, posto, onClose, onChanged }) {
    const { user } = useContext(AuthContext) || {};
    const ehMaster = user?.role === 'master';
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(false);
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');
    const postoId = posto?.posto_id ?? posto?.id;

    const carregar = useCallback(async () => {
        if (!isOpen || !postoId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (de) params.set('de', de);
            if (ate) params.set('ate', ate);
            const qs = params.toString() ? `?${params.toString()}` : '';
            setDados(await frotaApi.extratoPosto(postoId, qs));
        } catch (e) {
            logger.error('extrato do posto', e);
            notify.error(e.message || 'Erro ao carregar o extrato.');
        } finally {
            setLoading(false);
        }
    }, [isOpen, postoId, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);
    useEffect(() => { if (!isOpen) { setDados(null); setDe(''); setAte(''); } }, [isOpen]);

    const removerRecarga = async (mov) => {
        const ok = await confirmDialog(
            `Excluir a recarga de ${brl(mov.valor)}? O saldo do posto volta a subtrair esse valor.`,
            { danger: true, confirmText: 'Excluir recarga' },
        );
        if (!ok) return;
        try {
            await frotaApi.removerRecargaPosto(mov.id);
            notify.success('Recarga excluída.');
            carregar();
            onChanged?.();
        } catch (e) {
            logger.error('remover recarga', e);
            notify.error(e.message || 'Erro ao excluir a recarga.');
        }
    };

    const resumo = dados?.resumo;
    const movimentos = dados?.movimentos || [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            width="xlarge"
            scrollBody
            title={<>
                <i className="ti ti-receipt" style={{ marginRight: 8 }} />
                Extrato — {posto?.posto_nome || posto?.nome || 'posto'}
            </>}
            subtitle="Recargas e abastecimentos na mesma linha do tempo"
            footer={
                <button className="frota-btn frota-btn-text" onClick={onClose}>Fechar</button>
            }
        >
            {resumo && (
                <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-wallet" /> Recarregado</div>
                        <div className="frota-kpi-val">{brl(resumo.total_recarregado)}</div>
                    </div>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-gas-station" /> Consumido</div>
                        <div className="frota-kpi-val">{brl(resumo.total_consumido)}</div>
                    </div>
                    <div className={`frota-kpi${resumo.saldo < 0 ? ' alert' : ' accent'}`}>
                        <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Saldo atual</div>
                        <div className="frota-kpi-val">{brl(resumo.saldo)}</div>
                    </div>
                </div>
            )}

            <div className="frota-card-actions" style={{ marginBottom: 12 }}>
                <input className="frota-inp" type="date" style={{ maxWidth: 150 }}
                    value={de} onChange={e => setDe(e.target.value)} aria-label="De" title="De" />
                <input className="frota-inp" type="date" style={{ maxWidth: 150 }}
                    value={ate} onChange={e => setAte(e.target.value)} aria-label="Até" title="Até" />
            </div>

            {loading ? <div className="frota-loading">Carregando…</div> : (
                <div className="frota-table-wrap">
                    <table className="frota-table">
                        <thead>
                            <tr>
                                <th>Data</th><th>Movimento</th><th>Veículo</th>
                                <th className="frota-right">Valor</th>
                                <th className="frota-right">Saldo</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentos.length === 0 && (
                                <tr><td colSpan={6} className="frota-empty">
                                    Nenhum movimento no período.
                                </td></tr>
                            )}
                            {movimentos.map(m => (
                                <tr key={`${m.tipo}-${m.id}`}>
                                    <td className="frota-muted">{dataBR(m.data)}</td>
                                    <td>
                                        <span className={`frota-badge ${m.tipo === 'recarga'
                                            ? 'frota-b-success' : 'frota-b-neutral'}`}>
                                            <i className={`ti ${m.tipo === 'recarga'
                                                ? 'ti-wallet' : 'ti-gas-station'}`} />
                                            {m.tipo === 'recarga' ? 'Recarga' : 'Abastecimento'}
                                        </span>
                                        <div className="frota-cell-sub">{m.descricao}</div>
                                    </td>
                                    <td className="frota-muted">
                                        {m.veiculo_placa ? placaBR(m.veiculo_placa) : '—'}
                                        {m.litros != null && (
                                            <div className="frota-cell-sub">{litrosFmt(m.litros)}</div>
                                        )}
                                    </td>
                                    <td className="frota-valor frota-right">
                                        {m.valor < 0 ? `- ${brl(Math.abs(m.valor))}` : brl(m.valor)}
                                    </td>
                                    <td className="frota-muted frota-right">{brl(m.saldo_acumulado)}</td>
                                    <td>
                                        {ehMaster && m.tipo === 'recarga' && (
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Excluir recarga"
                                                onClick={() => removerRecarga(m)}>
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
            <div className="frota-hint">
                <i className="ti ti-info-circle" /> Os totais acima são do posto inteiro,
                não do período filtrado — é o número que fecha com o extrato do posto.
            </div>
        </Modal>
    );
}
