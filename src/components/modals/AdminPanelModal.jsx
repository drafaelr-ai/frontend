import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import UserPermissionsModal from './UserPermissionsModal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { confirmDialog } from '../../utils/notify';

const AdminPanelModal = ({ allObras, onClose }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userToEdit, setUserToEdit] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('comum');
    const [changingRole, setChangingRole] = useState(null);

    const fetchUsers = () => {
        setIsLoading(true);
        fetchWithAuth(`${API_URL}/admin/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(err => {
                logger.error("Erro ao buscar usuários:", err);
                setError("Falha ao carregar usuários.");
                setIsLoading(false);
            });
    };

    const handleChangeRole = async (userId, novoRole) => {
        if (!await confirmDialog(`Deseja alterar o nível deste usuário para "${novoRole}"?`, { confirmText: 'Alterar nível' })) {
            return;
        }

        setChangingRole(userId);
        setError(null);

        try {
            const response = await fetchWithAuth(`${API_URL}/admin/users/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: novoRole })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.erro || 'Erro ao alterar nível');
            }

            await response.json();

            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? { ...u, role: novoRole } : u
            ));

        } catch (err) {
            logger.error("Erro ao alterar nível:", err);
            setError(err.message);
        } finally {
            setChangingRole(null);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!await confirmDialog(`Tem certeza que deseja excluir o usuário ${user.username}? Esta ação não pode ser desfeita.`, { danger: true, confirmText: 'Excluir' })) {
            return;
        }

        setError(null);

        fetchWithAuth(`${API_URL}/admin/users/${user.id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') });
            return res.json();
        })
        .then(() => {
            setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        })
        .catch(err => {
            logger.error("Erro ao deletar usuário:", err);
            setError(err.message);
        });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = (e) => {
        e.preventDefault();
        setError(null);
        fetchWithAuth(`${API_URL}/admin/users`, {
            method: 'POST',
            body: JSON.stringify({
                username: newUsername,
                password: newPassword,
                role: newRole
            })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') });
            return res.json();
        })
        .then(newUser => {
            setUsers(prevUsers => [...prevUsers, newUser]);
            setNewUsername('');
            setNewPassword('');
            setNewRole('comum');
        })
        .catch(err => {
            logger.error("Erro ao criar usuário:", err);
            setError(err.message);
        });
    };

    const handleSavePermissions = (userId, obra_ids) => {
        fetchWithAuth(`${API_URL}/admin/users/${userId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ obra_ids })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.erro || 'Erro ao salvar') });
            return res.json();
        })
        .then(() => {
            setUserToEdit(null);
        })
        .catch(err => {
            logger.error("Erro ao salvar permissões:", err);
            setError(err.message);
        });
    };

    const getRoleBadge = (role) => {
        const styles = {
            master: { bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)', icon: '👑' },
            administrador: { bg: 'var(--status-info-bg)', color: 'var(--status-info)', icon: '⭐' },
            comum: { bg: 'var(--surface-muted)', color: 'var(--text-secondary)', icon: '👤' }
        };
        const s = styles[role] || styles.comum;
        return (
            <span style={{
                backgroundColor: s.bg,
                color: s.color,
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)'
            }}>
                {s.icon} {role}
            </span>
        );
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Painel de Administração"
            width="xlarge"
            scrollBody={true}
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
            }
        >
            {userToEdit && (
                <UserPermissionsModal
                    userToEdit={userToEdit}
                    allObras={allObras}
                    onClose={() => setUserToEdit(null)}
                    onSave={handleSavePermissions}
                />
            )}
            <div style={{ opacity: userToEdit ? 0.1 : 1 }}>
                <div className="card-full" style={{ background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                    <p className="m-section" style={{ marginTop: 0 }}>Criar Novo Usuário</p>
                    <form onSubmit={handleCreateUser} className="form-add-obra">
                        <input
                            type="text"
                            placeholder="Usuário (ou e-mail)"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Senha Temporária"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                        >
                            <option value="comum">👤 Operador (comum)</option>
                            <option value="administrador">⭐ Administrador</option>
                            <option value="master">👑 Master</option>
                        </select>
                        <button type="submit" className="m-btn-primary" style={{ flexGrow: 0 }}>
                            <i className="ti ti-plus" aria-hidden="true"></i>
                            Criar
                        </button>
                    </form>
                    {error && <p style={{ color: 'var(--status-danger)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{error}</p>}
                </div>

                <p className="m-section">Usuários Existentes</p>
                {isLoading ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Carregando usuários...</p>
                ) : (
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th style={{ width: '180px' }}>Nível</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.username}</td>
                                    <td>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                            disabled={changingRole === user.id}
                                            style={{
                                                padding: 'var(--space-1) var(--space-2)',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '0.5px solid var(--border-default)',
                                                backgroundColor: changingRole === user.id ? 'var(--surface-muted)' : 'var(--surface-card)',
                                                cursor: changingRole === user.id ? 'wait' : 'pointer',
                                                fontSize: 'var(--text-sm)',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="comum">👤 Operador</option>
                                            <option value="administrador">⭐ Admin</option>
                                            <option value="master">👑 Master</option>
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center', display: 'flex', gap: 'var(--space-1)', justifyContent: 'center' }}>
                                        <button
                                            className="acao-btn"
                                            style={{ backgroundColor: 'var(--status-info)', color: 'white' }}
                                            onClick={() => setUserToEdit(user)}
                                        >
                                            Obras
                                        </button>
                                        <button
                                            className="acao-btn"
                                            style={{ backgroundColor: 'var(--status-danger)', color: 'white' }}
                                            onClick={() => handleDeleteUser(user)}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
};

export default AdminPanelModal;
