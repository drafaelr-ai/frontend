import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';
import { dataBR, dataHoraBR, statusBadge, resumoItens, STATUS_SOLICITACAO } from './solicitacoesFormat';
import SolicitacaoDetalhe from './SolicitacaoDetalhe';
import NovaSolicitacaoModal from '../../components/modals/NovaSolicitacaoModal';

export default function SolicitacoesList({ obras, user }) {
    const [lista, setLista] = useState(null);           // null = carregando
    const [fStatus, setFStatus] = useState('');
    const [fObra, setFObra] = useState('');
    const [busca, setBusca] = useState('');
    const [detalheId, setDetalheId] = useState(null);
    const [modalNova, setModalNova] = useState(false);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        try {
            const params = new URLSearchParams();
            if (fStatus) params.set('status', fStatus);
            if (fObra) params.set('obra_id', fObra);
            const qs = params.toString();
            const data = await solicitacoesApi.listar(qs ? `?${qs}` : '');
            if (reqId === reqIdRef.current) setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            logger.error('listar solicitações', e);
            if (reqId === reqIdRef.current) {
                setLista([]);
                notify.error(e.message || 'Erro ao carregar solicitações.');
            }
        }
    }, [fStatus, fObra]);

    useEffect(() => { carregar(); }, [carregar]);

    if (detalheId) {
        return (
            <SolicitacaoDetalhe
                solicitacaoId={detalheId}
                user={user}
                onVoltar={() => { setDetalheId(null); carregar(); }}
            />
        );
    }

    const filtrada = (lista || []).filter(s => {
        if (!busca) return true;
        const alvo = `${s.id} ${s.obra_nome || ''} ${s.solicitante_nome || ''} ${s.tipo || ''}`.toLowerCase();
        return alvo.includes(busca.toLowerCase());
    });

    const abertas = (lista || []).filter(s => ['Aberta', 'Em cotação'].includes(s.status)).length;
    const aguardando = (lista || []).filter(s => s.status === 'Aguardando aprovação').length;
    const aprovadas = (lista || []).filter(s => s.status === 'Aprovada').length;

    return (
        <>
            <div className="solc-kpis">
                <div className="solc-kpi accent">
                    <div className="solc-kpi-lbl"><i className="ti ti-list-details" /> Total</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : lista.length}</div>
                </div>
                <div className="solc-kpi">
                    <div className="solc-kpi-lbl"><i className="ti ti-search" /> Em cotação</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : abertas}</div>
                </div>
                <div className={`solc-kpi${aguardando ? ' alert' : ''}`}>
                    <div className="solc-kpi-lbl"><i className="ti ti-clock" /> Aguardando aprovação</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : aguardando}</div>
                </div>
                <div className="solc-kpi">
                    <div className="solc-kpi-lbl"><i className="ti ti-check" /> Aprovadas</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : aprovadas}</div>
                </div>
            </div>

            <div className="solc-card">
                <div className="solc-card-head">
                    <div className="solc-card-title"><i className="ti ti-shopping-cart" /> Solicitações de compra</div>
                    <div className="solc-card-actions">
                        <input
                            className="solc-inp" style={{ width: 180 }} placeholder="Buscar…"
                            value={busca} onChange={e => setBusca(e.target.value)}
                        />
                        <select className="solc-inp" style={{ width: 170 }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                            <option value="">Todos os status</option>
                            {STATUS_SOLICITACAO.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="solc-inp" style={{ width: 170 }} value={fObra} onChange={e => setFObra(e.target.value)}>
                            <option value="">Todas as obras</option>
                            {(obras || []).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                        </select>
                        <button className="solc-btn solc-btn-primary" onClick={() => setModalNova(true)}>
                            <i className="ti ti-plus" /> Nova solicitação
                        </button>
                    </div>
                </div>

                {lista == null ? (
                    <div className="solc-loading">Carregando…</div>
                ) : filtrada.length === 0 ? (
                    <div className="solc-empty">
                        <i className="ti ti-shopping-cart-off" style={{ fontSize: 28 }} /><br />
                        Nenhuma solicitação encontrada.
                    </div>
                ) : (
                    <table className="solc-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Obra</th>
                                <th>Itens</th>
                                <th>Solicitante</th>
                                <th>Solicitada em</th>
                                <th>Necessidade</th>
                                <th>Cotações</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrada.map(s => {
                                const b = statusBadge(s.status);
                                return (
                                    <tr key={s.id} className="clickable" onClick={() => setDetalheId(s.id)}>
                                        <td className="solc-cell-main">#{s.id}</td>
                                        <td>{s.obra_nome || '—'}</td>
                                        <td>
                                            <div className="solc-cell-main">{s.resumo || resumoItens(s.itens, s.qtd_itens)}</div>
                                            <div className="solc-cell-sub">{s.tipo}</div>
                                        </td>
                                        <td>{s.solicitante_nome}</td>
                                        <td className="solc-cell-sub">{dataHoraBR(s.data_criacao)}</td>
                                        <td className="solc-cell-sub">{dataBR(s.data_necessidade)}</td>
                                        <td>{s.qtd_cotacoes || 0}</td>
                                        <td><span className={`solc-badge ${b.cls}`}><i className={`ti ${b.icon}`} /> {b.label}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <NovaSolicitacaoModal
                isOpen={modalNova}
                obras={obras}
                onClose={() => setModalNova(false)}
                onSaved={(nova) => { setModalNova(false); carregar(); if (nova?.id) setDetalheId(nova.id); }}
            />
        </>
    );
}
