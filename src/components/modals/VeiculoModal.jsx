import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { TIPOS_VEICULO, COMBUSTIVEIS } from '../../screens/Frota/frotaFormat';

const vazio = {
    placa: '', modelo: '', marca: '', ano_fabricacao: '', ano_modelo: '', tipo: 'carro',
    cor: '', combustivel: '', km_atual: '', renavam: '', chassi: '', observacao: '', status: 'ativo',
};

export default function VeiculoModal({ isOpen, veiculo, obras, imoveis, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [destino, setDestino] = useState('sem_local');
    const [obraId, setObraId] = useState('');
    const [imovelId, setImovelId] = useState('');
    const [salvando, setSalvando] = useState(false);
    const editando = !!veiculo;

    useEffect(() => {
        if (!isOpen) return;
        if (veiculo) {
            setForm({
                placa: veiculo.placa || '',
                modelo: veiculo.modelo || '',
                marca: veiculo.marca || '',
                ano_fabricacao: veiculo.ano_fabricacao ?? '',
                ano_modelo: veiculo.ano_modelo ?? '',
                tipo: veiculo.tipo || 'carro',
                cor: veiculo.cor || '',
                combustivel: veiculo.combustivel || '',
                km_atual: veiculo.km_atual ?? '',
                renavam: veiculo.renavam || '',
                chassi: veiculo.chassi || '',
                observacao: veiculo.observacao || '',
                status: veiculo.status || 'ativo',
            });
        } else {
            setForm(vazio);
            setDestino('sem_local');
            setObraId('');
            setImovelId('');
        }
    }, [isOpen, veiculo]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.placa.trim()) { notify.warning('Informe a placa.'); return; }
        if (!form.modelo.trim()) { notify.warning('Informe o modelo.'); return; }
        if (!editando && destino === 'obra' && !obraId) { notify.warning('Selecione a obra.'); return; }
        if (!editando && destino === 'imovel' && !imovelId) { notify.warning('Selecione o imóvel.'); return; }
        setSalvando(true);
        try {
            const body = {
                placa: form.placa.trim(),
                modelo: form.modelo.trim(),
                marca: form.marca.trim() || null,
                ano_fabricacao: form.ano_fabricacao || null,
                ano_modelo: form.ano_modelo || null,
                tipo: form.tipo,
                cor: form.cor.trim() || null,
                combustivel: form.combustivel || null,
                km_atual: form.km_atual || null,
                renavam: form.renavam.trim() || null,
                chassi: form.chassi.trim() || null,
                observacao: form.observacao.trim() || null,
            };
            if (editando) {
                body.status = form.status;
                await frotaApi.editarVeiculo(veiculo.id, body);
            } else {
                body.destino_tipo = destino;
                if (destino === 'obra') body.obra_id = obraId;
                if (destino === 'imovel') {
                    const im = imoveis.find(i => String(i.id) === String(imovelId));
                    body.imovel_id = imovelId;
                    body.imovel_nome = im?.nome || null;
                }
                await frotaApi.criarVeiculo(body);
            }
            notify.success(editando ? 'Veículo atualizado.' : 'Veículo cadastrado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar veiculo', e);
            notify.error(e.message || 'Erro ao salvar veículo.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            width="large"
            title={<><i className="ti ti-truck" style={{ marginRight: 8 }} />{editando ? 'Editar veículo' : 'Novo veículo'}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar veículo'}
                </button>
            </>}
        >
            <div className="frota-row3">
                <div className="frota-field"><label>Placa</label>
                    <input className="frota-inp" placeholder="ABC-1D23" value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())} /></div>
                <div className="frota-field"><label>Marca</label>
                    <input className="frota-inp" placeholder="Ex.: Toyota" value={form.marca} onChange={e => set('marca', e.target.value)} /></div>
                <div className="frota-field"><label>Modelo</label>
                    <input className="frota-inp" placeholder="Ex.: Hilux" value={form.modelo} onChange={e => set('modelo', e.target.value)} /></div>
            </div>
            <div className="frota-row3">
                <div className="frota-field"><label>Tipo</label>
                    <select className="frota-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        {TIPOS_VEICULO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                <div className="frota-field"><label>Ano fabricação</label>
                    <input className="frota-inp" type="number" placeholder="2022" value={form.ano_fabricacao} onChange={e => set('ano_fabricacao', e.target.value)} /></div>
                <div className="frota-field"><label>Ano modelo</label>
                    <input className="frota-inp" type="number" placeholder="2023" value={form.ano_modelo} onChange={e => set('ano_modelo', e.target.value)} /></div>
            </div>
            <div className="frota-row3">
                <div className="frota-field"><label>Cor</label>
                    <input className="frota-inp" value={form.cor} onChange={e => set('cor', e.target.value)} /></div>
                <div className="frota-field"><label>Combustível</label>
                    <select className="frota-inp" value={form.combustivel} onChange={e => set('combustivel', e.target.value)}>
                        <option value="">—</option>
                        {COMBUSTIVEIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select></div>
                <div className="frota-field"><label>KM atual</label>
                    <input className="frota-inp" type="number" value={form.km_atual} onChange={e => set('km_atual', e.target.value)} /></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Renavam (opcional)</label>
                    <input className="frota-inp" value={form.renavam} onChange={e => set('renavam', e.target.value)} /></div>
                <div className="frota-field"><label>Chassi (opcional)</label>
                    <input className="frota-inp" value={form.chassi} onChange={e => set('chassi', e.target.value)} /></div>
            </div>

            {!editando && (
                <div className="frota-field">
                    <label>Local inicial</label>
                    <div className="frota-destino">
                        <button type="button" className={`frota-destino-opt${destino === 'sem_local' ? ' active' : ''}`} onClick={() => setDestino('sem_local')}>
                            <i className="ti ti-minus" /> Sem local
                        </button>
                        <button type="button" className={`frota-destino-opt${destino === 'obra' ? ' active' : ''}`} onClick={() => setDestino('obra')}>
                            <i className="ti ti-building" /> Obra
                        </button>
                        <button type="button" className={`frota-destino-opt${destino === 'imovel' ? ' active' : ''}`} onClick={() => setDestino('imovel')}>
                            <i className="ti ti-home" /> Imóvel do patrimônio
                        </button>
                    </div>
                    {destino === 'obra' && (
                        <select className="frota-inp" value={obraId} onChange={e => setObraId(e.target.value)}>
                            <option value="">Selecione a obra…</option>
                            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}{o.uf ? ` (${o.uf})` : ''}</option>)}
                        </select>
                    )}
                    {destino === 'imovel' && (
                        imoveis.length
                            ? <select className="frota-inp" value={imovelId} onChange={e => setImovelId(e.target.value)}>
                                <option value="">Selecione o imóvel…</option>
                                {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome}{i.cidade ? ` — ${i.cidade}` : ''}</option>)}
                            </select>
                            : <div className="frota-hint"><i className="ti ti-plug-off" /> Lista de imóveis do patrimônio indisponível no momento.</div>
                    )}
                </div>
            )}

            {editando && (
                <div className="frota-field"><label>Status</label>
                    <select className="frota-inp" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="ativo">Ativo</option>
                        <option value="em_manutencao">Em manutenção</option>
                        <option value="vendido">Vendido</option>
                        <option value="inativo">Inativo</option>
                    </select></div>
            )}

            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>

            {editando && (
                <div className="frota-hint"><i className="ti ti-info-circle" /> Para mudar o local do veículo use o botão "Mover" no detalhe — assim o histórico de movimentações fica registrado.</div>
            )}
        </Modal>
    );
}
