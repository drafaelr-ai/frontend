import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';

const EditPrioridadeModal = ({ item, onClose, onSave }) => {
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Editar Prioridade"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-edit-prioridade" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Salvar Prioridade
                    </button>
                </>
            }
        >
            <form id="form-edit-prioridade" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Item</label>
                    <input className="m-input" type="text" value={item.descricao} readOnly disabled />
                </div>
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
            </form>
        </Modal>
    );
};

export default EditPrioridadeModal;
