import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';

const UserPermissionsModal = ({ userToEdit, allObras, onClose, onSave }) => {
    const [selectedObraIds, setSelectedObraIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (userToEdit) {
            fetchWithAuth(`${API_URL}/admin/users/${userToEdit.id}/permissions`)
                .then(res => res.json())
                .then(data => {
                    setSelectedObraIds(new Set(data.obra_ids));
                    setIsLoading(false);
                })
                .catch(err => {
                    logger.error("Erro ao buscar permissões:", err);
                    setIsLoading(false);
                });
        }
    }, [userToEdit]);
    const handleCheckboxChange = (obraId) => {
        setSelectedObraIds(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(obraId)) {
                newSet.delete(obraId);
            } else {
                newSet.add(obraId);
            }
            return newSet;
        });
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const obra_ids = Array.from(selectedObraIds);
        onSave(userToEdit.id, obra_ids);
    };
    if (isLoading) {
        return <Modal onClose={onClose}><div className="loading-screen">Carregando permissões...</div></Modal>;
    }
    return (
        <Modal onClose={onClose}>
            <h2>Editar Permissões: {userToEdit.username}</h2>
            <p>Nível: <strong>{userToEdit.role}</strong></p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Selecione as obras que este usuário pode ver:</label>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
                        {allObras.length > 0 ? allObras.map(obra => (
                            <div key={obra.id}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selectedObraIds.has(obra.id)}
                                        onChange={() => handleCheckboxChange(obra.id)}
                                    />
                                    {obra.nome}
                                </label>
                            </div>
                        )) : <p>Nenhuma obra cadastrada para atribuir.</p>}
                    </div>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Permissões</button>
                </div>
            </form>
        </Modal>
    );
};

export default UserPermissionsModal;
