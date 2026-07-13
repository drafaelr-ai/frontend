import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR, TIPOS_DOCUMENTO } from '../../screens/Frota/frotaFormat';

const vazio = { tipo: 'crlv', descricao: '', data_vencimento: '', valor: '', observacao: '' };

export default function DocumentoVeiculoModal({ isOpen, veiculo, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [arquivo, setArquivo] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(vazio);
        setArquivo(null);
    }, [isOpen]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        setSalvando(true);
        try {
            let resp;
            if (arquivo) {
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
                fd.append('arquivo', arquivo);
                resp = await frotaApi.criarDocumento(veiculo.id, fd, true);
            } else {
                resp = await frotaApi.criarDocumento(veiculo.id, {
                    ...form,
                    descricao: form.descricao.trim() || null,
                    data_vencimento: form.data_vencimento || null,
                    valor: form.valor || null,
                    observacao: form.observacao.trim() || null,
                });
            }
            if (resp?.aviso) notify.warning(resp.aviso);
            else notify.success('Documento salvo.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar documento', e);
            notify.error(e.message || 'Erro ao salvar documento.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-file-text" style={{ marginRight: 8 }} />Documento — {veiculo ? placaBR(veiculo.placa) : ''}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar documento'}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Tipo</label>
                    <select className="frota-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                <div className="frota-field"><label>Vencimento</label>
                    <input className="frota-inp" type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} /></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Descrição (opcional)</label>
                    <input className="frota-inp" placeholder="Ex.: Seguro Porto — apólice 123" value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
                <div className="frota-field"><label>Valor (opcional)</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
            </div>
            <div className="frota-field"><label>Arquivo (opcional — PDF/imagem)</label>
                <input className="frota-inp" type="file" accept=".pdf,image/*" onChange={e => setArquivo(e.target.files?.[0] || null)} /></div>
            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
