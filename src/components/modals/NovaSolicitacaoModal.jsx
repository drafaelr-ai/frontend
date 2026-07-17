import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { TIPOS_SOLICITACAO } from '../../screens/Solicitacoes/solicitacoesFormat';

const itemVazio = () => ({ descricao: '', quantidade: '', unidade: '', observacao: '' });
const vazio = { obra_id: '', tipo: 'Material', data_necessidade: '', observacao: '' };

export default function NovaSolicitacaoModal({ isOpen, obras, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [itens, setItens] = useState([itemVazio()]);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(vazio);
        setItens([itemVazio()]);
    }, [isOpen]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setItem = (idx, k, v) => setItens(list => list.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
    const addItem = () => setItens(list => [...list, itemVazio()]);
    const delItem = (idx) => setItens(list => (list.length > 1 ? list.filter((_, i) => i !== idx) : list));

    const salvar = async () => {
        if (!form.obra_id) { notify.warning('Selecione a obra.'); return; }
        const itensValidos = itens.filter(i => i.descricao.trim());
        if (!itensValidos.length) { notify.warning('Informe ao menos um item.'); return; }
        if (itensValidos.some(i => !i.quantidade || Number(String(i.quantidade).replace(',', '.')) <= 0)) {
            notify.warning('Todo item precisa de quantidade maior que zero.');
            return;
        }
        setSalvando(true);
        try {
            const resp = await solicitacoesApi.criar({
                obra_id: form.obra_id,
                tipo: form.tipo,
                data_necessidade: form.data_necessidade || null,
                observacao: form.observacao.trim() || null,
                itens: itensValidos.map(i => ({
                    descricao: i.descricao.trim(),
                    quantidade: i.quantidade,
                    unidade: i.unidade.trim() || null,
                    observacao: i.observacao.trim() || null,
                })),
            });
            notify.success('Solicitação criada — os responsáveis pela pesquisa de preços foram avisados.');
            onSaved?.(resp);
        } catch (e) {
            logger.error('criar solicitação', e);
            notify.error(e.message || 'Erro ao criar solicitação.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-shopping-cart-plus" style={{ marginRight: 8 }} />Nova solicitação de compra</>}
            subtitle="A data e a hora da solicitação são registradas automaticamente."
            width="large"
            footer={<>
                <button className="solc-btn solc-btn-text" onClick={onClose}>Cancelar</button>
                <button className="solc-btn solc-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Enviando…' : 'Criar solicitação'}
                </button>
            </>}
        >
            <div className="solc-row3">
                <div className="solc-field"><label>Obra</label>
                    <select className="solc-inp" value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
                        <option value="">Selecionar obra…</option>
                        {(obras || []).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select></div>
                <div className="solc-field"><label>Tipo</label>
                    <select className="solc-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        {TIPOS_SOLICITACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                <div className="solc-field"><label>Necessário para (opcional)</label>
                    <input className="solc-inp" type="date" value={form.data_necessidade} onChange={e => set('data_necessidade', e.target.value)} /></div>
            </div>

            <div className="solc-field" style={{ marginBottom: 8 }}>
                <label>Itens da solicitação</label>
            </div>
            <div className="solc-item-row" style={{ marginBottom: 4 }}>
                <span className="solc-cell-sub">Descrição</span>
                <span className="solc-cell-sub">Quantidade</span>
                <span className="solc-cell-sub">Unidade</span>
                <span />
            </div>
            {itens.map((item, idx) => (
                <div className="solc-item-row" key={idx}>
                    <input className="solc-inp" placeholder="Ex.: Cimento CP-II 50kg"
                        value={item.descricao} onChange={e => setItem(idx, 'descricao', e.target.value)} />
                    <input className="solc-inp" placeholder="0"
                        value={item.quantidade} onChange={e => setItem(idx, 'quantidade', e.target.value)} />
                    <input className="solc-inp" placeholder="un, sc, m³"
                        value={item.unidade} onChange={e => setItem(idx, 'unidade', e.target.value)} />
                    <button type="button" className="solc-item-del" title="Remover item"
                        onClick={() => delItem(idx)} disabled={itens.length === 1}>
                        <i className="ti ti-trash" />
                    </button>
                </div>
            ))}
            <button type="button" className="solc-btn solc-btn-secondary solc-btn-sm" onClick={addItem} style={{ marginBottom: 'var(--space-4)' }}>
                <i className="ti ti-plus" /> Adicionar item
            </button>

            <div className="solc-field"><label>Observação (opcional)</label>
                <input className="solc-inp" placeholder="Ex.: entregar na portaria da obra"
                    value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
