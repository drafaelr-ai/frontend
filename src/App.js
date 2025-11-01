import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import './App.css';

// Imports do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Registrar os componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// --- CONFIGURAÇÃO INICIAL ---
const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para exibir a prioridade
const PrioridadeBadge = ({ prioridade }) => {
    let p = parseInt(prioridade, 10) || 0;
    if (p === 0) {
        return <span style={{ color: '#aaa', fontSize: '0.9em' }}>-</span>;
    }
    
    let color = '#6c757d'; // 1-2 (Baixa)
    if (p === 3) color = '#007bff'; // 3 (Média)
    if (p === 4) color = '#ffc107'; // 4 (Alta)
    if (p === 5) color = '#dc3545'; // 5 (Urgente)

    const style = {
        backgroundColor: color,
        color: 'white',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '10px',
        textAlign: 'center'
    };
    return <span style={style}>{p}</span>;
};


// Helper para formatar BRL
const formatCurrency = (value) => {
    if (typeof value !== 'number') { value = 0; }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para pegar a data de hoje (para novos lançamentos)
const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000));
    return todayWithOffset.toISOString().split('T')[0];
};

// --- HELPER DA API (ATUALIZADO PARA FORMDATA) ---
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
        // 'Content-Type': 'application/json', // <-- REMOVIDO DAQUI
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // <-- INÍCIO DA MUDANÇA -->
    // Não defina Content-Type se o body for FormData
    // O navegador fará isso (com o 'boundary' correto)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    // <-- FIM DA MUDANÇA -->

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload(); 
        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};


