import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Editar Permissões"
            subtitle={`${userToEdit.username} · ${userToEdit.role}`}
            width="default"
            footer={isLoading ? undefined : (
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-user-permissions" className="m-btn-primary">
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Salvar Permissões
                    </button>
                </>
            )}
        >
            {isLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Carregando permissões...</p>
            ) : (
                <form id="form-user-permissions" onSubmit={handleSubmit}>
                    <div className="m-field">
                        <label className="m-label">Obras com acesso</label>
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: '0.5px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-2)',
                        }}>
                            {allObras.length > 0 ? allObras.map(obra => (
                                <label key={obra.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-1) var(--space-2)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--text-base)',
                                    color: 'var(--text-primary)',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedObraIds.has(obra.id)}
                                        onChange={() => handleCheckboxChange(obra.id)}
                                    />
                                    {obra.nome}
                                </label>
                            )) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-2)' }}>
                                    Nenhuma obra cadastrada para atribuir.
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default React.memo(UserPermissionsModal);
