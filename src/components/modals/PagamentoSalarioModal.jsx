import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { rhApi } from '../../screens/RH/rhApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { moedaParaNumero, opcoesCompetencia } from '../../screens/RH/rhFormat';

export default function PagamentoSalarioModal({ isOpen, funcionarios, competenciaDefault, onClose, onSaved }) {
    const base = { funcionario_id: '', tipo: 'salario', competencia: competenciaDefault, valor: '', data_pagamento: '', observacao: '' };
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

    // Pré-preenche valor com o salário do funcionário escolhido (se tipo salário e valor vazio)
    useEffect(() => {
        if (!isOpen || !form.funcionario_id || form.tipo !== 'salario' || form.valor) return;
        const f = funcionarios.find(x => String(x.id) === String(form.funcionario_id));
        if (f?.salario != null) setForm(s => ({ ...s, valor: String(f.salario).replace('.', ',') }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.funcionario_id]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.funcionario_id) { notify.warning('Selecione o funcionário.'); return; }
        const valorNum = moedaParaNumero(form.valor);
        if (valorNum == null) { notify.warning('Informe o valor.'); return; }
        if (!form.data_pagamento) { notify.warning('Informe a data do pagamento.'); return; }
        setSalvando(true);
        try {
            if (arquivo) {
                const fd = new FormData();
                fd.append('funcionario_id', form.funcionario_id);
                fd.append('tipo', form.tipo);
                fd.append('competencia', form.competencia);
                fd.append('valor', String(valorNum));
                fd.append('data_pagamento', form.data_pagamento);
                if (form.observacao) fd.append('observacao', form.observacao);
                fd.append('arquivo', arquivo);
                await rhApi.criarPagamento(fd, true);
            } else {
                await rhApi.criarPagamento({
                    funcionario_id: form.funcionario_id, tipo: form.tipo, competencia: form.competencia,
                    valor: valorNum, data_pagamento: form.data_pagamento, observacao: form.observacao || null,
                });
            }
            notify.success('Pagamento registrado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar pagamento', e);
            notify.error(e.message || 'Erro ao registrar pagamento.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-cash" style={{ marginRight: 8 }} />Registrar pagamento</>}
            footer={<>
                <button className="rh-btn rh-btn-text" onClick={onClose}>Cancelar</button>
                <button className="rh-btn rh-btn-primary" onClick={salvar} disabled={salvando}><i className="ti ti-check" /> {salvando ? 'Registrando…' : 'Registrar'}</button>
            </>}
        >
            <div className="rh-field">
                <label>Funcionário</label>
                <select className="rh-inp" value={form.funcionario_id} onChange={e => set('funcionario_id', e.target.value)}>
                    <option value="">Selecione…</option>
                    {funcionarios.map(f => (
                        <option key={f.id} value={f.id}>
                            {f.nome} — {f.categoria_nome || '—'}{f.obra_nome ? ` — ${f.obra_nome}` : ' — Sem obra'}
                        </option>
                    ))}
                </select>
            </div>
            <div className="rh-row2">
                <div className="rh-field"><label>Tipo</label>
                    <select className="rh-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        <option value="salario">Salário</option>
                        <option value="vale">Vale / adiantamento</option>
                        <option value="outro">Outro</option>
                    </select></div>
                <div className="rh-field"><label>Competência</label>
                    <select className="rh-inp" value={form.competencia} onChange={e => set('competencia', e.target.value)}>
                        {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select></div>
            </div>
            <div className="rh-row2">
                <div className="rh-field"><label>Valor</label>
                    <input className="rh-inp money" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" /></div>
                <div className="rh-field"><label>Data do pagamento</label>
                    <input className="rh-inp" type="date" value={form.data_pagamento} onChange={e => set('data_pagamento', e.target.value)} /></div>
            </div>
            <div className="rh-field">
                <label>Comprovante (opcional)</label>
                <label className="rh-dropzone compact" style={{ cursor: 'pointer' }}>
                    <i className="ti ti-paperclip" />
                    <b>{arquivo ? arquivo.name : 'Anexar comprovante'}</b>
                    <input type="file" hidden onChange={e => setArquivo(e.target.files?.[0] || null)} />
                </label>
            </div>
        </Modal>
    );
}
