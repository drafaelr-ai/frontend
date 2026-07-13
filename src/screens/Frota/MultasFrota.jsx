import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, placaBR } from './frotaFormat';
import MultaFrotaModal from '../../components/modals/MultaFrotaModal';

export default function MultasFrota({ condutores }) {
    const [lista, setLista] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroVeiculo, setFiltroVeiculo] = useState('');
    const [modal, setModal] = useState(false);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filtroStatus) params.set('status', filtroStatus);
            if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const [mRes, vRes] = await Promise.allSettled([frotaApi.multas(qs), frotaApi.veiculos()]);
            if (reqIdRef.current !== reqId) return;
            if (mRes.status === 'fulfilled') setLista(Array.isArray(mRes.value) ? mRes.value : []);
            else { logger.error('Frota multas', mRes.reason); notify.error('Erro ao carregar multas.'); }
            if (vRes.status === 'fulfilled') setVeiculos(Array.isArray(vRes.value) ? vRes.value : []);
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [filtroStatus, filtroVeiculo]);

    useEffect(() => { carregar(); }, [carregar]);

    const pendentes = lista.filter(m => m.status_pagamento === 'pendente');
    const totalPendente = pendentes.reduce((s, m) => s + (Number(m.valor) || 0), 0);

    const marcarPaga = async (m) => {
        const ok = await confirmDialog(`Marcar a multa de ${brl(m.valor)} (${placaBR(m.veiculo_placa)}) como paga hoje?`);
        if (!ok) return;
        try {
            await frotaApi.editarMulta(m.id, {
                status_pagamento: 'paga',
                data_pagamento: new Date().toISOString().slice(0, 10),
            });
            notify.success('Multa marcada como paga.');
            carregar();
        } catch (e) {
            logger.error('pagar multa', e);
            notify.error(e.message || 'Erro ao atualizar multa.');
        }
    };

    const remover = async (m) => {
        const ok = await confirmDialog('Remover esta multa?', { danger: true });
        if (!ok) return;
        try {
            await frotaApi.removerMulta(m.id);
            notify.success('Multa removida.');
            carregar();
        } catch (e) {
            logger.error('remover multa', e);
            notify.error(e.message || 'Erro ao remover.');
        }
    };

    return (
        <>
            <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className={`frota-kpi${pendentes.length ? ' alert' : ' accent'}`}><div className="frota-kpi-lbl"><i className="ti ti-alert-triangle" /> Multas pendentes</div><div className="frota-kpi-val">{pendentes.length}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-cash" /> Valor pendente</div><div className="frota-kpi-val">{brlShort(totalPendente)}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-list" /> Total de multas</div><div className="frota-kpi-val">{lista.length}</div></div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-alert-triangle" /> Multas</div>
                    <div className="frota-card-actions">
                        <select className="frota-inp" style={{ maxWidth: 190 }} value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)}>
                            <option value="">Todos os veículos</option>
                            {veiculos.map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                        </select>
                        <select className="frota-inp" style={{ maxWidth: 150 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                            <option value="">Todos os status</option>
                            <option value="pendente">Pendente</option>
                            <option value="paga">Paga</option>
                            <option value="contestada">Contestada</option>
                        </select>
                        <button className="frota-btn frota-btn-primary" onClick={() => setModal(true)}>
                            <i className="ti ti-plus" /> Nova multa
                        </button>
                    </div>
                </div>

                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead><tr><th>Data</th><th>Veículo</th><th>Descrição</th><th>Condutor</th><th>Pontos</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={8} className="frota-empty">Nenhuma multa.</td></tr>}
                            {lista.map(m => (
                                <tr key={m.id}>
                                    <td className="frota-muted">{dataBR(m.data_infracao)}</td>
                                    <td><div className="frota-cell-main">{placaBR(m.veiculo_placa)}</div><div className="frota-cell-sub">{m.veiculo_modelo}</div></td>
                                    <td>{m.descricao || '—'}</td>
                                    <td className="frota-muted">{m.condutor_nome || '—'}</td>
                                    <td className="frota-muted">{m.pontos ?? '—'}</td>
                                    <td>
                                        <span className={`frota-badge ${m.status_pagamento === 'paga' ? 'frota-b-success' : m.status_pagamento === 'contestada' ? 'frota-b-info' : 'frota-b-warning'}`}>{m.status_pagamento}</span>
                                        {m.status_pagamento === 'paga' && m.data_pagamento && <div className="frota-cell-sub">{dataBR(m.data_pagamento)}</div>}
                                    </td>
                                    <td className="frota-valor">{brl(m.valor)}</td>
                                    <td>
                                        {m.status_pagamento === 'pendente' && <button className="frota-btn frota-btn-text frota-btn-sm" title="Marcar como paga" onClick={() => marcarPaga(m)}><i className="ti ti-check" /></button>}
                                        <button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => remover(m)}><i className="ti ti-trash" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <MultaFrotaModal
                isOpen={modal} veiculos={veiculos} condutores={condutores}
                onClose={() => setModal(false)}
                onSaved={() => { setModal(false); carregar(); }}
            />
        </>
    );
}
