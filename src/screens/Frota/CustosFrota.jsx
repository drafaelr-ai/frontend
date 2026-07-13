import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, placaBR } from './frotaFormat';
import ManutencaoFrotaModal from '../../components/modals/ManutencaoFrotaModal';
import AbastecimentoModal from '../../components/modals/AbastecimentoModal';

export default function CustosFrota({ condutores }) {
    const [veiculos, setVeiculos] = useState([]);
    const [manutencoes, setManutencoes] = useState([]);
    const [abastecimentos, setAbastecimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroVeiculo, setFiltroVeiculo] = useState('');
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');
    const [modalManut, setModalManut] = useState(false);
    const [modalAbast, setModalAbast] = useState(false);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo);
            if (de) params.set('de', de);
            if (ate) params.set('ate', ate);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const [vRes, mRes, aRes] = await Promise.allSettled([
                frotaApi.veiculos(), frotaApi.manutencoes(qs), frotaApi.abastecimentos(qs),
            ]);
            if (reqIdRef.current !== reqId) return;
            if (vRes.status === 'fulfilled') setVeiculos(Array.isArray(vRes.value) ? vRes.value : []);
            if (mRes.status === 'fulfilled') setManutencoes(Array.isArray(mRes.value) ? mRes.value : []);
            if (aRes.status === 'fulfilled') setAbastecimentos(Array.isArray(aRes.value) ? aRes.value : []);
            if ([vRes, mRes, aRes].some(r => r.status === 'rejected')) {
                notify.error('Erro ao carregar custos.');
            }
        } catch (e) {
            logger.error('Frota custos', e);
            notify.error('Erro ao carregar custos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [filtroVeiculo, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);

    const totalManut = manutencoes.reduce((s, m) => s + (Number(m.custo) || 0), 0);
    const totalAbast = abastecimentos.reduce((s, a) => s + (Number(a.valor) || 0), 0);

    const remover = async (tipo, id) => {
        const ok = await confirmDialog('Remover este registro?', { danger: true });
        if (!ok) return;
        try {
            if (tipo === 'manut') await frotaApi.removerManutencao(id);
            else await frotaApi.removerAbastecimento(id);
            notify.success('Registro removido.');
            carregar();
        } catch (e) {
            logger.error('remover custo', e);
            notify.error(e.message || 'Erro ao remover.');
        }
    };

    return (
        <>
            <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="frota-kpi accent"><div className="frota-kpi-lbl"><i className="ti ti-tool" /> Manutenções (período)</div><div className="frota-kpi-val">{brlShort(totalManut)}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-gas-station" /> Abastecimentos (período)</div><div className="frota-kpi-val">{brlShort(totalAbast)}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-sum" /> Total</div><div className="frota-kpi-val">{brlShort(totalManut + totalAbast)}</div></div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-filter" /> Filtros</div>
                    <div className="frota-card-actions">
                        <select className="frota-inp" style={{ maxWidth: 190 }} value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)}>
                            <option value="">Todos os veículos</option>
                            {veiculos.map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                        </select>
                        <input className="frota-inp" type="date" style={{ maxWidth: 150 }} value={de} onChange={e => setDe(e.target.value)} title="De" />
                        <input className="frota-inp" type="date" style={{ maxWidth: 150 }} value={ate} onChange={e => setAte(e.target.value)} title="Até" />
                    </div>
                </div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-tool" /> Manutenções</div>
                    <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalManut(true)}><i className="ti ti-plus" /> Nova manutenção</button>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead><tr><th>Data</th><th>Veículo</th><th>Tipo</th><th>Descrição</th><th>Local</th><th>Custo</th><th></th></tr></thead>
                        <tbody>
                            {manutencoes.length === 0 && <tr><td colSpan={7} className="frota-empty">Nenhuma manutenção no período.</td></tr>}
                            {manutencoes.map(m => (
                                <tr key={m.id}>
                                    <td className="frota-muted">{dataBR(m.data)}</td>
                                    <td><div className="frota-cell-main">{placaBR(m.veiculo_placa)}</div><div className="frota-cell-sub">{m.veiculo_modelo}</div></td>
                                    <td><span className={`frota-badge ${m.tipo === 'corretiva' ? 'frota-b-warning' : 'frota-b-info'}`}>{m.tipo}</span></td>
                                    <td>{m.descricao || '—'}{m.oficina && <div className="frota-cell-sub">{m.oficina}</div>}</td>
                                    <td className="frota-muted">{m.local_nome || 'Sem local'}</td>
                                    <td className="frota-valor">{brl(m.custo)}</td>
                                    <td><button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => remover('manut', m.id)}><i className="ti ti-trash" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-gas-station" /> Abastecimentos</div>
                    <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalAbast(true)}><i className="ti ti-plus" /> Novo abastecimento</button>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead><tr><th>Data</th><th>Veículo</th><th>Litros</th><th>KM</th><th>Local</th><th>Valor</th><th></th></tr></thead>
                        <tbody>
                            {abastecimentos.length === 0 && <tr><td colSpan={7} className="frota-empty">Nenhum abastecimento no período.</td></tr>}
                            {abastecimentos.map(a => (
                                <tr key={a.id}>
                                    <td className="frota-muted">{dataBR(a.data)}{a.posto && <div className="frota-cell-sub">{a.posto}</div>}</td>
                                    <td><div className="frota-cell-main">{placaBR(a.veiculo_placa)}</div><div className="frota-cell-sub">{a.veiculo_modelo}</div></td>
                                    <td className="frota-muted">{a.litros != null ? `${a.litros} L` : '—'}</td>
                                    <td className="frota-muted">{a.km ? Number(a.km).toLocaleString('pt-BR') : '—'}</td>
                                    <td className="frota-muted">{a.local_nome || 'Sem local'}</td>
                                    <td className="frota-valor">{brl(a.valor)}</td>
                                    <td><button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => remover('abast', a.id)}><i className="ti ti-trash" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="frota-hint"><i className="ti ti-info-circle" /> O local do custo é o local do veículo no momento do lançamento (snapshot) — mover o veículo depois não altera o histórico.</div>
            </div>

            <ManutencaoFrotaModal
                isOpen={modalManut} veiculos={veiculos}
                onClose={() => setModalManut(false)}
                onSaved={() => { setModalManut(false); carregar(); }}
            />
            <AbastecimentoModal
                isOpen={modalAbast} veiculos={veiculos} condutores={condutores}
                onClose={() => setModalAbast(false)}
                onSaved={() => { setModalAbast(false); carregar(); }}
            />
        </>
    );
}
