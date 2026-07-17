import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const MODULOS = [
    { id: 'obras', label: 'Obras', icon: 'ti-building', color: 'var(--module-obras)' },
    { id: 'admin', label: 'Administração (patrimônio)', icon: 'ti-building-bank', color: 'var(--module-admin)' },
    { id: 'rh', label: 'Pessoal / RH', icon: 'ti-users-group', color: 'var(--module-rh)' },
    { id: 'frota', label: 'Frota', icon: 'ti-truck', color: 'var(--module-frota)' },
    { id: 'solicitacoes', label: 'Solicitações (compras)', icon: 'ti-shopping-cart', color: 'var(--module-solicitacoes)' },
];

const UserPermissionsModal = ({ userToEdit, allObras, onClose, onSave }) => {
    const [selectedObraIds, setSelectedObraIds] = useState(new Set());
    const [todosModulos, setTodosModulos] = useState(true);
    const [selectedModulos, setSelectedModulos] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const isMaster = userToEdit?.role === 'master';

    useEffect(() => {
        if (userToEdit) {
            const lista = userToEdit.modulos_permitidos;
            setTodosModulos(lista == null);
            setSelectedModulos(new Set(Array.isArray(lista) ? lista : []));
            fetchWithAuth(`${API_URL}/admin/users/${userToEdit.id}/permissions`)
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro ao buscar permissões') });
                    return res.json();
                })
                .then(data => {
                    setSelectedObraIds(new Set(data.obra_ids));
                    setIsLoading(false);
                })
                .catch(err => {
                    logger.error("Erro ao buscar permissões:", err);
                    notify.error(err.message || 'Erro ao buscar permissões');
                    setIsLoading(false);
                    onClose();
                });
        }
    }, [userToEdit, onClose]);

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

    const handleModuloChange = (moduloId) => {
        setSelectedModulos(prevSet => {
            const newSet = new Set(prevSet);
            if (newSet.has(moduloId)) {
                newSet.delete(moduloId);
            } else {
                newSet.add(moduloId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isMaster) {
            const modulos = todosModulos ? null : Array.from(selectedModulos);
            try {
                const res = await fetchWithAuth(`${API_URL}/admin/users/${userToEdit.id}/modulos`, {
                    method: 'PUT',
                    body: JSON.stringify({ modulos }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.erro || 'Erro ao salvar módulos');
                }
                userToEdit.modulos_permitidos = modulos;
            } catch (err) {
                logger.error("Erro ao salvar módulos:", err);
                notify.error(err.message || 'Erro ao salvar módulos');
                return;
            }
        }
        const obra_ids = Array.from(selectedObraIds);
        onSave(userToEdit.id, obra_ids);
    };

    const checkboxRow = {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-1) var(--space-2)',
        cursor: 'pointer',
        fontSize: 'var(--text-base)',
        color: 'var(--text-primary)',
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
                        <label className="m-label">Módulos com acesso</label>
                        {isMaster ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                                <i className="ti ti-crown" aria-hidden="true" /> Master sempre tem acesso a todos os módulos.
                            </p>
                        ) : (
                            <div style={{
                                border: '0.5px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-2)',
                            }}>
                                <label style={checkboxRow}>
                                    <input
                                        type="radio"
                                        name="modulos-modo"
                                        checked={todosModulos}
                                        onChange={() => setTodosModulos(true)}
                                    />
                                    Todos os módulos
                                </label>
                                <label style={checkboxRow}>
                                    <input
                                        type="radio"
                                        name="modulos-modo"
                                        checked={!todosModulos}
                                        onChange={() => setTodosModulos(false)}
                                    />
                                    Somente os módulos selecionados:
                                </label>
                                {!todosModulos && (
                                    <div style={{ paddingLeft: 'var(--space-6)' }}>
                                        {MODULOS.map(m => (
                                            <label key={m.id} style={checkboxRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedModulos.has(m.id)}
                                                    onChange={() => handleModuloChange(m.id)}
                                                />
                                                <span
                                                    aria-hidden="true"
                                                    style={{
                                                        width: 8, height: 8, borderRadius: 'var(--radius-full)',
                                                        background: m.color, flexShrink: 0,
                                                    }}
                                                />
                                                <i className={`ti ${m.icon}`} aria-hidden="true" style={{ color: m.color }} /> {m.label}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                                <label key={obra.id} style={checkboxRow}>
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
