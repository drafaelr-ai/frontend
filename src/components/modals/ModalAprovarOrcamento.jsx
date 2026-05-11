import React, { useState } from 'react';
import Modal from './Modal';
import { formatCurrency } from '../../utils/format';

const ModalAprovarOrcamento = ({ orcamento, onClose, onConfirmar }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAprovar = async () => {
        setIsSubmitting(true);
        try {
            await onConfirmar();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose} customWidth="450px">
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px', color: '#28a745' }}>
                    ✅ Aprovar Solicitação
                </h2>

                {/* Info da Solicitação */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '25px',
                    border: '1px solid #e9ecef',
                    textAlign: 'left'
                }}>
                    <strong style={{ fontSize: '1.1em', display: 'block', marginBottom: '10px' }}>
                        {orcamento.descricao}
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#666' }}>
                        <span>💰 Valor: <strong style={{ color: '#28a745' }}>{formatCurrency(orcamento.valor)}</strong></span>
                        {orcamento.fornecedor && <span>🏢 Fornecedor: {orcamento.fornecedor}</span>}
                        {orcamento.tipo && <span>📦 Tipo: {orcamento.tipo}</span>}
                        {orcamento.servico_nome && <span>🔧 Serviço: {orcamento.servico_nome}</span>}
                        {orcamento.numero_parcelas > 1 && (
                            <span>📅 Parcelamento: {orcamento.numero_parcelas}x de {formatCurrency(orcamento.valor / orcamento.numero_parcelas)}</span>
                        )}
                        {orcamento.data_vencimento && (
                            <span>📆 Vencimento: {new Date(orcamento.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                    </div>
                </div>

                <p style={{ marginBottom: '20px', color: '#666' }}>
                    Ao aprovar, será criado automaticamente um <strong>pagamento futuro</strong> no cronograma financeiro.
                    {orcamento.servico_nome && (
                        <><br/><br/>O valor será somado ao orçamento do serviço <strong>"{orcamento.servico_nome}"</strong>.</>
                    )}
                </p>

                {/* Botões */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onClose}
                        className="cancel-btn"
                        style={{ flex: 1, padding: '14px' }}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAprovar}
                        className="submit-btn"
                        style={{
                            flex: 2,
                            padding: '14px',
                            backgroundColor: '#28a745',
                            fontSize: '1.05em'
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳ Aprovando...' : '✅ Aprovar Compra'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalAprovarOrcamento;
