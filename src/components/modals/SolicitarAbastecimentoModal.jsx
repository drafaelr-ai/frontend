import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { brl, placaBR } from '../../screens/Frota/frotaFormat';

const vazio = {
    veiculo_id: '', condutor_id: '',
    limite_valor: '', validade_horas: '48', observacao: '',
};

/** Gera o link que o motorista abre (sem login) para registrar o abastecimento:
    ele informa KM e litros e anexa o comprovante; o sistema lê o cupom. */
export default function SolicitarAbastecimentoModal({ isOpen, veiculos, veiculoFixo, condutores, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [salvando, setSalvando] = useState(false);
    const [gerada, setGerada] = useState(null);  // solicitação criada → tela do link

    useEffect(() => {
        if (!isOpen) return;
        setForm({ ...vazio, veiculo_id: veiculoFixo?.id ?? '' });
        setGerada(null);
        return () => { setGerada(null); setForm(vazio); };
    }, [isOpen, veiculoFixo]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const veiculo = (veiculos || []).find(v => String(v.id) === String(form.veiculo_id));

    const gerar = async () => {
        if (!form.veiculo_id) { notify.warning('Selecione o veículo.'); return; }
        setSalvando(true);
        try {
            // combustivel não vai no payload: o backend usa o do cadastro do
            // veículo, que é onde a informação já vive.
            const nova = await frotaApi.criarSolicitacaoAbastecimento({
                veiculo_id: form.veiculo_id,
                condutor_id: form.condutor_id || null,
                limite_valor: form.limite_valor || null,
                validade_horas: form.validade_horas || null,
                observacao: form.observacao.trim() || null,
            });
            setGerada(nova);
            onSaved?.();
        } catch (e) {
            logger.error('gerar link de abastecimento', e);
            notify.error(e.message || 'Erro ao gerar o link.');
        } finally {
            setSalvando(false);
        }
    };

    const copiar = () => {
        navigator.clipboard.writeText(gerada.url)
            .then(() => notify.success('Link copiado.'))
            .catch(() => notify.error('Não foi possível copiar o link.'));
    };

    const whatsapp = () => {
        const texto = `Abastecimento autorizado — ${placaBR(gerada.veiculo_placa)} ${gerada.veiculo_modelo || ''}\n`
            + (gerada.limite_valor ? `Limite: ${brl(gerada.limite_valor)}\n` : '')
            + `Abra o link, informe o KM e os litros e anexe a foto do cupom:\n${gerada.url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    };

    if (gerada) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={<><i className="ti ti-link" style={{ marginRight: 8 }} />Link gerado</>}
                footer={<button className="frota-btn frota-btn-primary" onClick={onClose}>Fechar</button>}
            >
                <div className="frota-hint" style={{ marginTop: 0 }}>
                    <i className="ti ti-check" /> Envie o link ao motorista. Ele preenche KM, litros e
                    anexa o comprovante — o abastecimento entra na frota quando ele enviar.
                </div>
                <div className="frota-link-box">{gerada.url}</div>
                <div className="frota-card-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="frota-btn frota-btn-secondary" onClick={copiar}>
                        <i className="ti ti-copy" /> Copiar link
                    </button>
                    <button className="frota-btn frota-btn-primary" onClick={whatsapp}>
                        <i className="ti ti-brand-whatsapp" /> Enviar no WhatsApp
                    </button>
                </div>
                <div className="frota-hint">
                    <i className="ti ti-clock" /> O link vale {form.validade_horas || 48}h e só pode ser
                    usado uma vez.
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-gas-station" style={{ marginRight: 8 }} />Autorizar abastecimento</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={gerar} disabled={salvando}>
                    <i className="ti ti-link" /> {salvando ? 'Gerando…' : 'Gerar link'}
                </button>
            </>}
        >
            <div className="frota-row2">
                <div className="frota-field"><label>Veículo</label>
                    <select className="frota-inp" value={form.veiculo_id} disabled={!!veiculoFixo}
                        onChange={e => set('veiculo_id', e.target.value)}>
                        <option value="">Selecione…</option>
                        {(veiculos || []).map(v => (
                            <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>
                        ))}
                    </select></div>
                <div className="frota-field"><label>Motorista (opcional)</label>
                    <select className="frota-inp" value={form.condutor_id}
                        onChange={e => set('condutor_id', e.target.value)}>
                        <option value="">Condutor atual do veículo</option>
                        {(condutores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select></div>
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Limite de valor (opcional)</label>
                    <input className="frota-inp money" placeholder="0,00" value={form.limite_valor}
                        onChange={e => set('limite_valor', e.target.value)} /></div>
                <div className="frota-field"><label>Validade do link</label>
                    <select className="frota-inp" value={form.validade_horas}
                        onChange={e => set('validade_horas', e.target.value)}>
                        <option value="12">12 horas</option>
                        <option value="24">24 horas</option>
                        <option value="48">48 horas</option>
                        <option value="168">7 dias</option>
                    </select></div>
            </div>
            <div className="frota-field"><label>Instrução ao motorista (opcional)</label>
                <input className="frota-inp" maxLength={300} placeholder="Ex.: abastecer no posto da BR-101"
                    value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>

            {veiculo && (
                <div className="frota-hint">
                    <i className="ti ti-dashboard" /> Último KM registrado:{' '}
                    <b>{veiculo.km_atual ? Number(veiculo.km_atual).toLocaleString('pt-BR') : '—'}</b>.
                    O motorista não consegue enviar um KM menor que esse.
                </div>
            )}
            <div className="frota-hint">
                <i className="ti ti-info-circle" /> Acima do limite, o envio é bloqueado e o motorista
                é orientado a falar com o responsável.
            </div>
        </Modal>
    );
}
