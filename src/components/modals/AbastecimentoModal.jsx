import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR, COMBUSTIVEIS } from '../../screens/Frota/frotaFormat';

const vazio = { veiculo_id: '', data: '', litros: '', valor: '', km: '', combustivel: '', posto: '', condutor_id: '', observacao: '' };

export default function AbastecimentoModal({ isOpen, veiculos, veiculoFixo, condutores, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm({ ...vazio, veiculo_id: veiculoFixo?.id ?? '', data: new Date().toISOString().slice(0, 10) });
    }, [isOpen, veiculoFixo]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.veiculo_id) { notify.warning('Selecione o veículo.'); return; }
        if (!form.data) { notify.warning('Informe a data.'); return; }
        if (!form.valor) { notify.warning('Informe o valor.'); return; }
        setSalvando(true);
        try {
            await frotaApi.criarAbastecimento({
                ...form,
                litros: form.litros || null,
                km: form.km || null,
                combustivel: form.combustivel || null,
                posto: form.posto.trim() || null,
                condutor_id: form.condutor_id || null,
                observacao: form.observacao.trim() || null,
            });
            notify.success('Abastecimento registrado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar abastecimento', e);
            notify.error(e.message || 'Erro ao salvar abastecimento.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-gas-station" style={{ marginRight: 8 }} />Novo abastecimento</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar abastecimento'}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Veículo</label>
                    <select className="frota-inp" value={form.veiculo_id} disabled={!!veiculoFixo} onChange={e => set('veiculo_id', e.target.value)}>
                        <option value="">Selecione…</option>
                        {(veiculos || []).map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                    </select></div>
                <div className="frota-field"><label>Data</label>
                    <input className="frota-inp" type="date" value={form.data} onChange={e => set('data', e.target.value)} /></div>
            </div>
            <div className="frota-row3">
                <div className="frota-field"><label>Valor</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
                <div className="frota-field"><label>Litros</label>
                    <input className="frota-inp" type="number" step="0.01" value={form.litros} onChange={e => set('litros', e.target.value)} /></div>
                <div className="frota-field"><label>KM</label>
                    <input className="frota-inp" type="number" value={form.km} onChange={e => set('km', e.target.value)} /></div>
            </div>
            <div className="frota-row3">
                <div className="frota-field"><label>Combustível</label>
                    <select className="frota-inp" value={form.combustivel} onChange={e => set('combustivel', e.target.value)}>
                        <option value="">—</option>
                        {COMBUSTIVEIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select></div>
                <div className="frota-field"><label>Posto (opcional)</label>
                    <input className="frota-inp" value={form.posto} onChange={e => set('posto', e.target.value)} /></div>
                <div className="frota-field"><label>Condutor (opcional)</label>
                    <select className="frota-inp" value={form.condutor_id} onChange={e => set('condutor_id', e.target.value)}>
                        <option value="">—</option>
                        {(condutores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select></div>
            </div>
            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
