import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { logger } from '../../utils/logger';

const EditLancamentoModal = ({ lancamento, onClose, onSave, itensOrcamento }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
         if (lancamento) {
             const initialData = { ...lancamento };
             if (initialData.data) {
                 try {
                     initialData.data = new Date(initialData.data + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     logger.error("Erro ao formatar data para edição:", e);
                     initialData.data = '';
                 }
             }
             if (initialData.data_vencimento) {
                 try {
                     initialData.data_vencimento = new Date(initialData.data_vencimento + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     logger.error("Erro ao formatar data_vencimento para edição:", e);
                     initialData.data_vencimento = '';
                 }
             } else {
                 initialData.data_vencimento = initialData.data || '';
             }
             initialData.orcamento_item_id = initialData.orcamento_item_id ? parseInt(initialData.orcamento_item_id, 10) : '';
             initialData.prioridade = initialData.prioridade ? parseInt(initialData.prioridade, 10) : 0;
             initialData.fornecedor = initialData.fornecedor || '';

             setFormData(initialData);
         } else {
             setFormData({});
         }
     }, [lancamento]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'valor_total' || name === 'valor_pago') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'orcamento_item_id') {
            finalValue = value ? parseInt(value, 10) : '';
        }
        if (name === 'prioridade') {
            finalValue = value ? parseInt(value, 10) : 0;
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = {
            ...formData,
            orcamento_item_id: formData.orcamento_item_id || null,
            prioridade: parseInt(formData.prioridade, 10) || 0,
            fornecedor: formData.fornecedor || null
        };
        onSave(dataToSend);
    };

    if (!lancamento) return null;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Editar Lançamento"
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-edit-lancamento" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Salvar Alterações
                    </button>
                </>
            }
        >
            <form id="form-edit-lancamento" onSubmit={handleSubmit}>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Data do Registro</label>
                        <input className="m-input" type="date" name="data" value={formData.data || ''} onChange={handleChange} required />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Data de Vencimento</label>
                        <input className="m-input" type="date" name="data_vencimento" value={formData.data_vencimento || ''} onChange={handleChange} required />
                    </div>
                </div>
                <div className="m-field">
                    <label className="m-label">Descrição</label>
                    <input className="m-input" type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required />
                </div>
                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input className="m-input" type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>
                <div className="m-field">
                    <label className="m-label">Chave PIX</label>
                    <input className="m-input" type="text" name="pix" value={formData.pix || ''} onChange={handleChange} />
                </div>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Valor Total (R$)</label>
                        <input className="m-input" type="number" step="0.01" name="valor_total" value={formData.valor_total || 0} onChange={handleChange} required />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Valor Já Pago (R$)</label>
                        <input className="m-input" type="number" step="0.01" name="valor_pago" value={formData.valor_pago || 0} onChange={handleChange} required />
                    </div>
                </div>
                <div className="m-field">
                    <label className="m-label">Vincular ao Item do Orçamento <span className="m-label-opt">(opcional)</span></label>
                    <select className="m-select" name="orcamento_item_id" value={formData.orcamento_item_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Despesa Geral)</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                </div>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Prioridade</label>
                        <select className="m-select" name="prioridade" value={formData.prioridade || 0} onChange={handleChange}>
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
                        <select className="m-select" name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required>
                            <option>Mão de Obra</option>
                            <option>Serviço</option>
                            <option>Material</option>
                            <option>Equipamentos</option>
                        </select>
                    </div>
                </div>
                <div className="m-field">
                    <label className="m-label">Status</label>
                    <select className="m-select" name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required>
                        <option>A Pagar</option>
                        <option>Pago</option>
                    </select>
                </div>
            </form>
        </Modal>
    );
};

export default React.memo(EditLancamentoModal);
