import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const vazio = { fornecedor: '', valor_total: '', condicao_pagamento: '', prazo_entrega: '', observacao: '' };

export default function CotacaoSolicitacaoModal({ isOpen, solicitacao, onClose, onSaved }) {
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
        if (!form.fornecedor.trim()) { notify.warning('Informe o fornecedor.'); return; }
        if (!form.valor_total) { notify.warning('Informe o valor total.'); return; }
        setSalvando(true);
        try {
            let resp;
            if (arquivo) {
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
                fd.append('arquivo', arquivo);
                resp = await solicitacoesApi.criarCotacao(solicitacao.id, fd, true);
            } else {
                resp = await solicitacoesApi.criarCotacao(solicitacao.id, {
                    ...form,
                    condicao_pagamento: form.condicao_pagamento.trim() || null,
                    prazo_entrega: form.prazo_entrega.trim() || null,
                    observacao: form.observacao.trim() || null,
                });
            }
            if (resp?.aviso) notify.warning(resp.aviso);
            else notify.success('Cotação registrada.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar cotação', e);
            notify.error(e.message || 'Erro ao registrar cotação.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-report-money" style={{ marginRight: 8 }} />Cotação — Solicitação #{solicitacao?.id}</>}
            footer={<>
                <button className="solc-btn solc-btn-text" onClick={onClose}>Cancelar</button>
                <button className="solc-btn solc-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar cotação'}
                </button>
            </>}
        >
            <div className="solc-row2">
                <div className="solc-field"><label>Fornecedor</label>
                    <input className="solc-inp" placeholder="Ex.: Depósito Central"
                        value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} /></div>
                <div className="solc-field"><label>Valor total (R$)</label>
                    <input className="solc-inp money" placeholder="0,00"
                        value={form.valor_total} onChange={e => set('valor_total', e.target.value)} /></div>
            </div>
            <div className="solc-row2">
                <div className="solc-field"><label>Condição de pagamento (opcional)</label>
                    <input className="solc-inp" placeholder="Ex.: 30 dias / PIX à vista"
                        value={form.condicao_pagamento} onChange={e => set('condicao_pagamento', e.target.value)} /></div>
                <div className="solc-field"><label>Prazo de entrega (opcional)</label>
                    <input className="solc-inp" placeholder="Ex.: 5 dias úteis"
                        value={form.prazo_entrega} onChange={e => set('prazo_entrega', e.target.value)} /></div>
            </div>
            <div className="solc-field"><label>Anexo (opcional — PDF/imagem do orçamento)</label>
                <input className="solc-inp" type="file" accept=".pdf,image/*"
                    onChange={e => setArquivo(e.target.files?.[0] || null)} /></div>
            <div className="solc-field"><label>Observação (opcional)</label>
                <input className="solc-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
