import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import './App.css';

// --- CONFIGURAÇÃO INICIAL ---
const API_URL = 'https://backend-production-78c9.up.railway.app';

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

// --- HELPER DA API ---
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json', 
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

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

    // (Estilos do Login... inalterados)
    const loginStyles = {
        container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
        card: { padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '300px' },
        form: { display: 'flex', flexDirection: 'column', gap: '15px' },
        input: { padding: '12px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '4px' },
        button: { padding: '12px', fontSize: '1em', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
        error: { color: '#dc3545', textAlign: 'center', marginTop: '10px' }
    };

    return (
        <div style={loginStyles.container}>
            <div style={loginStyles.card}>
                <h2 style={{ textAlign: 'center', margin: 0, marginBottom: '20px' }}>Controle de Obra</h2>
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


// --- COMPONENTES DE MODAL (Existentes) ---
const Modal = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

const EditLancamentoModal = ({ lancamento, onClose, onSave }) => {
    // ... (código inalterado)
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
             setFormData(initialData);
         } else {
             setFormData({});
         }
     }, [lancamento]);
    const handleChange = (e) => { const { name, value } = e.target; const finalValue = name === 'valor' ? parseFloat(value) || 0 : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    if (!lancamento) return null;
    return (
        <Modal onClose={onClose}>
            <h2>Editar Lançamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Data</label><input type="date" name="data" value={formData.data || ''} onChange={handleChange} required /></div>
                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>
                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required /></div>
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

// --- MUDANÇA: Modal de Empreitada renomeado para Servico ---
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
        const finalValue = (name === 'valor_global_mao_de_obra' || name === 'valor_global_material') ? parseFloat(value) || 0 : value; 
        setFormData(prev => ({ ...prev, [name]: finalValue })); 
    };
    
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };

    const handleDeletarPagamento = (pagamentoId) => {
        // --- MUDANÇA: Rota atualizada ---
        fetchWithAuth(`${API_URL}/servicos/${servico.id}/pagamentos/${pagamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) throw new Error('Erro ao deletar'); return res.json(); })
        .then(() => {
             if (fetchObraData && obraId) { fetchObraData(obraId); onClose(); } 
             else { window.location.reload(); }
        })
        .catch(error => console.error('Erro:', error));
    };

    const handleDeletarServico = () => {
        // --- MUDANÇA: Rota atualizada ---
        fetchWithAuth(`${API_URL}/servicos/${servico.id}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) throw new Error('Erro ao deletar'); return res.json(); })
        .then(() => {
             if (fetchObraData && obraId) { fetchObraData(obraId); onClose(); } 
             else { window.location.reload(); }
        })
        .catch(error => console.error('Erro:', error));
    };

    if (!servico) return null;
    
    // --- MUDANÇA: Cálculos de pagamento separados por tipo ---
    const pagamentosMO = (servico.pagamentos || []).filter(p => p.tipo_pagamento === 'mao_de_obra' && p.status === 'Pago');
    const pagamentosMat = (servico.pagamentos || []).filter(p => p.tipo_pagamento === 'material' && p.status === 'Pago');
    
    const totalPagoMO = pagamentosMO.reduce((sum, p) => sum + (p.valor || 0), 0);
    const totalPagoMat = pagamentosMat.reduce((sum, p) => sum + (p.valor || 0), 0);

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
                    <p><strong>Valor Total Mão de Obra:</strong> {formatCurrency(servico.valor_global_mao_de_obra)} (Pago: {formatCurrency(totalPagoMO)})</p>
                    <p><strong>Valor Total Material:</strong> {formatCurrency(servico.valor_global_material)} (Pago: {formatCurrency(totalPagoMat)})</p>
                    <p><strong>Chave PIX:</strong> {servico.pix || 'N/A'}</p>
                    <hr />
                    <h3>Histórico de Pagamentos</h3>
                    <table className="tabela-pagamentos" style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th> {/* NOVO */}
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
                                        <td>{pag.tipo_pagamento === 'mao_de_obra' ? 'Mão de Obra' : 'Material'}</td> {/* NOVO */}
                                        <td>{formatCurrency(pag.valor)}</td>
                                        <td>
                                            <span style={{ backgroundColor: pag.status === 'Pago' ? 'var(--cor-verde)' : 'var(--cor-vermelho)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: '500', textTransform: 'uppercase' }}>
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
                                    <td colSpan={user.role === 'administrador' ? 5 : 4} style={{textAlign: 'center'}}>Nenhum pagamento realizado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
                    {/* --- MUDANÇA: Campos de valor separados --- */}
                    <div className="form-group"><label>Valor Mão de Obra (R$)</label><input type="number" step="0.01" name="valor_global_mao_de_obra" value={formData.valor_global_mao_de_obra || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Valor Material (R$)</label><input type="number" step="0.01" name="valor_global_material" value={formData.valor_global_material || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                    <div className="form-actions"><button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
                </form>
            )}
        </Modal>
    );
};


