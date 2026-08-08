import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';
import { brl, dataHoraBR, resumoItens } from './solicitacoesFormat';
import SolicitacaoDetalhe from './SolicitacaoDetalhe';

/** Compras já atendidas pelo comprador — saíram da lista de compras.
    A baixa é reversível pelo detalhe (botão "Reabrir compra"). */
export default function HistoricoCompras({ obras, user }) {
    const [lista, setLista] = useState(null);           // null = carregando
    const [fObra, setFObra] = useState('');
    const [busca, setBusca] = useState('');
    const [detalheId, setDetalheId] = useState(null);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        try {
            const data = await solicitacoesApi.historico(fObra ? `obra_id=${fObra}` : '');
            if (reqId === reqIdRef.current) setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            logger.error('histórico de compras', e);
            if (reqId === reqIdRef.current) {
                setLista([]);
                notify.error(e.message || 'Erro ao carregar o histórico de compras.');
            }
        }
    }, [fObra]);

    useEffect(() => { carregar(); }, [carregar]);

    if (detalheId) {
        return (
            <SolicitacaoDetalhe
                solicitacaoId={detalheId}
                user={user}
                voltarLabel="Voltar ao histórico"
                onVoltar={() => { setDetalheId(null); carregar(); }}
            />
        );
    }

    const filtrada = (lista || []).filter(s => {
        if (!busca) return true;
        const alvo = `${s.id} ${s.obra_nome || ''} ${s.solicitante_nome || ''} ${s.tipo || ''} `
            + `${s.fornecedor_aprovado || ''} ${s.atendida_por_nome || ''} ${s.resumo || ''}`;
        return alvo.toLowerCase().includes(busca.toLowerCase());
    });

    const totalGasto = filtrada.reduce((acc, s) => acc + (Number(s.valor_aprovado) || 0), 0);
    const mesAtual = new Date().toISOString().slice(0, 7);
    const noMes = filtrada.filter(s => (s.data_atendimento || '').slice(0, 7) === mesAtual).length;

    return (
        <>
            <div className="solc-kpis">
                <div className="solc-kpi accent">
                    <div className="solc-kpi-lbl"><i className="ti ti-package" /> Compras atendidas</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : filtrada.length}</div>
                </div>
                <div className="solc-kpi">
                    <div className="solc-kpi-lbl"><i className="ti ti-cash" /> Valor total</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : brl(totalGasto)}</div>
                </div>
                <div className="solc-kpi">
                    <div className="solc-kpi-lbl"><i className="ti ti-calendar" /> Atendidas neste mês</div>
                    <div className="solc-kpi-val">{lista == null ? '…' : noMes}</div>
                </div>
                <div className="solc-kpi">
                    <div className="solc-kpi-lbl"><i className="ti ti-building-community" /> Obras</div>
                    <div className="solc-kpi-val">
                        {lista == null ? '…' : new Set(filtrada.map(s => s.obra_id)).size}
                    </div>
                </div>
            </div>

            <div className="solc-card">
                <div className="solc-card-head">
                    <div className="solc-card-title"><i className="ti ti-history" /> Histórico de compras</div>
                    <div className="solc-card-actions">
                        <input
                            className="solc-inp" style={{ width: 180 }} placeholder="Buscar…"
                            value={busca} onChange={e => setBusca(e.target.value)}
                        />
                        <select className="solc-inp" style={{ width: 170 }} value={fObra} onChange={e => setFObra(e.target.value)}>
                            <option value="">Todas as obras</option>
                            {(obras || []).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                        </select>
                    </div>
                </div>

                {lista == null ? (
                    <div className="solc-loading">Carregando…</div>
                ) : filtrada.length === 0 ? (
                    <div className="solc-empty">
                        <i className="ti ti-package-off" style={{ fontSize: 28 }} /><br />
                        Nenhuma compra atendida ainda. Ao marcar uma compra aprovada como
                        atendida, ela sai da lista de compras e aparece aqui.
                    </div>
                ) : (
                    <table className="solc-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Obra</th>
                                <th>Itens</th>
                                <th>Fornecedor</th>
                                <th>Solicitante</th>
                                <th>Atendida por</th>
                                <th>Atendida em</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrada.map(s => (
                                <tr key={s.id} className="clickable" onClick={() => setDetalheId(s.id)}>
                                    <td className="solc-cell-main">#{s.id}</td>
                                    <td>{s.obra_nome || '—'}</td>
                                    <td>
                                        <div className="solc-cell-main">{s.resumo || resumoItens(s.itens, s.qtd_itens)}</div>
                                        <div className="solc-cell-sub">{s.tipo}</div>
                                    </td>
                                    <td>{s.fornecedor_aprovado || '—'}</td>
                                    <td>{s.solicitante_nome}</td>
                                    <td>
                                        <div>{s.atendida_por_nome || '—'}</div>
                                        {s.observacao_atendimento && (
                                            <div className="solc-cell-sub">{s.observacao_atendimento}</div>
                                        )}
                                    </td>
                                    <td className="solc-cell-sub">{dataHoraBR(s.data_atendimento)}</td>
                                    <td className="solc-cell-main">{s.valor_aprovado != null ? brl(s.valor_aprovado) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
