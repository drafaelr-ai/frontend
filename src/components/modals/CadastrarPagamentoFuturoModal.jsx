import React, { useState } from 'react';
import Modal from '../Modal/Modal';
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Cadastrar Pagamento Futuro"
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-cadastrar-pagamento-futuro" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Cadastrar
                    </button>
                </>
            }
        >
            <form id="form-cadastrar-pagamento-futuro" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Descrição</label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </div>
                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Valor (R$)</label>
                        <input
                            className="m-input"
                            type="number"
                            step="0.01"
                            value={formData.valor}
                            onChange={(e) => setFormData({...formData, valor: e.target.value})}
                            required
                        />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Data de Vencimento</label>
                        <input
                            className="m-input"
                            type="date"
                            value={formData.data_vencimento}
                            onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                            required
                        />
                    </div>
                </div>
                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Chave PIX <span className="m-label-opt">(opcional)</span></label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Código de Barras / Linha Digitável <span className="m-label-opt">(opcional)</span></label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.codigo_barras}
                        onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                        placeholder="Ex: 34191.09008 12345.678901..."
                        maxLength="100"
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Vincular a Item do Orçamento <span className="m-label-opt">(opcional)</span></label>
                    <select
                        className="m-select"
                        value={formData.orcamento_item_id || ''}
                        onChange={(e) => setFormData({...formData, orcamento_item_id: e.target.value})}
                    >
                        <option value="">Nenhum (Despesa Geral)</option>
                        {itensOrcamento.map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', marginBottom: 0 }}>
                        Ao pagar, o valor será contabilizado no orçamento do item selecionado.
                    </p>
                </div>
                <div className="m-field">
                    <label className="m-label">Observações <span className="m-label-opt">(opcional)</span></label>
                    <textarea
                        className="m-textarea"
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default React.memo(CadastrarPagamentoFuturoModal);
