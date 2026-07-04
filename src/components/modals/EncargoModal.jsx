import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { rhApi } from '../../screens/RH/rhApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { moedaParaNumero, opcoesCompetencia } from '../../screens/RH/rhFormat';

export default function EncargoModal({ isOpen, obras, competenciaDefault, onClose, onSaved }) {
    const base = { tipo: 'fgts', competencia: competenciaDefault, vencimento: '', valor: '', obra_id: '', observacao: '' };
    const [form, setForm] = useState(base);
    const [arquivo, setArquivo] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const opcoes = opcoesCompetencia(12);

    useEffect(() => {
        if (!isOpen) return;
        setForm({ ...base, competencia: competenciaDefault });
        setArquivo(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, competenciaDefault]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        const valorNum = moedaParaNumero(form.valor);
        if (valorNum == null) { notify.warning('Informe o valor.'); return; }
        setSalvando(true);
        try {
            let r;
            if (arquivo) {
                const fd = new FormData();
                fd.append('tipo', form.tipo);
                fd.append('competencia', form.competencia);
                if (form.vencimento) fd.append('vencimento', form.vencimento);
                fd.append('valor', String(valorNum));
                if (form.obra_id) fd.append('obra_id', form.obra_id);
                if (form.observacao) fd.append('observacao', form.observacao);
                fd.append('arquivo', arquivo);
                r = await rhApi.criarEncargo(fd, true);
            } else {
                r = await rhApi.criarEncargo({
                    tipo: form.tipo, competencia: form.competencia, vencimento: form.vencimento || null,
                    valor: valorNum, obra_id: form.obra_id || null, observacao: form.observacao || null,
                });
            }
            if (r?.aviso) notify.warning(r.aviso); else notify.success('Encargo registrado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar encargo', e);
            notify.error(e.message || 'Erro ao registrar encargo.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-receipt-tax" style={{ marginRight: 8 }} />Registrar encargo</>}
            footer={<>
                <button className="rh-btn rh-btn-text" onClick={onClose}>Cancelar</button>
                <button className="rh-btn rh-btn-primary" onClick={salvar} disabled={salvando}><i className="ti ti-check" /> {salvando ? 'Registrando…' : 'Registrar encargo'}</button>
            </>}
        >
            <div className="rh-row2">
                <div className="rh-field"><label>Tipo</label>
                    <select className="rh-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        <option value="fgts">FGTS</option>
                        <option value="inss_darf">INSS · DARF</option>
                        <option value="esocial_dae">eSocial · DAE</option>
                        <option value="outro">Outro</option>
                    </select></div>
                <div className="rh-field"><label>Competência</label>
                    <select className="rh-inp" value={form.competencia} onChange={e => set('competencia', e.target.value)}>
                        {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select></div>
            </div>
            <div className="rh-row2">
                <div className="rh-field"><label>Vencimento</label>
                    <input className="rh-inp" type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} /></div>
                <div className="rh-field"><label>Valor</label>
                    <input className="rh-inp money" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" /></div>
            </div>
            <div className="rh-field"><label>Vincular a obra (opcional)</label>
                <select className="rh-inp" value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
                    <option value="">— Geral (empresa toda) —</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}{o.uf ? ` (${o.uf})` : ''}</option>)}
                </select></div>
            <div className="rh-field">
                <label>Arquivo da guia / DARF</label>
                <label className="rh-dropzone compact" style={{ cursor: 'pointer' }}>
                    <i className="ti ti-file-type-pdf" />
                    <b>{arquivo ? arquivo.name : 'Anexar PDF da guia'}</b>
                    <input type="file" hidden accept="application/pdf,image/*" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                </label>
            </div>
        </Modal>
    );
}
