import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import {
    brl, dataBR, placaBR, tipoVeiculoLabel, tipoDocLabel,
    statusVeiculoBadge, vencimentoBadge, TIPOS_VEICULO,
} from './frotaFormat';
import VeiculoModal from '../../components/modals/VeiculoModal';
import MovimentacaoVeiculoModal from '../../components/modals/MovimentacaoVeiculoModal';
import DocumentoVeiculoModal from '../../components/modals/DocumentoVeiculoModal';
import ManutencaoFrotaModal from '../../components/modals/ManutencaoFrotaModal';
import AbastecimentoModal from '../../components/modals/AbastecimentoModal';
import MultaFrotaModal from '../../components/modals/MultaFrotaModal';

function TagLocal({ item }) {
    if (item.local_tipo === 'obra') {
        return <span className="frota-tag-local"><i className="ti ti-building" style={{ fontSize: 12 }} /> {item.obra_nome || 'Obra'}</span>;
    }
    if (item.local_tipo === 'imovel') {
        return <span className="frota-tag-local"><i className="ti ti-home" style={{ fontSize: 12 }} /> {item.imovel_nome || item.local_nome || 'Imóvel'}</span>;
    }
    return <span className="frota-tag-local none"><i className="ti ti-minus" style={{ fontSize: 12 }} /> Sem local</span>;
}

const SUBTABS = [
    { id: 'docs', icon: 'ti-file-text', label: 'Documentos' },
    { id: 'movs', icon: 'ti-route', label: 'Movimentações' },
    { id: 'manut', icon: 'ti-tool', label: 'Manutenções' },
    { id: 'abast', icon: 'ti-gas-station', label: 'Abastecimentos' },
    { id: 'multas', icon: 'ti-alert-triangle', label: 'Multas' },
];

