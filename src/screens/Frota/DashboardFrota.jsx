import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import {
    brl, brlShort, dataBR, placaBR, tipoDocLabel,
    competenciaAtual, opcoesCompetencia,
} from './frotaFormat';

function hojeISOlocal() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

export default function DashboardFrota() {
    const [competencia, setCompetencia] = useState(competenciaAtual());
    const [dash, setDash] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        setErro('');
        try {
            const data = await frotaApi.dashboard(competencia);
            if (reqIdRef.current !== reqId) return;
            setDash(data);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('Frota dashboard', e);
            setErro(e.message || 'Erro ao carregar o dashboard da Frota.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [competencia]);

    useEffect(() => { carregar(); }, [carregar]);

    if (loading) return <div className="frota-loading">Carregando…</div>;
    if (erro || !dash) return (
        <div className="frota-card">
            <div className="frota-empty">
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} /> {erro || 'Não foi possível montar a visão geral.'}
                <div style={{ marginTop: 12 }}><button className="frota-btn frota-btn-secondary" onClick={carregar}><i className="ti ti-refresh" /> Tentar novamente</button></div>
            </div>
        </div>
    );

    const custo = dash.custo_mes || {};
    const docsVencidos = dash.documentos_vencidos || [];
    const docsAVencer = dash.documentos_a_vencer || [];
    const cnhs = dash.cnhs_a_vencer || [];
    const custoLocal = dash.custo_por_local || [];
    const multasPendentes = dash.multas_pendentes || [];
    const multasPrazos = dash.multas_prazos_urgentes || [];
    const maxLocal = Math.max(...custoLocal.map(l => l.total), 1);

    return (
        <>
            <div className="frota-dash-period">
                <div className="frota-ttl"><i className="ti ti-calendar" /> Competência</div>
                <select className="frota-inp" style={{ maxWidth: 200 }} value={competencia} onChange={e => setCompetencia(e.target.value)}>
                    {opcoesCompetencia(12).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            <div className="frota-kpis">
                <div className="frota-kpi accent"><div className="frota-kpi-lbl"><i className="ti ti-truck" /> Veículos ativos</div><div className="frota-kpi-val">{dash.veiculos_ativos ?? 0}</div></div>
                <div className="frota-kpi"><div className="frota-kpi-lbl"><i className="ti ti-cash" /> Custo do mês</div><div className="frota-kpi-val">{brlShort(custo.total)}</div></div>
                <div className={`frota-kpi${docsVencidos.length ? ' alert' : ''}`}><div className="frota-kpi-lbl"><i className="ti ti-file-alert" /> Docs vencidos</div><div className="frota-kpi-val">{docsVencidos.length}</div></div>
                <div className={`frota-kpi${cnhs.length ? ' alert' : ''}`}><div className="frota-kpi-lbl"><i className="ti ti-id" /> CNHs vencendo</div><div className="frota-kpi-val">{cnhs.length}</div></div>
            </div>

            <div className="frota-dash-grid">
                <div className="frota-card" style={{ marginBottom: 0 }}>
                    <div className="frota-card-head">
                        <div className="frota-card-title"><i className="ti ti-chart-bar" /> Custo do mês</div>
                    </div>
                    <div className="frota-bar-row">
                        <div className="frota-bar-label"><i className="ti ti-tool" /> Manutenções</div>
                        <div className="frota-bar-track"><div className="frota-bar-fill" style={{ width: `${custo.total ? (custo.manutencoes / custo.total) * 100 : 0}%` }} /></div>
                        <div className="frota-bar-val">{brl(custo.manutencoes)}</div>
                    </div>
                    <div className="frota-bar-row">
                        <div className="frota-bar-label"><i className="ti ti-gas-station" /> Abastecimentos</div>
                        <div className="frota-bar-track"><div className="frota-bar-fill sky" style={{ width: `${custo.total ? (custo.abastecimentos / custo.total) * 100 : 0}%` }} /></div>
                        <div className="frota-bar-val">{brl(custo.abastecimentos)}</div>
                    </div>
                    <div className="frota-bar-row">
                        <div className="frota-bar-label"><i className="ti ti-alert-triangle" /> Multas pagas</div>
                        <div className="frota-bar-track"><div className="frota-bar-fill" style={{ width: `${custo.total ? (custo.multas_pagas / custo.total) * 100 : 0}%`, background: 'var(--status-danger)' }} /></div>
                        <div className="frota-bar-val">{brl(custo.multas_pagas)}</div>
                    </div>
                </div>

                <div className="frota-card" style={{ marginBottom: 0 }}>
                    <div className="frota-card-head">
                        <div className="frota-card-title"><i className="ti ti-map-pin" /> Custo por local</div>
                    </div>
                    {custoLocal.length === 0 && <div className="frota-empty">Sem custos na competência.</div>}
                    {custoLocal.map((l, i) => (
                        <div className="frota-bar-row" key={i}>
                            <div className="frota-bar-label">
                                <i className={`ti ${l.local_tipo === 'obra' ? 'ti-building' : l.local_tipo === 'imovel' ? 'ti-home' : 'ti-minus'}`} />
                                {l.local_nome}
                            </div>
                            <div className="frota-bar-track"><div className="frota-bar-fill sky" style={{ width: `${(l.total / maxLocal) * 100}%` }} /></div>
                            <div className="frota-bar-val">{brl(l.total)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="frota-dash-grid">
                <div className="frota-card" style={{ marginBottom: 0 }}>
                    <div className="frota-card-head">
                        <div className="frota-card-title"><i className="ti ti-file-alert" /> Documentos vencidos / a vencer</div>
                    </div>
                    {docsVencidos.length + docsAVencer.length === 0 && <div className="frota-empty"><i className="ti ti-circle-check" style={{ marginRight: 6 }} /> Nenhum documento vencendo.</div>}
                    {[...docsVencidos, ...docsAVencer].slice(0, 8).map(d => (
                        <div className="frota-bar-row" key={d.id} style={{ justifyContent: 'space-between' }}>
                            <div className="frota-bar-label" style={{ width: 'auto', flex: 1 }}>
                                <i className="ti ti-file-text" /> {tipoDocLabel(d.tipo)} — {placaBR(d.veiculo_placa)}
                            </div>
                            <span className={`frota-badge ${d.status === 'vencido' ? 'frota-b-danger' : 'frota-b-warning'}`}>
                                {d.status === 'vencido' ? 'Vencido' : 'Vence'} {dataBR(d.data_vencimento)}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="frota-card" style={{ marginBottom: 0 }}>
                    <div className="frota-card-head">
                        <div className="frota-card-title"><i className="ti ti-id" /> CNHs vencendo (30 dias)</div>
                    </div>
                    {cnhs.length === 0 && <div className="frota-empty"><i className="ti ti-circle-check" style={{ marginRight: 6 }} /> Nenhuma CNH vencendo.</div>}
                    {cnhs.slice(0, 8).map(c => (
                        <div className="frota-bar-row" key={c.id} style={{ justifyContent: 'space-between' }}>
                            <div className="frota-bar-label" style={{ width: 'auto', flex: 1 }}>
                                <i className="ti ti-steering-wheel" /> {c.nome}{c.cnh_categoria ? ` · ${c.cnh_categoria}` : ''}
                            </div>
                            <span className={`frota-badge ${c.cnh_status === 'vencida' ? 'frota-b-danger' : 'frota-b-warning'}`}>
                                {c.cnh_status === 'vencida' ? 'Vencida' : 'Vence'} {dataBR(c.cnh_validade)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-alert-triangle" /> Infrações para acompanhar</div>
                    <span className={`frota-badge ${multasPrazos.length ? 'frota-b-danger' : 'frota-b-neutral'}`}>{multasPrazos.length} prazo(s) em 7 dias</span>
                </div>
                {multasPendentes.length === 0 && <div className="frota-empty"><i className="ti ti-circle-check" style={{ marginRight: 6 }} /> Nenhuma multa pendente.</div>}
                {multasPendentes.map(multa => {
                    const prazo = multa.data_limite_defesa || multa.data_vencimento_penalidade;
                    return (
                        <div className="frota-bar-row" key={multa.id} style={{ justifyContent: 'space-between' }}>
                            <div className="frota-bar-label" style={{ width: 'auto', flex: 1 }}>
                                <i className="ti ti-alert-triangle" /> {placaBR(multa.veiculo_placa)} · {multa.descricao || 'Infração'}
                            </div>
                            <div className="frota-cell-sub" style={{ marginRight: 12 }}>{brl(multa.valor)}</div>
                            {prazo ? <span className={`frota-badge ${prazo <= hojeISOlocal() ? 'frota-b-danger' : 'frota-b-warning'}`}>Prazo {dataBR(prazo)}</span> : <span className="frota-badge frota-b-neutral">Sem prazo</span>}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
