import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const EditPrioridadeModal = ({ item, onClose, onSave }) => {
    // ... (código inalterado)
    const [prioridade, setPrioridade] = useState(0);

    useEffect(() => {
        if (item) {
            setPrioridade(item.prioridade || 0);
        }
    }, [item]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(parseInt(prioridade, 10));
    };

    if (!item) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Prioridade</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Item</label>
                    <input type="text" value={item.descricao} readOnly disabled />
                </div>
                <div className="form-group">
                    <label>Prioridade</label>
                    <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Prioridade</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditPrioridadeModal;
