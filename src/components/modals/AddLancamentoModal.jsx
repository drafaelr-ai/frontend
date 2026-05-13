import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { getTodayString } from '../../utils/format';

const AddLancamentoModal = ({ onClose, onSave, itensOrcamento }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString());
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [pix, setPix] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('Material');
    const status = 'Pago';
    const [orcamentoItemId, setOrcamentoItemId] = useState('');
    const [prioridade, setPrioridade] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            data,
            data_vencimento: dataVencimento,
            descricao,
            fornecedor: fornecedor || null,
            pix: pix || null,
            valor: parseFloat(valor) || 0,
            tipo,
            status: 'Pago',
            prioridade: parseInt(prioridade, 10) || 0,
            orcamento_item_id: orcamentoItemId ? parseInt(orcamentoItemId, 10) : null,
            is_gasto_avulso_historico: true
        });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Adicionar Gasto Avulso (Pago)"
            subtitle="Este gasto será automaticamente marcado como PAGO e adicionado ao histórico."
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-add-lancamento" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Salvar Gasto
                    </button>
                </>
            }
        >
            <form id="form-add-lancamento" onSubmit={handleSubmit}>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Data do Registro</label>
                        <input className="m-input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Data de Vencimento</label>
                        <input className="m-input" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                </div>
                <div className="m-field">
                    <label className="m-label">Descrição</label>
                    <input className="m-input" type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                </div>
                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input className="m-input" type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>
                <div className="m-field">
                    <label className="m-label">Chave PIX</label>
                    <input className="m-input" type="text" value={pix} onChange={(e) => setPix(e.target.value)} />
                </div>
                <div className="m-field">
                    <label className="m-label">Valor Total (R$)</label>
                    <input className="m-input" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                <div className="m-field">
                    <label className="m-label">Vincular ao Item do Orçamento <span className="m-label-opt">(opcional)</span></label>
                    <select className="m-select" value={orcamentoItemId} onChange={(e) => setOrcamentoItemId(e.target.value)}>
                        <option value="">Nenhum (Despesa Geral)</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                </div>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Prioridade</label>
                        <select className="m-select" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                            <option value="0">0 (Nenhuma)</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3 (Média)</option>
                            <option value="4">4</option>
                            <option value="5">5 (Urgente)</option>
                        </select>
                    </div>
                    <div className="m-field">
                        <label className="m-label">Tipo/Segmento</label>
                        <select className="m-select" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                            <option>Material</option>
                            <option>Mão de Obra</option>
                            <option>Serviço</option>
                            <option>Equipamentos</option>
                        </select>
                    </div>
                </div>
                <div style={{
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--status-success-bg)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--status-success-text)',
                    fontWeight: 'var(--weight-medium)',
                }}>
                    Status: PAGO (automático)
                </div>
            </form>
        </Modal>
    );
};

export default AddLancamentoModal;
