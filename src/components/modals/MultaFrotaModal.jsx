import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR } from '../../screens/Frota/frotaFormat';

const vazio = { veiculo_id: '', data_infracao: '', descricao: '', valor: '', pontos: '', condutor_id: '', status_pagamento: 'pendente', data_pagamento: '', observacao: '' };

export default function MultaFrotaModal({ isOpen, veiculos, veiculoFixo, condutores, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [arquivo, setArquivo] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm({ ...vazio, veiculo_id: veiculoFixo?.id ?? '', data_infracao: new Date().toISOString().slice(0, 10) });
        setArquivo(null);
    }, [isOpen, veiculoFixo]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.veiculo_id) { notify.warning('Selecione o veículo.'); return; }
        if (!form.data_infracao) { notify.warning('Informe a data da infração.'); return; }
        if (!form.valor) { notify.warning('Informe o valor.'); return; }
        setSalvando(true);
        try {
            let resp;
            if (arquivo) {
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
                fd.append('arquivo', arquivo);
                resp = await frotaApi.criarMulta(fd, true);
            } else {
                resp = await frotaApi.criarMulta({
                    ...form,
                    descricao: form.descricao.trim() || null,
                    pontos: form.pontos || null,
                    condutor_id: form.condutor_id || null,
                    data_pagamento: form.data_pagamento || null,
                    observacao: form.observacao.trim() || null,
                });
            }
            if (resp?.aviso) notify.warning(resp.aviso);
            else notify.success('Multa registrada.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar multa', e);
            notify.error(e.message || 'Erro ao salvar multa.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-alert-triangle" style={{ marginRight: 8 }} />Nova multa</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar multa'}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Veículo</label>
                    <select className="frota-inp" value={form.veiculo_id} disabled={!!veiculoFixo} onChange={e => set('veiculo_id', e.target.value)}>
                        <option value="">Selecione…</option>
                        {(veiculos || []).map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                    </select></div>
                <div className="frota-field"><label>Data da infração</label>
                    <input className="frota-inp" type="date" value={form.data_infracao} onChange={e => set('data_infracao', e.target.value)} /></div>
            </div>
            <div className="frota-field"><label>Descrição</label>
                <input className="frota-inp" placeholder="Ex.: excesso de velocidade — Av. Brasil" value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
            <div className="frota-row3">
                <div className="frota-field"><label>Valor</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
                <div className="frota-field"><label>Pontos</label>
                    <input className="frota-inp" type="number" value={form.pontos} onChange={e => set('pontos', e.target.value)} /></div>
                <div className="frota-field"><label>Condutor responsável</label>
                    <select className="frota-inp" value={form.condutor_id} onChange={e => set('condutor_id', e.target.value)}>
                        <option value="">—</option>
                        {(condutores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Status</label>
                    <select className="frota-inp" value={form.status_pagamento} onChange={e => set('status_pagamento', e.target.value)}>
                        <option value="pendente">Pendente</option>
                        <option value="paga">Paga</option>
                        <option value="contestada">Contestada</option>
                    </select></div>
                {form.status_pagamento === 'paga' ? (
                    <div className="frota-field"><label>Data do pagamento</label>
                        <input className="frota-inp" type="date" value={form.data_pagamento} onChange={e => set('data_pagamento', e.target.value)} /></div>
                ) : (
                    <div className="frota-field"><label>Notificação (opcional)</label>
                        <input className="frota-inp" type="file" accept=".pdf,image/*" onChange={e => setArquivo(e.target.files?.[0] || null)} /></div>
                )}
            </div>
            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