// --- CONTEXTO DE AUTENTICAÇÃO ---
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// --- COMPONENTE DE LOGIN ---
const LoginScreen = () => {
    const { login } = useAuth(); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido'); });
            }
            return res.json();
        })
        .then(data => {
            login(data); 
        })
        .catch(err => {
            console.error("Erro no login:", err);
            setError(err.message || "Credenciais inválidas. Verifique seu usuário e senha.");
            setIsLoading(false);
        });
    };

    const loginStyles = {
        container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--cor-fundo)' },
        card: { padding: '40px', background: 'white', borderRadius: '8px', boxShadow: 'var(--sombra-card)', minWidth: '300px' },
        form: { display: 'flex', flexDirection: 'column', gap: '15px' },
        input: { padding: '12px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '4px' },
        
        h1: {
            textAlign: 'center',
            margin: 0,
            marginBottom: '30px', 
            color: 'var(--cor-primaria)', 
            fontSize: '3em',
            fontWeight: '700',
            fontFamily: 'Segoe UI, sans-serif'
        },

        button: { padding: '12px', fontSize: '1em', background: 'var(--cor-primaria)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
        error: { color: 'var(--cor-vermelho)', textAlign: 'center', marginTop: '10px' }
    };

    return (
        <div style={loginStyles.container}>
            <div style={loginStyles.card}>
                
                <h1 style={loginStyles.h1}>Obraly</h1>

                <form onSubmit={handleLogin} style={loginStyles.form}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={loginStyles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={loginStyles.input}
                        required
                    />
                    <button type="submit" style={loginStyles.button} disabled={isLoading}>
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                    {error && <p style={loginStyles.error}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

// Gráfico de Pizza
const GastosPorSegmentoChart = ({ data }) => {
    if (!data || Object.keys(data).length === 0) {
        return <p style={{textAlign: 'center', padding: '20px'}}>Sem dados para exibir no gráfico.</p>;
    }

    const chartData = {
        labels: Object.keys(data),
        datasets: [
            {
                label: 'Valor Gasto (R$)',
                data: Object.values(data),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)', // Vermelho (Material)
                    'rgba(54, 162, 235, 0.7)', // Azul (Mão de Obra)
                    'rgba(255, 206, 86, 0.7)', // Amarelo (Serviço)
                    'rgba(75, 192, 192, 0.7)', // Verde (Equipamentos)
                    'rgba(153, 102, 255, 0.7)', // Roxo
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
    };

    return (
        <div style={{ position: 'relative', height: '350px' }}>
            <Pie data={chartData} options={options} />
        </div>
    );
};
// ---------------------------------


// --- COMPONENTES DE MODAL (Existentes) ---
const Modal = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

// Modal de Edição (com Fornecedor)
const EditLancamentoModal = ({ lancamento, onClose, onSave, servicos }) => {
    const [formData, setFormData] = useState({});
    
    useEffect(() => {
         if (lancamento) {
             const initialData = { ...lancamento };
             if (initialData.data) {
                 try {
                     initialData.data = new Date(initialData.data + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     console.error("Erro ao formatar data para edição:", e);
                     initialData.data = '';
                 }
             }
             initialData.servico_id = initialData.servico_id ? parseInt(initialData.servico_id, 10) : '';
             initialData.prioridade = initialData.prioridade ? parseInt(initialData.prioridade, 10) : 0; 
             initialData.fornecedor = initialData.fornecedor || ''; 

             setFormData(initialData);
         } else {
             setFormData({});
         }
     }, [lancamento]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        let finalValue = value;
        if (name === 'valor') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'servico_id') {
            finalValue = value ? parseInt(value, 10) : ''; 
        }
        if (name === 'prioridade') {
            finalValue = value ? parseInt(value, 10) : 0;
        }
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        const dataToSend = {
            ...formData,
            servico_id: formData.servico_id || null,
            prioridade: parseInt(formData.prioridade, 10) || 0,
            fornecedor: formData.fornecedor || null 
        };
        onSave(dataToSend); 
    };
    
    if (!lancamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Lançamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data</label>
                    <input type="date" name="data" value={formData.data || ''} onChange={handleChange} required />
                </div>
                
                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required /></div>
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select name="servico_id" value={formData.servico_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Prioridade</label>
                    <select name="prioridade" value={formData.prioridade || 0} onChange={handleChange}>
                        <option value="0">0 (Nenhuma)</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3 (Média)</option>
                        <option value="4">4</option>
                        <option value="5">5 (Urgente)</option>
                    </select>
                </div>

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Material</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                <div className="form-group"><label>Status</label><select name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required><option>A Pagar</option><option>Pago</option></select></div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
            </form>
        </Modal>
    );
};

// Modal de Serviço (com Orçamento de Material)
const ServicoDetailsModal = ({ servico, onClose, onSave, fetchObraData, obraId }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    
     useEffect(() => {
         if (servico) {
             setFormData({
                 ...servico,
                 valor_global_mao_de_obra: servico.valor_global_mao_de_obra || 0,
                 valor_global_material: servico.valor_global_material || 0, 
             });
         } else {
             setFormData({});
         }
     }, [servico]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        const finalValue = (name === 'valor_global_mao_de_obra' || name === 'valor_global_material') 
            ? parseFloat(value) || 0 
            : value; 
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };

    const handleDeletarPagamento = (pagamentoId) => {
        fetchWithAuth(`${API_URL}/servicos/${servico.id}/pagamentos/${pagamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) throw new Error('Erro ao deletar'); return res.json(); })
        .then(() => {
             if (fetchObraData && obraId) { fetchObraData(obraId); onClose(); } 
             else { window.location.reload(); }
        })
        .catch(error => console.error('Erro:', error));
    };

    const handleDeletarServico = () => {
        fetchWithAuth(`${API_URL}/servicos/${servico.id}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) throw new Error('Erro ao deletar'); return res.json(); })
        .then(() => {
             if (fetchObraData && obraId) { fetchObraData(obraId); onClose(); } 
             else { window.location.reload(); }
        })
        .catch(error => console.error('Erro:', error));
    };

    if (!servico) return null;
    
    const pagamentosMO = (servico.pagamentos || []).filter(p => p.tipo_pagamento === 'mao_de_obra');
    const totalGastoMO = pagamentosMO.reduce((sum, p) => sum + (p.valor || 0), 0) + (servico.total_gastos_vinculados_mo || 0);

    const pagamentosMat = (servico.pagamentos || []).filter(p => p.tipo_pagamento === 'material');
    const totalGastoMat = pagamentosMat.reduce((sum, p) => sum + (p.valor || 0), 0) + (servico.total_gastos_vinculados_mat || 0);

    return (
        <Modal onClose={onClose}>
            {!isEditing ? (
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>{servico.nome}</h2>
                        {user.role === 'administrador' && (
                            <button onClick={handleDeletarServico} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: '#dc3545', padding: '5px' }} title="Excluir Serviço" > 🗑️ </button>
                        )}
                    </div>
                    <p><strong>Responsável:</strong> {servico.responsavel || 'N/A'}</p>
                    <p><strong>Valor Orçado (Mão de Obra):</strong> {formatCurrency(servico.valor_global_mao_de_obra)} (Gasto Total: {formatCurrency(totalGastoMO)})</p>
                    <p><strong>Valor Orçado (Material):</strong> {formatCurrency(servico.valor_global_material)} (Gasto Total: {formatCurrency(totalGastoMat)})</p>
                    <p><strong>Chave PIX:</strong> {servico.pix || 'N/A'}</p>
                    <hr />
                    <h3>Histórico de Pagamentos (do Serviço)</h3>
                    <div className="tabela-scroll-container" style={{maxHeight: '200px'}}> 
                        <table className="tabela-pagamentos" style={{width: '100%'}}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Fornecedor</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    {user.role === 'administrador' && <th style={{width: '80px'}}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {servico.pagamentos && servico.pagamentos.length > 0 ? (
                                    servico.pagamentos.map((pag) => (
                                        <tr key={pag.id}>
                                            <td>{pag.data ? new Date(pag.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Inválida'}</td>
                                            <td>{pag.tipo_pagamento === 'mao_de_obra' ? 'Mão de Obra' : 'Material'}</td>
                                            <td>{pag.fornecedor || 'N/A'}</td>
                                            <td>{formatCurrency(pag.valor)}</td>
                                            <td>
                                                <span style={{ backgroundColor: pag.status === 'Pago' ? 'var(--cor-acento)' : 'var(--cor-vermelho)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: '500', textTransform: 'uppercase' }}>
                                                    {pag.status}
                                                </span>
                                            </td>
                                            {user.role === 'administrador' && (
                                                <td style={{textAlign: 'center'}}>
                                                    <button onClick={() => handleDeletarPagamento(pag.id)} className="acao-icon-btn delete-btn" title="Excluir Pagamento" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: '5px', color: '#dc3545' }} > 🗑️ </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                 ) : (
                                    <tr>
                                        <td colSpan={user.role === 'administrador' ? 6 : 5} style={{textAlign: 'center'}}>Nenhum pagamento rápido registrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <div className="form-actions" style={{marginTop: '20px'}}>
                            <button type="button" onClick={() => setIsEditing(true)} className="submit-btn"> Editar Serviço </button>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <h2>Editar Serviço</h2>
                    <div className="form-group"><label>Descrição</label><input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" value={formData.responsavel || ''} onChange={handleChange} /></div>
                    <div className="form-group">
                        <label>Valor Orçado - Mão de Obra (R$)</label>
                        <input type="number" step="0.01" name="valor_global_mao_de_obra" value={formData.valor_global_mao_de_obra || 0} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Valor Orçado - Material (R$)</label>
                        <input type="number" step="0.01" name="valor_global_material" value={formData.valor_global_material || 0} onChange={handleChange} />
                    </div>
                    
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                    <div className="form-actions"><button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
                </form>
            )}
        </Modal>
    );
};


// --- MODAIS DE ADMINISTRAÇÃO ---
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
                    console.error("Erro ao buscar permissões:", err);
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

const AdminPanelModal = ({ allObras, onClose }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userToEdit, setUserToEdit] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('comum');
    const fetchUsers = () => {
        setIsLoading(true);
        fetchWithAuth(`${API_URL}/admin/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Erro ao buscar usuários:", err);
                setError("Falha ao carregar usuários.");
                setIsLoading(false);
            });
    };
    useEffect(() => {
        fetchUsers();
    }, []);
    const handleCreateUser = (e) => {
        e.preventDefault();
        setError(null);
        if (newRole === 'administrador') {
            setError("Não é possível criar outro administrador por aqui.");
            return;
        }
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
            console.error("Erro ao criar usuário:", err);
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
            console.error("Erro ao salvar permissões:", err);
            setError(err.message); 
        });
    };
    return (
        <Modal onClose={onClose}>
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
                            <option value="comum">Usuário Comum (Visualizar)</option>
                            <option value="master">Usuário Master (Editar)</option>
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
                                <th>Nível</th>
                                <th style={{textAlign: 'center'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.username}</td>
                                    <td>{user.role}</td>
                                    <td style={{textAlign: 'center'}}>
                                        <button 
                                            className="acao-btn" 
                                            style={{backgroundColor: '#17a2b8', color: 'white'}}
                                            onClick={() => setUserToEdit(user)}
                                        >
                                            Editar Permissões
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
// ----------------------------------------------------

// Modal "Exportar Relatório Geral" (com fetchWithAuth)
const ExportReportModal = ({ onClose }) => {
    const [selectedPriority, setSelectedPriority] = useState('todas');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = () => {
        setIsLoading(true);
        setError(null);

        const url = `${API_URL}/export/pdf_pendentes_todas_obras?prioridade=${selectedPriority}`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o relatório.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                
                setIsLoading(false);
                onClose();
            })
            .catch(err => {
                console.error("Erro ao gerar PDF:", err);
                setError(err.message || "Não foi possível gerar o PDF.");
                setIsLoading(false);
            });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Exportar Relatório Geral de Pendências</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
                <div className="form-group">
                    <label>Filtrar por Prioridade</label>
                    <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} required>
                        <option value="todas">Todas as Pendências</option>
                        <option value="5">Prioridade 5 (Urgente)</option>
                        <option value="4">Prioridade 4</option>
                        <option value="3">Prioridade 3 (Média)</option>
                        <option value="2">Prioridade 2</option>
                        <option value="1">Prioridade 1</option>
                        <option value="0">Prioridade 0 (Nenhuma)</option>
                    </select>
                </div>
                
                <div className="form-actions" style={{ marginTop: '30px' }}>
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>Cancelar</button>
                    <button type="submit" className="submit-btn pdf" disabled={isLoading}>
                        {isLoading ? 'Gerando...' : 'Gerar PDF'}
                    </button>
                </div>
                {error && <p style={{color: 'red', textAlign: 'center', marginTop: '10px'}}>{error}</p>}
            </form>
        </Modal>
    );
};
// ----------------------------------------------------

// Modal para Editar Apenas a Prioridade de Pagamentos de Serviço
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
// ----------------------------------------------------


// --- COMPONENTE DO DASHBOARD (Atualizado) ---
function Dashboard() {
    const { user, logout } = useAuth();
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddServicoModalVisible, setAddServicoModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingServico, setViewingServico] = useState(null);
    const [isAdminPanelVisible, setAdminPanelVisible] = useState(false);
    
    const [isExportModalVisible, setExportModalVisible] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [orcamentos, setOrcamentos] = useState([]);
    const [isAddOrcamentoModalVisible, setAddOrcamentoModalVisible] = useState(false);
    const [isServicosCollapsed, setIsServicosCollapsed] = useState(false);
    const [editingServicoPrioridade, setEditingServicoPrioridade] = useState(null);
    const [filtroPendencias, setFiltroPendencias] = useState('');
    

    // <--- MUDANÇA: Novo state para edição de orçamento
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    // (Linhas existentes...)

    // <-- INÍCIO DA MUDANÇA: Adicione esta linha -->
    const [viewingAnexos, setViewingAnexos] = useState(null);
    // <-- FIM DA MUDANÇA -->
    // (Resto do código...)

    // Filtros de 'A Pagar' e 'Pagos'
    const itemsAPagar = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => item.status === 'A Pagar'), 
        [historicoUnificado]
    );
    
    const itemsAPagarFiltrados = useMemo(() => {
        if (!filtroPendencias) {
            return itemsAPagar;
        }
        const lowerCaseFiltro = filtroPendencias.toLowerCase();
        return itemsAPagar.filter(item => 
            (item.descricao && item.descricao.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.fornecedor && item.fornecedor.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.tipo && item.tipo.toLowerCase().includes(lowerCaseFiltro))
        );
    }, [itemsAPagar, filtroPendencias]);

    const itemsPagos = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => item.status === 'Pago'),
        [historicoUnificado]
    );


    // Efeito para buscar obras
    useEffect(() => {
        console.log("Buscando lista de obras...");
        fetchWithAuth(`${API_URL}/obras`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => { console.log("Obras recebidas:", data); setObras(Array.isArray(data) ? data : []); })
            .catch(error => { console.error("Erro ao buscar obras:", error); setObras([]); });
    }, []); 

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        console.log(`Buscando dados da obra ID: ${obraId}`);
        fetchWithAuth(`${API_URL}/obras/${obraId}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                console.log("Dados da obra recebidos:", data);
                setObraSelecionada(data.obra || null);
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                    ...serv,
                    pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                }));
                setServicos(servicosComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
            })
            .catch(error => { console.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); setOrcamentos([]); })
            .finally(() => setIsLoading(false));
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => {
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, { method: 'POST', body: JSON.stringify({ nome, cliente }) })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => { setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); e.target.reset(); })
        .catch(error => console.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => console.error('Erro ao deletar obra:', error));
    };
    
    const handleMarcarComoPago = (itemId) => {
        const isLancamento = String(itemId).startsWith('lanc-');
        const isServicoPag = String(itemId).startsWith('serv-pag-');
        const actualId = String(itemId).split('-').pop(); 

        let url = '';
        if (isLancamento) {
            url = `${API_URL}/lancamentos/${actualId}/pago`;
        } else if (isServicoPag) {
            url = `${API_URL}/servicos/pagamentos/${actualId}/status`;
        } else {
            return; 
        }

        console.log("Alternando status para:", itemId);
        fetchWithAuth(url, { method: 'PATCH' })
             .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
             .then(() => fetchObraData(obraSelecionada.id))
             .catch(error => console.error("Erro ao marcar como pago:", error));
    };

    const handleDeletarLancamento = (itemId) => {
         const isLancamento = String(itemId).startsWith('lanc-');
         const actualId = String(itemId).split('-').pop();
        if (isLancamento) {
            console.log("Deletando lançamento geral:", actualId);
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
                .then(() => { fetchObraData(obraSelecionada.id); })
                .catch(error => console.error('Erro ao deletar lançamento:', error));
        }
    };
    
    const handleEditLancamento = (item) => {
        if (item.tipo_registro === 'lancamento') { setEditingLancamento(item); }
    };
    
    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { 
            ...updatedLancamento, 
            valor: parseFloat(updatedLancamento.valor) || 0,
            servico_id: updatedLancamento.servico_id || null 
        };
        fetchWithAuth(`${API_URL}/lancamentos/${updatedLancamento.lancamento_id}`, { 
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição:", error));
    };
    
    const handleSaveLancamento = (lancamentoData) => {
        console.log("Salvando novo lançamento:", lancamentoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar lançamento:", error));
    };

    const handleSaveServico = (servicoData) => {
        console.log("Salvando novo serviço:", servicoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/servicos`, {
            method: 'POST',
            body: JSON.stringify(servicoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddServicoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar serviço:", error));
    };

    const handleSaveEditServico = (updatedServico) => {
        const dataToSend = {
            ...updatedServico,
            valor_global_mao_de_obra: parseFloat(updatedServico.valor_global_mao_de_obra) || 0,
            valor_global_material: parseFloat(updatedServico.valor_global_material) || 0, 
            responsavel: updatedServico.responsavel || null,
            pix: updatedServico.pix || null
        };
        fetchWithAuth(`${API_URL}/servicos/${updatedServico.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setViewingServico(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição do serviço:", error));
    };

    // Handlers dos Orçamentos (ATUALIZADOS)
    const handleSaveOrcamento = (formData) => { // <--- MUDANÇA: Recebe FormData
        console.log("Salvando novo orçamento...");
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/orcamentos`, {
            method: 'POST',
            body: formData // <--- MUDANÇA: Enviado diretamente
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setAddOrcamentoModalVisible(false);
            fetchObraData(obraSelecionada.id); 
        })
        .catch(error => {
            console.error("Erro ao salvar orçamento:", error);
            alert(`Erro ao salvar orçamento: ${error.message}\n\nVerifique o console para mais detalhes (F12).`);
        });
    };
    
    // <--- MUDANÇA: Nova função para salvar edição de orçamento (com anexos)
    const handleSaveEditOrcamento = (orcamentoId, formData, newFiles) => {
        console.log("Salvando edição do orçamento:", orcamentoId);
        
        // Etapa 1: Salvar os dados do formulário (texto)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, {
            method: 'PUT',
            body: formData // Envia como FormData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            
            // Etapa 2: Se houver novos arquivos, enviá-los
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                // Rota do backend para adicionar anexos a um orçamento existente
                return fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/anexos`, {
                    method: 'POST',
                    body: fileFormData
                });
            }
            
            return Promise.resolve(); // Nenhum arquivo para enviar
            
        }).then(fileRes => {
            if (fileRes && !fileRes.ok) {
                 // Tenta ler o erro do upload de arquivo
                 return fileRes.json().then(err => { throw new Error(err.erro || 'Erro ao enviar anexos') });
            }
            
            // Tudo certo, fechar modal e recarregar
            setEditingOrcamento(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            console.error("Erro ao salvar edição do orçamento:", error);
            alert(`Erro ao salvar edição: ${error.message}`);
        });
    };
    
    const handleAprovarOrcamento = (orcamentoId) => {
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/aprovar`, { method: 'POST' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao aprovar orçamento:", error));
    };
    
    const handleRejeitarOrcamento = (orcamentoId) => {
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao rejeitar orçamento:", error));
    };

    // Handler do PDF da Obra (com fetchWithAuth)
    const handleExportObraPDF = () => {
        if (!obraSelecionada) return;
        
        setIsExportingPDF(true);
        const url = `${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o PDF da obra.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                setIsExportingPDF(false);
            })
            .catch(err => {
                console.error("Erro ao gerar PDF da obra:", err);
                alert("Não foi possível gerar o PDF. Verifique o console para mais detalhes.");
                setIsExportingPDF(false);
            });
    };

    // Handler de Pagamento de Serviço (com Fornecedor)
    const handleAddPagamentoServico = (e, servicoId) => {
        e.preventDefault();
        const valorPagamento = e.target.valorPagamento.value;
        const statusPagamento = e.target.statusPagamento.value;
        const tipoPagamento = e.target.tipoPagamento.value;
        const dataPagamento = e.target.dataPagamento.value; 
        const prioridadePagamento = e.target.prioridadePagamento.value; 
        const fornecedor = e.target.fornecedor.value;
        
        if (!valorPagamento || !tipoPagamento || !dataPagamento) return;
        
        const pagamento = {
            valor: parseFloat(valorPagamento) || 0,
            data: dataPagamento, 
            status: statusPagamento,
            tipo_pagamento: tipoPagamento,
            prioridade: parseInt(prioridadePagamento, 10) || 0,
            fornecedor: fornecedor || null
        };
        console.log("Adicionando pagamento de serviço:", pagamento);
        fetchWithAuth(`${API_URL}/servicos/${servicoId}/pagamentos`, {
            method: 'POST',
            body: JSON.stringify(pagamento)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             e.target.reset(); 
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao adicionar pagamento:", error));
    };

    // Nova Função para salvar Prioridade do Pag. Serviço
    const handleSaveServicoPrioridade = (novaPrioridade) => {
        if (!editingServicoPrioridade) return;

        const pagamentoId = editingServicoPrioridade.pagamento_id;
        
        fetchWithAuth(`${API_URL}/servicos/pagamentos/${pagamentoId}/prioridade`, {
            method: 'PATCH',
            body: JSON.stringify({ prioridade: novaPrioridade })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setEditingServicoPrioridade(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            console.error("Erro ao salvar prioridade do serviço:", error);
            alert(`Erro ao salvar prioridade: ${error.message}`);
        });
    };


    // --- RENDERIZAÇÃO ---
    
    // TELA DE SELEÇÃO DE OBRAS (com Botão de Relatório Geral)
    if (!obraSelecionada) {
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                {isExportModalVisible && <ExportReportModal 
                    onClose={() => setExportModalVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
                    
                        <button 
                            onClick={() => setExportModalVisible(true)} 
                            className="export-btn pdf" 
                            style={{marginRight: '10px'}}
                        >
                            Relatório Geral de Pendências
                        </button>
                        
                        {user.role === 'administrador' && (
                            <button onClick={() => setAdminPanelVisible(true)} className="submit-btn" style={{marginRight: '10px'}}>
                                Gerenciar Usuários
                            </button>
                        )}
                        <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                    </div>
                </header>

                {user.role === 'administrador' && (
                    <div className="card-full">
                        <h3>Cadastrar Nova Obra</h3>
                        <form onSubmit={handleAddObra} className="form-add-obra">
                            <input type="text" name="nome" placeholder="Nome da Obra" required />
                            <input type="text" name="cliente" placeholder="Nome do Cliente" />
                            <button type="submit" className="submit-btn">Adicionar Obra</button>
                        </form>
                    </div>
                )}
                <div className="lista-obras">
                    {obras.length > 0 ? (
                        
                        obras.map(obra => (
                            <div key={obra.id} className="card-obra">
                                
                                {user.role === 'administrador' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletarObra(obra.id, obra.nome); }}
                                        className="card-obra-delete-btn"
                                        title="Excluir Obra"
                                    >
                                        🗑️
                                    </button>
                                )}
                                
                                <div onClick={() => fetchObraData(obra.id)} className="card-obra-content">
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p>
                                    
                                    <div className="obra-kpi-summary">
                                        <div>
                                            <span>Total Pago</span>
                                            <strong style={{ color: 'var(--cor-acento)' }}>
                                                {formatCurrency(obra.total_pago)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Restante (Orçamento)</span>
                                            <strong style={{ color: 'var(--cor-vermelho)' }}>
                                                {formatCurrency(obra.total_a_pagar)}
                                            </strong>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))

                    ) : (
                        <p>Nenhuma obra cadastrada ou você ainda não tem permissão para ver nenhuma. Fale com o administrador.</p>
                    )}
                </div>
            </div>
        );
    }

    // TELA DE LOADING
    if (isLoading || !sumarios) { return <div className="loading-screen">Carregando...</div>; }

    
    // TELA PRINCIPAL DO DASHBOARD
    return (
        <div className="dashboard-container">
            {/* --- Modais --- */}
            {editingLancamento && <EditLancamentoModal 
                lancamento={editingLancamento} 
                onClose={() => setEditingLancamento(null)} 
                onSave={handleSaveEdit}
                servicos={servicos} 
            />}
            
            {isAddServicoModalVisible && (
                <AddServicoModal
                    onClose={() => setAddServicoModalVisible(false)}
                    onSave={handleSaveServico}
                />
            )}
            
            {isAddLancamentoModalVisible && (
                <AddLancamentoModal
                    onClose={() => setAddLancamentoModalVisible(false)}
                    onSave={handleSaveLancamento}
                    servicos={servicos} 
                />
            )}
            
            {viewingServico && <ServicoDetailsModal
                                     servico={viewingServico}
                                     onClose={() => setViewingServico(null)}
                                     onSave={handleSaveEditServico}
                                     fetchObraData={fetchObraData}
                                     obraId={obraSelecionada.id}
                                 />}

            {isAddOrcamentoModalVisible && (
                <AddOrcamentoModal
                    onClose={() => setAddOrcamentoModalVisible(false)}
                    onSave={handleSaveOrcamento}
                    servicos={servicos}
                />
                
            )}

            {/* <--- MUDANÇA: Renderiza o novo modal de Edição de Orçamento (COM A CHAMADA CORRIGIDA) --> */}
            {editingOrcamento && (
                <EditOrcamentoModal
                    orcamento={editingOrcamento}
                    onClose={() => setEditingOrcamento(null)}
                    onSave={(orcamentoId, formData, newFiles) => handleSaveEditOrcamento(orcamentoId, formData, newFiles)}
                    servicos={servicos}
                />
            )}
{/* ... (Modal de Edição de Orçamento) ... */}

            {/* <-- INÍCIO DA MUDANÇA: Adicione estas linhas --> */}
            {viewingAnexos && (
                <ViewAnexosModal
                    orcamento={viewingAnexos}
                    onClose={() => setViewingAnexos(null)}
                />
            )}
            {/* <-- FIM DA MUDANÇA --> */}

            {editingServicoPrioridade && (
              <EditPrioridadeModal
                item={editingServicoPrioridade}
                onClose={() => setEditingServicoPrioridade(null)}
                onSave={handleSaveServicoPrioridade}
              />
            )}
            <header className="dashboard-header">
                <div><h1>{obraSelecionada.nome}</h1><p>Cliente: {obraSelecionada.cliente || 'N/A'}</p></div>
                <div>
                    <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d', marginRight: '10px'}}>Sair (Logout)</button>
                    <button onClick={() => setObraSelecionada(null)} className="voltar-btn">&larr; Ver Todas as Obras</button>
                </div>
            </header>

            {/* --- *** KPIs *** --- */}
             {sumarios && (
                 <div className="kpi-grid">
                     <div className="kpi-card total-geral"><span>Total Comprometido (Pago + A Pagar)</span><h2>{formatCurrency(sumarios.total_geral)}</h2></div>
                     <div className="kpi-card total-pago"><span>Total Pago</span><h2>{formatCurrency(sumarios.total_pago)}</h2></div>
                     <div className="kpi-card total-a-pagar"><span>Restante do Orçamento</span><h2>{formatCurrency(sumarios.total_em_aberto_orcamento)}</h2></div>
                 </div>
             )}
            
            {/* Grid com Gráfico e Sumário */}
            <div className="main-grid">
                <div className="card-main">
                    <div className="card-header"><h3>Gráfico de Gastos (Gerais)</h3></div>
                    <GastosPorSegmentoChart data={sumarios.total_por_segmento_geral} />
                </div>
                <div className="card-main">
                    <div className="card-header"><h3>Total por Segmento (Geral)</h3></div>
                    <div className="lista-segmento tabela-scroll-container">
                        {sumarios.total_por_segmento_geral && Object.keys(sumarios.total_por_segmento_geral).length > 0 ? (
                            Object.entries(sumarios.total_por_segmento_geral).map(([segmento, valor]) => (
                                <div key={segmento} className="item-segmento">
                                    <span>{segmento}</span>
                                    <span className="valor-segmento">{formatCurrency(valor)}</span>
                                </div>
                            ))
                        ) : (
                            <p>Nenhum gasto geral registrado.</p>
                        )}
                    </div>
                </div>
            </div>


            {/* Tabela de Orçamentos */}
            <div className="card-full">
                <div className="card-header">
                    <h3>Orçamentos para Aprovação</h3>
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <button className="acao-btn add-btn" style={{backgroundColor: 'var(--cor-info)'}} onClick={() => setAddOrcamentoModalVisible(true)}>+ Novo Orçamento</button>
                    )}
                </div>
                <div className="tabela-scroll-container">
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Segmento</th>
                                <th>Serviço</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                            <tbody>
                            {orcamentos.length > 0 ? orcamentos.map(orc => (
                                <tr key={orc.id} className="linha-clicavel" onClick={() => setEditingOrcamento(orc)}>
                                    <td>
                                        {orc.descricao}
                                    </td>
                                    <td>{orc.fornecedor || 'N/A'}</td>
                                    <td>{orc.tipo}</td>
                                    <td>{orc.servico_nome || 'Geral'}</td>
                                    <td>{formatCurrency(orc.valor)}</td>
                                    <td className="acoes-cell" style={{display: 'flex', gap: '5px', justifyContent: 'center'}} onClick={e => e.stopPropagation()}>
                                        
                                        {/* <-- INÍCIO DA MUDANÇA: Botão de Anexo --> */}
                                        {orc.anexos_count > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setViewingAnexos(orc); }}
                                                className="acao-icon-btn"
                                                title={`${orc.anexos_count} anexo(s)`}
                                                style={{ fontSize: '1.3em', color: '#007bff' }}
                                            >
                                                📎
                                            </button>
                                        )}
                                        {/* <-- FIM DA MUDANÇA --> */}

                                        {(user.role === 'administrador' || user.role === 'master') && (
                                            <>
                                                <button 
                                                    onClick={() => handleRejeitarOrcamento(orc.id)} 
                                                    className="acao-btn" 
                                                    title="Rejeitar"
                                                    style={{backgroundColor: 'var(--cor-vermelho)', color: 'white', padding: '5px 10px'}}
                                                >
                                                    Rejeitar
                                                </button>
                                                <button 
                                                    onClick={() => handleAprovarOrcamento(orc.id)} 
                                                    className="acao-btn" 
                                                    title="Aprovar"
                                                    style={{backgroundColor: 'var(--cor-acento)', color: 'white', padding: '5px 10px'}}
                                                >
                                                    Aprovar
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{textAlign: 'center'}}>Nenhum orçamento pendente.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Card de Serviços Colapsável */}
            <div className="card-full">
                 <div className="card-header">
                    <h3>Serviços (Planilha de Custos)</h3>
                    <div className="header-actions">
                        {(user.role === 'administrador' || user.role === 'master') && (
                            <button className="acao-btn add-btn" onClick={() => setAddServicoModalVisible(true)}>+ Novo Serviço</button>
                        )}
                        
                        <button 
                            className="acao-btn" 
                            style={{backgroundColor: '#6c757d', color: 'white', minWidth: '100px'}}
                            onClick={() => setIsServicosCollapsed(prev => !prev)}
                        >
                            {isServicosCollapsed ? 'Expandir' : 'Recolher'}
                        </button>
                    </div>
                </div>
                
                {!isServicosCollapsed && (
                    <div className="lista-empreitadas tabela-scroll-container" style={{marginTop: '15px'}}>
                        {(Array.isArray(servicos) ? servicos : []).length > 0 ? (Array.isArray(servicos) ? servicos : []).map(serv => {
                            
                            const safePagamentos = Array.isArray(serv.pagamentos) ? serv.pagamentos : [];
                            
                            const pagamentosMO = safePagamentos.filter(p => p.tipo_pagamento === 'mao_de_obra');
                            const valorGastoTotalMO = pagamentosMO.reduce((total, pag) => total + (pag.valor || 0), 0) + (serv.total_gastos_vinculados_mo || 0);
                            const valorGlobalMO = serv.valor_global_mao_de_obra || 0;
                            const progressoMO = valorGlobalMO > 0 ? (valorGastoTotalMO / valorGlobalMO) * 100 : 0;

                            const pagamentosMat = safePagamentos.filter(p => p.tipo_pagamento === 'material');
                            const valorGastoTotalMat = pagamentosMat.reduce((total, pag) => total + (pag.valor || 0), 0) + (serv.total_gastos_vinculados_mat || 0);
                            
                            const valorGlobalMat = serv.valor_global_material || 0;

                            return (
                                <div key={serv.id} className="card-empreitada-item">
                                    <div onClick={() => setViewingServico(serv)} className="card-empreitada-item-clickable">
                                        <div className="empreitada-header">
                                            <h4>{serv.nome}</h4>
                                            <span style={{textAlign: 'right'}}>
                                                Orçado (MO): {formatCurrency(valorGlobalMO)}<br/>
                                                Orçado (Mat): {formatCurrency(valorGlobalMat)}
                                            </span>
                                        </div>
                                        <small>Responsável: {serv.responsavel || 'N/A'}</small>
                                        
                                        <div style={{marginTop: '10px'}}>
                                            <small>Mão de Obra (Gasto Total): {formatCurrency(valorGastoTotalMO)} / {formatCurrency(valorGlobalMO)}</small>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar" style={{ width: `${progressoMO}%` }}></div>
                                            </div>
                                        </div>
                                        <div style={{marginTop: '5px'}}>
                                            <small>Material (Gasto Total): {formatCurrency(valorGastoTotalMat)} / {formatCurrency(valorGlobalMat)}</small>
                                            <div className="progress-bar-container" style={{backgroundColor: '#e9ecef'}}>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(user.role === 'administrador' || user.role === 'master') && (
                                        <form onSubmit={(e) => handleAddPagamentoServico(e, serv.id)} className="form-pagamento-parcial" onClick={e => e.stopPropagation()}>
                                            <input type="date" name="dataPagamento" defaultValue={getTodayString()} required style={{flex: 1.5}} />
                                            <input type="text" name="fornecedor" placeholder="Fornecedor" style={{flex: 1.5}} />
                                            <input type="number" step="0.01" name="valorPagamento" placeholder="Valor" required style={{flex: 1.5}} />
                                            
                                            <select name="prioridadePagamento" defaultValue="0" required style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                                <option value="0">P: 0</option>
                                                <option value="1">P: 1</option>
                                                <option value="2">P: 2</option>
                                                <option value="3">P: 3</option>
                                                <option value="4">P: 4</option>
                                                <option value="5">P: 5</option>
                                            </select>
                                            
                                            <select name="tipoPagamento" required style={{flex: 1.5, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                                <option value="">Tipo...</option>
                                                <option value="mao_de_obra">Mão de Obra</option>
                                                <option value="material">Material</option>
                                            </select>
                                            <select name="statusPagamento" defaultValue="Pago" required style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                                <option value="Pago">Pago</option>
                                                <option value="A Pagar">A Pagar</option>
                                            </select>
                                            <button type="submit" style={{flex: 1}}>Adic.</button>
                                        </form>
                                    )}
                                </div>
                            );
                        }) : <p>Nenhum serviço cadastrado.</p>}
                    </div> 
                )}
            </div> 

            {/* Tabela de Pendências (A Pagar) */}
            <div className="card-full">
                <div className="card-header">
                    <h3>Pendências (A Pagar)</h3>
                    <div className="header-actions">
                        <input 
                            type="text" 
                            placeholder="Filtrar pendências..." 
                            value={filtroPendencias}
                            onChange={(e) => setFiltroPendencias(e.target.value)}
                            style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
                        />
                        {(user.role === 'administrador' || user.role === 'master') && (
                            <button className="acao-btn add-btn" onClick={() => setAddLancamentoModalVisible(true)}>+ Novo Gasto Geral</button>
                        )}
                        <button 
                            onClick={handleExportObraPDF} 
                            className="export-btn pdf"
                            disabled={isExportingPDF}
                        >
                            {isExportingPDF ? 'Gerando...' : 'PDF (Pendentes)'}
                        </button>
                    </div>
                </div>
                <div className="tabela-scroll-container">
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Segmento</th>
                                <th>Prior.</th>
                                <th>Status</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsAPagarFiltrados.length > 0 ? itemsAPagarFiltrados.map(item => (
                                <tr key={item.id}>
                                    <td>{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        {item.descricao}
                                        {item.tipo_registro === 'pagamento_servico' && (
                                            <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'var(--cor-info)', color: 'white', borderRadius: '4px', fontSize: '0.75em', fontWeight: '500' }}>
                                                SERVIÇO
                                            </span>
                                        )}
                                    </td>
                                    <td>{item.fornecedor || 'N/A'}</td>
                                    <td>{item.tipo}</td>
                                    <td className="status-cell">
                                        <PrioridadeBadge prioridade={item.prioridade} />
                                    </td>
                                    <td className="status-cell">
                                        {(user.role === 'administrador' || user.role === 'master') ? (
                                            <button 
                                                onClick={() => handleMarcarComoPago(item.id)}
                                                className="quick-pay-btn" 
                                                title="Marcar como Pago"
                                            >
                                                A Pagar ✓
                                            </button>
                                        ) : (
                                            <span className="status" style={{backgroundColor: 'var(--cor-vermelho)'}}>A Pagar</span>
                                        )}
                                    </td>
                                    <td>{formatCurrency(item.valor)}</td>
                                    <td className="acoes-cell">
                                        {(user.role === 'administrador' || user.role === 'master') ? (
                                            item.tipo_registro === 'lancamento' ? (
                                                <button onClick={() => handleEditLancamento(item)} className="acao-icon-btn edit-btn" title="Editar Lançamento" > ✏️ </button>
                                            ) : (
                                                <button onClick={() => setEditingServicoPrioridade(item)} className="acao-icon-btn edit-btn" title="Editar Prioridade" > ✏️ </button>
                                            )
                                        ) : null}
                                        {item.tipo_registro === 'lancamento' && user.role === 'administrador' && (
                                            <button onClick={() => handleDeletarLancamento(item.id)} className="acao-icon-btn delete-btn" title="Excluir" > 🗑️ </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" style={{textAlign: 'center'}}>Nenhuma pendência encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Tabela de Histórico (agora somente Pagos) */}
            <div className="card-full">
                <div className="card-header">
                    <h3>Histórico de Pagamentos (Pagos)</h3>
                    <div className="header-actions">
                        <button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/csv`)} className="export-btn">CSV (Geral)</button>
                    </div>
                </div>
                <div className="tabela-scroll-container">
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Segmento</th>
                                <th>Prior.</th>
                                <th>Status</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsPagos.length > 0 ? itemsPagos.map(item => (
                                <tr key={item.id}>
                                    <td>{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        {item.descricao}
                                        {item.tipo_registro === 'pagamento_servico' && (
                                            <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'var(--cor-info)', color: 'white', borderRadius: '4px', fontSize: '0.75em', fontWeight: '500' }}>
                                                SERVIÇO
                                            </span>
                                        )}
                                    </td>
                                    <td>{item.fornecedor || 'N/A'}</td>
                                    <td>{item.tipo}</td>
                                    <td className="status-cell">
                                        <span style={{ color: '#aaa', fontSize: '0.9em' }}>-</span>
                                    </td>
                                    <td className="status-cell">
                                        {(user.role === 'administrador' || user.role === 'master') ? (
                                            <button 
                                                onClick={() => handleMarcarComoPago(item.id)}
                                                className="quick-pay-btn"
                                                style={{backgroundColor: 'var(--cor-acento)'}}
                                                title="Marcar como A Pagar"
                                            >
                                                Pago ⮎
                                            </button>
                                        ) : (
                                            <span className="status pago">Pago</span>
                                        )}
                                    </td>
                                    <td>{formatCurrency(item.valor)}</td>
                                    <td className="acoes-cell">
                                        {(user.role === 'administrador' || user.role === 'master') ? (
                                            item.tipo_registro === 'lancamento' ? (
                                                <button onClick={() => handleEditLancamento(item)} className="acao-icon-btn edit-btn" title="Editar Lançamento" > ✏️ </button>
                                            ) : (
                                                <button onClick={() => setEditingServicoPrioridade(item)} className="acao-icon-btn edit-btn" title="Editar Prioridade" > ✏️ </button>
                                            )
                                        ) : null}
                                        {item.tipo_registro === 'lancamento' && user.role === 'administrador' && (
                                            <button onClick={() => handleDeletarLancamento(item.id)} className="acao-icon-btn delete-btn" title="Excluir" > 🗑️ </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" style={{textAlign: 'center'}}>Nenhum pagamento encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Modal "Adicionar Serviço" (com Orçamento de Material)
const AddServicoModal = ({ onClose, onSave }) => {
    const [nome, setNome] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [pix, setPix] = useState('');
    const [valorMO, setValorMO] = useState(0); 
    const [valorMaterial, setValorMaterial] = useState(0); 

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let servicoData = {
            nome,
            responsavel: responsavel || null,
            pix: pix || null,
            valor_global_mao_de_obra: valorMO,
            valor_global_material: valorMaterial, 
        };
        
        onSave(servicoData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>Cadastrar Novo Serviço</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição do Serviço</label>
                    <input type="text" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Piscina" required />
                </div>
                <div className="form-group">
                    <label>Responsável</label>
                    <input type="text" name="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Ex: Carlos (Piscineiro)" />
                </div>
                <div className="form-group">
                    <label>Dados de Pagamento (PIX)</label>
                    <input type="text" name="pix" value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Email, Celular, etc." />
                </div>
                
                <hr />

                <div className="form-group">
                    <label>Valor Orçado - Mão de Obra (R$)</label>
                    <input type="number" step="0.01" value={valorMO} onChange={(e) => setValorMO(parseFloat(e.target.value) || 0)} />
                </div>
                
                <div className="form-group">
                    <label>Valor Orçado - Material (R$)</label>
                    <input type="number" step="0.01" value={valorMaterial} onChange={(e) => setValorMaterial(parseFloat(e.target.value) || 0)} />
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Serviço</button>
                </div>
            </form>
        </Modal>
    );
};

// Modal "Adicionar Gasto Geral" (com Fornecedor)
const AddLancamentoModal = ({ onClose, onSave, servicos }) => {
    const [data, setData] = useState(getTodayString());
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState(''); 
    const [pix, setPix] = useState('');
    const [valor, setValor] = useState(0);
    const [tipo, setTipo] = useState('Material');
    const [status, setStatus] = useState('A Pagar');
    const [servicoId, setServicoId] = useState('');
    const [prioridade, setPrioridade] = useState(0); 

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            data,
            descricao,
            fornecedor: fornecedor || null,
            pix: pix || null,
            valor: parseFloat(valor) || 0,
            tipo,
            status,
            prioridade: parseInt(prioridade, 10) || 0,
            servico_id: servicoId ? parseInt(servicoId, 10) : null
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Adicionar Novo Gasto</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data</label>
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                </div>
                <div className="form-group"><label>Descrição</label><input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" value={pix} onChange={(e) => setPix(e.target.value)} /></div>
                <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
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

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                <div className="form-group"><label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                        <option>A Pagar</option>
                        <option>Pago</option>
                    </select>
                </div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
            </form>
        </Modal>
    );
};

// Modal "Adicionar Orçamento" (ATUALIZADO com Anexos)
const AddOrcamentoModal = ({ onClose, onSave, servicos }) => {
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [valor, setValor] = useState(0);
    const [dadosPagamento, setDadosPagamento] = useState('');
    const [tipo, setTipo] = useState('Material'); 
    const [servicoId, setServicoId] = useState(''); 
    const [observacoes, setObservacoes] = useState(''); 

    // <-- INÍCIO DA MUDANÇA -->
    const [anexos, setAnexos] = useState([]); // State para os arquivos
    // <-- FIM DA MUDANÇA -->

    const handleFileChange = (e) => {
        setAnexos(Array.from(e.target.files));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // <-- INÍCIO DA MUDANÇA -->
        // Não é mais um objeto JSON, é FormData
        const formData = new FormData();
        formData.append('descricao', descricao);
        formData.append('fornecedor', fornecedor || '');
        formData.append('valor', parseFloat(valor) || 0);
        formData.append('dados_pagamento', dadosPagamento || '');
        formData.append('tipo', tipo);
        formData.append('servico_id', servicoId ? parseInt(servicoId, 10) : '');
        formData.append('observacoes', observacoes || '');
        
        // Adiciona os arquivos
        anexos.forEach(file => {
            formData.append('anexos', file);
        });
        
        onSave(formData); // Envia o FormData
        // <-- FIM DA MUDANÇA -->
    };

    return (
        <Modal onClose={onClose}>
            <h2>Adicionar Orçamento para Aprovação</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cimento e Areia" required />
                </div>
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Casa do Construtor" />
                </div>
                <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                 <div className="form-group">
                    <label>Dados de Pagamento (Opcional)</label>
                    <input type="text" value={dadosPagamento} onChange={(e) => setDadosPagamento(e.target.value)} placeholder="PIX, Conta, etc." />
                </div>
                
                <div className="form-group">
                    <label>Observações (Opcional)</label>
                    <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="3"></textarea>
                </div>
                
                {/* <-- INÍCIO DA MUDANÇA: Campo de Anexos --> */}
                <div className="form-group">
                    <label>Anexos (PDF, Imagens)</label>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf"
                    />
                </div>
                {/* <-- FIM DA MUDANÇA --> */}
                
                <hr style={{margin: '20px 0'}} />
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group"><label>Tipo/Segmento</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Orçamento</button>
                </div>
            </form>
        </Modal>
    );
};

// <--- MUDANÇA: Novo Modal para Editar Orçamento (COM ANEXOS) ---
const EditOrcamentoModal = ({ orcamento, onClose, onSave, servicos }) => {
    const [formData, setFormData] = useState({});
    
    // <-- INÍCIO DAS MUDANÇAS -->
    const [existingAnexos, setExistingAnexos] = useState([]);
    const [newAnexos, setNewAnexos] = useState([]);
    const [isLoadingAnexos, setIsLoadingAnexos] = useState(false);
    // --- NOVO MODAL PARA VER ANEXOS ---
const ViewAnexosModal = ({ orcamento, onClose }) => {
    const [anexos, setAnexos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orcamento) {
            setIsLoading(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setAnexos(Array.isArray(data) ? data : []);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Erro ao buscar anexos:", err);
                    setIsLoading(false);
                });
        }
    }, [orcamento]);

    // Lógica para abrir o anexo (reutilizada do EditOrcamentoModal)
    const handleOpenAnexo = (anexoId) => {
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => alert(`Erro ao abrir anexo: ${err.message}`));
    };

    if (!orcamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Anexos de: {orcamento.descricao}</h2>
            <div className="form-group" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
                {isLoading ? <p>Carregando anexos...</p> : (
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                        {anexos.length > 0 ? anexos.map(anexo => (
                            <li key={anexo.id} style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '1.1em' }}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                    title={`Abrir ${anexo.filename}`}
                                    style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    📎 {anexo.filename}
                                </a>
                            </li>
                        )) : <p>Nenhum anexo encontrado.</p>}
                    </ul>
                )}
            </div>
            <div className="form-actions" style={{marginTop: '20px'}}>
                <button type="button" onClick={onClose} className="cancel-btn" style={{width: '100%'}}>Fechar</button>
            </div>
        </Modal>
    );
};
// --- FIM DO NOVO MODAL ---
    // <-- FIM DAS MUDANÇAS -->

    useEffect(() => {
        if (orcamento) {
            setFormData({
                ...orcamento,
                servico_id: orcamento.servico_id ? parseInt(orcamento.servico_id, 10) : '',
                observacoes: orcamento.observacoes || ''
            });
            
            // <-- INÍCIO DAS MUDANÇAS -->
            // Buscar anexos existentes
            setIsLoadingAnexos(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setExistingAnexos(Array.isArray(data) ? data : []);
                    setIsLoadingAnexos(false);
                })
                .catch(err => {
                    console.error("Erro ao buscar anexos:", err);
                    setIsLoadingAnexos(false);
                });
            // <-- FIM DAS MUDANÇAS -->
        }
    }, [orcamento]);

    const handleChange = (e) => { 
        const { name, value } = e.target; 
        let finalValue = value;
        if (name === 'valor') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'servico_id') {
            finalValue = value ? parseInt(value, 10) : ''; 
        }
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    // <-- INÍCIO DAS MUDANÇAS -->
    const handleFileChange = (e) => {
        setNewAnexos(Array.from(e.target.files));
    };

    const handleOpenAnexo = (anexoId) => {
        // Usamos o fetchWithAuth para autenticar a requisição do arquivo
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                // Cria uma URL temporária para o blob e abre em nova aba
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => alert(`Erro ao abrir anexo: ${err.message}`));
    };

    const handleDeleteAnexo = (anexoId, e) => {
        e.preventDefault(); // Impede o clique no link
        e.stopPropagation(); // Impede o clique no link
        
        if (window.confirm("Tem certeza que deseja excluir este anexo?")) {
            fetchWithAuth(`${API_URL}/anexos/${anexoId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error('Falha ao deletar');
                    setExistingAnexos(prev => prev.filter(a => a.id !== anexoId));
                })
                .catch(err => alert(`Erro ao deletar anexo: ${err.message}`));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // 1. Criar o FormData para os dados de texto
        const data = new FormData();
        data.append('descricao', formData.descricao || '');
        data.append('fornecedor', formData.fornecedor || '');
        data.append('valor', parseFloat(formData.valor) || 0);
        data.append('dados_pagamento', formData.dados_pagamento || '');
        data.append('tipo', formData.tipo || 'Material');
        data.append('servico_id', formData.servico_id || '');
        data.append('observacoes', formData.observacoes || '');
        
        // 2. Chamar onSave com o ID, os dados de texto e os novos arquivos
        onSave(formData.id, data, newAnexos);
    };
    // <-- FIM DAS MUDANÇAS -->

    if (!orcamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Orçamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required />
                </div>
                 <div className="form-group">
                    <label>Dados de Pagamento (Opcional)</label>
                    <input type="text" name="dados_pagamento" value={formData.dados_pagamento || ''} onChange={handleChange} />
                </div>
                
                <div className="form-group">
                    <label>Observações (Opcional)</label>
                    <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows="3"></textarea>
                </div>
                
                <hr style={{margin: '20px 0'}} />

                {/* <-- INÍCIO DAS MUDANÇAS: Listagem e Upload de Anexos --> */}
                <div className="form-group">
                    <label>Anexos Atuais</label>
                    {isLoadingAnexos ? <p>Carregando anexos...</p> : (
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                            {existingAnexos.length > 0 ? existingAnexos.map(anexo => (
                                <li key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
                                    <a 
                                        href="#" // Usamos onClick para autenticação
                                        onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                        title={`Abrir ${anexo.filename}`}
                                        style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        {anexo.filename}
                                    </a>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleDeleteAnexo(anexo.id, e)}
                                        title="Excluir Anexo"
                                        style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.2em' }}
                                    >
                                        &times;
                                    </button>
                                </li>
                            )) : <p>Nenhum anexo.</p>}
                        </ul>
                    )}
                </div>

                <div className="form-group">
                    <label>Adicionar Novos Anexos</label>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf"
                    />
                </div>
                {/* <-- FIM DAS MUDANÇAS --> */}

                <hr style={{margin: '20px 0'}} />
                
                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select name="servico_id" value={formData.servico_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Material'} onChange={handleChange} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Alterações</button>
                </div>
            </form>
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL (ROTEADOR) ---
function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true); 

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Falha ao carregar dados de autenticação:", error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        setIsLoading(false); 
    }, []);

    const login = (data) => {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {user ? <Dashboard /> : <LoginScreen />}
        </AuthContext.Provider>
    );
}

export default App;