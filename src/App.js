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

// --- HELPER DA API (NOVO) ---
// Esta função agora faz TODOS os seus fetches
// 1. Pega o token do localStorage
// 2. Adiciona o header "Authorization: Bearer ..."
// 3. Se receber um erro 401 (Token inválido/expirado), força o logout
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json', // Garante que o Content-Type está setado
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Token inválido ou expirado
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Recarrega a página, forçando o usuário para a tela de login
        window.location.reload(); 
        // Retorna uma promessa rejeitada para parar a execução do código que chamou
        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};


// --- CONTEXTO DE AUTENTICAÇÃO (NOVO) ---
// Isso permite que todos os componentes saibam quem está logado
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// --- COMPONENTE DE LOGIN (NOVO) ---
const LoginScreen = () => {
    const { login } = useAuth(); // Pega a função 'login' do nosso contexto
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
            // 'data' aqui é { access_token: "...", user: {...} }
            login(data); // Chama a função do AuthContext para salvar o usuário
        })
        .catch(err => {
            console.error("Erro no login:", err);
            setError("Credenciais inválidas. Verifique seu usuário e senha.");
            setIsLoading(false);
        });
    };

    // Estilos inline simples para a tela de login
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


// --- SEUS COMPONENTES DE MODAL (Quase inalterados) ---
const Modal = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

