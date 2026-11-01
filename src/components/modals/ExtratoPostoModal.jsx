import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Modal from '../Modal/Modal';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, dataBR, placaBR } from '../../screens/Frota/frotaFormat';

const litrosFmt = (v) => (v == null ? '' : `${Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
})} L`);

// Cada posto tem sua unidade: em posto de litros o extrato anda em litros e o
// valor pago fica como informação ao lado.
const quantidade = (valor, unidade) =>
    (unidade === 'litros' ? litrosFmt(valor) : brl(valor));

export default function ExtratoPostoModal({ isOpen, posto, onClose, onChanged }) {
    const { user } = useContext(AuthContext) || {};
    const ehMaster = user?.role === 'master';
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState(null);
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');
    // Mexer rápido nas datas dispara várias buscas: sem este contador a
    // resposta que chega atrasada sobrescreve a mais nova, e a tela mostra o
    // movimento de outro período (ou de outro posto) sob o nome certo.
    const reqIdRef = useRef(0);
    const postoId = posto?.posto_id ?? posto?.id;

    const carregar = useCallback(async () => {
        if (!isOpen || !postoId) return;
        const reqId = ++reqIdRef.current;
        setLoading(true);
        setErro(null);
        try {
            const params = new URLSearchParams();
            if (de) params.set('de', de);
            if (ate) params.set('ate', ate);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const resposta = await frotaApi.extratoPosto(postoId, qs);
            if (reqIdRef.current !== reqId) return;
            setDados(resposta);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('extrato do posto', e);
            setErro(e.message || 'Erro ao carregar o extrato.');
            notify.error(e.message || 'Erro ao carregar o extrato.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [isOpen, postoId, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);
    useEffect(() => {
        if (isOpen) return;
        // Invalida o que estiver em voo: o modal pode reabrir em outro posto
        // antes de a resposta anterior chegar.
        reqIdRef.current += 1;
        setDados(null);
        setErro(null);
        setDe('');
        setAte('');
    }, [isOpen]);

    const removerRecarga = async (mov) => {
        const rotulo = mov.tipo === 'ajuste' ? 'o ajuste de' : 'a recarga de';
        const ok = await confirmDialog(
            `Excluir ${rotulo} ${fmt(Math.abs(mov.valor))}? `
            + 'O saldo do posto volta a desconsiderar esse movimento.',
            { danger: true, confirmText: 'Excluir' },
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
    const saldoInicial = dados?.saldo_inicial;
    const unidade = dados?.unidade || posto?.unidade || 'reais';
    const fmt = (v) => quantidade(v, unidade);

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
                        <div className="frota-kpi-val">{fmt(resumo.total_recarregado)}</div>
                        {resumo.total_pago != null && (
                            <div className="frota-cell-sub">pago {brl(resumo.total_pago)}</div>
                        )}
                    </div>
                    <div className="frota-kpi">
                        <div className="frota-kpi-lbl"><i className="ti ti-gas-station" /> Consumido</div>
                        <div className="frota-kpi-val">{fmt(resumo.total_consumido)}</div>
                    </div>
                    <div className={`frota-kpi${resumo.saldo < 0 ? ' alert' : ' accent'}`}>
                        <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Saldo atual</div>
                        <div className="frota-kpi-val">{fmt(resumo.saldo)}</div>
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
                                    {erro
                                        ? `Não foi possível carregar o extrato: ${erro}`
                                        : 'Nenhum movimento no período.'}
                                </td></tr>
                            )}
                            {movimentos.map(m => (
                                <tr key={`${m.tipo}-${m.id}`}>
                                    <td className="frota-muted">{dataBR(m.data)}</td>
                                    <td>
                                        <span className={`frota-badge ${
                                            m.tipo === 'recarga' ? 'frota-b-success'
                                                : (m.tipo === 'ajuste' ? 'frota-b-info'
                                                    : 'frota-b-neutral')}`}>
                                            <i className={`ti ${
                                                m.tipo === 'recarga' ? 'ti-wallet'
                                                    : (m.tipo === 'ajuste' ? 'ti-equal'
                                                        : 'ti-gas-station')}`} />
                                            {m.tipo === 'recarga' ? 'Recarga'
                                                : (m.tipo === 'ajuste' ? 'Ajuste' : 'Abastecimento')}
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
                                        {m.valor < 0
                                            ? `- ${fmt(Math.abs(m.valor))}`
                                            : fmt(m.valor)}
                                        {m.sem_quantidade && (
                                            <div className="frota-cell-sub">
                                                <i className="ti ti-alert-triangle" /> sem litros
                                            </div>
                                        )}
                                        {m.valor_pago != null && (
                                            <div className="frota-cell-sub">
                                                pago {brl(m.valor_pago)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="frota-muted frota-right">
                                        {fmt(m.saldo_acumulado)}
                                    </td>
                                    <td>
                                        {ehMaster && m.tipo !== 'abastecimento' && (
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Excluir movimento"
                                                onClick={() => removerRecarga(m)}>
                                                <i className="ti ti-trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!!saldoInicial && (
                                <tr>
                                    <td className="frota-muted">—</td>
                                    <td className="frota-muted">
                                        Saldo anterior ao período
                                    </td>
                                    <td className="frota-muted">—</td>
                                    <td className="frota-muted frota-right">—</td>
                                    <td className="frota-muted frota-right">
                                        {fmt(saldoInicial)}
                                    </td>
                                    <td></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="frota-hint">
                <i className="ti ti-info-circle" /> Os totais acima são do posto inteiro,
                não do período filtrado — é o número que fecha com o extrato do posto. A
                coluna de saldo acompanha isso: com filtro de data ela parte do saldo
                anterior ao período, não do zero.
            </div>
        </Modal>
    );
}
