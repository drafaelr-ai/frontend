import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR } from '../../screens/Frota/frotaFormat';

const vazio = { veiculo_id: '', tipo: 'preventiva', descricao: '', data: '', km: '', custo: '', oficina: '', observacao: '' };

export default function ManutencaoFrotaModal({ isOpen, veiculos, veiculoFixo, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [arquivo, setArquivo] = useState(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm({ ...vazio, veiculo_id: veiculoFixo?.id ?? '', data: new Date().toISOString().slice(0, 10) });
        setArquivo(null);
    }, [isOpen, veiculoFixo]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.veiculo_id) { notify.warning('Selecione o veículo.'); return; }
        if (!form.data) { notify.warning('Informe a data.'); return; }
        if (!form.custo) { notify.warning('Informe o custo.'); return; }
        setSalvando(true);
        try {
            let resp;
            if (arquivo) {
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
                fd.append('arquivo', arquivo);
                resp = await frotaApi.criarManutencao(fd, true);
            } else {
                resp = await frotaApi.criarManutencao({
                    ...form,
                    descricao: form.descricao.trim() || null,
                    km: form.km || null,
                    oficina: form.oficina.trim() || null,
                    observacao: form.observacao.trim() || null,
                });
            }
            if (resp?.aviso) notify.warning(resp.aviso);
            else notify.success('Manutenção registrada.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar manutencao', e);
            notify.error(e.message || 'Erro ao salvar manutenção.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-tool" style={{ marginRight: 8 }} />Nova manutenção</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar manutenção'}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Veículo</label>
                    <select className="frota-inp" value={form.veiculo_id} disabled={!!veiculoFixo} onChange={e => set('veiculo_id', e.target.value)}>
                        <option value="">Selecione…</option>
                        {(veiculos || []).map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                    </select></div>
                <div className="frota-field"><label>Tipo</label>
                    <select className="frota-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        <option value="preventiva">Preventiva</option>
                        <option value="corretiva">Corretiva</option>
                    </select></div>
            </div>
            <div className="frota-field"><label>Descrição</label>
                <input className="frota-inp" placeholder="Ex.: troca de óleo e filtros" value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
            <div className="frota-row3">
                <div className="frota-field"><label>Data</label>
                    <input className="frota-inp" type="date" value={form.data} onChange={e => set('data', e.target.value)} /></div>
                <div className="frota-field"><label>KM</label>
                    <input className="frota-inp" type="number" value={form.km} onChange={e => set('km', e.target.value)} /></div>
                <div className="frota-field"><label>Custo</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.custo} onChange={e => set('custo', e.target.value)} /></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Oficina (opcional)</label>
                    <input className="frota-inp" value={form.oficina} onChange={e => set('oficina', e.target.value)} /></div>
                <div className="frota-field"><label>NF / comprovante (opcional)</label>
                    <input className="frota-inp" type="file" accept=".pdf,image/*" onChange={e => setArquivo(e.target.files?.[0] || null)} /></div>
            </div>
            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
            <div className="frota-hint"><i className="ti ti-info-circle" /> O custo é atribuído ao local atual do veículo (obra/imóvel) e o KM informado atualiza o hodômetro se for maior que o atual.</div>
        </Modal>
    );
}
