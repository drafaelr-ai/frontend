import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import {
    brl, brlShort, dataBR, placaBR, tipoDocLabel,
    competenciaAtual, opcoesCompetencia,
} from './frotaFormat';

export default function DashboardFrota() {
    const [competencia, setCompetencia] = useState(competenciaAtual());
    const [dash, setDash] = useState(null);
    const [loading, setLoading] = useState(true);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const data = await frotaApi.dashboard(competencia);
            if (reqIdRef.current !== reqId) return;
            setDash(data);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('Frota dashboard', e);
            notify.error('Erro ao carregar o dashboard da Frota.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [competencia]);

    useEffect(() => { carregar(); }, [carregar]);

    if (loading || !dash) return <div className="frota-loading">Carregando…</div>;

    const custo = dash.custo_mes || {};
    const docsVencidos = dash.documentos_vencidos || [];
    const docsAVencer = dash.documentos_a_vencer || [];
    const cnhs = dash.cnhs_a_vencer || [];
    const custoLocal = dash.custo_por_local || [];
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
        </>
    );
}
