import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import './App.css';

// Imports do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// MUDANÇA 1: Import do componente DiarioObras
import DiarioObras from './components/DiarioObras';

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
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 422) {
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
const Modal = ({ children, onClose, customWidth }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div 
            className="modal-content" 
            style={{ maxWidth: customWidth || '500px' }}  // <-- MUDANÇA AQUI
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

// <--- MUDANÇA: Modal de Edição (com valor_total e valor_pago) -->
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
             // Formatar data_vencimento
             if (initialData.data_vencimento) {
                 try {
                     initialData.data_vencimento = new Date(initialData.data_vencimento + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     console.error("Erro ao formatar data_vencimento para edição:", e);
                     initialData.data_vencimento = '';
                 }
             } else {
                 initialData.data_vencimento = initialData.data || ''; // Fallback para data normal
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
        
        if (name === 'valor_total' || name === 'valor_pago') { // <-- MUDANÇA
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
                    <label>Data do Registro</label>
                    <input type="date" name="data" value={formData.data || ''} onChange={handleChange} required />
                </div>
                
                <div className="form-group">
                    <label>Data de Vencimento ⚠️</label>
                    <input type="date" name="data_vencimento" value={formData.data_vencimento || ''} onChange={handleChange} required />
                </div>
                
                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                
                {/* <-- MUDANÇA: valor -> valor_total --> */}
                <div className="form-group"><label>Valor Total (R$)</label>
                    <input type="number" step="0.01" name="valor_total" value={formData.valor_total || 0} onChange={handleChange} required />
                </div>
                {/* <-- MUDANÇA: Novo campo valor_pago --> */}
                <div className="form-group"><label>Valor Já Pago (R$)</label>
                    <input type="number" step="0.01" name="valor_pago" value={formData.valor_pago || 0} onChange={handleChange} required />
                </div>

                
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

// <--- MUDANÇA: Modal de Serviço (com valor_total e valor_pago) -->
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
    
    // Calcula totais pagos
    const totalPagoMO = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'mao_de_obra')
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        
    const totalGastoMO = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'mao_de_obra')
        .reduce((sum, p) => sum + (p.valor_total || 0), 0) + (servico.total_gastos_vinculados_mo || 0);

    const totalPagoMat = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'material')
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0);
        
    const totalGastoMat = (servico.pagamentos || [])
        .filter(p => p.tipo_pagamento === 'material')
        .reduce((sum, p) => sum + (p.valor_total || 0), 0) + (servico.total_gastos_vinculados_mat || 0);


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
                    <p><strong>Valor Orçado (Mão de Obra):</strong> {formatCurrency(servico.valor_global_mao_de_obra)} (Comprometido: {formatCurrency(totalGastoMO)} | Pago: {formatCurrency(totalPagoMO)})</p>
                    <p><strong>Valor Orçado (Material):</strong> {formatCurrency(servico.valor_global_material)} (Comprometido: {formatCurrency(totalGastoMat)} | Pago: {formatCurrency(totalPagoMat)})</p>
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
                                    <th>Valor Total</th>
                                    <th>Valor Pago</th>
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
                                            <td>{formatCurrency(pag.valor_total)}</td>
                                            <td>{formatCurrency(pag.valor_pago)}</td>
                                            
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
    // ... (depois da função handleCreateUser)

    const handleDeleteUser = (user) => {
        if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.username}? Esta ação não pode ser desfeita.`)) {
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
            // Remove o usuário da lista no frontend
            setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        })
        .catch(err => {
            console.error("Erro ao deletar usuário:", err);
            setError(err.message);
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
        <Modal onClose={onClose} customWidth="700px"> {/* <-- MUDANÇA AQUI */}
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
                                   <td style={{textAlign: 'center', display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                        <button 
                                            className="acao-btn" 
                                            style={{backgroundColor: '#17a2b8', color: 'white'}}
                                            onClick={() => setUserToEdit(user)}
                                        >
                                            Editar Permissões
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
// ----------------------------------------------------

// Modal "Exportar Relatório Geral"
const ExportReportModal = ({ onClose }) => {
    // ... (código inalterado)
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


// Modal "Relatório do Cronograma Financeiro"
const ModalRelatorioCronograma = ({ onClose, obras }) => {
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGerarRelatorio = async () => {
        if (!obraSelecionada) {
            alert('Por favor, selecione uma obra primeiro.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraSelecionada.id}/relatorio-cronograma-pdf`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Erro ao gerar relatório do cronograma.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Cronograma_${obraSelecionada.nome.replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            alert('Relatório gerado com sucesso!');
            onClose();
        } catch (err) {
            console.error("Erro ao gerar relatório:", err);
            setError(err.message || "Não foi possível gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <h2>📊 Relatório do Cronograma Financeiro</h2>
                
                {error && (
                    <div style={{ 
                        padding: '10px', 
                        marginBottom: '15px', 
                        backgroundColor: '#ffebee', 
                        border: '1px solid #ef5350',
                        borderRadius: '5px',
                        color: '#c62828'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ marginBottom: '10px', color: '#666' }}>
                        Selecione a obra para gerar o relatório do cronograma financeiro:
                    </p>
                    
                    <div style={{ 
                        display: 'grid', 
                        gap: '10px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                    }}>
                        {obras.map(obra => (
                            <div
                                key={obra.id}
                                onClick={() => setObraSelecionada(obra)}
                                style={{
                                    padding: '15px',
                                    border: obraSelecionada?.id === obra.id 
                                        ? '2px solid var(--cor-primaria)' 
                                        : '1px solid #ddd',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: obraSelecionada?.id === obra.id 
                                        ? '#e3f2fd' 
                                        : 'white',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0' }}>{obra.nome}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                                            Cliente: {obra.cliente || 'N/A'}
                                        </p>
                                    </div>
                                    {obraSelecionada?.id === obra.id && (
                                        <span style={{ 
                                            fontSize: '1.5em',
                                            color: 'var(--cor-primaria)'
                                        }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose} 
                        className="voltar-btn"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleGerarRelatorio} 
                        className="submit-btn"
                        disabled={isLoading || !obraSelecionada}
                        style={{
                            opacity: (!obraSelecionada || isLoading) ? 0.6 : 1
                        }}
                    >
                        {isLoading ? '⏳ Gerando...' : '📄 Gerar Relatório PDF'}
                    </button>
                </div>

                {obraSelecionada && (
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '10px', 
                        backgroundColor: '#e8f5e9',
                        borderRadius: '5px',
                        fontSize: '0.9em',
                        color: '#2e7d32'
                    }}>
                        ✓ Obra selecionada: <strong>{obraSelecionada.nome}</strong>
                    </div>
                )}
            </div>
        </Modal>
    );
};
// ----------------------------------------------------


// Modal para Editar Prioridade
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
// ----------------------------------------------------

// Modal "Adicionar Serviço"
const AddServicoModal = ({ onClose, onSave }) => {
    // ... (código inalterado)
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

// <--- MUDANÇA: Modal "Adicionar Gasto Geral" (usa 'valor' para 'valor_total') -->
const AddLancamentoModal = ({ onClose, onSave, servicos }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString()); // NOVO campo
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState(''); 
    const [pix, setPix] = useState('');
    const [valor, setValor] = useState(0); // Este 'valor' será enviado como 'valor_total'
    const [tipo, setTipo] = useState('Material');
    // MUDANÇA 2: Status sempre será "Pago" para gastos avulsos do histórico
    const status = 'Pago';
    const [servicoId, setServicoId] = useState('');
    const [prioridade, setPrioridade] = useState(0); 

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            data,
            data_vencimento: dataVencimento, // NOVO campo
            descricao,
            fornecedor: fornecedor || null,
            pix: pix || null,
            valor: parseFloat(valor) || 0, // O handler 'handleSaveLancamento' espera 'valor'
            tipo,
            status: 'Pago', // MUDANÇA 2: Sempre "Pago"
            prioridade: parseInt(prioridade, 10) || 0,
            servico_id: servicoId ? parseInt(servicoId, 10) : null,
            is_gasto_avulso_historico: true // MUDANÇA 2: Flag para backend
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>💵 Adicionar Gasto Avulso (Pago)</h2>
            <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                Este gasto será automaticamente marcado como <strong>PAGO</strong> e adicionado ao histórico.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data do Registro</label>
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Data de Vencimento ⚠️</label>
                    <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                </div>
                <div className="form-group"><label>Descrição</label><input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
                
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>

                <div className="form-group"><label>Chave PIX</label><input type="text" value={pix} onChange={(e) => setPix(e.target.value)} /></div>
                
                {/* O usuário insere 'valor', mas o backend salvará em 'valor_total' */}
                <div className="form-group"><label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                
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
                {/* MUDANÇA 2: Campo Status removido - sempre será Pago */}
                <div style={{padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', marginBottom: '15px'}}>
                    <strong>Status: PAGO</strong> (automático)
                </div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
            </form>
        </Modal>
    );
};

// Modal "Adicionar Orçamento"
const AddOrcamentoModal = ({ onClose, onSave, servicos }) => {
    // ... (código inalterado, já usa FormData)
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [valor, setValor] = useState(0);
    const [dadosPagamento, setDadosPagamento] = useState('');
    const [tipo, setTipo] = useState('Material'); 
    const [servicoId, setServicoId] = useState(''); 
    const [observacoes, setObservacoes] = useState(''); 
    const [anexos, setAnexos] = useState([]); 

    const handleFileChange = (e) => {
        setAnexos(Array.from(e.target.files));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('descricao', descricao);
        formData.append('fornecedor', fornecedor || '');
        formData.append('valor', parseFloat(valor) || 0);
        formData.append('dados_pagamento', dadosPagamento || '');
        formData.append('tipo', tipo);
        formData.append('servico_id', servicoId ? parseInt(servicoId, 10) : '');
        formData.append('observacoes', observacoes || '');
        
        anexos.forEach(file => {
            formData.append('anexos', file);
        });
        
        onSave(formData);
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
                
                <div className="form-group">
                    <label>Anexos (PDF, Imagens)</label>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        accept="image/*,.pdf"
                    />
                </div>
                
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

// MUDANÇA 3: NOVO Modal "Inserir Pagamento"
const InserirPagamentoModal = ({ onClose, onSave, servicos, obraId }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString());
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [pix, setPix] = useState('');
    const [valor, setValor] = useState(0);
    const [tipo, setTipo] = useState('Material'); // Material, Mão de Obra, Serviço
    const [status, setStatus] = useState('A Pagar'); // Pago ou A Pagar
    const [servicoId, setServicoId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            data,
            data_vencimento: dataVencimento,
            descricao,
            fornecedor: fornecedor || null,
            pix: pix || null,
            valor: parseFloat(valor) || 0,
            tipo,
            status,
            servico_id: servicoId ? parseInt(servicoId, 10) : null
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>💳 Inserir Pagamento</h2>
            <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                Insira um novo pagamento. Você pode vincular a um serviço e escolher se foi pago ou está a pagar.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Data do Registro</label>
                    <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Data de Vencimento</label>
                    <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Chave PIX (Opcional)</label>
                    <input type="text" value={pix} onChange={(e) => setPix(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Tipo</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Serviço">Serviço</option>
                        <option value="Equipamentos">Equipamentos</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                        <option value="Pago">Pago</option>
                        <option value="A Pagar">A Pagar</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Vincular ao Serviço (Opcional)</label>
                    <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                        <option value="">Nenhum</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Inserir Pagamento</button>
                </div>
            </form>
        </Modal>
    );
};

// Modal para Editar Orçamento
const EditOrcamentoModal = ({ orcamento, onClose, onSave, servicos }) => {
    // ... (código inalterado)
    const [formData, setFormData] = useState({});
    const [existingAnexos, setExistingAnexos] = useState([]);
    const [newAnexos, setNewAnexos] = useState([]);
    const [isLoadingAnexos, setIsLoadingAnexos] = useState(false);

    useEffect(() => {
        if (orcamento) {
            setFormData({
                ...orcamento,
                servico_id: orcamento.servico_id ? parseInt(orcamento.servico_id, 10) : '',
                observacoes: orcamento.observacoes || ''
            });
            
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
    
    const handleFileChange = (e) => {
        setNewAnexos(Array.from(e.target.files));
    };

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

    const handleDeleteAnexo = (anexoId, e) => {
        e.preventDefault();
        e.stopPropagation(); 
        
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
        
        const data = new FormData();
        data.append('descricao', formData.descricao || '');
        data.append('fornecedor', formData.fornecedor || '');
        data.append('valor', parseFloat(formData.valor) || 0);
        data.append('dados_pagamento', formData.dados_pagamento || '');
        data.append('tipo', formData.tipo || 'Material');
        data.append('servico_id', formData.servico_id || '');
        data.append('observacoes', formData.observacoes || '');
        
        onSave(formData.id, data, newAnexos);
    };

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

                <div className="form-group">
                    <label>Anexos Atuais</label>
                    {isLoadingAnexos ? <p>Carregando anexos...</p> : (
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                            {existingAnexos.length > 0 ? existingAnexos.map(anexo => (
                                <li key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
                                    <a 
                                        href="#"
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

// --- NOVO MODAL PARA VER ANEXOS ---
const ViewAnexosModal = ({ orcamento, onClose }) => {
    // ... (código inalterado)
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


// <--- MUDANÇA: NOVO MODAL PARA PAGAMENTO PARCIAL ---
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
// --- FIM DO NOVO MODAL ---


// --- MODAL DE UPLOAD DE NOTA FISCAL ---
const UploadNotaFiscalModal = ({ item, obraId, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Validar tipo de arquivo (PDF, imagens)
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Tipo de arquivo inválido. Apenas PDF e imagens são permitidos.');
                return;
            }
            // Validar tamanho (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('Arquivo muito grande. Tamanho máximo: 10MB');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, selecione um arquivo');
            return;
        }

        setIsUploading(true);
        setError(null);

        // <-- CORREÇÃO: Pegar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', realItemId);
        formData.append('item_type', item.tipo_registro);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`, {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro ao fazer upload'); });
            }
            return res.json();
        })
        .then(() => {
            onSuccess();
            onClose();
        })
        .catch(err => {
            console.error("Erro ao fazer upload:", err);
            setError(err.message);
        })
        .finally(() => {
            setIsUploading(false);
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Anexar Nota Fiscal</h2>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                <strong>Item:</strong> {item.descricao}<br />
                <strong>Fornecedor:</strong> {item.fornecedor || 'N/A'}
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Selecione o arquivo (PDF ou Imagem)</label>
                    <input 
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    {file && (
                        <p style={{ marginTop: '5px', color: 'var(--cor-acento)', fontSize: '0.9em' }}>
                            ✓ Arquivo selecionado: {file.name}
                        </p>
                    )}
                </div>

                {error && <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center' }}>{error}</p>}

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isUploading}>
                        Cancelar
                    </button>
                    <button type="submit" className="submit-btn" disabled={isUploading}>
                        {isUploading ? 'Enviando...' : 'Anexar Nota Fiscal'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
// --- FIM DO MODAL DE UPLOAD DE NOTA FISCAL ---


// --- MODAL DE ORÇAMENTOS ---
const ModalOrcamentos = ({ onClose, obraId, obraNome }) => {
    const [orcamentos, setOrcamentos] = useState([]);
    const [filtro, setFiltro] = useState('Todos');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        carregarOrcamentos();
    }, [obraId]);

    const carregarOrcamentos = () => {
        setIsLoading(true);
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/orcamentos`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao carregar orçamentos'); });
                }
                return res.json();
            })
            .then(data => {
                setOrcamentos(data);
            })
            .catch(err => {
                console.error('Erro ao carregar orçamentos:', err);
                setError(err.message);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleDownloadAnexo = (anexoId, filename) => {
        window.open(`${API_URL}/anexos/${anexoId}`, '_blank');
    };

    const orcamentosFiltrados = orcamentos.filter(orc => {
        if (filtro === 'Todos') return true;
        return orc.status === filtro;
    });

    const getStatusColor = (status) => {
        switch(status) {
            case 'Aprovado': return '#28a745';
            case 'Rejeitado': return '#dc3545';
            case 'Pendente': return '#ffc107';
            default: return '#6c757d';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Aprovado': return '✅';
            case 'Rejeitado': return '❌';
            case 'Pendente': return '⏳';
            default: return '📋';
        }
    };

    const contadores = {
        total: orcamentos.length,
        aprovados: orcamentos.filter(o => o.status === 'Aprovado').length,
        rejeitados: orcamentos.filter(o => o.status === 'Rejeitado').length,
        pendentes: orcamentos.filter(o => o.status === 'Pendente').length
    };

    return (
        <Modal onClose={onClose} customWidth="900px">
            <h2>💰 Orçamentos da Obra</h2>
            <p style={{ marginBottom: '20px', color: 'var(--cor-texto-secundario)' }}>
                {obraNome}
            </p>

            {/* Filtros */}
            <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '25px',
                flexWrap: 'wrap'
            }}>
                {['Todos', 'Aprovado', 'Rejeitado', 'Pendente'].map(statusFiltro => (
                    <button
                        key={statusFiltro}
                        onClick={() => setFiltro(statusFiltro)}
                        style={{
                            padding: '8px 16px',
                            border: `2px solid ${filtro === statusFiltro ? 'var(--cor-primaria)' : '#ddd'}`,
                            borderRadius: '20px',
                            background: filtro === statusFiltro ? 'var(--cor-primaria)' : 'white',
                            color: filtro === statusFiltro ? 'white' : 'var(--cor-texto)',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            fontWeight: filtro === statusFiltro ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                        }}
                    >
                        {statusFiltro} 
                        {statusFiltro === 'Todos' && ` (${contadores.total})`}
                        {statusFiltro === 'Aprovado' && ` (${contadores.aprovados})`}
                        {statusFiltro === 'Rejeitado' && ` (${contadores.rejeitados})`}
                        {statusFiltro === 'Pendente' && ` (${contadores.pendentes})`}
                    </button>
                ))}
            </div>

            {/* Conteúdo */}
            <div style={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '15px',
                background: '#f8f9fa'
            }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p>⏳ Carregando orçamentos...</p>
                    </div>
                ) : error ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px',
                        color: 'var(--cor-vermelho)'
                    }}>
                        <p>❌ {error}</p>
                        <button 
                            onClick={carregarOrcamentos}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: 'var(--cor-primaria)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : orcamentosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        <p>📋 Nenhum orçamento {filtro !== 'Todos' ? filtro.toLowerCase() : ''} encontrado.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {orcamentosFiltrados.map(orc => (
                            <div 
                                key={orc.id}
                                style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: `2px solid ${getStatusColor(orc.status)}20`,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                {/* Header com status */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <h3 style={{ 
                                            margin: '0 0 5px 0',
                                            color: 'var(--cor-primaria)',
                                            fontSize: '1.1em'
                                        }}>
                                            {orc.descricao}
                                        </h3>
                                        {orc.servico_nome && (
                                            <p style={{ 
                                                margin: 0,
                                                fontSize: '0.85em',
                                                color: '#6c757d'
                                            }}>
                                                🔗 Serviço: {orc.servico_nome}
                                            </p>
                                        )}
                                    </div>
                                    <span style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        background: getStatusColor(orc.status),
                                        color: 'white',
                                        fontSize: '0.9em',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getStatusIcon(orc.status)} {orc.status}
                                    </span>
                                </div>

                                {/* Informações */}
                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '15px'
                                }}>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Fornecedor:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.fornecedor || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Valor:
                                        </strong>
                                        <p style={{ 
                                            margin: '2px 0 0 0',
                                            color: 'var(--cor-primaria)',
                                            fontWeight: 'bold',
                                            fontSize: '1.1em'
                                        }}>
                                            {new Intl.NumberFormat('pt-BR', { 
                                                style: 'currency', 
                                                currency: 'BRL' 
                                            }).format(orc.valor)}
                                        </p>
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Tipo:
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0' }}>
                                            {orc.tipo}
                                        </p>
                                    </div>
                                    {orc.dados_pagamento && (
                                        <div>
                                            <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                                Pagamento:
                                            </strong>
                                            <p style={{ margin: '2px 0 0 0' }}>
                                                {orc.dados_pagamento}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Observações */}
                                {orc.observacoes && (
                                    <div style={{ 
                                        marginBottom: '15px',
                                        padding: '10px',
                                        background: '#f8f9fa',
                                        borderRadius: '5px',
                                        borderLeft: '3px solid var(--cor-primaria)'
                                    }}>
                                        <strong style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                            Observações:
                                        </strong>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                                            {orc.observacoes}
                                        </p>
                                    </div>
                                )}

                                {/* Anexos */}
                                {orc.anexos && orc.anexos.length > 0 && (
                                    <div>
                                        <strong style={{ 
                                            fontSize: '0.9em',
                                            color: '#6c757d',
                                            display: 'block',
                                            marginBottom: '8px'
                                        }}>
                                            📎 Anexos ({orc.anexos.length}):
                                        </strong>
                                        <div style={{ 
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px'
                                        }}>
                                            {orc.anexos.map(anexo => (
                                                <button
                                                    key={anexo.id}
                                                    onClick={() => handleDownloadAnexo(anexo.id, anexo.filename)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: '#e7f3ff',
                                                        border: '1px solid #0066cc',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85em',
                                                        color: '#0066cc',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#0066cc';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = '#e7f3ff';
                                                        e.currentTarget.style.color = '#0066cc';
                                                    }}
                                                >
                                                    <span>📄</span>
                                                    {anexo.filename}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ 
                marginTop: '20px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '0.9em', color: '#6c757d' }}>
                    <strong>Resumo:</strong> {contadores.total} orçamento(s) • 
                    ✅ {contadores.aprovados} aprovado(s) • 
                    ❌ {contadores.rejeitados} rejeitado(s) • 
                    ⏳ {contadores.pendentes} pendente(s)
                </div>
                <button 
                    onClick={onClose}
                    className="cancel-btn"
                >
                    Fechar
                </button>
            </div>
        </Modal>
    );
};
// --- FIM DO MODAL DE ORÇAMENTOS ---


// --- MODAL DE RELATÓRIOS ---
const RelatoriosModal = ({ onClose, obraId, obraNome }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadType, setDownloadType] = useState(null);
    const [error, setError] = useState(null);

    const handleDownloadNotasFiscais = () => {
        setIsDownloading(true);
        setDownloadType('notas');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais/export/zip`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao baixar notas fiscais'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notas_fiscais_${obraNome}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                console.error("Erro ao baixar notas fiscais:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    const handleDownloadResumoObra = () => {
        setIsDownloading(true);
        setDownloadType('resumo');
        setError(null);

        // <-- CORREÇÃO: Usar fetchWithAuth para enviar token
        fetchWithAuth(`${API_URL}/obras/${obraId}/relatorio/resumo-completo`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao gerar relatório'); });
                }
                return res.blob();
            })
            .then(blob => {
                // Criar URL temporário e abrir em nova aba
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                
                // Limpar URL após um tempo
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 1000);
            })
            .catch(err => {
                console.error("Erro ao gerar relatório:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    return (
        <Modal onClose={onClose} customWidth="500px">
            <h2>📊 Relatórios da Obra</h2>
            <p style={{ marginBottom: '25px', color: 'var(--cor-texto-secundario)' }}>
                Selecione o tipo de relatório que deseja gerar:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Opção 1: Baixar Notas Fiscais */}
                <button
                    onClick={handleDownloadNotasFiscais}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-primaria)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'notas' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📎</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-primaria)' }}>
                                {isDownloading && downloadType === 'notas' ? 'Preparando...' : 'Baixar Notas Fiscais'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Exporta todas as notas fiscais em um arquivo ZIP
                            </p>
                        </div>
                    </div>
                </button>

                {/* Opção 2: Resumo da Obra */}
                <button
                    onClick={handleDownloadResumoObra}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-acento)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'resumo' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📄</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-acento)' }}>
                                {isDownloading && downloadType === 'resumo' ? 'Gerando...' : 'Resumo Completo da Obra'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                PDF com serviços, valores, pendências, orçamentos e gráficos
                            </p>
                        </div>
                    </div>
                </button>

                {/* Opção 3: Orçamentos */}
                <button
                    onClick={() => {
                        onClose(); // Fecha o modal de relatórios
                        // Abre o modal de orçamentos através do callback
                        if (window.abrirModalOrcamentos) {
                            window.abrirModalOrcamentos();
                        }
                    }}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid #17a2b8',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>💰</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: '#17a2b8' }}>
                                Orçamentos
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Visualize todos os orçamentos com status e anexos
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {error && (
                <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center', marginTop: '15px' }}>
                    {error}
                </p>
            )}

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
                <button onClick={onClose} className="cancel-btn" disabled={isDownloading}>
                    Fechar
                </button>
            </div>
        </Modal>
    );
};
// --- FIM DO MODAL DE RELATÓRIOS ---


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
    const [isRelatorioCronogramaVisible, setRelatorioCronogramaVisible] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [orcamentos, setOrcamentos] = useState([]);
    const [isAddOrcamentoModalVisible, setAddOrcamentoModalVisible] = useState(false);
    
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);
    
    // <--- MUDANÇA: Novo estado para o modal de pagamento -->
    const [payingItem, setPayingItem] = useState(null);
    
    const [isServicosCollapsed, setIsServicosCollapsed] = useState(false);
    const [editingServicoPrioridade, setEditingServicoPrioridade] = useState(null);
    const [filtroPendencias, setFiltroPendencias] = useState('');
    
    // <--- NOVO: Estados para Notas Fiscais -->
    const [notasFiscais, setNotasFiscais] = useState([]);
    const [uploadingNFFor, setUploadingNFFor] = useState(null); // Item que está recebendo upload
    
    // <--- NOVO: Estado para modal de relatórios -->
    const [isRelatoriosModalVisible, setRelatoriosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal de orçamentos -->
    const [isOrcamentosModalVisible, setOrcamentosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal do Cronograma Financeiro -->
    const [isCronogramaFinanceiroVisible, setCronogramaFinanceiroVisible] = useState(false);
    
    // MUDANÇA 2: Estado para modal do Diário de Obras
    const [isDiarioVisible, setDiarioVisible] = useState(false);
    
    // MUDANÇA 3: NOVO estado para modal de Inserir Pagamento
    const [isInserirPagamentoModalVisible, setInserirPagamentoModalVisible] = useState(false);

    // NOVO: Estado para controlar o PIX de cada formulário de serviço
    const [pixPorServico, setPixPorServico] = useState({}); // { servicoId: 'chave@pix.com' }

const totalOrcamentosPendentes = useMemo(() => {
        // A variável 'orcamentos' já contém
        // apenas os orçamentos com status 'Pendente' vindos do backend.
        return (Array.isArray(orcamentos) ? orcamentos : [])
            .reduce((total, orc) => total + (orc.valor || 0), 0);
    }, [orcamentos]);

   const itemsAPagar = useMemo(() => {
    // <--- MUDANÇA: Filtros de 'A Pagar' e 'Pagos' atualizados -->
    return (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item =>
        (item.valor_total || 0) > (item.valor_pago || 0)
    )
},
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

 // --- NOVO BLOCO DO CRONOGRAMA (LUGAR CORRETO) ---
    const cronogramaPagamentos = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparação de datas

        const data7Dias = new Date(hoje);
        data7Dias.setDate(hoje.getDate() + 7);

        const data30Dias = new Date(hoje);
        data30Dias.setDate(hoje.getDate() + 30);

        const totais = {
            atrasados: 0,
            hoje: 0,
            prox7dias: 0,
            prox30dias: 0,
            totalAPagar: 0
        };

        // Usa a variável 'itemsAPagar' que já foi definida ANTES
        (Array.isArray(itemsAPagar) ? itemsAPagar : []).forEach(item => {
            const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
            // Usa data_vencimento se existir, senão usa data como fallback
            const dataParaUsar = item.data_vencimento || item.data;
            const dataVencimento = new Date(dataParaUsar + 'T00:00:00'); 
            
            totais.totalAPagar += valorRestante;

            if (dataVencimento < hoje) {
                totais.atrasados += valorRestante;
            } else if (dataVencimento.getTime() === hoje.getTime()) {
                totais.hoje += valorRestante;
            } else if (dataVencimento <= data7Dias) {
                totais.prox7dias += valorRestante;
            } else if (dataVencimento <= data30Dias) {
                totais.prox30dias += valorRestante;
            }
        });

        return totais;
    }, [itemsAPagar]); // A dependência é 'itemsAPagar'
    // --- FIM DO NOVO BLOCO ---


    const itemsPagos = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => 
            (item.valor_total || 0) - (item.valor_pago || 0) < 0.01 // Totalmente pago
        ),
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
    
    // Callback para abrir modal de orçamentos
    useEffect(() => {
        window.abrirModalOrcamentos = () => {
            setOrcamentosModalVisible(true);
        };
        return () => {
            delete window.abrirModalOrcamentos;
        };
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
                
                // <--- NOVO: Buscar notas fiscais -->
                fetchNotasFiscais(obraId);
            })
            .catch(error => { console.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); setOrcamentos([]); })
            .finally(() => setIsLoading(false));
    };
    
    // <--- NOVO: Função para buscar notas fiscais -->
    const fetchNotasFiscais = (obraId) => {
        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                console.log("Notas fiscais recebidas:", data);
                setNotasFiscais(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                console.error("Erro ao buscar notas fiscais:", error);
                setNotasFiscais([]);
            });
    };
    
    // <--- NOVO: Helper para verificar se item tem nota fiscal -->
    const itemHasNotaFiscal = (item) => {
        // <-- CORREÇÃO: Usar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;
            
        return notasFiscais.some(nf => 
            nf.item_id === realItemId && nf.item_type === item.tipo_registro
        );
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => {
        // ... (código inalterado)
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, { method: 'POST', body: JSON.stringify({ nome, cliente }) })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => { setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); e.target.reset(); })
        .catch(error => console.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => console.error('Erro ao deletar obra:', error));
    };
    
    // <--- MUDANÇA: Esta função (marcar pago 100%) será chamada pelo modal de edição, não mais pelo botão -->
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
         // ... (código inalterado)
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
    
    // <--- MUDANÇA: Atualizado para enviar valor_total e valor_pago -->
    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { 
            ...updatedLancamento, 
            valor_total: parseFloat(updatedLancamento.valor_total) || 0, // <-- MUDANÇA
            valor_pago: parseFloat(updatedLancamento.valor_pago) || 0, // <-- MUDANÇA
            servico_id: updatedLancamento.servico_id || null 
        };
        // Remove 'valor' se existir por acidente
        delete dataToSend.valor;
        
        fetchWithAuth(`${API_URL}/lancamentos/${updatedLancamento.lancamento_id}`, { 
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar edição:", error));
    };
    
    // <--- MUDANÇA: handleSaveLancamento (o 'valor' do formulário é o 'valor_total') -->
    const handleSaveLancamento = (lancamentoData) => {
        console.log("Salvando novo lançamento:", lancamentoData);
        // O formulário envia 'valor', mas o backend espera 'valor'
        // A lógica do backend já converte 'valor' para 'valor_total' e 'valor_pago'
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar lançamento:", error));
    };
    
    // MUDANÇA 3: NOVO handler para Inserir Pagamento
    const handleInserirPagamento = (pagamentoData) => {
        console.log("Inserindo novo pagamento:", pagamentoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/inserir-pagamento`, {
            method: 'POST',
            body: JSON.stringify(pagamentoData)
        }).then(res => { 
            if (!res.ok) { 
                return res.json().then(err => { throw new Error(err.erro || 'Erro ao inserir pagamento') }); 
            } 
            return res.json(); 
        })
        .then(() => { 
            setInserirPagamentoModalVisible(false); 
            fetchObraData(obraSelecionada.id); 
            alert('Pagamento inserido com sucesso!');
        })
        .catch(error => {
            console.error("Erro ao inserir pagamento:", error);
            alert('Erro ao inserir pagamento: ' + error.message);
        });
    };

    const handleSaveServico = (servicoData) => {
        // ... (código inalterado)
        console.log("Salvando novo serviço:", servicoData);
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/servicos`, {
            method: 'POST',
            body: JSON.stringify(servicoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddServicoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => console.error("Erro ao salvar serviço:", error));
    };

    const handleSaveEditServico = (updatedServico) => {
        // ... (código inalterado)
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

    // --- Handlers de Orçamento (inalterados) ---
    const handleSaveOrcamento = (formData) => {
        // ... (código inalterado)
        console.log("Salvando novo orçamento...");
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/orcamentos`, {
            method: 'POST',
            body: formData
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
    const handleSaveEditOrcamento = (orcamentoId, formData, newFiles) => {
        // ... (código inalterado)
        console.log("Salvando edição do orçamento:", orcamentoId);
        
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, {
            method: 'PUT',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                return fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/anexos`, {
                    method: 'POST',
                    body: fileFormData
                });
            }
            
            return Promise.resolve();
            
        }).then(fileRes => {
            if (fileRes && !fileRes.ok) {
                 return fileRes.json().then(err => { throw new Error(err.erro || 'Erro ao enviar anexos') });
            }
            
            setEditingOrcamento(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            console.error("Erro ao salvar edição do orçamento:", error);
            alert(`Erro ao salvar edição: ${error.message}`);
        });
    };
    const handleAprovarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/aprovar`, { method: 'POST' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao aprovar orçamento:", error));
    };
    const handleRejeitarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao rejeitar orçamento:", error));
    };

    // Handler do PDF da Obra
    const handleExportObraPDF = () => {
        // ... (código inalterado)
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

    // <--- MUDANÇA: Handler de Pagamento (usa 'valor' para 'valor_total') -->
    const handleAddPagamentoServico = (e, servicoId) => {
        e.preventDefault();
        const valorPagamento = e.target.valorPagamento.value; // Este é o 'valor' do formulário
        const statusPagamento = e.target.statusPagamento.value;
        const tipoPagamento = e.target.tipoPagamento.value;
        const dataPagamento = e.target.dataPagamento.value; 
        const dataVencimento = e.target.dataVencimento.value;
        const fornecedor = e.target.fornecedor.value;
        const pixValue = pixPorServico[servicoId] || ''; // Pegar o PIX do state
        
        if (!valorPagamento || !tipoPagamento || !dataPagamento) return;
        
        const pagamento = {
            valor: parseFloat(valorPagamento) || 0, // O backend espera 'valor'
            data: dataPagamento, 
            data_vencimento: dataVencimento,
            status: statusPagamento,
            tipo_pagamento: tipoPagamento,
            pix: pixValue || null, // Campo PIX
            fornecedor: fornecedor || null
        };
        console.log("Adicionando pagamento de serviço:", pagamento);
        fetchWithAuth(`${API_URL}/servicos/${servicoId}/pagamentos`, {
            method: 'POST',
            body: JSON.stringify(pagamento)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             e.target.reset(); 
             // Limpar o state de PIX desse serviço
             setPixPorServico(prev => ({ ...prev, [servicoId]: '' }));
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => console.error("Erro ao adicionar pagamento:", error));
    };

    // Handler de Prioridade
    const handleSaveServicoPrioridade = (novaPrioridade) => {
        // ... (código inalterado)
        if (!editingServicoPrioridade) return;

        const pagamentoId = editingServicoPrioridade.pagamento_id;
        
        fetchWithAuth(`${API_URL}/servicos/pagamentos/${pagamentoId}/prioridade`, {
            method: 'PATCH',
            body: JSON.stringify({ prioridade: novaPrioridade })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setEditingServicoPrioridade(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            console.error("Erro ao salvar prioridade do serviço:", error);
            alert(`Erro ao salvar prioridade: ${error.message}`);
        });
    };

    // <--- MUDANÇA: NOVA FUNÇÃO HANDLER PARA PAGAMENTO PARCIAL ---
    const handleSavePartialPayment = (valor_a_pagar) => {
        if (!payingItem) return;

        const { tipo_registro, id } = payingItem;
        // O ID vem como "lanc-123" ou "serv-pag-456"
        const item_type = tipo_registro === 'lancamento' ? 'lancamento' : 'pagamento_servico';
        const item_id = id.split('-').pop();

        console.log(`Registrando pagamento de ${valor_a_pagar} para ${item_type} ${item_id}`);

        fetchWithAuth(`${API_URL}/pagamentos/${item_type}/${item_id}/pagar`, {
            method: 'PATCH',
            body: JSON.stringify({ valor_a_pagar })
        })
        .then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') }); }
            return res.json();
        })
        .then(() => {
            setPayingItem(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            console.error("Erro ao registrar pagamento parcial:", error);
            // Mostra o erro de validação (ex: "valor maior que o restante")
            // Precisamos garantir que o modal esteja aberto para mostrar o erro
            if (payingItem) {
                alert(`Erro: ${error.message}`);
            }
        });
    };
    // <--- FIM DA NOVA FUNÇÃO ---


    // --- RENDERIZAÇÃO ---
    
    // TELA DE SELEÇÃO DE OBRAS
    if (!obraSelecionada) {
        // ... (código inalterado) ...
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                {isRelatorioCronogramaVisible && <ModalRelatorioCronograma 
                    obras={obras}
                    onClose={() => setRelatorioCronogramaVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
                    
                        <button 
                            onClick={() => setRelatorioCronogramaVisible(true)} 
                            className="export-btn pdf" 
                            style={{marginRight: '10px'}}
                        >
                            📊 Relatório Financeiro
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
                                            <span>Orçamento Total</span>
                                            <strong style={{ color: 'var(--cor-vermelho)' }}>
                                                {formatCurrency(obra.orcamento_total || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Valores Pagos</span>
                                            <strong style={{ color: 'var(--cor-primaria)' }}>
                                                {formatCurrency(obra.total_pago || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Liberado (Fila)</span>
                                            <strong style={{ color: 'var(--cor-acento)' }}>
                                                {formatCurrency(obra.liberado_pagamento || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Residual</span>
                                            <strong style={{ color: '#f0ad4e' }}>
                                                {formatCurrency(obra.residual || 0)}
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
            
            {/* MUDANÇA 3: NOVO modal Inserir Pagamento */}
            {isInserirPagamentoModalVisible && (
                <InserirPagamentoModal
                    onClose={() => setInserirPagamentoModalVisible(false)}
                    onSave={handleInserirPagamento}
                    servicos={servicos}
                    obraId={obraSelecionada.id}
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

            {editingOrcamento && (
                <EditOrcamentoModal
                    orcamento={editingOrcamento}
                    onClose={() => setEditingOrcamento(null)}
                    onSave={(orcamentoId, formData, newFiles) => handleSaveEditOrcamento(orcamentoId, formData, newFiles)}
                    servicos={servicos}
                />
            )}

            {viewingAnexos && (
                <ViewAnexosModal
                    orcamento={viewingAnexos}
                    onClose={() => setViewingAnexos(null)}
                />
            )}

            {/* <-- MUDANÇA: Renderiza o novo modal de pagamento --> */}
            {payingItem && (
                <PartialPaymentModal
                    item={payingItem}
                    onClose={() => setPayingItem(null)}
                    onSave={handleSavePartialPayment}
                />
            )}

            {editingServicoPrioridade && (
                <EditPrioridadeModal
                    item={editingServicoPrioridade}
                    onClose={() => setEditingServicoPrioridade(null)}
                    onSave={handleSaveServicoPrioridade}
                />
            )}
            
            {/* <-- NOVO: Modal de Upload de Nota Fiscal --> */}
            {uploadingNFFor && (
                <UploadNotaFiscalModal
                    item={uploadingNFFor}
                    obraId={obraSelecionada.id}
                    onClose={() => setUploadingNFFor(null)}
                    onSuccess={() => fetchNotasFiscais(obraSelecionada.id)}
                />
            )}
            
            {/* <-- NOVO: Modal de Relatórios --> */}
            {isRelatoriosModalVisible && (
                <RelatoriosModal
                    onClose={() => setRelatoriosModalVisible(false)}
                    obraId={obraSelecionada.id}
                    obraNome={obraSelecionada.nome}
                />
            )}
            
            {/* <-- NOVO: Modal de Orçamentos --> */}
            {isOrcamentosModalVisible && (
                <ModalOrcamentos
                    onClose={() => setOrcamentosModalVisible(false)}
                    obraId={obraSelecionada.id}
                    obraNome={obraSelecionada.nome}
                />
            )}

            {/* <-- NOVO: Modal do Cronograma Financeiro --> */}
            {isCronogramaFinanceiroVisible && (
                <CronogramaFinanceiro
                    onClose={() => {
                        setCronogramaFinanceiroVisible(false);
                        fetchObraData(obraSelecionada.id); // Recarrega dados da obra ao fechar
                    }}
                    obraId={obraSelecionada.id}
                    obraNome={obraSelecionada.nome}
                />
            )}

            {/* MUDANÇA 4: Modal do Diário de Obras */}
            {isDiarioVisible && (
                <DiarioObras
                    obra={obraSelecionada}
                    onClose={() => setDiarioVisible(false)}
                />
            )}

            {/* --- Cabeçalho --- */}
            <header className="dashboard-header">
                <div><h1>{obraSelecionada.nome}</h1><p>Cliente: {obraSelecionada.cliente || 'N/A'}</p></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* <-- NOVO: Botão Cronograma Financeiro --> */}
                    <button 
                        onClick={() => setCronogramaFinanceiroVisible(true)} 
                        className="voltar-btn" 
                        style={{ backgroundColor: '#28a745', color: 'white' }}
                    >
                        💰 Cronograma Financeiro
                    </button>
                    {/* MUDANÇA 3: NOVO botão Inserir Pagamento */}
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <button 
                            onClick={() => setInserirPagamentoModalVisible(true)} 
                            className="voltar-btn" 
                            style={{ backgroundColor: '#007bff', color: 'white' }}
                        >
                            💳 Inserir Pagamento
                        </button>
                    )}
                    {/* <-- NOVO: Botão Relatórios --> */}
                    <button 
                        onClick={() => setRelatoriosModalVisible(true)} 
                        className="voltar-btn" 
                        style={{ backgroundColor: 'var(--cor-acento)', color: 'white' }}
                    >
                        📊 Relatórios
                    </button>
                    {/* MUDANÇA 3: Botão Diário de Obras */}
                    <button 
                        onClick={() => setDiarioVisible(true)} 
                        className="voltar-btn" 
                        style={{ backgroundColor: '#17a2b8', color: 'white' }}
                    >
                        📔 Diário de Obras
                    </button>
                    <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                    <button onClick={() => setObraSelecionada(null)} className="voltar-btn">&larr; Ver Todas as Obras</button>
                </div>
            </header>

            {/* --- *** KPIs *** --- */}
             {sumarios && (
                 <div className="kpi-grid">
                     {/* Card 1: Orçamento Total */}
                     <div className="kpi-card orcamento-total">
                         <span>Orçamento Total (Orçado)</span>
                         <h2>{formatCurrency(sumarios.orcamento_total)}</h2>
                     </div>

                     {/* Card 2: Valores Efetivados/Pagos */}
                     <div className="kpi-card total-pago">
                         <span>Valores Efetivados (Pagos)</span>
                         <h2>{formatCurrency(sumarios.valores_pagos)}</h2>
                     </div>
                     
                     {/* Card 3: Liberado para Pagamento (Fila) */}
                     <div className="kpi-card liberado-pagamento">
                         <span>Liberado p/ Pagamento (Fila)</span>
                         <h2>{formatCurrency(sumarios.liberado_pagamento)}</h2>
                     </div>

                     {/* Card 4: Residual (Orçamento - Pago) */}
                     <div className="kpi-card residual-servicos">
                         <span>Residual (Orçado - Pago)</span>
                         <h2>{formatCurrency(sumarios.residual)}</h2>
                     </div>
                 </div>
             )}
            
            
            {/* --- Quadro Informativo do Cronograma Financeiro --- */}
            <QuadroAlertasVencimento obraId={obraSelecionada.id} />
            {/* --- Fim do Quadro Informativo --- */}
            
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
                
                <div className="header-actions">
                    <span style={{ 
                        fontSize: '1.1em', 
                        fontWeight: 'bold', 
                        color: 'var(--cor-texto-secundario)',
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: '20px' 
                    }}>
                        Total Pendente: 
                        <span style={{ 
                            color: 'var(--cor-primaria)', 
                            fontSize: '1.2em', 
                            marginLeft: '8px' 
                        }}>
                            {formatCurrency(totalOrcamentosPendentes)}
                        </span>
                    </span>
                
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <button className="acao-btn add-btn" style={{backgroundColor: 'var(--cor-info)'}} onClick={() => setAddOrcamentoModalVisible(true)}>+ Novo Orçamento</button>
                    )}
                
                </div>
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
                            {/* <-- MUDANÇA: Filtrar orçamentos rejeitados da lista principal */}
                            {orcamentos.filter(orc => orc.status !== 'Rejeitado').length > 0 ? orcamentos.filter(orc => orc.status !== 'Rejeitado').map(orc => (
                                <tr key={orc.id} className="linha-clicavel" onClick={() => setEditingOrcamento(orc)}>
                                    <td>
                                        {orc.descricao}
                                    </td>
                                    <td>{orc.fornecedor || 'N/A'}</td>
                                    <td>{orc.tipo}</td>
                                    <td>{orc.servico_nome || 'Geral'}</td>
                                    <td>{formatCurrency(orc.valor)}</td>
                                    <td className="acoes-cell" style={{display: 'flex', gap: '5px', justifyContent: 'center'}} onClick={e => e.stopPropagation()}>
                                        
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
                            
                            // --- Lógica de Mão de Obra ---
                            const pagamentosMO = safePagamentos.filter(p => p.tipo_pagamento === 'mao_de_obra');
                            const valorPagoTotalMO = pagamentosMO.reduce((total, pag) => total + (pag.valor_pago || 0), 0);
                            const valorComprometidoMO = pagamentosMO.reduce((total, pag) => total + (pag.valor_total || 0), 0) + (serv.total_gastos_vinculados_mo || 0);
                            const valorGlobalMO = serv.valor_global_mao_de_obra || 0;
                            const progressoMOPct = valorGlobalMO > 0 ? ((valorPagoTotalMO / valorGlobalMO) * 100).toFixed(0) : 0;

                            // --- Lógica de Material ---
                            const pagamentosMat = safePagamentos.filter(p => p.tipo_pagamento === 'material');
                            const valorPagoTotalMat = pagamentosMat.reduce((total, pag) => total + (pag.valor_pago || 0), 0);
                            const valorComprometidoMat = pagamentosMat.reduce((total, pag) => total + (pag.valor_total || 0), 0) + (serv.total_gastos_vinculados_mat || 0);
                            const valorGlobalMat = serv.valor_global_material || 0;
                            const progressoMatPct = valorGlobalMat > 0 ? ((valorPagoTotalMat / valorGlobalMat) * 100).toFixed(0) : 0;


                            return (
                                <div key={serv.id} className="card-empreitada-item">
                                    <div onClick={() => setViewingServico(serv)} className="card-empreitada-item-clickable">
                                        <div className="empreitada-header">
                                            <h4>{serv.nome}</h4>
                                            <span style={{textAlign: 'right'}}>
                                                <strong style={{fontSize: '1.1em', color: 'var(--cor-primaria)'}}>
                                                    Valor Total em Andamento: {formatCurrency(valorGlobalMO + valorGlobalMat)}
                                                </strong><br/>
                                                <small>Orçado (MO): {formatCurrency(valorGlobalMO)}</small><br/>
                                                <small>Orçado (Mat): {formatCurrency(valorGlobalMat)}</small>
                                            </span>
                                        </div>
                                        <small>Responsável: {serv.responsavel || 'N/A'}</small>
                                        
                                        <div style={{marginTop: '10px'}}>
                                            <small>
                                                Mão de Obra (Pago/Comprometido): {formatCurrency(valorPagoTotalMO)} / {formatCurrency(valorComprometidoMO)}
                                                <span style={{fontWeight: 'bold', marginLeft: '8px', color: 'var(--cor-primaria)'}}>({progressoMOPct}%)</span>
                                            </small>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar" style={{ width: `${progressoMOPct}%` }}></div>
                                            </div>
                                        </div>
                                        
                                        <div style={{marginTop: '5px'}}>
                                            <small>
                                                Material (Pago/Comprometido): {formatCurrency(valorPagoTotalMat)} / {formatCurrency(valorComprometidoMat)}
                                                <span style={{fontWeight: 'bold', marginLeft: '8px', color: '#fd7e14'}}>({progressoMatPct}%)</span>
                                            </small>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar" style={{ width: `${progressoMatPct}%`, backgroundColor: '#fd7e14' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(user.role === 'administrador' || user.role === 'master') && (
                                        <form onSubmit={(e) => handleAddPagamentoServico(e, serv.id)} className="form-pagamento-parcial" onClick={e => e.stopPropagation()}>
                                            <input type="date" name="dataPagamento" placeholder="Data Registro" defaultValue={getTodayString()} required style={{flex: 1, minWidth: '120px'}} title="Data do Registro" />
                                            <input type="date" name="dataVencimento" placeholder="Vencimento" defaultValue={getTodayString()} required style={{flex: 1, minWidth: '120px'}} title="Data de Vencimento ⚠️" />
                                            <input type="text" name="fornecedor" placeholder="Fornecedor" style={{flex: 1.2, minWidth: '120px'}} />
                                            <input type="number" step="0.01" name="valorPagamento" placeholder="Valor" required style={{flex: 1, minWidth: '100px'}} />
                                            
                                            <input 
                                                type="text" 
                                                placeholder="Chave PIX" 
                                                value={pixPorServico[serv.id] || ''}
                                                onChange={(e) => setPixPorServico(prev => ({ ...prev, [serv.id]: e.target.value }))}
                                                style={{flex: 1.2, minWidth: '120px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
                                            />
                                            
                                            <select name="tipoPagamento" required style={{flex: 1, minWidth: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                                <option value="">Tipo...</option>
                                                <option value="mao_de_obra">Mão de Obra</option>
                                                <option value="material">Material</option>
                                            </select>
                                            
                                            <select name="statusPagamento" defaultValue="Pago" required style={{flex: 0.8, minWidth: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                                <option value="Pago">Pago</option>
                                                <option value="A Pagar">A Pagar</option>
                                            </select>
                                            <button type="submit" style={{flex: 0.5, minWidth: '60px', maxWidth: '80px'}}>Adic.</button>
                                        </form>
                                    )}
                                </div>
                            );
                        }) : <p>Nenhum serviço cadastrado.</p>}
                    </div> 
                )}
            </div> 

            {/* MUDANÇA 1 e 4: Card de Pendências REMOVIDO - substituído pelo Cronograma Financeiro */}

            {/* <--- MUDANÇA: Tabela de Histórico (Pagos) ATUALIZADA --> */}
            <div className="card-full">
                <div className="card-header">
                    <h3>Histórico de Pagamentos (Pagos)</h3>
                    <div className="header-actions">
                        {/* MUDANÇA 2: Botão Novo Gasto Avulso movido para cá (sempre marca como Pago) */}
                        {(user.role === 'administrador' || user.role === 'master') && (
                            <button className="acao-btn add-btn" onClick={() => setAddLancamentoModalVisible(true)}>+ Novo Gasto Avulso</button>
                        )}
                        <button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/csv`)} className="export-btn">CSV (Geral)</button>
                    </div>
                </div>
                <div className="tabela-scroll-container">
                    <table className="tabela-historico">
                        <thead>
                            <tr>
                                <th style={{width: '120px'}}>Vencimento</th>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Segmento</th>
                                <th>Prior.</th>
                                <th>Status</th>
                                <th>Valor Pago</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsPagos.length > 0 ? itemsPagos.map(item => (
                                <tr key={item.id}>
                                    <td>{new Date((item.data_vencimento || item.data) + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
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
                                        <span className="status pago">Pago</span>
                                    </td>
                                    <td>{formatCurrency(item.valor_pago)}</td>
                                    <td className="acoes-cell">
                                        {/* <--- NOVO: Botão Anexar NF --> */}
                                        {(user.role === 'administrador' || user.role === 'master') && (
                                            <button 
                                                onClick={() => setUploadingNFFor(item)} 
                                                className="acao-icon-btn" 
                                                title={itemHasNotaFiscal(item) ? "Nota fiscal anexada ✓" : "Anexar Nota Fiscal"}
                                                style={{ 
                                                    color: itemHasNotaFiscal(item) ? 'var(--cor-acento)' : 'var(--cor-primaria)',
                                                    fontSize: '1.2em'
                                                }}
                                            >
                                                📎
                                            </button>
                                        )}
                                        
                                        {(user.role === 'administrador' || user.role === 'master') ? (
                                            item.tipo_registro === 'lancamento' ? (
                                                <button onClick={() => handleEditLancamento(item)} className="acao-icon-btn edit-btn" title="Editar Lançamento" > ✏️ </button>
                                            ) : (
                                                <button onClick={() => setEditingServicoPrioridade(item)} className="acao-icon-btn edit-btn" title="Editar Prioridade" > ✏️ </button>
                                            )
                                        ) : null}
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


// ===================================
// COMPONENTE CRONOGRAMA FINANCEIRO
// ===================================

// Modal para Cadastrar Pagamento Futuro (Único)
const CadastrarPagamentoFuturoModal = ({ onClose, onSave, obraId }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        data_vencimento: getTodayString(),
        fornecedor: '',
        pix: '',
        observacoes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>💰 Cadastrar Pagamento Futuro</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Valor:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Data de Vencimento:
                    <input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Chave PIX:
                    <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Cadastrar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};

// Modal para Editar Pagamento Futuro
const EditarPagamentoFuturoModal = ({ onClose, onSave, pagamento }) => {
    const [formData, setFormData] = useState({
        descricao: pagamento.descricao || '',
        valor: pagamento.valor || '',
        data_vencimento: pagamento.data_vencimento || getTodayString(),
        fornecedor: pagamento.fornecedor || '',
        pix: pagamento.pix || '',
        observacoes: pagamento.observacoes || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>✏️ Editar Pagamento Futuro</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Valor:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Data de Vencimento:
                    <input
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Chave PIX:
                    <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => setFormData({...formData, pix: e.target.value})}
                        placeholder="CPF, telefone, email ou chave aleatória"
                        maxLength="100"
                    />
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Salvar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};


// Modal para Cadastrar Pagamento Parcelado
const CadastrarPagamentoParceladoModal = ({ onClose, onSave, obraId }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        fornecedor: '',
        valor_total: '',
        numero_parcelas: '1',
        periodicidade: 'Mensal',
        data_primeira_parcela: getTodayString(),
        observacoes: ''
    });

    const valor_parcela = formData.valor_total && formData.numero_parcelas 
        ? (parseFloat(formData.valor_total) / parseInt(formData.numero_parcelas)).toFixed(2)
        : '0.00';

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Modal onClose={onClose}>
            <h2>📊 Cadastrar Pagamento Parcelado</h2>
            <form onSubmit={handleSubmit} className="form-orcamento">
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    Valor Total:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Número de Parcelas:
                    <input
                        type="number"
                        min="1"
                        value={formData.numero_parcelas}
                        onChange={(e) => setFormData({...formData, numero_parcelas: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Periodicidade:
                    <select
                        value={formData.periodicidade}
                        onChange={(e) => setFormData({...formData, periodicidade: e.target.value})}
                        required
                    >
                        <option value="Semanal">Semanal (a cada 7 dias)</option>
                        <option value="Mensal">Mensal (a cada 30 dias)</option>
                    </select>
                </label>

                <div style={{ 
                    padding: '10px', 
                    background: '#f0f8ff', 
                    borderRadius: '5px',
                    marginBottom: '10px'
                }}>
                    <strong>Valor de cada parcela:</strong> {formatCurrency(parseFloat(valor_parcela))}
                </div>

                <label>
                    Data da 1ª Parcela:
                    <input
                        type="date"
                        value={formData.data_primeira_parcela}
                        onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="3"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn">Cadastrar</button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};
// ==========================================
// COMPONENTE: MODAL DE EDIÇÃO DE PARCELAS
// ==========================================

const EditarParcelasModal = ({ obraId, pagamentoParcelado, onClose, onSave }) => {
    const [parcelas, setParcelas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parcelaEditando, setParcelaEditando] = useState(null);

    useEffect(() => {
        carregarParcelas();
    }, []);

    const carregarParcelas = async () => {
        try {
            setIsLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas`
            );
            
            if (!response.ok) throw new Error('Erro ao carregar parcelas');
            
            const data = await response.json();
            setParcelas(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditarParcela = async (parcela, novoValor, novaData) => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        valor_parcela: parseFloat(novoValor),
                        data_vencimento: novaData
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao editar parcela');

            await carregarParcelas();
            setParcelaEditando(null);
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const handleMarcarPaga = async (parcela) => {
        if (!window.confirm(`Confirma o pagamento da parcela ${parcela.numero_parcela}?`)) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamentoParcelado.id}/parcelas/${parcela.id}/pagar`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        data_pagamento: getTodayString()
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao marcar parcela como paga');

            await carregarParcelas();
            
            if (onSave) onSave();
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const calcularValorTotal = () => {
        return parcelas.reduce((sum, p) => sum + p.valor_parcela, 0);
    };

    if (isLoading) return <Modal><div className="modal-content">Carregando...</div></Modal>;
    if (error) return <Modal><div className="modal-content">Erro: {error}</div></Modal>;

    return (
        <Modal>
            <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
                <h2>✏️ Editar Parcelas</h2>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                    <strong>{pagamentoParcelado.descricao}</strong><br />
                    Fornecedor: {pagamentoParcelado.fornecedor || '-'}
                </p>
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <strong>Valor Total Calculado:</strong> {formatCurrency(calcularValorTotal())}
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                        {parcelas.filter(p => p.status === 'Pago').length} de {parcelas.length} pagas
                    </div>
                </div>

                <table className="tabela-pendencias">
                    <thead>
                        <tr>
                            <th>Parcela</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parcelas.map(parcela => (
                            <tr key={parcela.id} style={{
                                backgroundColor: parcela.status === 'Pago' ? '#e8f5e9' : 
                                               new Date(parcela.data_vencimento) < new Date() ? '#ffebee' : 'white'
                            }}>
                                <td>
                                    <strong>#{parcela.numero_parcela}</strong>
                                </td>
                                <td>
                                    {parcelaEditando === parcela.id ? (
                                        <input
                                            type="number"
                                            step="0.01"
                                            defaultValue={parcela.valor_parcela}
                                            id={`valor-${parcela.id}`}
                                            style={{ width: '120px', padding: '5px' }}
                                        />
                                    ) : (
                                        formatCurrency(parcela.valor_parcela)
                                    )}
                                </td>
                                <td>
                                    {parcelaEditando === parcela.id ? (
                                        <input
                                            type="date"
                                            defaultValue={parcela.data_vencimento}
                                            id={`data-${parcela.id}`}
                                            style={{ padding: '5px' }}
                                        />
                                    ) : (
                                        new Date(parcela.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')
                                    )}
                                </td>
                                <td>
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.85em',
                                        backgroundColor: parcela.status === 'Pago' ? '#28a745' : 
                                                       new Date(parcela.data_vencimento) < new Date() ? '#dc3545' : '#17a2b8',
                                        color: 'white'
                                    }}>
                                        {parcela.status === 'Pago' ? 'Paga' : 
                                         new Date(parcela.data_vencimento) < new Date() ? 'Vencida' : 'Previsto'}
                                    </span>
                                </td>
                                <td>
                                    {parcela.status !== 'Pago' && (
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {parcelaEditando === parcela.id ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const novoValor = document.getElementById(`valor-${parcela.id}`).value;
                                                            const novaData = document.getElementById(`data-${parcela.id}`).value;
                                                            handleEditarParcela(parcela, novoValor, novaData);
                                                        }}
                                                        className="submit-btn"
                                                        style={{ padding: '3px 8px', fontSize: '0.8em' }}
                                                    >
                                                        ✓ Salvar
                                                    </button>
                                                    <button
                                                        onClick={() => setParcelaEditando(null)}
                                                        className="voltar-btn"
                                                        style={{ padding: '3px 8px', fontSize: '0.8em' }}
                                                    >
                                                        ✕ Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setParcelaEditando(parcela.id)}
                                                        className="submit-btn"
                                                        style={{ padding: '3px 8px', fontSize: '0.8em' }}
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarcarPaga(parcela)}
                                                        className="submit-btn"
                                                        style={{ padding: '3px 8px', fontSize: '0.8em', backgroundColor: '#28a745' }}
                                                    >
                                                        ✓ Pagar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {parcela.status === 'Pago' && parcela.data_pagamento && (
                                        <span style={{ fontSize: '0.8em', color: '#666' }}>
                                            Paga em {new Date(parcela.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button onClick={onClose} className="voltar-btn">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};


// ==========================================
// COMPONENTE: QUADRO DE ALERTAS DE VENCIMENTO
// ==========================================

const QuadroAlertasVencimento = ({ obraId }) => {
    const [alertas, setAlertas] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [categoriaExpandida, setCategoriaExpandida] = useState(null);

    useEffect(() => {
        carregarAlertas();
    }, [obraId]);

    const carregarAlertas = async () => {
        try {
            setIsLoading(true);
            const response = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/alertas-vencimento`
            );
            
            if (!response.ok) throw new Error('Erro ao carregar alertas');
            
            const data = await response.json();
            setAlertas(data);
        } catch (err) {
            console.error('Erro ao carregar alertas:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCategoria = (categoria) => {
        setCategoriaExpandida(categoriaExpandida === categoria ? null : categoria);
    };

    if (isLoading) {
        return (
            <div className="card-full">
                <h3>📊 Status de Pagamentos</h3>
                <p>Carregando...</p>
            </div>
        );
    }

    if (!alertas) return null;

    const categorias = [
        {
            key: 'vencidos',
            titulo: '🔴 Vencidos (Atrasados)',
            cor: '#dc3545',
            dados: alertas.vencidos
        },
        {
            key: 'vence_hoje',
            titulo: '⚠️ Vence Hoje',
            cor: '#ffc107',
            dados: alertas.vence_hoje
        },
        {
            key: 'vence_amanha',
            titulo: '📅 Vence Amanhã',
            cor: '#fd7e14',
            dados: alertas.vence_amanha
        },
        {
            key: 'vence_7_dias',
            titulo: '📆 Vence em até 7 dias',
            cor: '#17a2b8',
            dados: alertas.vence_7_dias
        },
        {
            key: 'futuros',
            titulo: '✅ Futuros (mais de 7 dias)',
            cor: '#28a745',
            dados: alertas.futuros
        }
    ];

    return (
        <div className="card-full">
            <h3>📊 Quadro Informativo - Cronograma Financeiro</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                {categorias.map(categoria => (
                    <div
                        key={categoria.key}
                        style={{
                            padding: '15px',
                            backgroundColor: 'white',
                            border: `3px solid ${categoria.cor}`,
                            borderRadius: '8px',
                            cursor: categoria.dados.itens?.length > 0 ? 'pointer' : 'default',
                            transition: 'transform 0.2s',
                            position: 'relative'
                        }}
                        onClick={() => categoria.dados.itens?.length > 0 && toggleCategoria(categoria.key)}
                        onMouseEnter={(e) => categoria.dados.itens?.length > 0 && (e.currentTarget.style.transform = 'scale(1.02)')}
                        onMouseLeave={(e) => categoria.dados.itens?.length > 0 && (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '10px', color: categoria.cor }}>
                            {categoria.titulo}
                        </div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '5px' }}>
                            {categoria.dados.quantidade} {categoria.dados.quantidade === 1 ? 'item' : 'itens'}
                        </div>
                        <div style={{ fontSize: '1.2em', color: '#666' }}>
                            {formatCurrency(categoria.dados.valor_total)}
                        </div>
                        
                        {categoria.dados.itens?.length > 0 && (
                            <div style={{ 
                                position: 'absolute', 
                                bottom: '10px', 
                                right: '10px', 
                                fontSize: '0.8em', 
                                color: '#999' 
                            }}>
                                {categoriaExpandida === categoria.key ? '▲ Fechar' : '▼ Ver detalhes'}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Lista Expandida de Itens */}
            {categoriaExpandida && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    border: `2px solid ${categorias.find(c => c.key === categoriaExpandida)?.cor}`
                }}>
                    <h4>{categorias.find(c => c.key === categoriaExpandida)?.titulo} - Detalhes</h4>
                    
                    <table className="tabela-pendencias" style={{ marginTop: '10px' }}>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Descrição</th>
                                <th>Fornecedor</th>
                                <th>Valor</th>
                                <th>Vencimento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alertas[categoriaExpandida]?.itens?.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.8em',
                                            backgroundColor: item.tipo === 'Parcela' ? '#6c757d' : '#007bff',
                                            color: 'white'
                                        }}>
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td>{item.descricao}</td>
                                    <td>{item.fornecedor || '-'}</td>
                                    <td><strong>{formatCurrency(item.valor)}</strong></td>
                                    <td>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
// Modal Principal do Cronograma Financeiro
const CronogramaFinanceiro = ({ onClose, obraId, obraNome }) => {
    const [pagamentosFuturos, setPagamentosFuturos] = useState([]);
    const [pagamentosParcelados, setPagamentosParcelados] = useState([]);
    const [pagamentosServicoPendentes, setPagamentosServicoPendentes] = useState([]); // NOVO
    const [isEditarParcelasVisible, setEditarParcelasVisible] = useState(false);
    const [pagamentoParceladoSelecionado, setPagamentoParceladoSelecionado] = useState(null);
    const [previsoes, setPrevisoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // MUDANÇA 5: Estados para seleção múltipla
    const [itensSelecionados, setItensSelecionados] = useState([]); // [{tipo: 'futuro'|'parcela'|'servico', id: X}]
    const [isMarcarPagosVisible, setMarcarPagosVisible] = useState(false);
    
    const handleAbrirEditarParcelas = (pagamento) => {
        setPagamentoParceladoSelecionado(pagamento);
        setEditarParcelasVisible(true);
    };
    const [isCadastrarFuturoVisible, setCadastrarFuturoVisible] = useState(false);
    const [isCadastrarParceladoVisible, setCadastrarParceladoVisible] = useState(false);
    const [isEditarFuturoVisible, setEditarFuturoVisible] = useState(false);
    const [pagamentoFuturoSelecionado, setPagamentoFuturoSelecionado] = useState(null);
    
    // MUDANÇA 5: Funções de seleção
    const toggleSelecao = (tipo, id) => {
        setItensSelecionados(prev => {
            const exists = prev.find(item => item.tipo === tipo && item.id === id);
            if (exists) {
                return prev.filter(item => !(item.tipo === tipo && item.id === id));
            } else {
                return [...prev, { tipo, id }];
            }
        });
    };
    
    const isItemSelecionado = (tipo, id) => {
        return itensSelecionados.some(item => item.tipo === tipo && item.id === id);
    };
    
    const selecionarTodos = () => {
        const todos = [];
        
        // Pagamentos Futuros
        pagamentosFuturos.forEach(pag => {
            if (pag.status === 'Previsto') {
                todos.push({ tipo: 'futuro', id: pag.id });
            }
        });
        
        // Pagamentos de Serviço Pendentes
        pagamentosServicoPendentes.forEach(pag => {
            todos.push({ tipo: 'servico', id: pag.id });
        });
        
        // Parcelas
        pagamentosParcelados.forEach(pagParcelado => {
            pagParcelado.parcelas?.forEach(parcela => {
                if (parcela.status === 'Previsto') {
                    todos.push({ tipo: 'parcela', id: parcela.id });
                }
            });
        });
        
        setItensSelecionados(todos);
    };
    
    const desselecionarTodos = () => {
        setItensSelecionados([]);
    };
    
    // MUDANÇA 5: Handler para marcar múltiplos como pagos
    const handleMarcarMultiplosComoPago = async () => {
        if (itensSelecionados.length === 0) {
            alert('Selecione pelo menos um item para marcar como pago.');
            return;
        }
        
        try {
            const res = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        itens: itensSelecionados,
                        data_pagamento: new Date().toISOString().split('T')[0]
                    })
                }
            );
            
            if (res.ok) {
                const data = await res.json();
                const sucessos = data.resultados.filter(r => r.status === 'success').length;
                const erros = data.resultados.filter(r => r.status === 'error').length;
                
                alert(`${sucessos} item(ns) marcado(s) como pago. ${erros > 0 ? erros + ' erro(s).' : ''}`);
                setItensSelecionados([]);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao marcar itens como pagos:', error);
            alert('Erro ao processar pagamentos');
        }
    };

    // Carregar dados
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [futuroRes, parceladoRes, previsoesRes, servicoPendentesRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`),
                fetchWithAuth(`${API_URL}/sid/cronograma-financeiro/${obraId}/previsoes`),
                fetchWithAuth(`${API_URL}/obras/${obraId}/pagamentos-servico-pendentes`) // NOVO
            ]);

            if (futuroRes.ok) {
                const data = await futuroRes.json();
                setPagamentosFuturos(data);
            }

            if (parceladoRes.ok) {
                const data = await parceladoRes.json();
                // MUDANÇA 5: Buscar parcelas individuais para cada pagamento parcelado
                const parceladosComParcelas = await Promise.all(
                    data.map(async (pagParcelado) => {
                        try {
                            const parcelasRes = await fetchWithAuth(
                                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagParcelado.id}/parcelas`
                            );
                            if (parcelasRes.ok) {
                                const parcelas = await parcelasRes.json();
                                return { ...pagParcelado, parcelas };
                            }
                        } catch (err) {
                            console.error('Erro ao buscar parcelas:', err);
                        }
                        return { ...pagParcelado, parcelas: [] };
                    })
                );
                setPagamentosParcelados(parceladosComParcelas);
            }

            if (previsoesRes.ok) {
                const data = await previsoesRes.json();
                setPrevisoes(data);
            }
            
            // NOVO: Carregar pagamentos de serviço pendentes
            if (servicoPendentesRes.ok) {
                const data = await servicoPendentesRes.json();
                setPagamentosServicoPendentes(data);
            }
        } catch (error) {
            console.error('Erro ao carregar cronograma financeiro:', error);
            alert('Erro ao carregar dados do cronograma');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [obraId]);

    // Salvar Pagamento Futuro
    const handleSavePagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento futuro cadastrado com sucesso!');
                setCadastrarFuturoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar pagamento futuro:', error);
            alert('Erro ao salvar pagamento futuro');
        }
    };

    // Editar Pagamento Futuro
    const handleEditarPagamentoFuturo = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${pagamentoFuturoSelecionado.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento futuro atualizado com sucesso!');
                setEditarFuturoVisible(false);
                setPagamentoFuturoSelecionado(null);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao atualizar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao editar pagamento futuro:', error);
            alert('Erro ao editar pagamento futuro');
        }
    };

    // Salvar Pagamento Parcelado
    const handleSavePagamentoParcelado = async (formData) => {
        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados`,
                {
                    method: 'POST',
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                alert('Pagamento parcelado cadastrado com sucesso!');
                setCadastrarParceladoVisible(false);
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao cadastrar: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar pagamento parcelado:', error);
            alert('Erro ao salvar pagamento parcelado');
        }
    };

    // Deletar Pagamento Futuro
    const handleDeletePagamentoFuturo = async (id) => {
        if (!window.confirm('Deseja realmente excluir este pagamento futuro?')) return;

        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                alert('Pagamento futuro excluído com sucesso!');
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro ao excluir pagamento futuro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao deletar pagamento futuro:', error);
            alert('Erro ao deletar pagamento futuro: ' + error.message);
        }
    };

    // Marcar Pagamento Futuro Individual como Pago
    const handleMarcarPagamentoFuturoPago = async (id) => {
        if (!window.confirm('Deseja marcar este pagamento como pago?')) return;

        try {
            let res;
            const idStr = String(id);
            
            if (idStr.startsWith('servico-')) {
                // É um pagamento de serviço pendente "injetado" na lista
                const servPagId = parseInt(idStr.split('-').pop(), 10);
                console.log("Marcando pagamento de serviço futuro como pago:", servPagId);
                res = await fetchWithAuth(
                    `${API_URL}/obras/${obraId}/cronograma/marcar-multiplos-pagos`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            itens: [{ tipo: 'servico', id: servPagId }],
                            data_pagamento: new Date().toISOString().split('T')[0]
                        })
                    }
                );
            } else {
                // É um pagamento futuro "normal"
                console.log("Marcando pagamento futuro normal como pago:", id);
                res = await fetchWithAuth(
                    `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-futuros/${id}/marcar-pago`,
                    { method: 'POST' }
                );
            }

            if (res.ok) {
                alert('Pagamento marcado como pago!');
                // Importante pro item sumir do cronograma e entrar no histórico
                fetchData();
            } else {
                const errorData = await res.json();
                alert('Erro: ' + (errorData.erro || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao marcar pagamento como pago:', error);
            alert('Erro ao processar: ' + error.message);
        }
    };

    // Deletar Pagamento Parcelado
    const handleDeletePagamentoParcelado = async (id) => {
        if (!window.confirm('Deseja realmente excluir este pagamento parcelado?')) return;

        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${id}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                alert('Pagamento parcelado excluído com sucesso!');
                fetchData();
            } else {
                alert('Erro ao excluir pagamento parcelado');
            }
        } catch (error) {
            console.error('Erro ao deletar pagamento parcelado:', error);
            alert('Erro ao deletar pagamento parcelado');
        }
    };

    // Marcar parcela como paga
    const handleMarcarParcelaPaga = async (pagamento) => {
        const novasParcelas = pagamento.parcelas_pagas + 1;
        
        if (novasParcelas > pagamento.numero_parcelas) {
            alert('Todas as parcelas já foram pagas!');
            return;
        }

        try {
            const res = await fetchWithAuth(
                `${API_URL}/sid/cronograma-financeiro/${obraId}/pagamentos-parcelados/${pagamento.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ parcelas_pagas: novasParcelas })
                }
            );

            if (res.ok) {
                alert(`Parcela ${novasParcelas}/${pagamento.numero_parcelas} marcada como paga!`);
                fetchData();
            } else {
                alert('Erro ao marcar parcela como paga');
            }
        } catch (error) {
            console.error('Erro ao marcar parcela:', error);
            alert('Erro ao marcar parcela como paga');
        }
    };

    if (isLoading) {
        return <Modal onClose={onClose}><div className="loading-screen">Carregando cronograma...</div></Modal>;
    }

    const totalPrevisoes = previsoes.reduce((acc, prev) => acc + prev.valor, 0);

    return (
        <Modal onClose={onClose} customWidth="1000px">
            <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <h2>💰 Cronograma Financeiro - {obraNome}</h2>
                <QuadroAlertasVencimento obraId={obraId} /> 
                {/* Botões de Cadastro */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button 
                        onClick={() => setCadastrarFuturoVisible(true)} 
                        className="submit-btn"
                    >
                        ➕ Cadastrar Pagamento Futuro (Único)
                    </button>
                    <button 
                        onClick={() => setCadastrarParceladoVisible(true)} 
                        className="submit-btn"
                        style={{ backgroundColor: 'var(--cor-acento)' }}
                    >
                        ➕ Cadastrar Pagamento Parcelado
                    </button>
                    {itensSelecionados.length > 0 && (
                        <button 
                            onClick={handleMarcarMultiplosComoPago} 
                            className="inserir-btn"
                            style={{ backgroundColor: '#28a745' }}
                        >
                            ✓ Marcar {itensSelecionados.length} Selecionado(s) como Pago
                        </button>
                    )}
                </div>

                {/* Tabela de Previsões */}
                <div className="card-full" style={{ marginBottom: '20px' }}>
                    <h3>📊 Tabela de Previsões Mensais</h3>
                    <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '10px' }}>
                        Soma automática de pagamentos futuros e parcelados cadastrados no cronograma
                    </p>
                    
                    {previsoes.length > 0 ? (
                        <>
                            {/* DESKTOP: Tabela */}
                            <div className="desktop-only">
                                <table className="tabela-pendencias">
                                    <thead>
                                        <tr>
                                            <th>Mês</th>
                                            <th>Valor Previsto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previsoes.map((prev, index) => (
                                            <tr key={index}>
                                                <td><strong>{prev.mes_nome}</strong></td>
                                                <td>{formatCurrency(prev.valor)}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'var(--cor-primaria)', color: 'white', fontWeight: 'bold' }}>
                                            <td>TOTAL PREVISTO</td>
                                            <td>{formatCurrency(totalPrevisoes)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE: Cards */}
                            <div className="mobile-only">
                                {previsoes.map((prev, index) => (
                                    <div key={index} className="card-previsao">
                                        <div className="card-previsao-header">
                                            <span className="card-previsao-mes">{prev.mes_nome}</span>
                                        </div>
                                        <div className="card-previsao-valor">
                                            {formatCurrency(prev.valor)}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Card do Total */}
                                <div className="card-previsao card-previsao-total">
                                    <div className="card-previsao-header">
                                        <span className="card-previsao-mes">TOTAL PREVISTO</span>
                                    </div>
                                    <div className="card-previsao-valor">
                                        {formatCurrency(totalPrevisoes)}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p>Nenhuma previsão calculada. Cadastre pagamentos futuros ou parcelados.</p>
                    )}
                </div>

                {/* NOVO: Listagem de Pagamentos de Serviço Pendentes */}
                {pagamentosServicoPendentes.length > 0 && (
                    <div className="card-full" style={{ marginBottom: '20px', backgroundColor: '#fff3cd', border: '2px solid #ffc107' }}>
                        <h3>⚠️ Pagamentos de Serviço Pendentes</h3>
                        <p style={{ fontSize: '0.9em', color: '#856404', marginBottom: '15px' }}>
                            Estes são pagamentos vinculados a serviços que ainda não foram quitados totalmente.
                        </p>
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>✓</th>
                                    <th>Serviço</th>
                                    <th>Descrição</th>
                                    <th>Tipo</th>
                                    <th>Valor Total</th>
                                    <th>Pago</th>
                                    <th>Restante</th>
                                    <th>Prior.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosServicoPendentes.map(pag => (
                                    <tr key={pag.id}>
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={isItemSelecionado('servico', pag.id)}
                                                onChange={() => toggleSelecao('servico', pag.id)}
                                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                            />
                                        </td>
                                        <td><strong>{pag.servico_nome}</strong></td>
                                        <td>{pag.descricao}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.tipo_pagamento === 'Mão de Obra' ? '#007bff' : '#28a745',
                                                color: 'white'
                                            }}>
                                                {pag.tipo_pagamento}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(pag.valor_total)}</td>
                                        <td>{formatCurrency(pag.valor_pago)}</td>
                                        <td><strong>{formatCurrency(pag.valor_restante)}</strong></td>
                                        <td>
                                            <PrioridadeBadge prioridade={pag.prioridade} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Listagem de Pagamentos Futuros */}
                <div className="card-full" style={{ marginBottom: '20px' }}>
                    <h3>💵 Pagamentos Futuros (Únicos)</h3>
                    {pagamentosFuturos.length > 0 ? (
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>✓</th>
                                    <th>Descrição</th>
                                    <th>Fornecedor</th>
                                    <th>Vencimento</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosFuturos.map(pag => (
                                    <tr key={pag.id}>
                                        <td>
                                            {pag.status === 'Previsto' && (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isItemSelecionado('futuro', pag.id)}
                                                    onChange={() => toggleSelecao('futuro', pag.id)}
                                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                                />
                                            )}
                                        </td>
                                        <td>{pag.descricao}</td>
                                        <td>{pag.fornecedor || '-'}</td>
                                        <td>{new Date(pag.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td>{formatCurrency(pag.valor)}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.status === 'Previsto' ? '#17a2b8' : 
                                                               pag.status === 'Pago' ? '#28a745' : '#6c757d',
                                                color: 'white'
                                            }}>
                                                {pag.status}
                                            </span>
                                        </td>
                                        <td>
                                            {pag.status === 'Previsto' && (
                                                <>
                                                    <button
                                                        onClick={() => handleMarcarPagamentoFuturoPago(pag.id)}
                                                        className="inserir-btn"
                                                        style={{ padding: '5px 10px', fontSize: '0.85em', marginRight: '5px' }}
                                                        title="Marcar como Pago"
                                                    >
                                                        ✓ Pagar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setPagamentoFuturoSelecionado(pag);
                                                            setEditarFuturoVisible(true);
                                                        }}
                                                        className="submit-btn"
                                                        style={{ padding: '5px 10px', fontSize: '0.85em', marginRight: '5px', backgroundColor: '#6c757d' }}
                                                        title="Editar"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePagamentoFuturo(pag.id)}
                                                        className="voltar-btn"
                                                        style={{ padding: '5px 10px', fontSize: '0.85em' }}
                                                        title="Excluir"
                                                    >
                                                        🗑️ Excluir
                                                    </button>
                                                </>
                                            )}
                                            {pag.status === 'Pago' && (
                                                <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Pago</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Nenhum pagamento futuro cadastrado.</p>
                    )}
                </div>

                {/* Listagem de Pagamentos Parcelados */}
                <div className="card-full">
                    <h3>📋 Pagamentos Parcelados</h3>
                    {pagamentosParcelados.length > 0 ? (
                        <table className="tabela-pendencias">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Fornecedor</th>
                                    <th>Valor Total</th>
                                    <th>Parcelas</th>
                                    <th>Periodicidade</th>
                                    <th>Valor/Parcela</th>
                                    <th>1ª Parcela</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentosParcelados.map(pag => (
                                    <tr key={pag.id}>
                                        <td>{pag.descricao}</td>
                                        <td>{pag.fornecedor || '-'}</td>
                                        <td>{formatCurrency(pag.valor_total)}</td>
                                        <td>
                                            <strong>
                                                {pag.proxima_parcela_numero ? 
                                                    `${pag.proxima_parcela_numero}/${pag.numero_parcelas}` : 
                                                    `${pag.numero_parcelas}/${pag.numero_parcelas}`
                                                }
                                            </strong>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.periodicidade === 'Semanal' ? '#ffc107' : '#6c757d',
                                                color: 'white'
                                            }}>
                                                {pag.periodicidade || 'Mensal'}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(pag.valor_parcela)}</td>
                                        <td>
                                            {pag.proxima_parcela_vencimento ? 
                                                new Date(pag.proxima_parcela_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') :
                                                'Concluído'
                                            }
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.85em',
                                                backgroundColor: pag.status === 'Ativo' ? '#17a2b8' : 
                                                               pag.status === 'Concluído' ? '#28a745' : '#6c757d',
                                                color: 'white'
                                            }}>
                                                {pag.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                                                {pag.status === 'Ativo' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleMarcarParcelaPaga(pag)}
                                                            className="submit-btn"
                                                            style={{ padding: '5px 10px', fontSize: '0.85em' }}
                                                        >
                                                            ✓ Pagar Próxima Parcela
                                                        </button>
                                                        <button
                                                            onClick={() => handleAbrirEditarParcelas(pag)}
                                                            className="submit-btn"
                                                            style={{ padding: '5px 10px', fontSize: '0.85em', backgroundColor: '#6c757d' }}
                                                        >
                                                            ✏️ Editar Parcelas
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDeletePagamentoParcelado(pag.id)}
                                                    className="voltar-btn"
                                                    style={{ padding: '5px 10px', fontSize: '0.85em' }}
                                                >
                                                    🗑️ Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Nenhum pagamento parcelado cadastrado.</p>
                    )}
                </div>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button onClick={onClose} className="voltar-btn">Fechar</button>
                </div>
            </div>

            {/* Modais de Cadastro */}
            {isCadastrarFuturoVisible && (
                <CadastrarPagamentoFuturoModal
                    onClose={() => setCadastrarFuturoVisible(false)}
                    onSave={handleSavePagamentoFuturo}
                    obraId={obraId}
                />
            )}

            {isCadastrarParceladoVisible && (
                <CadastrarPagamentoParceladoModal
                    onClose={() => setCadastrarParceladoVisible(false)}
                    onSave={handleSavePagamentoParcelado}
                    obraId={obraId}
                />
                
            )}
            
            {isEditarFuturoVisible && pagamentoFuturoSelecionado && (
                <EditarPagamentoFuturoModal
                    onClose={() => {
                        setEditarFuturoVisible(false);
                        setPagamentoFuturoSelecionado(null);
                    }}
                    onSave={handleEditarPagamentoFuturo}
                    pagamento={pagamentoFuturoSelecionado}
                />
            )}
            
            {isEditarParcelasVisible && pagamentoParceladoSelecionado && (
                <EditarParcelasModal
                    obraId={obraId}
                    pagamentoParcelado={pagamentoParceladoSelecionado}
                    onClose={() => {
                        setEditarParcelasVisible(false);
                        setPagamentoParceladoSelecionado(null);
                    }}
                />
            )}
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