import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { formatCurrency } from '../../utils/format';

const PartialPaymentModal = ({ item, onClose, onSave }) => {
    const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
    const [valorAPagar, setValorAPagar] = useState(valorRestante.toFixed(2));
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const valorFloat = parseFloat(valorAPagar);

        if (isNaN(valorFloat) || valorFloat <= 0) {
            setError('O valor deve ser um número positivo.');
            return;
        }

        // +0.01 para evitar erros de arredondamento de centavos
        if (valorFloat > (valorRestante + 0.01)) {
            setError(`O valor não pode ser maior que o restante (${formatCurrency(valorRestante)}).`);
            return;
        }

        onSave(valorFloat);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Registrar Pagamento"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-partial-payment" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Registrar Pagamento
                    </button>
                </>
            }
        >
            <form id="form-partial-payment" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Item</label>
                    <input className="m-input" type="text" value={item.descricao} readOnly disabled />
                </div>
                <div className="m-field">
                    <label className="m-label">Valor Restante</label>
                    <input className="m-input" type="text" value={formatCurrency(valorRestante)} readOnly disabled />
                </div>
                <div className="m-field">
                    <label className="m-label">Valor a Pagar Hoje</label>
                    <input
                        className="m-input"
                        type="number"
                        step="0.01"
                        value={valorAPagar}
                        onChange={(e) => setValorAPagar(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                {error && (
                    <p style={{ color: 'var(--status-danger-text)', textAlign: 'center', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
};

export default PartialPaymentModal;
