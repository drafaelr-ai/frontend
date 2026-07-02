import React, { useState, useEffect, useCallback } from 'react';
import { rhApi } from './rhApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, iniciais } from './rhFormat';
import FuncionarioModal from '../../components/modals/FuncionarioModal';

export default function FuncionariosRH({ obras, categorias, reloadRefs, setCounts }) {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroObra, setFiltroObra] = useState('');
    const [modal, setModal] = useState({ open: false, funcionario: null });

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            let q = '';
            if (filtroObra === 'sem') q = '?obra_id=sem';
            else if (filtroObra) q = `?obra_id=${filtroObra}`;
            const data = await rhApi.funcionarios(q);
            setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            logger.error('RH funcionarios', e);
            notify.error('Erro ao carregar funcionários.');
        } finally {
            setLoading(false);
        }
    }, [filtroObra]);

    useEffect(() => { carregar(); }, [carregar]);

    const ativos = lista.filter(f => f.status === 'ativo');
    const emObra = ativos.filter(f => f.obra_id != null).length;
    const semObra = ativos.filter(f => f.obra_id == null).length;
    const folhaBase = ativos.reduce((s, f) => s + (Number(f.salario) || 0), 0);

    const onSaved = () => {
        setModal({ open: false, funcionario: null });
        carregar();
        reloadRefs?.();
        setCounts?.(c => ({ ...c }));
    };

    const inativar = async (f) => {
        const ok = await confirmDialog(`Inativar "${f.nome}"? O histórico é mantido.`, { danger: true });
        if (!ok) return;
        try {
            await rhApi.inativarFuncionario(f.id);
            notify.success('Funcionário inativado.');
            carregar(); reloadRefs?.();
        } catch (e) {
            logger.error('inativar', e);
            notify.error('Erro ao inativar.');
        }
    };

    return (
        <>
            <div className="rh-kpis">
                <div className="rh-kpi accent"><div className="rh-kpi-lbl"><i className="ti ti-users" /> Funcionários ativos</div><div className="rh-kpi-val">{ativos.length}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-building-community" /> Em obra</div><div className="rh-kpi-val">{emObra}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-user-question" /> Sem obra</div><div className="rh-kpi-val">{semObra}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-wallet" /> Folha base / mês</div><div className="rh-kpi-val">{brlShort(folhaBase)}</div></div>
            </div>

            <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-id-badge-2" /> Funcionários</div>
                    <div className="rh-card-actions">
                        <select className="rh-inp" style={{ maxWidth: 200 }} value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
                            <option value="">Todas as obras</option>
                            <option value="sem">— Sem obra —</option>
                            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}{o.uf ? ` (${o.uf})` : ''}</option>)}
                        </select>
                        <button className="rh-btn rh-btn-primary" onClick={() => setModal({ open: true, funcionario: null })}>
                            <i className="ti ti-plus" /> Novo funcionário
                        </button>
                    </div>
                </div>

                {loading ? <div className="rh-loading">Carregando…</div> : (
                    <table className="rh-table">
                        <thead><tr><th>Funcionário</th><th>Categoria</th><th>Obra</th><th>Salário</th><th>Admissão</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={6} className="rh-empty">Nenhum funcionário.</td></tr>}
                            {lista.map(f => (
                                <tr key={f.id}>
                                    <td>
                                        <div className="rh-who">
                                            <span className="rh-av-sm">{iniciais(f.nome)}</span>
                                            <div>
                                                <div className="rh-cell-main">{f.nome}</div>
                                                {f.cpf && <div className="rh-cell-sub">CPF {f.cpf}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{f.categoria_nome || '—'}</td>
                                    <td>
                                        {f.obra_id != null
                                            ? <span className="rh-tag-obra"><i className="ti ti-building" style={{ fontSize: 12 }} /> {f.obra_nome}</span>
                                            : <span className="rh-tag-obra none"><i className="ti ti-minus" style={{ fontSize: 12 }} /> Sem obra</span>}
                                    </td>
                                    <td className="rh-valor">
                                        {brl(f.salario)}
                                        {f.acima_do_piso === true && <span className="rh-badge rh-b-info" style={{ marginLeft: 6 }}>acima do piso</span>}
                                        {f.status !== 'ativo' && <span className="rh-badge rh-b-neutral" style={{ marginLeft: 6 }}>{f.status}</span>}
                                    </td>
                                    <td className="rh-muted">{dataBR(f.data_admissao)}</td>
                                    <td>
                                        <button className="rh-btn rh-btn-text rh-btn-sm" title="Editar / migrar obra" onClick={() => setModal({ open: true, funcionario: f })}><i className="ti ti-pencil" /></button>
                                        {f.status === 'ativo' && <button className="rh-btn rh-btn-text rh-btn-sm" title="Inativar" onClick={() => inativar(f)}><i className="ti ti-user-off" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="rh-hint"><i className="ti ti-info-circle" /> O salário é puxado do piso da convenção do estado da obra, e fica editável por funcionário (ex.: quem ganha acima do piso).</div>
            </div>

            <FuncionarioModal
                isOpen={modal.open}
                funcionario={modal.funcionario}
                obras={obras}
                categorias={categorias}
                onClose={() => setModal({ open: false, funcionario: null })}
                onSaved={onSaved}
            />
        </>
    );
}
