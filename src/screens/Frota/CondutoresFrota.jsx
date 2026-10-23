import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { dataBR, iniciais, vencimentoBadge } from './frotaFormat';
import CondutorModal from '../../components/modals/CondutorModal';

export default function CondutoresFrota({ reloadRefs }) {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('ativo');
    const [busca, setBusca] = useState('');
    const [filtroVinculo, setFiltroVinculo] = useState('');
    const [modal, setModal] = useState({ open: false, condutor: null });
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const data = await frotaApi.condutores(filtroStatus ? `?status=${filtroStatus}` : '');
            if (reqIdRef.current !== reqId) return;
            setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('Frota condutores', e);
            notify.error('Erro ao carregar condutores.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [filtroStatus]);

    useEffect(() => { carregar(); }, [carregar]);

    const ativos = lista.filter(c => c.status === 'ativo');
    const cnhVencida = ativos.filter(c => c.cnh_status === 'vencida').length;
    const cnhAVencer = ativos.filter(c => c.cnh_status === 'a_vencer').length;
    const listaFiltrada = lista.filter(c => {
        const termo = busca.trim().toLowerCase();
        const bateBusca = !termo || [c.nome, c.cpf, c.telefone, c.cnh_numero, c.veiculo_atual_placa]
            .some(valor => String(valor || '').toLowerCase().includes(termo));
        const bateVinculo = !filtroVinculo
            || (filtroVinculo === 'sem_veiculo' && !c.veiculo_atual_placa)
            || (filtroVinculo === 'com_veiculo' && !!c.veiculo_atual_placa)
            || (filtroVinculo === 'com_alerta' && !!c.usuario_nome)
            || (filtroVinculo === 'cnh_alerta' && ['vencida', 'a_vencer'].includes(c.cnh_status));
        return bateBusca && bateVinculo;
    });

    const onSaved = () => {
        setModal({ open: false, condutor: null });
        carregar();
        reloadRefs?.();
    };

    const inativar = async (c) => {
        const ok = await confirmDialog(`Inativar "${c.nome}"? O histórico é mantido.`, { danger: true });
        if (!ok) return;
        try {
            await frotaApi.inativarCondutor(c.id);
            notify.success('Condutor inativado.');
            carregar(); reloadRefs?.();
        } catch (e) {
            logger.error('inativar condutor', e);
            notify.error(e.message || 'Erro ao inativar.');
        }
    };

    return (
        <>
            <div className="frota-kpis">
                <div className="frota-kpi accent"><div className="frota-kpi-lbl"><i className="ti ti-steering-wheel" /> Condutores ativos</div><div className="frota-kpi-val">{ativos.length}</div></div>
                <div className={`frota-kpi${cnhVencida ? ' alert' : ''}`}><div className="frota-kpi-lbl"><i className="ti ti-id" /> CNH vencida</div><div className="frota-kpi-val">{cnhVencida}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-clock-exclamation" /> CNH vencendo (30d)</div><div className="frota-kpi-val">{cnhAVencer}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-truck" /> Com veículo</div><div className="frota-kpi-val">{ativos.filter(c => c.veiculo_atual_placa).length}</div></div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-steering-wheel" /> Condutores</div>
                    <div className="frota-card-actions">
                        <input className="frota-inp" style={{ maxWidth: 190 }} placeholder="Nome, CNH, placa…" value={busca} onChange={e => setBusca(e.target.value)} />
                        <select className="frota-inp" style={{ maxWidth: 180 }} value={filtroVinculo} onChange={e => setFiltroVinculo(e.target.value)}>
                            <option value="">Todos os vínculos</option>
                            <option value="sem_veiculo">Sem veículo</option>
                            <option value="com_veiculo">Com veículo</option>
                            <option value="com_alerta">Com alerta</option>
                            <option value="cnh_alerta">CNH em alerta</option>
                        </select>
                        <select className="frota-inp" style={{ maxWidth: 150 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                            <option value="">Todos</option>
                        </select>
                        <button className="frota-btn frota-btn-primary" onClick={() => setModal({ open: true, condutor: null })}>
                            <i className="ti ti-plus" /> Novo condutor
                        </button>
                    </div>
                </div>

                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <div className="frota-table-wrap"><table className="frota-table">
                        <thead><tr><th>Condutor</th><th>CNH</th><th>Validade</th><th>Funcionário (RH)</th><th>Alertas</th><th>Veículo atual</th><th></th></tr></thead>
                        <tbody>
                            {listaFiltrada.length === 0 && <tr><td colSpan={7} className="frota-empty">Nenhum condutor para estes filtros.</td></tr>}
                            {listaFiltrada.map(c => {
                                const vb = vencimentoBadge(c.cnh_status);
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="frota-who">
                                                <span className="frota-av-sm">{iniciais(c.nome)}</span>
                                                <div>
                                                    <div className="frota-cell-main">{c.nome}</div>
                                                    {c.telefone && <div className="frota-cell-sub">{c.telefone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="frota-muted">{c.cnh_numero || '—'}{c.cnh_categoria ? ` · ${c.cnh_categoria}` : ''}</td>
                                        <td>{dataBR(c.cnh_validade)} {vb && <span className={`frota-badge ${vb.cls}`} style={{ marginLeft: 6 }}>{vb.label}</span>}</td>
                                        <td className="frota-muted">{c.funcionario_nome || '—'}</td>
                                        <td className="frota-muted">{c.usuario_nome ? <><i className="ti ti-bell" /> {c.usuario_nome}</> : '—'}</td>
                                        <td className="frota-muted">{c.veiculo_atual_placa || '—'}</td>
                                        <td>
                                            <button className="frota-btn frota-btn-text frota-btn-sm" title="Editar" onClick={() => setModal({ open: true, condutor: c })}><i className="ti ti-pencil" /></button>
                                            {c.status === 'ativo' && <button className="frota-btn frota-btn-text frota-btn-sm" title="Inativar" onClick={() => inativar(c)}><i className="ti ti-user-off" /></button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                )}
            </div>

            <CondutorModal
                isOpen={modal.open}
                condutor={modal.condutor}
                onClose={() => setModal({ open: false, condutor: null })}
                onSaved={onSaved}
            />
        </>
    );
}
