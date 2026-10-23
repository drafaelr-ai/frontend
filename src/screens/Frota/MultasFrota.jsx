import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, placaBR } from './frotaFormat';
import MultaFrotaModal from '../../components/modals/MultaFrotaModal';
import GerenciarMultaModal from '../../components/modals/GerenciarMultaModal';
import SincronizarInfracoesModal from '../../components/modals/SincronizarInfracoesModal';
import ExcecoesEFrotasModal from '../../components/modals/ExcecoesEFrotasModal';

function hojeLocal() {
    const data = new Date();
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function prazoDaMulta(multa) {
    const prazo = multa.data_limite_defesa || multa.data_vencimento_penalidade;
    if (!prazo) return null;
    const alvo = new Date(`${prazo.slice(0, 10)}T00:00:00`);
    const dias = Math.round((alvo - hojeLocal()) / 86400000);
    if (dias < 0) return { prazo, dias, classe: 'frota-due', texto: `Prazo vencido em ${dataBR(prazo)}` };
    if (dias <= 7) return { prazo, dias, classe: 'frota-due-soon', texto: dias === 0 ? 'Prazo vence hoje' : `Prazo em ${dias} dia${dias === 1 ? '' : 's'}` };
    return { prazo, dias, classe: '', texto: `Defesa até ${dataBR(prazo)}` };
}

function statusOficial(multa) {
    if (multa.origem !== 'efrotas' || !multa.situacao_efrotas) return null;
    const mapa = {
        ativa: { texto: 'Ativa', classe: 'frota-b-info' },
        suspensa: { texto: 'Suspensa', classe: 'frota-b-warning' },
        cancelada: { texto: 'Cancelada', classe: 'frota-b-neutral' },
    };
    return mapa[multa.situacao_efrotas] || null;
}

export default function MultasFrota({ condutores }) {
    const { user } = useContext(AuthContext) || {};
    const ehGestor = user?.role === 'master' || user?.role === 'administrador';
    const [lista, setLista] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [integracao, setIntegracao] = useState(null);
    const [loadingIntegracao, setLoadingIntegracao] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroVeiculo, setFiltroVeiculo] = useState('');
    const [filtroOrigem, setFiltroOrigem] = useState('');
    const [busca, setBusca] = useState('');
    const [modal, setModal] = useState(false);
    const [modalSync, setModalSync] = useState(false);
    const [modalExcecoes, setModalExcecoes] = useState(false);
    const [multaGerenciando, setMultaGerenciando] = useState(null);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        if (ehGestor) setLoadingIntegracao(true);
        try {
            const params = new URLSearchParams();
            if (filtroStatus) params.set('status', filtroStatus);
            if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo);
            if (filtroOrigem) params.set('origem', filtroOrigem);
            if (busca.trim()) params.set('q', busca.trim());
            const qs = params.toString() ? `?${params.toString()}` : '';
            const tarefas = [frotaApi.multas(qs), frotaApi.veiculos()];
            if (ehGestor) tarefas.push(frotaApi.efrotasStatus());
            const respostas = await Promise.allSettled(tarefas);
            if (reqIdRef.current !== reqId) return;
            const [mRes, vRes, eRes] = respostas;
            if (mRes.status === 'fulfilled') setLista(Array.isArray(mRes.value) ? mRes.value : []);
            else { logger.error('Frota multas', mRes.reason); notify.error('Erro ao carregar multas.'); }
            if (vRes.status === 'fulfilled') setVeiculos(Array.isArray(vRes.value) ? vRes.value : []);
            if (ehGestor && eRes?.status === 'fulfilled') setIntegracao(eRes.value);
            else if (ehGestor && eRes?.status === 'rejected' && eRes.reason?.status !== 403) {
                logger.error('Status e-Frotas', eRes.reason);
                setIntegracao(null);
            }
        } finally {
            if (reqIdRef.current === reqId) {
                setLoading(false);
                setLoadingIntegracao(false);
            }
        }
    }, [filtroStatus, filtroVeiculo, filtroOrigem, busca, ehGestor]);

    useEffect(() => { carregar(); }, [carregar]);

    const multasAtivas = lista.filter(m => m.situacao_efrotas !== 'cancelada');
    const pendentes = multasAtivas.filter(m => m.status_pagamento === 'pendente');
    const totalPendente = pendentes.reduce((s, m) => s + (Number(m.valor) || 0), 0);
    const prazosUrgentes = multasAtivas.filter(m => {
        const prazo = prazoDaMulta(m);
        return prazo && prazo.dias <= 7;
    });
    const semCondutor = lista.filter(m => m.origem === 'efrotas' && !m.condutor_id && m.situacao_efrotas !== 'cancelada');

    const marcarPaga = async (multa) => {
        const ok = await confirmDialog(`Marcar a multa de ${brl(multa.valor)} (${placaBR(multa.veiculo_placa)}) como paga hoje?`);
        if (!ok) return;
        const hoje = hojeLocal();
        const dataPagamento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        try {
            await frotaApi.editarMulta(multa.id, {
                status_pagamento: 'paga',
                data_pagamento: dataPagamento,
            });
            notify.success('Multa marcada como paga.');
            carregar();
        } catch (e) {
            logger.error('pagar multa', e);
            notify.error(e.message || 'Erro ao atualizar multa.');
        }
    };

    const remover = async (multa) => {
        const ok = await confirmDialog('Remover esta multa manual? Esta ação não pode ser usada em infrações do e-Frotas.', { danger: true });
        if (!ok) return;
        try {
            await frotaApi.removerMulta(multa.id);
            notify.success('Multa removida.');
            carregar();
        } catch (e) {
            logger.error('remover multa', e);
            notify.error(e.message || 'Erro ao remover.');
        }
    };

    const consulta = integracao?.consulta;
    const ultimaSync = integracao?.ultima_sincronizacao;

    return (
        <>
            {ehGestor && (
                <div className="frota-efrotas-status">
                    <div className="frota-efrotas-status-main">
                        <i className={`ti ${consulta?.habilitada ? 'ti-plug-connected' : 'ti-plug-off'}`} />
                        <div>
                            <div className="frota-efrotas-status-title">
                                e-Frotas {loadingIntegracao ? '— verificando…' : consulta?.habilitada ? 'conectado' : 'aguarda configuração'}
                                {integracao?.webhook_configurado && <span className="frota-badge frota-b-success" style={{ marginLeft: 8 }}>alertas ativos</span>}
                            </div>
                            <div className="frota-efrotas-status-copy">
                                {loadingIntegracao ? 'Carregando status da integração.' : consulta?.mensagem || 'Configure a consulta histórica na API.'}
                                {ultimaSync?.finalizado_em && ` Última atualização: ${dataBR(ultimaSync.finalizado_em.slice(0, 10))}.`}
                            </div>
                        </div>
                    </div>
                    <div className="frota-efrotas-status-actions">
                        <button className="frota-btn frota-btn-secondary frota-btn-sm" onClick={() => setModalExcecoes(true)}>
                            <i className="ti ti-list-details" /> Revisar exceções{integracao?.excecoes_pendentes ? ` (${integracao.excecoes_pendentes})` : ''}
                        </button>
                        <button className="frota-btn frota-btn-primary frota-btn-sm" onClick={() => setModalSync(true)} disabled={!consulta?.habilitada} title={!consulta?.habilitada ? 'Configure o certificado/token do e-Frotas na API primeiro.' : ''}>
                            <i className="ti ti-refresh" /> Atualizar infrações
                        </button>
                    </div>
                </div>
            )}

            <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className={`frota-kpi${pendentes.length ? ' alert' : ' accent'}`}><div className="frota-kpi-lbl"><i className="ti ti-alert-triangle" /> Multas pendentes</div><div className="frota-kpi-val">{pendentes.length}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-cash" /> Valor pendente</div><div className="frota-kpi-val">{brlShort(totalPendente)}</div></div>
                <div className={`frota-kpi${prazosUrgentes.length ? ' alert' : ''}`}><div className="frota-kpi-lbl"><i className="ti ti-clock-exclamation" /> Prazos urgentes</div><div className="frota-kpi-val">{prazosUrgentes.length}</div></div>
                <div className={`frota-kpi${semCondutor.length ? ' alert' : ''}`}><div className="frota-kpi-lbl"><i className="ti ti-user-question" /> Sem condutor para revisar</div><div className="frota-kpi-val">{semCondutor.length}</div></div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div>
                        <div className="frota-card-title"><i className="ti ti-alert-triangle" /> Multas e infrações</div>
                        <div className="frota-cell-sub">Infrações do e-Frotas preservam o dado oficial; use o pagamento ou a contestação para a gestão interna.</div>
                    </div>
                    <div className="frota-card-actions">
                        <input className="frota-inp" style={{ maxWidth: 190 }} placeholder="Placa, AIT, órgão…" value={busca} onChange={e => setBusca(e.target.value)} />
                        <select className="frota-inp" style={{ maxWidth: 180 }} value={filtroVeiculo} onChange={e => setFiltroVeiculo(e.target.value)}>
                            <option value="">Todos os veículos</option>
                            {veiculos.map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                        </select>
                        <select className="frota-inp" style={{ maxWidth: 145 }} value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)}>
                            <option value="">Todas as origens</option>
                            <option value="efrotas">e-Frotas</option>
                            <option value="manual">Manual</option>
                        </select>
                        <select className="frota-inp" style={{ maxWidth: 145 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                            <option value="">Todos os status</option>
                            <option value="pendente">Pendente</option>
                            <option value="paga">Paga</option>
                            <option value="contestada">Contestada</option>
                        </select>
                        <button className="frota-btn frota-btn-secondary" onClick={carregar} title="Atualizar lista"><i className="ti ti-refresh" /></button>
                        <button className="frota-btn frota-btn-primary" onClick={() => setModal(true)}>
                            <i className="ti ti-plus" /> Nova multa
                        </button>
                    </div>
                </div>

                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <div className="frota-table-wrap">
                        <table className="frota-table">
                            <thead><tr><th>Data</th><th>Veículo</th><th>Infração</th><th>Condutor</th><th>Pontos</th><th>Situação</th><th>Valor</th><th></th></tr></thead>
                            <tbody>
                                {lista.length === 0 && <tr><td colSpan={8} className="frota-empty">Nenhuma multa para estes filtros.</td></tr>}
                                {lista.map(multa => {
                                    const prazo = prazoDaMulta(multa);
                                    const oficial = statusOficial(multa);
                                    const cancelada = multa.situacao_efrotas === 'cancelada';
                                    return (
                                        <tr key={multa.id}>
                                            <td className="frota-muted">{dataBR(multa.data_infracao)}</td>
                                            <td><div className="frota-cell-main">{placaBR(multa.veiculo_placa)}</div><div className="frota-cell-sub">{multa.veiculo_modelo}</div></td>
                                            <td>
                                                <div>{multa.descricao || '—'}</div>
                                                {multa.origem === 'efrotas' && <div className="frota-cell-sub">AIT {multa.numero_auto_infracao || '—'} · Órgão {multa.codigo_orgao_autuador || '—'}</div>}
                                                {(multa.local_autuacao || multa.municipio_autuacao) && <div className="frota-cell-sub">{[multa.local_autuacao, multa.municipio_autuacao, multa.uf_autuacao].filter(Boolean).join(' — ')}</div>}
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                                    {multa.origem === 'efrotas' && <span className="frota-badge frota-b-info">e-Frotas</span>}
                                                    {multa.fase_efrotas && <span className="frota-badge frota-b-neutral">{multa.fase_efrotas === 'penalidade' ? 'Penalidade' : 'Autuação'}</span>}
                                                </div>
                                            </td>
                                            <td className="frota-muted">
                                                {multa.condutor_nome || <span className={multa.origem === 'efrotas' ? 'frota-due-soon' : ''}>Revisar atribuição</span>}
                                            </td>
                                            <td className="frota-muted">{multa.pontos ?? '—'}</td>
                                            <td>
                                                <span className={`frota-badge ${multa.status_pagamento === 'paga' ? 'frota-b-success' : multa.status_pagamento === 'contestada' ? 'frota-b-info' : 'frota-b-warning'}`}>{multa.status_pagamento}</span>
                                                {oficial && <span className={`frota-badge ${oficial.classe}`} style={{ marginLeft: 5 }}>{oficial.texto}</span>}
                                                {prazo && <div className={`frota-cell-sub ${prazo.classe}`}>{prazo.texto}</div>}
                                                {multa.status_pagamento === 'paga' && multa.data_pagamento && <div className="frota-cell-sub">Pago em {dataBR(multa.data_pagamento)}</div>}
                                            </td>
                                            <td className="frota-valor">{brl(multa.valor)}</td>
                                            <td>
                                                <button className="frota-btn frota-btn-text frota-btn-sm" title="Definir responsável e situação" onClick={() => setMultaGerenciando(multa)}><i className="ti ti-clipboard-check" /></button>
                                                {multa.status_pagamento === 'pendente' && !cancelada && <button className="frota-btn frota-btn-text frota-btn-sm" title="Marcar como paga" onClick={() => marcarPaga(multa)}><i className="ti ti-check" /></button>}
                                                {multa.origem !== 'efrotas' && <button className="frota-btn frota-btn-text frota-btn-sm" title="Remover multa manual" onClick={() => remover(multa)}><i className="ti ti-trash" /></button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <MultaFrotaModal
                isOpen={modal} veiculos={veiculos} condutores={condutores}
                onClose={() => setModal(false)}
                onSaved={() => { setModal(false); carregar(); }}
            />
            <GerenciarMultaModal
                isOpen={!!multaGerenciando}
                multa={multaGerenciando}
                condutores={condutores}
                onClose={() => setMultaGerenciando(null)}
                onSaved={() => { setMultaGerenciando(null); carregar(); }}
            />
            <SincronizarInfracoesModal
                isOpen={modalSync} veiculos={veiculos.filter(v => v.status !== 'inativo')}
                onClose={() => setModalSync(false)}
                onSynced={carregar}
            />
            <ExcecoesEFrotasModal
                isOpen={modalExcecoes}
                onClose={() => setModalExcecoes(false)}
                onChanged={carregar}
            />
        </>
    );
}
