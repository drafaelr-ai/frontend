import React, { useState, useEffect, useCallback, useRef } from 'react';
import { rhApi } from './rhApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, competenciaAtual, opcoesCompetencia } from './rhFormat';
import PagamentoSalarioModal from '../../components/modals/PagamentoSalarioModal';

const TIPO_BADGE = { salario: 'rh-b-success', vale: 'rh-b-purple', outro: 'rh-b-neutral' };
const TIPO_LABEL = { salario: 'Salário', vale: 'Vale', outro: 'Outro' };

export default function PagamentosRH() {
    const [competencia, setCompetencia] = useState(competenciaAtual());
    const [lista, setLista] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const opcoes = opcoesCompetencia(12);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const [pags, funcs] = await Promise.all([
                rhApi.pagamentos(`?competencia=${competencia}`),
                rhApi.funcionarios('?status=ativo'),
            ]);
            if (reqIdRef.current !== reqId) return; // resposta obsoleta, competência já mudou
            setLista(Array.isArray(pags) ? pags : []);
            setFuncionarios(Array.isArray(funcs) ? funcs : []);
        } catch (e) {
            if (reqIdRef.current !== reqId) return;
            logger.error('RH pagamentos', e);
            notify.error('Erro ao carregar pagamentos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [competencia]);

    useEffect(() => { carregar(); }, [carregar]);

    const salarios = lista.filter(p => p.tipo === 'salario');
    const totalPago = salarios.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const totalVales = lista.filter(p => p.tipo === 'vale').reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const pagosIds = new Set(salarios.map(p => p.funcionario_id));
    const pendentes = Math.max(0, funcionarios.length - pagosIds.size);
    const obrasComFolha = new Set(salarios.map(p => p.obra_id ?? 'sem')).size;

    const abrirComprovante = async (p) => {
        try {
            const { url } = await rhApi.arquivoUrl('comprovante', p.id);
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            notify.error(e.message || 'Comprovante indisponível.');
        }
    };

    const remover = async (p) => {
        const ok = await confirmDialog(`Remover este pagamento de ${p.funcionario_nome}?`, { danger: true });
        if (!ok) return;
        try {
            await rhApi.removerPagamento(p.id);
            notify.success('Pagamento removido.');
            carregar();
        } catch (e) { logger.error('remover pag', e); notify.error('Erro ao remover.'); }
    };

    return (
        <>
            <div className="rh-kpis">
                <div className="rh-kpi accent"><div className="rh-kpi-lbl"><i className="ti ti-cash" /> Pago (salários)</div><div className="rh-kpi-val">{brlShort(totalPago)}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-clock-dollar" /> Vales / adiantamentos</div><div className="rh-kpi-val">{brlShort(totalVales)}</div></div>
                <div className="rh-kpi alert"><div className="rh-kpi-lbl"><i className="ti ti-alert-circle" /> Salários pendentes</div><div className="rh-kpi-val">{pendentes}</div></div>
                <div className="rh-kpi"><div className="rh-kpi-lbl"><i className="ti ti-building" /> Obras com folha</div><div className="rh-kpi-val">{obrasComFolha}</div></div>
            </div>

            <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-cash" /> Pagamentos — {opcoes.find(o => o.value === competencia)?.label || competencia}</div>
                    <div className="rh-card-actions">
                        <select className="rh-inp" style={{ maxWidth: 170 }} value={competencia} onChange={e => setCompetencia(e.target.value)}>
                            {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button className="rh-btn rh-btn-primary" onClick={() => setModalOpen(true)}><i className="ti ti-plus" /> Registrar pagamento</button>
                    </div>
                </div>

                {loading ? <div className="rh-loading">Carregando…</div> : (
                    <table className="rh-table">
                        <thead><tr><th>Funcionário</th><th>Tipo</th><th>Obra (no pagamento)</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={6} className="rh-empty">Nenhum pagamento nesta competência.</td></tr>}
                            {lista.map(p => (
                                <tr key={p.id}>
                                    <td className="rh-cell-main">{p.funcionario_nome}</td>
                                    <td><span className={`rh-badge ${TIPO_BADGE[p.tipo] || 'rh-b-neutral'}`}>{TIPO_LABEL[p.tipo] || p.tipo}</span></td>
                                    <td>
                                        {p.obra_id != null
                                            ? <span className="rh-tag-obra"><i className="ti ti-building" style={{ fontSize: 12 }} /> {p.obra_nome}</span>
                                            : <span className="rh-tag-obra none"><i className="ti ti-minus" style={{ fontSize: 12 }} /> Sem obra</span>}
                                    </td>
                                    <td className="rh-muted">{dataBR(p.data_pagamento)}</td>
                                    <td className="rh-valor">{brl(p.valor)}</td>
                                    <td>
                                        {p.comprovante_url && <button className="rh-btn rh-btn-text rh-btn-sm" title="Ver comprovante" onClick={() => abrirComprovante(p)}><i className="ti ti-paperclip" /></button>}
                                        <button className="rh-btn rh-btn-text rh-btn-sm" title="Remover" onClick={() => remover(p)}><i className="ti ti-trash" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="rh-hint"><i className="ti ti-info-circle" /> A obra é gravada junto com o pagamento. Se o funcionário migrar de obra depois, o histórico de custo de cada obra continua correto.</div>
            </div>

            <PagamentoSalarioModal
                isOpen={modalOpen}
                funcionarios={funcionarios}
                competenciaDefault={competencia}
                onClose={() => setModalOpen(false)}
                onSaved={() => { setModalOpen(false); carregar(); }}
            />
        </>
    );
}
