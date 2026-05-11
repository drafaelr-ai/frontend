import React, { useState } from 'react';
import Modal from './Modal';
import { getTodayString } from '../../utils/format';

const CadastrarPagamentoFuturoModal = ({ onClose, onSave, obraId, itensOrcamento = [] }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        data_vencimento: getTodayString(),
        fornecedor: '',
        pix: '',
        codigo_barras: '',
        observacoes: '',
        orcamento_item_id: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({
            ...formData,
            orcamento_item_id: formData.orcamento_item_id || null
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>💰 Cadastrar Pagamento Futuro</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Valor:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Data de Vencimento:
                    <input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Chave PIX:
                    <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </label>

                <label>
                    Código de Barras / Linha Digitável:
                    <input
                        type="text"
                        value={formData.codigo_barras}
                        onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                        placeholder="Ex: 34191.09008 12345.678901..."
                        maxLength="100"
                    />
                </label>

                <label>
                    📦 Vincular a Item do Orçamento:
                    <select
                        value={formData.orcamento_item_id || ''}
                        onChange={(e) => setFormData({...formData, orcamento_item_id: e.target.value})}
                    >
                        <option value="">-- Nenhum (Despesa Geral) --</option>
                        {itensOrcamento.map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                    <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        💡 Ao pagar, o valor será contabilizado no orçamento do item selecionado
                    </small>
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Cadastrar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};

export default CadastrarPagamentoFuturoModal;
