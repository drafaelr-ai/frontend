import React, { useState, useEffect } from 'react';
import Modal from './Modal';
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
            master: { bg: '#fef3c7', color: '#92400e', icon: '👑' },
            administrador: { bg: '#dbeafe', color: '#1e40af', icon: '⭐' },
            comum: { bg: '#f3f4f6', color: '#374151', icon: '👤' }
        };
        const s = styles[role] || styles.comum;
        return (
            <span style={{
                backgroundColor: s.bg,
                color: s.color,
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.85em',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {s.icon} {role}
            </span>
        );
    };

    return (
        <Modal onClose={onClose} customWidth="800px">
            {userToEdit && (
                <UserPermissionsModal
                    userToEdit={userToEdit}
                    allObras={allObras}
                    onClose={() => setUserToEdit(null)}
                    onSave={handleSavePermissions}
                />
            )}
            <div style={{opacity: userToEdit ? 0.1 : 1}}>
                <h2>Painel de Administração</h2>
                <div className="card-full" style={{ background: '#f8f9fa' }}>
                    <h3>Criar Novo Usuário</h3>
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
                        <button type="submit" className="submit-btn" style={{flexGrow: 0}}>Criar</button>
                    </form>
                    {error && <p style={{ color: 'red', fontSize: '0.9em' }}>{error}</p>}
                </div>
                <h3 style={{marginTop: '30px'}}>Usuários Existentes</h3>
                {isLoading ? <p>Carregando usuários...</p> : (
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th style={{width: '180px'}}>Nível</th>
                                <th style={{textAlign: 'center'}}>Ações</th>
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
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #d1d5db',
                                                backgroundColor: changingRole === user.id ? '#f3f4f6' : 'white',
                                                cursor: changingRole === user.id ? 'wait' : 'pointer',
                                                fontSize: '0.9em',
                                                width: '100%'
                                            }}
                                        >
                                            <option value="comum">👤 Operador</option>
                                            <option value="administrador">⭐ Admin</option>
                                            <option value="master">👑 Master</option>
                                        </select>
                                    </td>
                                   <td style={{textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                        <button
                                            className="acao-btn"
                                            style={{backgroundColor: '#17a2b8', color: 'white'}}
                                            onClick={() => setUserToEdit(user)}
                                        >
                                            Obras
                                        </button>
                                        <button
                                            className="acao-btn"
                                            style={{backgroundColor: 'var(--cor-vermelho)', color: 'white'}}
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
