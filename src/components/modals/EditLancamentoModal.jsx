import React, { useState, useEffect } from 'react';
import Modal from './Modal';
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
             // Formatar data_vencimento
             if (initialData.data_vencimento) {
                 try {
                     initialData.data_vencimento = new Date(initialData.data_vencimento + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     logger.error("Erro ao formatar data_vencimento para edição:", e);
                     initialData.data_vencimento = '';
                 }
             } else {
                 initialData.data_vencimento = initialData.data || ''; // Fallback para data normal
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

        if (name === 'valor_total' || name === 'valor_pago') { // <-- MUDANÇA
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
        <Modal onClose={onClose}>
            <h2>Editar Lançamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data do Registro</label>
                    <input type="date" name="data" value={formData.data || ''} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label>Data de Vencimento ⚠️</label>
                    <input type="date" name="data_vencimento" value={formData.data_vencimento || ''} onChange={handleChange} required />
                </div>

                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>

                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>

                {/* <-- MUDANÇA: valor -> valor_total --> */}
                <div className="form-group"><label>Valor Total (R$)</label>
                    <input type="number" step="0.01" name="valor_total" value={formData.valor_total || 0} onChange={handleChange} required />
                </div>
                {/* <-- MUDANÇA: Novo campo valor_pago --> */}
                <div className="form-group"><label>Valor Já Pago (R$)</label>
                    <input type="number" step="0.01" name="valor_pago" value={formData.valor_pago || 0} onChange={handleChange} required />
                </div>

                <div className="form-group"><label>Vincular ao Item do Orçamento (Opcional)</label>
                    <select name="orcamento_item_id" value={formData.orcamento_item_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Despesa Geral)</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Prioridade</label>
                    <select name="prioridade" value={formData.prioridade || 0} onChange={handleChange}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Material</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                <div className="form-group"><label>Status</label><select name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required><option>A Pagar</option><option>Pago</option></select></div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
            </form>
        </Modal>
    );
};

export default EditLancamentoModal;
