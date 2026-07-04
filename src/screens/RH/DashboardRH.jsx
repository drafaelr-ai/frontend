import React, { useState, useEffect } from 'react';
import { rhApi } from './rhApi';
import { logger } from '../../utils/logger';
import { brlShort, brl, competenciaAtual, opcoesCompetencia } from './rhFormat';

const CAT_ICON = [
    [/pedreiro/i, 'ti-tools'],
    [/servente/i, 'ti-shovel'],
    [/carpinteiro/i, 'ti-ruler-2'],
    [/armador/i, 'ti-rebar'],
    [/mestre/i, 'ti-hard-hat'],
];
const iconCategoria = (nome) => (CAT_ICON.find(([re]) => re.test(nome || '')) || [null, 'ti-user'])[1];

const TIPO_BARRA = {
    inss_darf: { cls: 'purple', badge: 'rh-b-purple' },
    fgts: { cls: 'info', badge: 'rh-b-info' },
    esocial_dae: { cls: 'neutral', badge: 'rh-b-neutral' },
    outro: { cls: '', badge: 'rh-b-neutral' },
};

export default function DashboardRH() {
    const [competencia, setCompetencia] = useState(competenciaAtual());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const opcoes = opcoesCompetencia(12);

    useEffect(() => {
        let vivo = true;
        setLoading(true);
        rhApi.dashboard(competencia)
            .then(d => { if (vivo) setData(d); })
            .catch(e => logger.error('RH dashboard', e))
            .finally(() => { if (vivo) setLoading(false); });
        return () => { vivo = false; };
    }, [competencia]);

    if (loading && !data) return <div className="rh-loading">Carregando…</div>;
    if (!data) return <div className="rh-empty">Não foi possível carregar o dashboard.</div>;

    const maxMo = Math.max(1, ...data.mo_por_obra.map(o => o.total));
    const maxSeg = Math.max(1, ...data.folha_por_segmento.map(s => s.total));
    const maxEnc = Math.max(1, ...data.encargos_por_tipo.map(e => e.total));

    const vazio = (data.folha_total === 0 && data.encargos_total === 0
        && data.mo_por_obra.length === 0 && data.folha_por_segmento.length === 0
        && data.encargos_por_tipo.length === 0);

    return (
        <>
            <div className="rh-dash-period">
                <div className="rh-ttl"><i className="ti ti-calendar" /> {opcoes.find(o => o.value === competencia)?.label || competencia}</div>
                <select className="rh-inp" style={{ maxWidth: 190 }} value={competencia}
                    onChange={e => setCompetencia(e.target.value)}>
                    {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            <div className="rh-kpis">
                <div className="rh-kpi accent">
                    <div className="rh-kpi-lbl"><i className="ti ti-wallet" /> Folha (salários)</div>
                    <div className="rh-kpi-val">{brlShort(data.folha_total)}</div>
                </div>
                <div className="rh-kpi">
                    <div className="rh-kpi-lbl"><i className="ti ti-receipt-tax" /> Encargos</div>
                    <div className="rh-kpi-val">{brlShort(data.encargos_total)}</div>
                </div>
                <div className="rh-kpi">
                    <div className="rh-kpi-lbl"><i className="ti ti-coins" /> Custo total de MO</div>
                    <div className="rh-kpi-val">{brlShort(data.custo_total)}</div>
                </div>
                <div className="rh-kpi">
                    <div className="rh-kpi-lbl"><i className="ti ti-percentage" /> Encargos / folha</div>
                    <div className="rh-kpi-val">{data.pct_encargos == null ? '—' : `${data.pct_encargos}%`}</div>
                </div>
            </div>

            {vazio && (
                <div className="rh-card" style={{ textAlign: 'center' }}>
                    <div className="rh-empty">
                        <i className="ti ti-inbox" style={{ fontSize: 40, display: 'block', marginBottom: 'var(--space-3)', color: 'var(--border-strong)' }} />
                        Nenhum lançamento nesta competência.
                        <div className="rh-hint" style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                            <i className="ti ti-info-circle" /> Registre pagamentos e encargos para ver os gráficos aqui.
                        </div>
                    </div>
                </div>
            )}

            {!vazio && <div className="rh-dash-grid">
                {/* MO por obra */}
                <div className="rh-card" style={{ margin: 0 }}>
                    <div className="rh-card-head">
                        <div className="rh-card-title"><i className="ti ti-building-community" /> Mão de obra por obra</div>
                    </div>
                    {data.mo_por_obra.length === 0 && <div className="rh-empty">Sem dados nesta competência.</div>}
                    {data.mo_por_obra.map((o, i) => {
                        const semObra = o.obra_id == null;
                        const salFlex = Math.max(1, Math.round(o.salarios));
                        const encFlex = Math.max(0, Math.round(o.encargos));
                        return (
                            <div className="rh-bar-row" key={i}>
                                <div className={`rh-bar-label${semObra ? ' rh-muted' : ''}`}>
                                    <i className={`ti ${semObra ? 'ti-minus' : 'ti-building'}`} /> {o.obra}
                                    {o.encargo_estimado &&
                                        <span className="rh-badge rh-b-neutral" title="Inclui rateio proporcional de encargos gerais"
                                            style={{ marginLeft: 6 }}>rateio estimado</span>}
                                </div>
                                <div className="rh-bar-track">
                                    <div className="rh-bar-stack" style={{ width: `${(o.total / maxMo) * 100}%` }}>
                                        <div className="rh-seg rh-seg-sal" style={{ flexGrow: salFlex, flexBasis: 0 }} />
                                        {encFlex > 0 && <div className="rh-seg rh-seg-enc" style={{ flexGrow: encFlex, flexBasis: 0 }} />}
                                    </div>
                                </div>
                                <div className="rh-bar-val">{brlShort(o.total)}</div>
                            </div>
                        );
                    })}
                    <div className="rh-legend">
                        <span className="rh-legend-k"><span className="rh-legend-sw" style={{ background: 'var(--brand-primary)' }} /> Salários</span>
                        <span className="rh-legend-k"><span className="rh-legend-sw" style={{ background: 'var(--brand-accent)' }} /> Encargos</span>
                    </div>
                </div>

                {/* Folha por segmento */}
                <div className="rh-card" style={{ margin: 0 }}>
                    <div className="rh-card-head">
                        <div className="rh-card-title"><i className="ti ti-chart-bar" /> Folha por segmento</div>
                    </div>
                    {data.folha_por_segmento.length === 0 && <div className="rh-empty">Sem dados nesta competência.</div>}
                    {data.folha_por_segmento.map((s, i) => (
                        <div className="rh-bar-row" key={i}>
                            <div className="rh-bar-label">
                                <i className={`ti ${iconCategoria(s.categoria)}`} /> {s.categoria} <span className="rh-q">·{s.qtd}</span>
                            </div>
                            <div className="rh-bar-track">
                                <div className="rh-bar-fill" style={{ width: `${(s.total / maxSeg) * 100}%` }} />
                            </div>
                            <div className="rh-bar-val">{brlShort(s.total)}</div>
                        </div>
                    ))}
                </div>
            </div>}

            {/* Encargos por tipo */}
            {!vazio && <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-receipt-tax" /> Encargos por tipo</div>
                    <div className="rh-card-actions"><span className="rh-valor" style={{ fontSize: 'var(--text-lg)' }}>{brlShort(data.encargos_total)}</span></div>
                </div>
                <div className="rh-dash-grid" style={{ margin: 0 }}>
                    <div>
                        {data.encargos_por_tipo.length === 0 && <div className="rh-empty">Sem encargos nesta competência.</div>}
                        {data.encargos_por_tipo.map((e, i) => {
                            const cfg = TIPO_BARRA[e.tipo] || TIPO_BARRA.outro;
                            return (
                                <div className="rh-bar-row" key={i}>
                                    <div className="rh-bar-label"><span className={`rh-badge ${cfg.badge}`}>{e.label}</span></div>
                                    <div className="rh-bar-track">
                                        <div className={`rh-bar-fill ${cfg.cls}`} style={{ width: `${(e.total / maxEnc) * 100}%` }} />
                                    </div>
                                    <div className="rh-bar-val">{brl(e.total)}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="rh-hint" style={{ margin: 0 }}>
                            <i className="ti ti-info-circle" /> Encargos não vinculados a obra entram como custo geral. Para ver o custo por obra incluindo encargos, use o rateio no card "Mão de obra por obra".
                        </div>
                    </div>
                </div>
            </div>}
        </>
    );
}
