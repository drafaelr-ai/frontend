import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR, COMBUSTIVEIS } from '../../screens/Frota/frotaFormat';

const vazio = { veiculo_id: '', data: '', litros: '', valor: '', km: '', combustivel: '', posto: '', condutor_id: '', observacao: '' };

function numeroBR(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    let texto = String(valor).replace('R$', '').trim();
    if (texto.includes(',') && texto.includes('.')) texto = texto.replace(/\./g, '').replace(',', '.');
    else if (texto.includes(',')) texto = texto.replace(',', '.');
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
}

export default function AbastecimentoModal({
    isOpen, veiculos, veiculoFixo, condutores, abastecimento, onClose, onSaved,
}) {
    const [form, setForm] = useState(vazio);
    const [salvando, setSalvando] = useState(false);
    const editando = Boolean(abastecimento?.id);
    const litros = numeroBR(form.litros);
    const valor = numeroBR(form.valor);
    const precoLitro = litros > 0 && valor > 0
        ? (valor / litros).toLocaleString('pt-BR', {
            minimumFractionDigits: 3, maximumFractionDigits: 3,
        })
        : '';

    useEffect(() => {
        if (!isOpen) return;
        if (abastecimento?.id) {
            setForm({
                ...vazio,
                veiculo_id: abastecimento.veiculo_id ?? veiculoFixo?.id ?? '',
                data: abastecimento.data || '',
                litros: abastecimento.litros ?? '',
                valor: abastecimento.valor ?? '',
                km: abastecimento.km ?? '',
                combustivel: abastecimento.combustivel || '',
                posto: abastecimento.posto || '',
                condutor_id: abastecimento.condutor_id ?? '',
                observacao: abastecimento.observacao || '',
            });
            return;
        }
        setForm({
            ...vazio,
            veiculo_id: veiculoFixo?.id ?? '',
            data: new Date().toISOString().slice(0, 10),
        });
    }, [isOpen, veiculoFixo, abastecimento]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.veiculo_id) { notify.warning('Selecione o veículo.'); return; }
        if (!form.data) { notify.warning('Informe a data.'); return; }
        if (!form.valor) { notify.warning('Informe o valor.'); return; }
        setSalvando(true);
        try {
            const payload = {
                ...form,
                litros: form.litros || null,
                km: form.km || null,
                combustivel: form.combustivel || null,
                posto: form.posto.trim() || null,
                condutor_id: form.condutor_id || null,
                observacao: form.observacao.trim() || null,
            };
            if (editando) await frotaApi.editarAbastecimento(abastecimento.id, payload);
            else await frotaApi.criarAbastecimento(payload);
            notify.success(editando ? 'Abastecimento atualizado.' : 'Abastecimento registrado.');
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
            title={<>
                <i className={`ti ${editando ? 'ti-edit' : 'ti-gas-station'}`} style={{ marginRight: 8 }} />
                {editando ? 'Editar abastecimento' : 'Novo abastecimento'}
            </>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : (editando ? 'Salvar alterações' : 'Salvar abastecimento')}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Veículo</label>
                    <select className="frota-inp" value={form.veiculo_id} disabled={!!veiculoFixo || editando} onChange={e => set('veiculo_id', e.target.value)}>
                        <option value="">Selecione…</option>
                        {(veiculos || []).map(v => <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>)}
                    </select></div>
                <div className="frota-field"><label>Data</label>
                    <input className="frota-inp" type="date" value={form.data} onChange={e => set('data', e.target.value)} /></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Valor</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
                <div className="frota-field"><label>Litros</label>
                    <input className="frota-inp" type="number" step="0.01" value={form.litros} onChange={e => set('litros', e.target.value)} /></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>R$/L (automático)</label>
                    <input className="frota-inp" aria-label="Valor por litro calculado" readOnly value={precoLitro} placeholder="Preencha valor e litros" /></div>
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