function DetalheVeiculo({ veiculo, obras, imoveis, condutores, onVoltar, onChanged }) {
    const [sub, setSub] = useState('docs');
    const [dados, setDados] = useState({ docs: null, movs: null, manut: null, abast: null, multas: null });
    const [modalMover, setModalMover] = useState(false);
    const [modalDoc, setModalDoc] = useState(false);
    const [modalManut, setModalManut] = useState(false);
    const [modalAbast, setModalAbast] = useState(false);
    const [modalMulta, setModalMulta] = useState(false);
    const [condutorSel, setCondutorSel] = useState(veiculo.condutor_atual_id ?? '');

    const carregarSub = useCallback(async (aba) => {
        try {
            if (aba === 'docs') setDados(d => ({ ...d, docs: null }));
            const fns = {
                docs: () => frotaApi.documentos(veiculo.id),
                movs: () => frotaApi.movimentacoes(veiculo.id),
                manut: () => frotaApi.manutencoes(`?veiculo_id=${veiculo.id}`),
                abast: () => frotaApi.abastecimentos(`?veiculo_id=${veiculo.id}`),
                multas: () => frotaApi.multas(`?veiculo_id=${veiculo.id}`),
            };
            const data = await fns[aba]();
            setDados(d => ({ ...d, [aba]: Array.isArray(data) ? data : [] }));
        } catch (e) {
            logger.error('Frota detalhe', e);
            notify.error('Erro ao carregar dados do veículo.');
            setDados(d => ({ ...d, [aba]: [] }));
        }
    }, [veiculo.id]);

    useEffect(() => { carregarSub(sub); }, [sub, carregarSub]);

    const abrirArquivo = async (tipo, id) => {
        try {
            const r = await frotaApi.arquivoUrl(tipo, id);
            if (r.url) window.open(r.url, '_blank', 'noopener');
        } catch (e) {
            logger.error('arquivo frota', e);
            notify.error(e.message || 'Erro ao abrir arquivo.');
        }
    };

    const aplicarCondutor = async () => {
        try {
            await frotaApi.atribuirCondutor(veiculo.id, condutorSel || null);
            notify.success(condutorSel ? 'Condutor atribuído.' : 'Condutor removido.');
            onChanged?.();
        } catch (e) {
            logger.error('condutor frota', e);
            notify.error(e.message || 'Erro ao atribuir condutor.');
        }
    };

    const removerItem = async (tipo, id) => {
        const ok = await confirmDialog('Remover este registro?', { danger: true });
        if (!ok) return;
        try {
            const fns = {
                docs: frotaApi.removerDocumento,
                manut: frotaApi.removerManutencao,
                abast: frotaApi.removerAbastecimento,
                multas: frotaApi.removerMulta,
            };
            await fns[tipo](id);
            notify.success('Registro removido.');
            carregarSub(tipo);
        } catch (e) {
            logger.error('remover frota', e);
            notify.error(e.message || 'Erro ao remover.');
        }
    };

    const sBadge = statusVeiculoBadge(veiculo.status);
    const lista = dados[sub];

    return (
        <div className="frota-card">
            <div className="frota-detail-head">
                <div>
                    <button className="frota-btn frota-btn-text frota-btn-sm" onClick={onVoltar} style={{ marginBottom: 8, paddingLeft: 0 }}>
                        <i className="ti ti-arrow-left" /> Voltar à lista
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span className="frota-plate">{placaBR(veiculo.placa)}</span>
                        <span className="frota-cell-main" style={{ fontSize: 'var(--text-lg)' }}>
                            {veiculo.marca ? `${veiculo.marca} ` : ''}{veiculo.modelo}
                        </span>
                        <span className={`frota-badge ${sBadge.cls}`}>{sBadge.label}</span>
                        <TagLocal item={veiculo} />
                    </div>
                    <div className="frota-detail-meta">
                        <span>Tipo: <b>{tipoVeiculoLabel(veiculo.tipo)}</b></span>
                        {veiculo.ano_fabricacao && <span>Ano: <b>{veiculo.ano_fabricacao}{veiculo.ano_modelo ? `/${veiculo.ano_modelo}` : ''}</b></span>}
                        {veiculo.km_atual != null && <span>KM: <b>{Number(veiculo.km_atual).toLocaleString('pt-BR')}</b></span>}
                        {veiculo.condutor_atual_nome && <span>Condutor: <b>{veiculo.condutor_atual_nome}</b></span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="frota-inp" style={{ maxWidth: 190 }} value={condutorSel} onChange={e => setCondutorSel(e.target.value)}>
                        <option value="">— Sem condutor —</option>
                        {condutores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <button className="frota-btn frota-btn-secondary frota-btn-sm" onClick={aplicarCondutor}>
                        <i className="ti ti-steering-wheel" /> Aplicar
                    </button>
                    <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalMover(true)}>
                        <i className={`ti ${veiculo.local_tipo === 'obra' ? 'ti-arrow-back-up' : 'ti-building'}`} /> {veiculo.local_tipo === 'obra' ? 'Retornar da obra' : 'Ceder à obra'}
                    </button>
                </div>
            </div>

            <div className="frota-subtabs">
                {SUBTABS.map(t => (
                    <button key={t.id} className={`frota-subtab${sub === t.id ? ' active' : ''}`} onClick={() => setSub(t.id)}>
                        <i className={`ti ${t.icon}`} /> {t.label}
                    </button>
                ))}
                <span style={{ flex: 1 }} />
                {sub === 'docs' && <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalDoc(true)}><i className="ti ti-plus" /> Documento</button>}
                {sub === 'manut' && <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalManut(true)}><i className="ti ti-plus" /> Manutenção</button>}
                {sub === 'abast' && <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalAbast(true)}><i className="ti ti-plus" /> Abastecimento</button>}
                {sub === 'multas' && <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalMulta(true)}><i className="ti ti-plus" /> Multa</button>}
            </div>

            {lista == null ? <div className="frota-loading">Carregando…</div> : (
                <>
                    {sub === 'docs' && (
                        <table className="frota-table">
                            <thead><tr><th>Documento</th><th>Vencimento</th><th>Valor</th><th>Arquivo</th><th></th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={5} className="frota-empty">Nenhum documento.</td></tr>}
                                {lista.map(d => {
                                    const vb = vencimentoBadge(d.status);
                                    return (
                                        <tr key={d.id}>
                                            <td><div className="frota-cell-main">{tipoDocLabel(d.tipo)}</div>{d.descricao && <div className="frota-cell-sub">{d.descricao}</div>}</td>
                                            <td>{dataBR(d.data_vencimento)} {vb && <span className={`frota-badge ${vb.cls}`} style={{ marginLeft: 6 }}>{vb.label}</span>}</td>
                                            <td className="frota-valor">{d.valor != null ? brl(d.valor) : '—'}</td>
                                            <td>{d.arquivo_url
                                                ? <button className="frota-btn frota-btn-text frota-btn-sm" onClick={() => abrirArquivo('documento', d.id)}><i className="ti ti-external-link" /> Abrir</button>
                                                : <span className="frota-muted">—</span>}</td>
                                            <td><button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => removerItem('docs', d.id)}><i className="ti ti-trash" /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {sub === 'movs' && (
                        <table className="frota-table">
                            <thead><tr><th>Data</th><th>Movimento</th><th>Destino</th><th>Observação</th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={4} className="frota-empty">Nenhuma movimentação.</td></tr>}
                                {lista.map(m => (
                                    <tr key={m.id}>
                                        <td className="frota-muted">{dataBR(m.data_movimentacao)}</td>
                                        <td><span className={`frota-badge ${m.destino_tipo === 'obra' ? 'frota-b-info' : m.destino_tipo === 'sem_local' ? 'frota-b-success' : 'frota-b-neutral'}`}>{m.destino_tipo === 'obra' ? 'Cessão à obra' : m.destino_tipo === 'sem_local' ? 'Retorno ao pátio' : 'Transferência'}</span></td>
                                        <td>
                                            {m.destino_tipo === 'obra' && <span className="frota-tag-local"><i className="ti ti-building" style={{ fontSize: 12 }} /> {m.destino_nome || 'Obra'}</span>}
                                            {m.destino_tipo === 'imovel' && <span className="frota-tag-local"><i className="ti ti-home" style={{ fontSize: 12 }} /> {m.destino_nome || 'Imóvel'}</span>}
                                            {m.destino_tipo === 'sem_local' && <span className="frota-tag-local none">Sem local</span>}
                                        </td>
                                        <td className="frota-muted" style={{ textAlign: 'left' }}>{m.observacao || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {sub === 'manut' && (
                        <table className="frota-table">
                            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>KM</th><th>Custo</th><th></th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={6} className="frota-empty">Nenhuma manutenção.</td></tr>}
                                {lista.map(m => (
                                    <tr key={m.id}>
                                        <td className="frota-muted">{dataBR(m.data)}</td>
                                        <td><span className={`frota-badge ${m.tipo === 'corretiva' ? 'frota-b-warning' : 'frota-b-info'}`}>{m.tipo}</span></td>
                                        <td><div className="frota-cell-main">{m.descricao || '—'}</div>{m.oficina && <div className="frota-cell-sub">{m.oficina}</div>}</td>
                                        <td className="frota-muted">{m.km ? Number(m.km).toLocaleString('pt-BR') : '—'}</td>
                                        <td className="frota-valor">{brl(m.custo)}</td>
                                        <td>
                                            {m.arquivo_url && <button className="frota-btn frota-btn-text frota-btn-sm" title="Abrir NF" onClick={() => abrirArquivo('manutencao', m.id)}><i className="ti ti-external-link" /></button>}
                                            <button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => removerItem('manut', m.id)}><i className="ti ti-trash" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {sub === 'abast' && (
                        <table className="frota-table">
                            <thead><tr><th>Data</th><th>Litros</th><th>KM</th><th>Condutor</th><th>Valor</th><th></th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={6} className="frota-empty">Nenhum abastecimento.</td></tr>}
                                {lista.map(a => (
                                    <tr key={a.id}>
                                        <td className="frota-muted">{dataBR(a.data)}{a.posto && <div className="frota-cell-sub">{a.posto}</div>}</td>
                                        <td className="frota-muted">{a.litros != null ? `${a.litros} L` : '—'}</td>
                                        <td className="frota-muted">{a.km ? Number(a.km).toLocaleString('pt-BR') : '—'}</td>
                                        <td className="frota-muted">{a.condutor_nome || '—'}</td>
                                        <td className="frota-valor">{brl(a.valor)}</td>
                                        <td><button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => removerItem('abast', a.id)}><i className="ti ti-trash" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {sub === 'multas' && (
                        <table className="frota-table">
                            <thead><tr><th>Data</th><th>Descrição</th><th>Condutor</th><th>Pontos</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={7} className="frota-empty">Nenhuma multa.</td></tr>}
                                {lista.map(m => (
                                    <tr key={m.id}>
                                        <td className="frota-muted">{dataBR(m.data_infracao)}</td>
                                        <td>{m.descricao || '—'}</td>
                                        <td className="frota-muted">{m.condutor_nome || '—'}</td>
                                        <td className="frota-muted">{m.pontos ?? '—'}</td>
                                        <td><span className={`frota-badge ${m.status_pagamento === 'paga' ? 'frota-b-success' : m.status_pagamento === 'contestada' ? 'frota-b-info' : 'frota-b-warning'}`}>{m.status_pagamento}</span></td>
                                        <td className="frota-valor">{brl(m.valor)}</td>
                                        <td><button className="frota-btn frota-btn-text frota-btn-sm" title="Remover" onClick={() => removerItem('multas', m.id)}><i className="ti ti-trash" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            <MovimentacaoVeiculoModal
                isOpen={modalMover} veiculo={veiculo} obras={obras} imoveis={imoveis}
                onClose={() => setModalMover(false)}
                onSaved={() => { setModalMover(false); onChanged?.(); carregarSub('movs'); }}
            />
            <DocumentoVeiculoModal
                isOpen={modalDoc} veiculo={veiculo}
                onClose={() => setModalDoc(false)}
                onSaved={() => { setModalDoc(false); carregarSub('docs'); }}
            />
            <ManutencaoFrotaModal
                isOpen={modalManut} veiculos={[veiculo]} veiculoFixo={veiculo}
                onClose={() => setModalManut(false)}
                onSaved={() => { setModalManut(false); carregarSub('manut'); onChanged?.(); }}
            />
            <AbastecimentoModal
                isOpen={modalAbast} veiculos={[veiculo]} veiculoFixo={veiculo} condutores={condutores}
                onClose={() => setModalAbast(false)}
                onSaved={() => { setModalAbast(false); carregarSub('abast'); onChanged?.(); }}
            />
            <MultaFrotaModal
                isOpen={modalMulta} veiculos={[veiculo]} veiculoFixo={veiculo} condutores={condutores}
                onClose={() => setModalMulta(false)}
                onSaved={() => { setModalMulta(false); carregarSub('multas'); }}
            />
        </div>
    );
}

export default function VeiculosFrota({ obras, imoveis, condutores, reloadRefs, setCounts }) {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [busca, setBusca] = useState('');
    const [modal, setModal] = useState({ open: false, veiculo: null });
    const [detalheId, setDetalheId] = useState(null);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filtroStatus) params.set('status', filtroStatus);
            if (filtroTipo) params.set('tipo', filtroTipo);
            if (busca.trim()) params.set('q', busca.trim());
            const qs = params.toString();
            const data = await frotaApi.veiculos(qs ? `?${qs}` : '');
            if (reqIdRef.current !== reqId) return;
            setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('Frota veiculos', e);
            notify.error('Erro ao carregar veículos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [filtroStatus, filtroTipo, busca]);

    useEffect(() => { carregar(); }, [carregar]);

    const naoInativos = lista.filter(v => v.status !== 'inativo');
    const emObra = naoInativos.filter(v => v.local_tipo === 'obra').length;
    const emImovel = naoInativos.filter(v => v.local_tipo === 'imovel').length;
    const semLocal = naoInativos.filter(v => !v.local_tipo).length;

    const onSaved = () => {
        setModal({ open: false, veiculo: null });
        carregar();
        reloadRefs?.();
    };

    const inativar = async (v) => {
        const ok = await confirmDialog(`Inativar o veículo ${placaBR(v.placa)}? O histórico é mantido.`, { danger: true });
        if (!ok) return;
        try {
            await frotaApi.inativarVeiculo(v.id);
            notify.success('Veículo inativado.');
            carregar(); reloadRefs?.();
        } catch (e) {
            logger.error('inativar veiculo', e);
            notify.error(e.message || 'Erro ao inativar.');
        }
    };

    const detalhe = detalheId != null ? lista.find(v => v.id === detalheId) : null;

    if (detalhe) {
        return (
            <DetalheVeiculo
                veiculo={detalhe} obras={obras} imoveis={imoveis} condutores={condutores}
                onVoltar={() => setDetalheId(null)}
                onChanged={() => { carregar(); reloadRefs?.(); }}
            />
        );
    }

    return (
        <>
            <div className="frota-kpis">
                <div className="frota-kpi accent"><div className="frota-kpi-lbl"><i className="ti ti-truck" /> Veículos</div><div className="frota-kpi-val">{naoInativos.length}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-building-community" /> Em obra</div><div className="frota-kpi-val">{emObra}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-home" /> Em imóvel</div><div className="frota-kpi-val">{emImovel}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-map-pin-off" /> Sem local</div><div className="frota-kpi-val">{semLocal}</div></div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-truck" /> Veículos</div>
                    <div className="frota-card-actions">
                        <input className="frota-inp" style={{ maxWidth: 180 }} placeholder="Placa, modelo…" value={busca} onChange={e => setBusca(e.target.value)} />
                        <select className="frota-inp" style={{ maxWidth: 150 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                            <option value="">Todos os tipos</option>
                            {TIPOS_VEICULO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <select className="frota-inp" style={{ maxWidth: 160 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                            <option value="">Todos os status</option>
                            <option value="ativo">Ativo</option>
                            <option value="em_manutencao">Em manutenção</option>
                            <option value="vendido">Vendido</option>
                            <option value="inativo">Inativo</option>
                        </select>
                        <button className="frota-btn frota-btn-primary" onClick={() => setModal({ open: true, veiculo: null })}>
                            <i className="ti ti-plus" /> Novo veículo
                        </button>
                    </div>
                </div>

                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead><tr><th>Veículo</th><th>Tipo</th><th>Local atual</th><th>Condutor</th><th>KM</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={7} className="frota-empty">Nenhum veículo.</td></tr>}
                            {lista.map(v => {
                                const sb = statusVeiculoBadge(v.status);
                                return (
                                    <tr key={v.id} className="clickable" onClick={() => setDetalheId(v.id)}>
                                        <td>
                                            <div className="frota-cell-main">{placaBR(v.placa)}</div>
                                            <div className="frota-cell-sub">{v.marca ? `${v.marca} ` : ''}{v.modelo}</div>
                                        </td>
                                        <td className="frota-muted">{tipoVeiculoLabel(v.tipo)}</td>
                                        <td><TagLocal item={v} /></td>
                                        <td className="frota-muted">{v.condutor_atual_nome || '—'}</td>
                                        <td className="frota-muted">{v.km_atual != null ? Number(v.km_atual).toLocaleString('pt-BR') : '—'}</td>
                                        <td><span className={`frota-badge ${sb.cls}`}>{sb.label}</span></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="frota-btn frota-btn-text frota-btn-sm" title="Detalhes" onClick={() => setDetalheId(v.id)}><i className="ti ti-eye" /></button>
                                            <button className="frota-btn frota-btn-text frota-btn-sm" title="Editar" onClick={() => setModal({ open: true, veiculo: v })}><i className="ti ti-pencil" /></button>
                                            {v.status !== 'inativo' && <button className="frota-btn frota-btn-text frota-btn-sm" title="Inativar" onClick={() => inativar(v)}><i className="ti ti-trash" /></button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <div className="frota-hint"><i className="ti ti-info-circle" /> Clique num veículo para ver documentos, movimentações, manutenções, abastecimentos e multas.</div>
            </div>

            <VeiculoModal
                isOpen={modal.open}
                veiculo={modal.veiculo}
                obras={obras}
                imoveis={imoveis}
                onClose={() => setModal({ open: false, veiculo: null })}
                onSaved={onSaved}
            />
        </>
    );
}
