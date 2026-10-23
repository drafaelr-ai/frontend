import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { brl, dataBR, placaBR } from '../../screens/Frota/frotaFormat';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

function hojeLocal() {
    const data = new Date();
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export default function GerenciarMultaModal({ isOpen, multa, condutores, onClose, onSaved }) {
    const [form, setForm] = useState({ condutor_id: '', status_pagamento: 'pendente', data_pagamento: '', observacao: '' });
    const [salvando, setSalvando] = useState(false);
    const [todosCondutores, setTodosCondutores] = useState(null);
    const importada = multa?.origem === 'efrotas';

    useEffect(() => {
        if (!isOpen || !multa) return;
        setForm({
            condutor_id: multa.condutor_id ?? '',
            status_pagamento: multa.status_pagamento || 'pendente',
            data_pagamento: multa.data_pagamento || '',
            observacao: multa.observacao || '',
        });
    }, [isOpen, multa]);

    // A tela principal trabalha apenas com condutores ativos. Aqui também
    // carregamos os inativos para nunca apagar por acidente o responsável de
    // uma infração histórica ao salvar outra informação da gestão.
    useEffect(() => {
        if (!isOpen) return;
        let ativo = true;
        setTodosCondutores(null);
        frotaApi.condutores()
            .then(lista => { if (ativo) setTodosCondutores(Array.isArray(lista) ? lista : []); })
            .catch(() => { if (ativo) setTodosCondutores(condutores || []); });
        return () => { ativo = false; };
    }, [isOpen, condutores]);

    const set = (campo, valor) => setForm(atual => ({
        ...atual,
        [campo]: valor,
        ...(campo === 'status_pagamento' && valor === 'paga' && !atual.data_pagamento
            ? { data_pagamento: hojeLocal() }
            : {}),
    }));

    const salvar = async () => {
        if (!multa) return;
        if (form.status_pagamento === 'paga' && !form.data_pagamento) {
            notify.warning('Informe a data do pagamento.');
            return;
        }
        setSalvando(true);
        try {
            await frotaApi.editarMulta(multa.id, {
                condutor_id: form.condutor_id || null,
                status_pagamento: form.status_pagamento,
                data_pagamento: form.status_pagamento === 'paga' ? form.data_pagamento : null,
                observacao: form.observacao.trim() || null,
            });
            notify.success('Gestão da multa atualizada.');
            onSaved?.();
        } catch (e) {
            logger.error('gerenciar multa', e);
            notify.error(e.message || 'Não foi possível atualizar a multa.');
        } finally {
            setSalvando(false);
        }
    };

    if (!multa) return null;
    const listaCondutores = todosCondutores || condutores || [];
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-clipboard-check" style={{ marginRight: 8 }} />{importada ? 'Gerenciar infração e-Frotas' : 'Gerenciar multa'}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose} disabled={salvando}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar gestão'}
                </button>
            </>}
        >
            <div className={importada ? 'frota-callout frota-callout-info' : 'frota-callout'}>
                <i className={importada ? 'ti ti-shield-check' : 'ti ti-info-circle'} />
                <span>
                    <b>{placaBR(multa.veiculo_placa)}</b> · {multa.descricao || 'Infração'} · {brl(multa.valor)}
                    {multa.numero_auto_infracao ? ` · AIT ${multa.numero_auto_infracao}` : ''}
                    {importada && ' — os dados oficiais ficam protegidos; aqui você registra apenas a gestão interna.'}
                </span>
            </div>
            {importada && !multa.condutor_id && (
                <div className="frota-callout frota-callout-warning">
                    <i className="ti ti-user-question" />
                    <span>Confirme quem conduzia o veículo na data da infração antes de atribuir um responsável.</span>
                </div>
            )}
            <div className="frota-field">
                <label>Condutor responsável</label>
                <select className="frota-inp" value={form.condutor_id} onChange={e => set('condutor_id', e.target.value)}>
                    <option value="">— A definir / sem responsável —</option>
                    {listaCondutores.filter(c => c.status !== 'inativo' || String(c.id) === String(multa.condutor_id)).map(c => (
                        <option key={c.id} value={c.id}>{c.nome}{c.status === 'inativo' ? ' (inativo)' : ''}{c.veiculo_atual_placa ? ` · ${placaBR(c.veiculo_atual_placa)}` : ''}</option>
                    ))}
                </select>
            </div>
            <div className="frota-row2">
                <div className="frota-field">
                    <label>Situação interna</label>
                    <select className="frota-inp" value={form.status_pagamento} onChange={e => set('status_pagamento', e.target.value)}>
                        <option value="pendente">Pendente</option>
                        <option value="contestada">Contestada</option>
                        <option value="paga">Paga</option>
                    </select>
                </div>
                <div className="frota-field">
                    <label>Data do pagamento</label>
                    <input className="frota-inp" type="date" value={form.data_pagamento} disabled={form.status_pagamento !== 'paga'} onChange={e => set('data_pagamento', e.target.value)} />
                </div>
            </div>
            <div className="frota-field">
                <label>Observação interna</label>
                <input className="frota-inp" value={form.observacao} placeholder="Ex.: motorista reconheceu a infração" onChange={e => set('observacao', e.target.value)} />
            </div>
            {multa.data_limite_defesa && <div className="frota-cell-sub">Prazo de defesa informado: {dataBR(multa.data_limite_defesa)}</div>}
        </Modal>
    );
}