const EditLancamentoModal = ({ lancamento, onClose, onSave }) => {
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
                {/* ... (Formulário do modal de edição de lançamento inalterado) ... */}
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

// MODAL DE DETALHES DA EMPREITADA (COM PERMISSÕES)
const EmpreitadaDetailsModal = ({ empreitada, onClose, onSave, fetchObraData, obraId }) => {
    // Pega o usuário do contexto
    const { user } = useAuth();
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
     useEffect(() => {
         if (empreitada) {
             setFormData({
                 ...empreitada,
                 valor_global: empreitada.valor_global || 0
             });
         } else {
             setFormData({});
         }
     }, [empreitada]);

    const handleChange = (e) => { const { name, value } = e.target; const finalValue = name === 'valor_global' ? parseFloat(value) || 0 : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };

    const handleDeletarPagamento = (pagamentoId) => {
        // ... (lógica fetchWithAuth) ...
        fetchWithAuth(`${API_URL}/empreitadas/${empreitada.id}/pagamentos/${pagamentoId}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao deletar');
            return res.json();
        })
        .then(() => {
             if (fetchObraData && obraId) {
                 fetchObraData(obraId); 
                 onClose();
             } else {
                 window.location.reload();
             }
        })
        .catch(error => console.error('Erro:', error));
    };

    const handleDeletarEmpreitada = () => {
        // ... (lógica fetchWithAuth) ...
        fetchWithAuth(`${API_URL}/empreitadas/${empreitada.id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao deletar');
            return res.json();
        })
        .then(() => {
             if (fetchObraData && obraId) {
                 fetchObraData(obraId);
                 onClose();
             } else {
                 window.location.reload();
             }
        })
        .catch(error => console.error('Erro:', error));
    };

    if (!empreitada) return null;

    return (
        <Modal onClose={onClose}>
            {!isEditing ? (
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>{empreitada.nome}</h2>
                        {/* --- PERMISSÃO: Apenas Admin pode deletar empreitada --- */}
                        {user.role === 'administrador' && (
                            <button
                                onClick={handleDeletarEmpreitada}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: '#dc3545', padding: '5px' }}
                                title="Excluir Empreitada"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                    {/* ... (Resto do modal de detalhes) ... */}
                    <p><strong>Responsável:</strong> {empreitada.responsavel || 'N/A'}</p>
                    <p><strong>Valor Global:</strong> {formatCurrency(empreitada.valor_global)}</p>
                    <p><strong>Chave PIX:</strong> {empreitada.pix || 'N/A'}</p>
                    <hr />
                    <h3>Histórico de Pagamentos</h3>
                    <table className="tabela-pagamentos" style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Valor</th>
                                <th>Status</th>
                                {/* --- PERMISSÃO: Esconde coluna de Ações se não for Admin --- */}
                                {user.role === 'administrador' && <th style={{width: '80px'}}>Ações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {empreitada.pagamentos && empreitada.pagamentos.length > 0 ? (
                                empreitada.pagamentos.map((pag) => (
                                    <tr key={pag.id}>
                                        <td>{pag.data ? new Date(pag.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Inválida'}</td>
                                        <td>{formatCurrency(pag.valor)}</td>
                                        <td>
                                            <span style={{
                                                backgroundColor: pag.status === 'Pago' ? 'var(--cor-verde)' : 'var(--cor-vermelho)',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.8em',
                                                fontWeight: '500',
                                                textTransform: 'uppercase'
                                            }}>
                                                {pag.status}
                                            </span>
                                        </td>
                                        {/* --- PERMISSÃO: Apenas Admin pode deletar pagamento --- */}
                                        {user.role === 'administrador' && (
                                            <td style={{textAlign: 'center'}}>
                                                <button
                                                    onClick={() => handleDeletarPagamento(pag.id)}
                                                    className="acao-icon-btn delete-btn"
                                                    title="Excluir Pagamento"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: '5px', color: '#dc3545' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                             ) : (
                                <tr>
                                    <td colSpan={user.role === 'administrador' ? 4 : 3} style={{textAlign: 'center'}}>Nenhum pagamento realizado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {/* --- PERMISSÃO: Admin e Master podem editar --- */}
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <div className="form-actions" style={{marginTop: '20px'}}>
                            <button type="button" onClick={() => setIsEditing(true)} className="submit-btn">
                                Editar Empreitada
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {/* ... (Formulário de edição de empreitada inalterado) ... */}
                    <h2>Editar Empreitada</h2>
                    <div className="form-group"><label>Descrição</label><input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" value={formData.responsavel || ''} onChange={handleChange} /></div>
                    <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" value={formData.valor_global || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div>
                    <div className="form-actions"><button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
                </form>
            )}
        </Modal>
    );
};

// --- COMPONENTE DO DASHBOARD (Seu App.js antigo, agora renomeado) ---
function Dashboard() {
    // Pega o usuário e a função de logout do Contexto de Autenticação
    const { user, logout } = useAuth();

    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [empreitadas, setEmpreitadas] = useState([]);
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddEmpreitadaModalVisible, setAddEmpreitadaModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingEmpreitada, setViewingEmpreitada] = useState(null);

    // Efeito para buscar obras
    useEffect(() => {
        console.log("Buscando lista de obras...");
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Obras recebidas:", data);
                setObras(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                console.error("Erro ao buscar obras:", error);
                setObras([]);
            });
    }, []); // Dependência vazia, roda apenas uma vez

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        console.log(`Buscando dados da obra ID: ${obraId}`);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras/${obraId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Dados da obra recebidos:", data);
                setObraSelecionada(data.obra || null);
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                const empreitadasComPagamentosArray = (Array.isArray(data.empreitadas) ? data.empreitadas : []).map(emp => ({
                    ...emp,
                    pagamentos: Array.isArray(emp.pagamentos) ? emp.pagamentos : []
                }));
                setEmpreitadas(empreitadasComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
            })
            .catch(error => {
                console.error(`Erro ao buscar dados da obra ${obraId}:`, error);
                setObraSelecionada(null);
                setLancamentos([]);
                setEmpreitadas([]);
                setSumarios(null);
            })
            .finally(() => setIsLoading(false));
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    // (Todas as funções de CRUD agora usam 'fetchWithAuth')

    const handleAddObra = (e) => {
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        console.log("Adicionando nova obra:", { nome, cliente });
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras`, {
            method: 'POST',
            body: JSON.stringify({ nome, cliente })
        })
        .then(res => {
            if (!res.ok) {
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao adicionar obra') });
            }
            return res.json();
        })
        .then(novaObra => {
            console.log("Obra adicionada:", novaObra);
            setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome)));
            e.target.reset();
        })
        .catch(error => console.error('Erro ao adicionar obra:', error));
    };

    const handleDeletarObra = (obraId, obraNome) => {
        console.log(`Solicitando deleção da obra ID: ${obraId}.`);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao deletar obra') });
            }
            return res.json();
        })
        .then(() => {
            console.log("Obra deletada:", obraId);
            setObras(prevObras => prevObras.filter(o => o.id !== obraId));
        })
        .catch(error => console.error('Erro ao deletar obra:', error));
    };

    const handleMarcarComoPago = (itemId) => {
        const isPayment = String(itemId).startsWith('emp-pag-');
        const actualId = String(itemId).split('-').pop(); 

        if (isPayment) {
            // Não implementado aqui (ainda)
        } else {
             console.log("Marcando lançamento geral como pago:", actualId);
             // --- API ATUALIZADA ---
             fetchWithAuth(`${API_URL}/lancamentos/${actualId}/pago`, { method: 'PATCH' })
                 .then(res => {
                     if (!res.ok) {
                         return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao marcar como pago') });
                     }
                     return res.json();
                 })
                 .then(() => fetchObraData(obraSelecionada.id))
                 .catch(error => console.error("Erro ao marcar como pago:", error));
        }
    };


    const handleDeletarLancamento = (itemId) => {
         const isPayment = String(itemId).startsWith('emp-pag-');
         const actualId = String(itemId).split('-').pop();

        if (isPayment) {
             // Não implementado aqui (ainda)
        } else {
            console.log("Deletando lançamento geral:", actualId);
            // --- API ATUALIZADA ---
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) {
                        return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao deletar lançamento') });
                    }
                    return res.json();
                })
                .then(() => {
                    fetchObraData(obraSelecionada.id);
                })
                .catch(error => console.error('Erro ao deletar lançamento:', error));
        }
    };

    const handleEditLancamento = (item) => {
        if (item.isEmpreitadaPayment) {
             console.log("Edição de pagamento de empreitada deve ser feita no modal da empreitada:", item.uniqueId);
        } else {
            setEditingLancamento(item);
        }
    };

    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { ...updatedLancamento, valor: parseFloat(updatedLancamento.valor) || 0 };
        console.log("Salvando edição do lançamento:", dataToSend.id);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/lancamentos/${dataToSend.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => {
             if (!res.ok) {
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao salvar edição') });
             }
             return res.json();
         })
        .then(() => {
            setEditingLancamento(null);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar edição:", error));
    };

    const handleSaveLancamento = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const lancamentoData = Object.fromEntries(formData.entries());
        lancamentoData.data = getTodayString();
        lancamentoData.valor = parseFloat(lancamentoData.valor) || 0;
        lancamentoData.pix = lancamentoData.pix || null;
        console.log("Salvando novo lançamento:", lancamentoData);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => {
             if (!res.ok) {
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao salvar lançamento') });
             }
             return res.json();
        })
        .then(() => {
            setAddLancamentoModalVisible(false);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar lançamento:", error));
    };

    const handleSaveEmpreitada = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const empreitadaData = Object.fromEntries(formData.entries());
        empreitadaData.valor_global = parseFloat(empreitadaData.valor_global) || 0;
        empreitadaData.responsavel = empreitadaData.responsavel || null;
        empreitadaData.pix = empreitadaData.pix || null;
        console.log("Salvando nova empreitada:", empreitadaData);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/empreitadas`, {
            method: 'POST',
            body: JSON.stringify(empreitadaData)
        }).then(res => {
             if (!res.ok) {
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao salvar empreitada') });
             }
             return res.json();
        })
        .then(() => {
            setAddEmpreitadaModalVisible(false);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar empreitada:", error));
    };

    const handleSaveEditEmpreitada = (updatedEmpreitada) => {
        const dataToSend = {
            ...updatedEmpreitada,
            valor_global: parseFloat(updatedEmpreitada.valor_global) || 0,
            responsavel: updatedEmpreitada.responsavel || null,
            pix: updatedEmpreitada.pix || null
        };
        console.log("Salvando edição da empreitada:", dataToSend.id);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/empreitadas/${dataToSend.id}`, {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao salvar edição da empreitada') });
            }
            return res.json();
        })
        .then(() => {
            setViewingEmpreitada(null);
            fetchObraData(obraSelecionada.id);
        }).catch(error => console.error("Erro ao salvar edição da empreitada:", error));
    };

    const handleAddPagamentoParcial = (e, empreitadaId) => {
        e.preventDefault();
        const valorPagamento = e.target.valorPagamento.value;
        const statusPagamento = e.target.statusPagamento.value;
        if (!valorPagamento) return;
        const pagamento = {
            valor: parseFloat(valorPagamento) || 0,
            data: getTodayString(),
            status: statusPagamento
        };
        console.log("Adicionando pagamento parcial:", pagamento);
        // --- API ATUALIZADA ---
        fetchWithAuth(`${API_URL}/empreitadas/${empreitadaId}/pagamentos`, {
            method: 'POST',
            body: JSON.stringify(pagamento)
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao adicionar pagamento') });
            }
            return res.json();
        })
        .then((empreitadaAtualizada) => {
             setEmpreitadas(prevEmpreitadas =>
                 prevEmpreitadas.map(emp =>
                     emp.id === empreitadaId ? empreitadaAtualizada : emp
                 )
             );
             if (viewingEmpreitada && viewingEmpreitada.id === empreitadaId) {
                 setViewingEmpreitada(empreitadaAtualizada);
             }
             e.target.reset();
             fetchObraData(obraSelecionada.id);
        })
        .catch(error => console.error("Erro ao adicionar pagamento:", error));
    };

     // Lógica do histórico permanece a mesma
     const historicoCompleto = useMemo(() => {
         const safeLancamentos = Array.isArray(lancamentos) ? lancamentos : [];
         const safeEmpreitadas = Array.isArray(empreitadas) ? empreitadas : [];
         const gastosGerais = safeLancamentos.map(lanc => ({
             ...lanc,
             isEmpreitadaPayment: false,
             uniqueId: `lanc-${lanc.id}`
         }));
         const pagamentosEmpreitada = safeEmpreitadas.flatMap(emp =>
             (Array.isArray(emp.pagamentos) ? emp.pagamentos : []).map(pag => ({
                 id: pag.id,
                 data: pag.data,
                 valor: pag.valor,
                 status: pag.status,
                 descricao: `Pagamento: ${emp.nome || 'Empreitada s/ nome'}`,
                 tipo: 'Empreitada',
                 pix: emp.pix || '',
                 isEmpreitadaPayment: true,
                 uniqueId: `emp-pag-${pag.id}`
             }))
         );
         const combinado = [...gastosGerais, ...pagamentosEmpreitada];
         combinado.sort((a, b) => {
             const dateA = a.data ? new Date(a.data) : new Date(0);
             const dateB = b.data ? new Date(b.data) : new Date(0);
             if (dateB - dateA === 0) {
                 const idA = a.uniqueId;
                 const idB = b.uniqueId;
                 if (idA < idB) return -1;
                 if (idA > idB) return 1;
                 return 0;
             }
             return dateB - dateA;
         });

         return combinado;
     }, [lancamentos, empreitadas]);


    // --- RENDERIZAÇÃO ---
    
    // TELA DE SELEÇÃO DE OBRAS (COM PERMISSÕES)
    if (!obraSelecionada) {
        return (
            <div className="container">
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    {/* --- NOVO: Botão de Logout --- */}
                    <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                </header>

                {/* --- PERMISSÃO: Apenas Admin pode cadastrar obras --- */}
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
                                {/* --- PERMISSÃO: Apenas Admin pode deletar obras --- */}
                                {user.role === 'administrador' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletarObra(obra.id, obra.nome);
                                        }}
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

    // TELA PRINCIPAL DO DASHBOARD (COM PERMISSÕES)
    return (
        <div className="dashboard-container">
            {/* --- Modais --- */}
            {editingLancamento && <EditLancamentoModal lancamento={editingLancamento} onClose={() => setEditingLancamento(null)} onSave={handleSaveEdit} />}
            {isAddEmpreitadaModalVisible && (
                <Modal onClose={() => setAddEmpreitadaModalVisible(false)}>
                    <h2>Cadastrar Nova Empreitada</h2>
                    <form onSubmit={handleSaveEmpreitada}>
                        {/* ... (Formulário de nova empreitada) ... */}
                        <div className="form-group"><label>Descrição da Contratação</label><input type="text" name="nome" placeholder="Ex: Serviço de Pintura" required /></div>
                        <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" placeholder="Ex: Carlos (Pintor)" /></div>
                        <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" placeholder="10000.00" required /></div>
                        <div className="form-group"><label>Dados de Pagamento (PIX)</label><input type="text" name="pix" placeholder="Email, Celular, etc." /></div>
                        <div className="form-actions"><button type="button" onClick={() => setAddEmpreitadaModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Empreitada</button></div>
                    </form>
                </Modal>
            )}
            {isAddLancamentoModalVisible && (
                <Modal onClose={() => setAddLancamentoModalVisible(false)}>
                    <h2>Adicionar Novo Gasto</h2>
                    <form onSubmit={handleSaveLancamento}>
                        {/* ... (Formulário de novo gasto) ... */}
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
             {viewingEmpreitada && <EmpreitadaDetailsModal
                                     empreitada={viewingEmpreitada}
                                     onClose={() => setViewingEmpreitada(null)}
                                     onSave={handleSaveEditEmpreitada}
                                     fetchObraData={fetchObraData}
                                     obraId={obraSelecionada.id}
                                 />}


            {/* --- Cabeçalho (com botão de Sair) --- */}
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


            {/* --- Empreitadas (com permissões) --- */}
            <div className="card-full">
                 <div className="card-header">
                    <h3>Empreitadas</h3>
                    {/* --- PERMISSÃO: Admin e Master podem adicionar --- */}
                    {(user.role === 'administrador' || user.role === 'master') && (
                        <button className="acao-btn add-btn" onClick={() => setAddEmpreitadaModalVisible(true)}>+ Nova Empreitada</button>
                    )}
                </div>
                <div className="lista-empreitadas">
                    {(Array.isArray(empreitadas) ? empreitadas : []).length > 0 ? (Array.isArray(empreitadas) ? empreitadas : []).map(emp => {
                        const safePagamentos = Array.isArray(emp.pagamentos) ? emp.pagamentos : [];
                        const valorPago = safePagamentos.filter(p => p.status === 'Pago').reduce((total, pag) => total + (pag.valor || 0), 0);
                        const valorGlobalNum = emp.valor_global || 0;
                        const progresso = valorGlobalNum > 0 ? (valorPago / valorGlobalNum) * 100 : 0;
                        return (
                            <div key={emp.id} className="card-empreitada-item">
                                <div onClick={() => setViewingEmpreitada(emp)}>
                                    <div className="empreitada-header"><h4>{emp.nome}</h4><span>{formatCurrency(valorGlobalNum)}</span></div>
                                    <small>Responsável: {emp.responsavel || 'N/A'}</small>
                                    <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${progresso}%` }}></div></div>
                                    <div className="empreitada-sumario"><span>Pago: {formatCurrency(valorPago)}</span><span>Restante: {formatCurrency(valorGlobalNum - valorPago)}</span><span>{progresso.toFixed(1)}%</span></div>
                                </div>
                                {/* --- PERMISSÃO: Admin e Master podem adicionar pagamento --- */}
                                {(user.role === 'administrador' || user.role === 'master') && (
                                    <form onSubmit={(e) => handleAddPagamentoParcial(e, emp.id)} className="form-pagamento-parcial" onClick={e => e.stopPropagation()}>
                                        <input type="number" step="0.01" name="valorPagamento" placeholder="Valor do Pagamento" required style={{flex: 2}} />
                                        <select name="statusPagamento" defaultValue="Pago" required style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                            <option value="Pago">Pago</option>
                                            <option value="A Pagar">A Pagar</option>
                                        </select>
                                        <button type="submit">Adicionar</button>
                                    </form>
                                )}
                            </div>
                        );
                    }) : <p>Nenhuma empreitada cadastrada.</p>}
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
                                    {/* --- PERMISSÃO: Admin e Master podem marcar como pago --- */}
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


            {/* --- Histórico de Gastos (com permissões) --- */}
            <div className="card-full">
                <div className="card-header"><h3>Histórico Completo (Gastos e Pag. Empreitadas)</h3>
                    <div className="header-actions">
                        {/* --- PERMISSÃO: Admin e Master podem adicionar gasto --- */}
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
                        {/* Usando o histórico unificado que vem do backend */}
                        {historicoUnificado.map(item => (
                            <tr key={item.id}> {/* item.id agora é 'lanc-1' ou 'emp-pag-1' */}
                                <td>{new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td>
                                    {item.descricao}
                                    {item.tipo_registro === 'pagamento_empreitada' && (
                                        <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '0.75em', fontWeight: '500' }}>
                                            EMPREITADA
                                        </span>
                                    )}
                                </td>
                                <td>{item.tipo}</td>
                                <td className="status-cell">
                                    {item.status === 'A Pagar' ? (
                                        /* --- PERMISSÃO: Admin e Master podem pagar --- */
                                        (user.role === 'administrador' || user.role === 'master') ? (
                                            <button 
                                                onClick={() => handleMarcarComoPago(item.id)} 
                                                className="quick-pay-btn" 
                                                title="Marcar como Pago"
                                                disabled={item.tipo_registro === 'pagamento_empreitada'}
                                            >
                                                A Pagar ✓
                                            </button>
                                        ) : (
                                            <span className="status" style={{backgroundColor: 'var(--cor-vermelho)'}}>A Pagar</span>
                                        )
                                    ) : (
                                        <span className="status pago">Pago</span>
                                    )}
                                </td>
                                <td>{formatCurrency(item.valor)}</td>
                                <td className="acoes-cell">
                                    {item.tipo_registro === 'lancamento' ? (
                                        <>
                                            {/* --- PERMISSÃO: Admin e Master podem editar --- */}
                                            {(user.role === 'administrador' || user.role === 'master') && (
                                                <button 
                                                    onClick={() => handleEditLancamento(item)} 
                                                    className="acao-icon-btn edit-btn" 
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            {/* --- PERMISSÃO: Apenas Admin pode deletar --- */}
                                            {user.role === 'administrador' && (
                                                <button 
                                                    onClick={() => handleDeletarLancamento(item.id)} 
                                                    className="acao-icon-btn delete-btn" 
                                                    title="Excluir"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{fontSize: '0.85em', color: '#666'}}>
                                            Ver na empreitada
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

// --- COMPONENTE PRINCIPAL (ROTEADOR) ---
// Este é o novo componente 'App' principal
// Ele gerencia o estado de autenticação e decide qual tela mostrar
function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Adiciona estado de carregamento

    // Efeito para verificar o localStorage na inicialização
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
            // Limpa em caso de dados corrompidos
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        setIsLoading(false); // Termina o carregamento
    }, []);

    // Função de Login
    const login = (data) => {
        // data = { access_token, user }
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    // Função de Logout
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // Se estiver carregando (verificando o token), mostra uma tela em branco
    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    // O Provider "fornece" o usuário, token, login e logout para todos os componentes filhos
    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {user ? <Dashboard /> : <LoginScreen />}
        </AuthContext.Provider>
    );
}

export default App;