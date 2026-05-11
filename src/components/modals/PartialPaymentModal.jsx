import React, { useState } from 'react';
import Modal from './Modal';
import { formatCurrency } from '../../utils/format';

const PartialPaymentModal = ({ item, onClose, onSave }) => {

    // Calcula o valor que ainda falta pagar
    const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);

    // Define o valor inicial do input como o valor restante
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

        // Envia o valor para a função principal
        onSave(valorFloat);
    };

    return (
        <Modal onClose={onClose}>
            <h2>Registrar Pagamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Item</label>
                    <input type="text" value={item.descricao} readOnly disabled />
                </div>

                <div className="form-group">
                    <label>Valor Restante</label>
                    <input
                        type="text"
                        value={formatCurrency(valorRestante)}
                        readOnly
                        disabled
                    />
                </div>

                <div className="form-group">
                    <label>Valor a Pagar Hoje</label>
                    <input
                        type="number"
                        step="0.01"
                        value={valorAPagar}
                        onChange={(e) => setValorAPagar(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                {error && <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center' }}>{error}</p>}

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn" style={{backgroundColor: 'var(--cor-acento)'}}>
                        Registrar Pagamento
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PartialPaymentModal;
