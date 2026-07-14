import React, { useState, useEffect, useCallback, useRef } from 'react';
import { rhApi } from './rhApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, competenciaCurta, competenciaAtual, opcoesCompetencia } from './rhFormat';
import EncargoModal from '../../components/modals/EncargoModal';

const TIPO = {
    fgts: { label: 'FGTS', badge: 'rh-b-info' },
    inss_darf: { label: 'INSS · DARF', badge: 'rh-b-purple' },
    esocial_dae: { label: 'eSocial · DAE', badge: 'rh-b-neutral' },
    outro: { label: 'Outro', badge: 'rh-b-neutral' },
};
const STATUS = {
    pago: { label: 'Pago', badge: 'rh-b-success' },
    vencido: { label: 'Vencido', badge: 'rh-b-danger' },
    a_vencer: { label: 'A vencer', badge: 'rh-b-warning' },
};

export default function EncargosRH({ obras }) {
    const [competencia, setCompetencia] = useState(competenciaAtual());
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const importInput = useRef(null);
    const opcoes = opcoesCompetencia(12);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const data = await rhApi.encargos(`?competencia=${competencia}`);
            if (reqIdRef.current !== reqId) return; // resposta obsoleta, competência já mudou
            setLista(Array.isArray(data) ? data : []);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('RH encargos', e);
            notify.error('Erro ao carregar encargos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [competencia]);

    useEffect(() => { carregar(); }, [carregar]);

    const total = lista.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalFgts = lista.filter(e => e.tipo === 'fgts').reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalInss = lista.filter(e => e.tipo === 'inss_darf').reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const seteDias = (() => {
        const hoje = new Date(); const lim = new Date(); lim.setDate(hoje.getDate() + 7);
        return lista.filter(e => e.status === 'a_vencer' && e.vencimento && new Date(e.vencimento) <= lim).length;
    })();

    const abrirGuia = async (e) => {
        try {
            const { url } = await rhApi.arquivoUrl('guia', e.id);
            window.open(url, '_blank', 'noopener');
        } catch (err) { notify.error(err.message || 'Guia indisponível.'); }
    };

    const remover = async (e) => {
        const ok = await confirmDialog('Remover este encargo?', { danger: true });
        if (!ok) return;
        try { await rhApi.removerEncargo(e.id); notify.success('Encargo removido.'); carregar(); }
        catch (err) { logger.error('remover encargo', err); notify.error('Erro ao remover.'); }
    };

    const importar = async (ev) => {
        const file = ev.target.files?.[0];
        ev.target.value = '';
        if (!file) return;
        try {
            const fd = new FormData();
            fd.append('arquivo', file);
            const r = await rhApi.importarEncargos(fd);
            notify.success(`Importados: ${r.criados} • Ignorados: ${r.ignorados}`);
            carregar();
        } catch (e) {
            logger.error('importar encargos', e);
            notify.error(e.message || 'Erro ao importar planilha.');
        }
    };

    return (
        <>
            <div className="rh-kpis">
                <div className="rh-kpi accent"><div className="rh-kpi-lbl"><i className="ti ti-receipt-tax" /> Encargos</div><div className="rh-kpi-val">{brlShort(total)}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-percentage" /> FGTS</div><div className="rh-kpi-val">{brlShort(totalFgts)}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-building-bank" /> INSS / DARF</div><div className="rh-kpi-val">{brlShort(totalInss)}</div></div>
                <div className="rh-kpi alert"><div className="rh-kpi-lbl"><i className="ti ti-calendar-due" /> A vencer (7 dias)</div><div className="rh-kpi-val">{seteDias}</div></div>
            </div>

            <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-receipt-tax" /> Encargos · guias e DARF</div>
                    <div className="rh-card-actions">
                        <select className="rh-inp" style={{ maxWidth: 170 }} value={competencia} onChange={e => setCompetencia(e.target.value)}>
                            {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button className="rh-btn rh-btn-secondary" onClick={() => importInput.current?.click()}><i className="ti ti-upload" /> Importar da contabilidade</button>
                        <input ref={importInput} type="file" accept=".xlsx,.csv" hidden onChange={importar} />
                        <button className="rh-btn rh-btn-primary" onClick={() => setModalOpen(true)}><i className="ti ti-plus" /> Registrar encargo</button>
                    </div>
                </div>

                {loading ? <div className="rh-loading">Carregando…</div> : (
                    <table className="rh-table">
                        <thead><tr><th>Tipo</th><th>Competência</th><th>Vencimento</th><th>Obra</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={7} className="rh-empty">Nenhum encargo nesta competência.</td></tr>}
                            {lista.map(e => {
                                const t = TIPO[e.tipo] || TIPO.outro;
                                const s = STATUS[e.status] || STATUS.a_vencer;
                                return (
                                    <tr key={e.id}>
                                        <td><span className={`rh-badge ${t.badge}`}>{t.label}</span></td>
                                        <td className="rh-muted">{competenciaCurta(e.competencia)}</td>
                                        <td className="rh-muted">{dataBR(e.vencimento)}</td>
                                        <td>
                                            {e.obra_id != null
                                                ? <span className="rh-tag-obra"><i className="ti ti-building" style={{ fontSize: 12 }} /> {e.obra_nome}</span>
                                                : <span className="rh-tag-obra none"><i className="ti ti-minus" style={{ fontSize: 12 }} /> Geral</span>}
                                        </td>
                                        <td><span className={`rh-badge ${s.badge}`}>{s.label}</span></td>
                                        <td className="rh-valor">{brl(e.valor)}</td>
                                        <td>
                                            {e.arquivo_url && <button className="rh-btn rh-btn-text rh-btn-sm" title="Ver guia" onClick={() => abrirGuia(e)}><i className="ti ti-file-type-pdf" /></button>}
                                            <button className="rh-btn rh-btn-text rh-btn-sm" title="Remover" onClick={() => remover(e)}><i className="ti ti-trash" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <div className="rh-hint"><i className="ti ti-info-circle" /> DARF/guias costumam ser agregados (empresa toda). Vínculo a obra ou funcionário é opcional, pra quando você quiser ratear.</div>
            </div>

            <EncargoModal
                isOpen={modalOpen}
                obras={obras}
                competenciaDefault={competencia}
                onClose={() => setModalOpen(false)}
                onSaved={() => { setModalOpen(false); carregar(); }}
            />
        </>
    );
}