// --- MODAIS DE ADMINISTRAÇÃO (Inalterados) ---
const UserPermissionsModal = ({ userToEdit, allObras, onClose, onSave }) => {
    // ... (código inalterado)
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
    // ... (código inalterado)
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


// --- COMPONENTE DO DASHBOARD (Atualizado) ---
function Dashboard() {
    const { user, logout } = useAuth();

    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    // --- MUDANÇA: 'empreitadas' -> 'servicos' ---
    const [servicos, setServicos] = useState([]);
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modais do Dashboard
    const [editingLancamento, setEditingLancamento] = useState(null);
    // --- MUDANÇA: 'AddEmpreitada' -> 'AddServico' ---
    const [isAddServicoModalVisible, setAddServicoModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingServico, setViewingServico] = useState(null);
    
    // Modal de Admin
    const [isAdminPanelVisible, setAdminPanelVisible] = useState(false);


    // Efeito para buscar obras
    useEffect(() => {
        console.log("Buscando lista de obras...");
        fetchWithAuth(`${API_URL}/obras`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                console.log("Obras recebidas:", data);
                setObras(Array.isArray(data) ? data : []);
            })
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
                // --- MUDANÇA: 'empreitadas' -> 'servicos' ---
                const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                    ...serv,
                    pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                }));
                setServicos(servicosComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
            })
            .catch(error => { console.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); })
            .finally(() => setIsLoading(false));
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---

    const handleAddObra = (e) => {
        // ... (código inalterado)
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, {
            method: 'POST',
            body: JSON.stringify({ nome, cliente })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => {
            setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome)));
            e.target.reset();
        })
        .catch(error => console.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => console.error('Erro ao deletar obra:', error));
    };
    
    // --- MUDANÇA: handleMarcarComoPago agora entende 'serv-pag-' ---
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
            return; // ID desconhecido
        }

        console.log("Alternando status para:", itemId);
        fetchWithAuth(url, { method: 'PATCH' })
             .then(res => {
                 if (!res.ok) {
                     return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') });
                 }
                 return res.json();
             })
             .then(() => fetchObraData(obraSelecionada.id)) // Recarrega tudo
             .catch(error => console.error("Erro ao marcar como pago:", error));
    };


    const handleDeletarLancamento = (itemId) => {
         // Esta função agora só lida com 'lanc-'
         const isLancamento = String(itemId).startsWith('lanc-');
         const actualId = String(itemId).split('-').pop();

        if (isLancamento) {
            console.log("Deletando lançamento geral:", actualId);
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
                .then(() => { fetchObraData(obraSelecionada.id); })
                .catch(error => console.error('Erro ao deletar lançamento:', error));
        }
        // Deleção de pagamentos de serviço é feita no ServicoDetailsModal
    };
    
    const handleEditLancamento = (item) => {
        // Esta função só lida com lançamentos
        if (item.tipo_registro === 'lancamento') { 
            setEditingLancamento(item); 
        }
        // Edição de serviços é feita no ServicoDetailsModal
    };
    
    const handleSaveEdit = (updatedLancamento) => {
        // ... (código inalterado)
        const dataToSend = { ...updatedLancamento, valor: parseFloat(updatedLancamento.valor) || 0 };
        fetchWithAuth(`${API_URL}/lancamentos/${dataToSend.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição:", error));
    };
    
    const handleSaveLancamento = (e) => {
        // ... (código inalterado)
        e.preventDefault();
        const formData = new FormData(e.target);
        const lancamentoData = Object.fromEntries(formData.entries());
        lancamentoData.data = getTodayString();
        lancamentoData.valor = parseFloat(lancamentoData.valor) || 0;
        lancamentoData.pix = lancamentoData.pix || null;
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar lançamento:", error));
    };

    // --- MUDANÇA: 'handleSaveEmpreitada' -> 'handleSaveServico' ---
    const handleSaveServico = (servicoData) => {
        console.log("Salvando novo serviço:", servicoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/servicos`, {
            method: 'POST',
            body: JSON.stringify(servicoData)
        }).then(res => {
             if (!res.ok) {
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao salvar serviço') });
             }
             return res.json();
        })
        .then(() => {
            setAddServicoModalVisible(false);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar serviço:", error));
    };

    // --- MUDANÇA: 'handleSaveEditEmpreitada' -> 'handleSaveEditServico' ---
    const handleSaveEditServico = (updatedServico) => {
        const dataToSend = {
            ...updatedServico,
            valor_global_mao_de_obra: parseFloat(updatedServico.valor_global_mao_de_obra) || 0,
            valor_global_material: parseFloat(updatedServico.valor_global_material) || 0,
            responsavel: updatedServico.responsavel || null,
            pix: updatedServico.pix || null
        };
        console.log("Salvando edição do serviço:", dataToSend.id);
        fetchWithAuth(`${API_URL}/servicos/${dataToSend.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } 
            return res.json();
        })
        .then(() => {
            setViewingServico(null);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar edição do serviço:", error));
    };

    // --- MUDANÇA: 'handleAddPagamentoParcial' -> 'handleAddPagamentoServico' ---
    const handleAddPagamentoServico = (e, servicoId) => {
        e.preventDefault();
        const valorPagamento = e.target.valorPagamento.value;
        const statusPagamento = e.target.statusPagamento.value;
        const tipoPagamento = e.target.tipoPagamento.value; // NOVO
        
        if (!valorPagamento || !tipoPagamento) return;
        
        const pagamento = {
            valor: parseFloat(valorPagamento) || 0,
            data: getTodayString(),
            status: statusPagamento,
            tipo_pagamento: tipoPagamento // NOVO
        };
        console.log("Adicionando pagamento de serviço:", pagamento);
        fetchWithAuth(`${API_URL}/servicos/${servicoId}/pagamentos`, {
            method: 'POST',
            body: JSON.stringify(pagamento)
        }).then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); }
            return res.json(); 
        })
        .then((servicoAtualizado) => {
             setServicos(prevServicos =>
                 prevServicos.map(serv =>
                     serv.id === servicoId ? servicoAtualizado : serv
                 )
             );
             if (viewingServico && viewingServico.id === servicoId) {
                 setViewingServico(servicoAtualizado);
             }
             e.target.reset(); 
             fetchObraData(obraSelecionada.id);
        })
        .catch(error => console.error("Erro ao adicionar pagamento:", error));
    };

    // --- RENDERIZAÇÃO ---
    
    // TELA DE SELEÇÃO DE OBRAS (Inalterada)
    if (!obraSelecionada) {
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
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
                            <div key={obra.id} className="card-obra" style={{position: 'relative'}}>
                                <div onClick={() => fetchObraData(obra.id)} style={{cursor: 'pointer', paddingRight: '40px'}}>
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p>
                                </div>
                                {user.role === 'administrador' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletarObra(obra.id, obra.nome); }}
                                        className="acao-icon-btn delete-btn"
                                        style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '1.3em', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                        title="Excluir Obra"
                                    >
                                        🗑️
                                    </button>
                                )}
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

    const pagamentosPendentesGerais = (Array.isArray(lancamentos) ? lancamentos : []).filter(l => l.status === 'A Pagar');

    // TELA PRINCIPAL DO DASHBOARD
    return (
        <div className="dashboard-container">
            {/* --- Modais --- */}
            {editingLancamento && <EditLancamentoModal lancamento={editingLancamento} onClose={() => setEditingLancamento(null)} onSave={handleSaveEdit} />}
            
            {/* --- MUDANÇA: Modal de "AddServico" --- */}
            {isAddServicoModalVisible && (
                <AddServicoModal
                    onClose={() => setAddServicoModalVisible(false)}
                    onSave={handleSaveServico}
                />
            )}
            
            {isAddLancamentoModalVisible && (
                <Modal onClose={() => setAddLancamentoModalVisible(false)}>
                    <h2>Adicionar Novo Gasto</h2>
                    <form onSubmit={handleSaveLancamento}>
                        <div className="form-group"><label>Descrição</label><input type="text" name="descricao" required /></div>
                        <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" /></div>
                        <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" required /></div>
                        <div className="form-group"><label>Tipo/Segmento</label>
                            <select name="tipo" defaultValue="Mão de Obra" required>
                                <option>Mão de Obra</option>
                                <option>Serviço</option>
                                <option>Material</option>
                                <option>Equipamentos</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Status</label><select name="status" defaultValue="A Pagar" required><option>A Pagar</option><option>Pago</option></select></div>
                        <div className="form-actions"><button type="button" onClick={() => setAddLancamentoModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
                    </form>
                </Modal>
            )}
             {viewingServico && <ServicoDetailsModal
                                     servico={viewingServico}
                                     onClose={() => setViewingServico(null)}
                                     onSave={handleSaveEditServico}
                                     fetchObraData={fetchObraData}
                                     obraId={obraSelecionada.id}
                                 />}


            {/* --- Cabeçalho --- */}
            <header className="dashboard-header">
                <div><h1>{obraSelecionada.nome}</h1><p>Cliente: {obraSelecionada.cliente || 'N/A'}</p></div>
                <div>
                    <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d', marginRight: '10px'}}>Sair (Logout)</button>
                    <button onClick={() => setObraSelecionada(null)} className="voltar-btn">&larr; Ver Todas as Obras</button>
                </div>
            </header>

            {/* --- KPIs --- */}
             {sumarios && (
                 <div className="kpi-grid">
                     <div className="kpi-card total-geral"><span>Total Geral</span><h2>{formatCurrency(sumarios.total_geral)}</h2></div>
                     <div className="kpi-card total-pago"><span>Total Pago</span><h2>{formatCurrency(sumarios.total_pago)}</h2></div>
                     <div className="kpi-card total-a-pagar"><span>Total a Pagar</span><h2>{formatCurrency(sumarios.total_a_pagar)}</h2><small>{pagamentosPendentesGerais.length} pendência(s) gerais</small></div>
                 </div>
             )}


            {/* --- MUDANÇA: 'Empreitadas' -> 'Serviços' --- */}
            <div className="card-full">
                 <div className="card-header">
                    <h3>Serviços (Planilha de Custos)</h3>
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <button className="acao-btn add-btn" onClick={() => setAddServicoModalVisible(true)}>+ Novo Serviço</button>
                    )}
                </div>
                <div className="lista-empreitadas"> {/* (CSS class 'lista-empreitadas' mantida por estilo) */}
                    {(Array.isArray(servicos) ? servicos : []).length > 0 ? (Array.isArray(servicos) ? servicos : []).map(serv => {
                        
                        // --- MUDANÇA: Cálculo de pagamento separado ---
                        const safePagamentos = Array.isArray(serv.pagamentos) ? serv.pagamentos : [];
                        
                        // Mão de Obra
                        const pagamentosMO = safePagamentos.filter(p => p.tipo_pagamento === 'mao_de_obra' && p.status === 'Pago');
                        const valorPagoMO = pagamentosMO.reduce((total, pag) => total + (pag.valor || 0), 0);
                        const valorGlobalMO = serv.valor_global_mao_de_obra || 0;
                        const progressoMO = valorGlobalMO > 0 ? (valorPagoMO / valorGlobalMO) * 100 : 0;

                        // Material
                        const pagamentosMat = safePagamentos.filter(p => p.tipo_pagamento === 'material' && p.status === 'Pago');
                        const valorPagoMat = pagamentosMat.reduce((total, pag) => total + (pag.valor || 0), 0);
                        const valorGlobalMat = serv.valor_global_material || 0;
                        const progressoMat = valorGlobalMat > 0 ? (valorPagoMat / valorGlobalMat) * 100 : 0;
                        
                        return (
                            <div key={serv.id} className="card-empreitada-item"> {/* (CSS class mantida) */}
                                <div onClick={() => setViewingServico(serv)}>
                                    <div className="empreitada-header">
                                        <h4>{serv.nome}</h4>
                                        {/* Mostra o valor total (MO+Mat) que vem do backend */}
                                        <span>{formatCurrency(serv.valor_global_total)}</span>
                                    </div>
                                    <small>Responsável: {serv.responsavel || 'N/A'}</small>
                                    
                                    {/* --- MUDANÇA: Duas barras de progresso --- */}
                                    <div style={{marginTop: '10px'}}>
                                        <small>Mão de Obra: {formatCurrency(valorPagoMO)} / {formatCurrency(valorGlobalMO)}</small>
                                        <div className="progress-bar-container">
                                            <div className="progress-bar" style={{ width: `${progressoMO}%`, backgroundColor: 'var(--cor-azul)' }}></div>
                                        </div>
                                    </div>
                                    <div style={{marginTop: '5px'}}>
                                        <small>Material: {formatCurrency(valorPagoMat)} / {formatCurrency(valorGlobalMat)}</small>
                                        <div className="progress-bar-container">
                                            <div className="progress-bar" style={{ width: `${progressoMat}%`, backgroundColor: 'var(--cor-verde)' }}></div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* --- MUDANÇA: Formulário de Pagamento Atualizado --- */}
                                {(user.role === 'administrador' || user.role === 'master') && (
                                    <form onSubmit={(e) => handleAddPagamentoServico(e, serv.id)} className="form-pagamento-parcial" onClick={e => e.stopPropagation()}>
                                        <input type="number" step="0.01" name="valorPagamento" placeholder="Valor" required style={{flex: 2}} />
                                        
                                        {/* Seletor de Tipo de Pagamento */}
                                        <select name="tipoPagamento" required style={{flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                            <option value="">Tipo...</option>
                                            <option value="mao_de_obra">Mão de Obra</option>
                                            <option value="material">Material</option>
                                        </select>
                                        
                                        <select name="statusPagamento" defaultValue="Pago" required style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                            <option value="Pago">Pago</option>
                                            <option value="A Pagar">A Pagar</option>
                                        </select>
                                        <button type="submit">Adicionar</button>
                                    </form>
                                )}
                            </div>
                        );
                    }) : <p>Nenhum serviço cadastrado.</p>}
                </div> 
            </div> 


            {/* --- Grid Principal (Pendentes e Segmentos) --- */}
             {sumarios && sumarios.total_por_segmento && (
                 <div className="main-grid">
                     <div className="card-main">
                         <div className="card-header"><h3>Pagamentos Pendentes (Gerais)</h3></div>
                         <div className="lista-pendentes">{pagamentosPendentesGerais.length > 0 ? pagamentosPendentesGerais.map(lanc => (
                            <div key={lanc.id} className="item-pendente">
                                <div className="item-info">
                                    <span className="item-descricao">{lanc.descricao} - {lanc.tipo}</span>
                                    <small>{lanc.data ? new Date(lanc.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Inválida'}</small>
                                </div>
                                <div className="item-acao">
                                    <span className="item-valor">{formatCurrency(lanc.valor)}</span>
                                    {(user.role === 'administrador' || user.role === 'master') && (
                                        <button onClick={() => handleMarcarComoPago(`lanc-${lanc.id}`)} className="marcar-pago-btn">Marcar como Pago</button>
                                    )}
                                </div>
                             </div>
                         )) : <p>Nenhum pagamento geral pendente.</p>}</div>
                     </div>
                     <div className="card-main">
                         <div className="card-header"><h3>Total por Segmento (Geral)</h3></div>
                         <div className="lista-segmento">{Object.entries(sumarios.total_por_segmento).map(([segmento, valor]) => (<div key={segmento} className="item-segmento"><span>{segmento}</span><span className="valor-segmento">{formatCurrency(valor)}</span></div>))}</div>
                     </div>
                 </div>
             )}


            {/* --- MUDANÇA: Histórico de Gastos Atualizado --- */}
            <div className="card-full">
                <div className="card-header"><h3>Histórico Completo (Gastos e Pag. Serviços)</h3>
                    <div className="header-actions">
                        {(user.role === 'administrador' || user.role === 'master') && (
                            <button className="acao-btn add-btn" onClick={() => setAddLancamentoModalVisible(true)}>+ Novo Gasto Geral</button>
                        )}
                        <button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/csv`)} className="export-btn">CSV (Geral)</button>
                        <button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`)} className="export-btn pdf">PDF (Pendentes)</button>
                    </div>
                </div>
                <table className="tabela-historico">
                    <thead><tr><th>Data</th><th>Descrição</th><th>Segmento</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
                    <tbody>
                        {historicoUnificado.map(item => (
                            <tr key={item.id}>
                                <td>{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td>
                                    {item.descricao}
                                    {item.tipo_registro === 'pagamento_servico' && (
                                        <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '0.75em', fontWeight: '500' }}>
                                            SERVIÇO
                                        </span>
                                    )}
                                </td>
                                <td>{item.tipo}</td>
                                <td className="status-cell">
                                    {item.status === 'A Pagar' ? (
                                        (user.role === 'administrador' || user.role === 'master') ? (
                                            <button 
                                                onClick={() => handleMarcarComoPago(item.id)} // item.id pode ser 'lanc-1' ou 'serv-pag-1'
                                                className="quick-pay-btn" 
                                                title={item.status === 'A Pagar' ? "Marcar como Pago" : "Marcar como A Pagar"}
                                            >
                                                A Pagar ✓
                                            </button>
                                        ) : (
                                            <span className="status" style={{backgroundColor: 'var(--cor-vermelho)'}}>A Pagar</span>
                                        )
                                    ) : (
                                        // --- MUDANÇA: Permite clicar em "Pago" para reverter ---
                                        (user.role === 'administrador' || user.role === 'master') ? (
                                            <button 
                                                onClick={() => handleMarcarComoPago(item.id)}
                                                className="quick-pay-btn"
                                                style={{backgroundColor: 'var(--cor-verde)'}}
                                                title={item.status === 'A Pagar' ? "Marcar como Pago" : "Marcar como A Pagar"}
                                            >
                                                Pago ⮎
                                            </button>
                                        ) : (
                                            <span className="status pago">Pago</span>
                                        )
                                    )}
                                </td>
                                <td>{formatCurrency(item.valor)}</td>
                                <td className="acoes-cell">
                                    {item.tipo_registro === 'lancamento' ? (
                                        <>
                                            {(user.role === 'administrador' || user.role === 'master') && (
                                                <button onClick={() => handleEditLancamento(item)} className="acao-icon-btn edit-btn" title="Editar" > ✏️ </button>
                                            )}
                                            {user.role === 'administrador' && (
                                                <button onClick={() => handleDeletarLancamento(item.id)} className="acao-icon-btn delete-btn" title="Excluir" > 🗑️ </button>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{fontSize: '0.85em', color: '#666'}}>
                                            Ver no serviço
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {(Array.isArray(historicoUnificado) ? historicoUnificado : []).length === 0 && (
                     <p style={{ textAlign: 'center', marginTop: '15px' }}>Nenhum gasto ou pagamento registrado.</p>
                 )}
            </div>
        </div>
    );
}

// --- NOVO: Modal "Adicionar Serviço" ---
const AddServicoModal = ({ onClose, onSave }) => {
    // Controla qual formulário mostrar
    const [rateioTipo, setRateioTipo] = useState('empreita'); // 'empreita' ou 'detalhado'
    
    // Campos do formulário
    const [nome, setNome] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [pix, setPix] = useState('');
    const [valorUnico, setValorUnico] = useState(0);
    const [valorMO, setValorMO] = useState(0);
    const [valorMat, setValorMat] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let servicoData = {
            nome,
            responsavel: responsavel || null,
            pix: pix || null,
            valor_global_mao_de_obra: 0,
            valor_global_material: 0
        };

        if (rateioTipo === 'empreita') {
            // Se for empreita, 100% do valor vai para Mão de Obra
            servicoData.valor_global_mao_de_obra = valorUnico;
        } else {
            // Se for detalhado, usa os valores separados
            servicoData.valor_global_mao_de_obra = valorMO;
            servicoData.valor_global_material = valorMat;
        }
        
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

                {/* Seletor de Tipo de Rateio */}
                <div className="form-group">
                    <label>Tipo de Rateio de Custo</label>
                    <select value={rateioTipo} onChange={(e) => setRateioTipo(e.target.value)}>
                        <option value="empreita">Empreita (Valor Único)</option>
                        <option value="detalhado">Detalhado (Mão de Obra + Material)</option>
                    </select>
                </div>

                {/* Campos de Valor Condicionais */}
                {rateioTipo === 'empreita' ? (
                    <div className="form-group">
                        <label>Valor Global (R$)</label>
                        <input type="number" step="0.01" value={valorUnico} onChange={(e) => setValorUnico(parseFloat(e.target.value) || 0)} required />
                    </div>
                ) : (
                    <>
                        <div className="form-group">
                            <label>Valor Mão de Obra (R$)</label>
                            <input type="number" step="0.01" value={valorMO} onChange={(e) => setValorMO(parseFloat(e.target.value) || 0)} required />
                        </div>
                        <div className="form-group">
                            <label>Valor Material (R$)</label>
                            <input type="number" step="0.01" value={valorMat} onChange={(e) => setValorMat(parseFloat(e.target.value) || 0)} required />
                        </div>
                    </>
                )}
                
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Serviço</button>
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