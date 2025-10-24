import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://backend-production-78c9.up.railway.app';
const getTodayString = () => { const today = new Date(); const offset = today.getTimezoneOffset(); const todayWithOffset = new Date(today.getTime() - (offset * 60 * 1000)); return todayWithOffset.toISOString().split('T')[0]; }
const formatCurrency = (value) => { if (typeof value !== 'number') { value = 0; } return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };

// --- COMPONENTES DE MODAL (POP-UP) ---
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
    useEffect(() => { setFormData(lancamento || {}); }, [lancamento]);
    const handleChange = (e) => { const { name, value } = e.target; const finalValue = name === 'valor' ? parseFloat(value) || 0 : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    if (!lancamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Lançamento</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Data</label><input type="date" name="data" value={formData.data || ''} onChange={handleChange} required /></div>
                <div className="form-group"><label>Descrição</label><input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required /></div>
                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} required /></div>
                <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required /></div>
                <div className="form-group"><label>Tipo/Segmento</label><select name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required><option>Mão de Obra</option><option>Serviço</option><option>Material</option></select></div>
                <div className="form-group"><label>Status</label><select name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required><option>A Pagar</option><option>Pago</option></select></div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
            </form>
        </Modal>
    );
};

const EmpreitadaDetailsModal = ({ empreitada, onClose, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(empreitada);
    useEffect(() => { setFormData(empreitada); }, [empreitada]);
    const handleChange = (e) => { const { name, value } = e.target; const finalValue = name === 'valor_global' ? parseFloat(value) || 0 : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };
    
    const handleDeletarPagamento = (pagamentoId) => {
        if (window.confirm("Tem certeza que deseja excluir este pagamento?")) {
            fetch(`${API_URL}/empreitadas/${empreitada.id}/pagamentos/${pagamentoId}`, { 
                method: 'DELETE' 
            })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao deletar');
                return res.json();
            })
            .then(() => {
                window.location.reload();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao deletar o pagamento. Tente novamente.');
            });
        }
    };

    const handleDeletarEmpreitada = () => {
        if (window.confirm(`Tem certeza que deseja excluir a empreitada "${empreitada.nome}"?\n\nTodos os pagamentos serão perdidos!`)) {
            fetch(`${API_URL}/empreitadas/${empreitada.id}`, { 
                method: 'DELETE' 
            })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao deletar');
                return res.json();
            })
            .then(() => {
                window.location.reload();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao deletar a empreitada. Tente novamente.');
            });
        }
    };
    
    if (!empreitada) return null;

    return (
        <Modal onClose={onClose}>
            {!isEditing ? (
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>{empreitada.nome}</h2>
                        <button 
                            onClick={handleDeletarEmpreitada}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.5em',
                                color: '#dc3545',
                                padding: '5px'
                            }}
                            title="Excluir Empreitada"
                        >
                            🗑️
                        </button>
                    </div>
                    <p><strong>Responsável:</strong> {empreitada.responsavel}</p>
                    <p><strong>Valor Global:</strong> {formatCurrency(empreitada.valor_global)}</p>
                    <p><strong>Chave PIX:</strong> {empreitada.pix}</p>
                    <hr />
                    <h3>Histórico de Pagamentos</h3>
                    <table className="tabela-pagamentos" style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th style={{width: '80px'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empreitada.pagamentos.map((pag) => (
                                <tr key={pag.id}>
                                    <td>{new Date(pag.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}</td>
                                    <td>{formatCurrency(pag.valor)}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: pag.status === 'Pago' ? '#28a745' : '#dc3545',
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
                                    <td style={{textAlign: 'center'}}>
                                        <button 
                                            onClick={() => handleDeletarPagamento(pag.id)}
                                            className="acao-icon-btn delete-btn"
                                            title="Excluir Pagamento"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.2em',
                                                padding: '5px',
                                                color: '#dc3545'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {empreitada.pagamentos.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{textAlign: 'center'}}>Nenhum pagamento realizado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="form-actions" style={{marginTop: '20px'}}>
                        <button type="button" onClick={() => setIsEditing(true)} className="submit-btn">
                            Editar Empreitada
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <h2>Editar Empreitada</h2>
                    <div className="form-group"><label>Descrição</label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" value={formData.responsavel} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" value={formData.valor_global} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix} onChange={handleChange} required /></div>
                    <div className="form-actions"><button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
                </form>
            )}
        </Modal>
    );
};

// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---
function App() {
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [empreitadas, setEmpreitadas] = useState([]);
    const [sumarios, setSumarios] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddEmpreitadaModalVisible, setAddEmpreitadaModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingEmpreitada, setViewingEmpreitada] = useState(null);

    useEffect(() => { fetch(`${API_URL}/obras`).then(res => res.json()).then(data => setObras(data)).catch(console.error); }, []);

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        fetch(`${API_URL}/obras/${obraId}`).then(res => res.json()).then(data => {
            setObraSelecionada(data.obra);
            setLancamentos(data.lancamentos);
            setEmpreitadas(data.empreitadas);
            setSumarios(data.sumarios);
        }).catch(console.error).finally(() => setIsLoading(false));
    };
    
    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => { 
        e.preventDefault(); 
        const nome = e.target.nome.value; 
        const cliente = e.target.cliente.value; 
        fetch(`${API_URL}/obras`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nome, cliente }) 
        })
        .then(res => res.json())
        .then(novaObra => { 
            setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); 
            e.target.reset(); 
        })
        .catch(error => {
            console.error('Erro ao adicionar obra:', error);
            alert('Erro ao adicionar obra. Tente novamente.');
        });
    };
    
    const handleDeletarObra = (obraId, obraNome) => {
        if (window.confirm(`Tem certeza que deseja excluir a obra "${obraNome}"?\n\nATENÇÃO: Todos os lançamentos e empreitadas serão perdidos!`)) {
            fetch(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Erro ao deletar');
                return res.json();
            })
            .then(() => {
                setObras(prevObras => prevObras.filter(o => o.id !== obraId));
                alert('Obra deletada com sucesso!');
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao deletar a obra. Tente novamente.');
            });
        }
    };
    
    const handleMarcarComoPago = (lancamentoId) => fetch(`${API_URL}/lancamentos/${lancamentoId}/pago`, { method: 'PATCH' }).then(() => fetchObraData(obraSelecionada.id));
    
    const handleDeletarLancamento = (lancamentoId) => { 
        if (window.confirm("Tem certeza que deseja excluir este lançamento?")) { 
            fetch(`${API_URL}/lancamentos/${lancamentoId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error('Erro ao deletar');
                    return res.json();
                })
                .then(() => {
                    fetchObraData(obraSelecionada.id);
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('Erro ao deletar o lançamento. Tente novamente.');
                });
        } 
    };
    
    const handleSaveEdit = (updatedLancamento) => { 
        fetch(`${API_URL}/lancamentos/${updatedLancamento.id}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updatedLancamento) 
        }).then(() => { 
            setEditingLancamento(null); 
            fetchObraData(obraSelecionada.id); 
        }); 
    };
    
    const handleSaveLancamento = (e) => { 
        e.preventDefault(); 
        const formData = new FormData(e.target); 
        const lancamentoData = Object.fromEntries(formData.entries()); 
        lancamentoData.data = getTodayString(); 
        fetch(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(lancamentoData) 
        }).then(() => { 
            setAddLancamentoModalVisible(false); 
            fetchObraData(obraSelecionada.id); 
        }); 
    };
    
    const handleSaveEmpreitada = (e) => { 
        e.preventDefault(); 
        const formData = new FormData(e.target); 
        const empreitadaData = Object.fromEntries(formData.entries()); 
        fetch(`${API_URL}/obras/${obraSelecionada.id}/empreitadas`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(empreitadaData) 
        }).then(() => { 
            setAddEmpreitadaModalVisible(false); 
            fetchObraData(obraSelecionada.id); 
        }); 
    };
    
    const handleSaveEditEmpreitada = (updatedEmpreitada) => { 
        fetch(`${API_URL}/empreitadas/${updatedEmpreitada.id}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updatedEmpreitada) 
        }).then(() => { 
            setViewingEmpreitada(null); 
            fetchObraData(obraSelecionada.id); 
        }); 
    };
    
    const handleAddPagamentoParcial = (e, empreitadaId) => { 
        e.preventDefault(); 
        const valorPagamento = e.target.valorPagamento.value;
        const statusPagamento = e.target.statusPagamento.value;
        if (!valorPagamento) return; 
        const pagamento = { 
            valor: valorPagamento, 
            data: getTodayString(),
            status: statusPagamento
        }; 
        fetch(`${API_URL}/empreitadas/${empreitadaId}/pagamentos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(pagamento) 
        }).then(() => fetchObraData(obraSelecionada.id)); 
        e.target.reset(); 
    };

    // --- RENDERIZAÇÃO ---
    if (!obraSelecionada) {
        return (
            <div className="container">
                <h1>Minhas Obras</h1>
                <div className="card-full">
                    <h3>Cadastrar Nova Obra</h3>
                    <form onSubmit={handleAddObra} className="form-add-obra">
                        <input type="text" name="nome" placeholder="Nome da Obra" required />
                        <input type="text" name="cliente" placeholder="Nome do Cliente" />
                        <button type="submit" className="submit-btn">Adicionar Obra</button>
                    </form>
                </div>
                <div className="lista-obras">
                    {obras.map(obra => (
                        <div key={obra.id} className="card-obra" style={{position: 'relative'}}>
                            <div onClick={() => fetchObraData(obra.id)} style={{cursor: 'pointer', paddingRight: '40px'}}>
                                <h3>{obra.nome}</h3>
                                <p>Cliente: {obra.cliente}</p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletarObra(obra.id, obra.nome);
                                }}
                                className="acao-icon-btn delete-btn"
                                style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    fontSize: '1.3em',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: 0.6
                                }}
                                title="Excluir Obra"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                    {obras.length === 0 && <p>Nenhuma obra cadastrada ainda. Use o formulário acima para começar.</p>}
                </div>
            </div>
        );
    }

    if (isLoading || !sumarios) { return <div className="loading-screen">Carregando...</div>; }
    
    const pagamentosPendentes = lancamentos.filter(l => l.status === 'A Pagar');

    return (
        <div className="dashboard-container">
            {editingLancamento && <EditLancamentoModal lancamento={editingLancamento} onClose={() => setEditingLancamento(null)} onSave={handleSaveEdit} />}
            {isAddEmpreitadaModalVisible && (
                <Modal onClose={() => setAddEmpreitadaModalVisible(false)}>
                    <h2>Cadastrar Nova Empreitada</h2>
                    <form onSubmit={handleSaveEmpreitada}>
                        <div className="form-group"><label>Descrição da Contratação</label><input type="text" name="nome" placeholder="Ex: Serviço de Pintura" required /></div>
                        <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" placeholder="Ex: Carlos (Pintor)" required /></div>
                        <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" placeholder="10000.00" required /></div>
                        <div className="form-group"><label>Dados de Pagamento (PIX)</label><input type="text" name="pix" placeholder="Email, Celular, etc." required /></div>
                        <div className="form-actions"><button type="button" onClick={() => setAddEmpreitadaModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Empreitada</button></div>
                    </form>
                </Modal>
            )}
            {isAddLancamentoModalVisible && (
                <Modal onClose={() => setAddLancamentoModalVisible(false)}>
                    <h2>Adicionar Novo Gasto</h2>
                    <form onSubmit={handleSaveLancamento}>
                        <div className="form-group"><label>Descrição</label><input type="text" name="descricao" required /></div>
                        <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" required /></div>
                        <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" required /></div>
                        <div className="form-group"><label>Tipo/Segmento</label><select name="tipo" defaultValue="Mão de Obra" required><option>Mão de Obra</option><option>Serviço</option><option>Material</option></select></div>
                        <div className="form-group"><label>Status</label><select name="status" defaultValue="A Pagar" required><option>A Pagar</option><option>Pago</option></select></div>
                        <div className="form-actions"><button type="button" onClick={() => setAddLancamentoModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
                    </form>
                </Modal>
            )}
            {viewingEmpreitada && <EmpreitadaDetailsModal empreitada={viewingEmpreitada} onClose={() => setViewingEmpreitada(null)} onSave={handleSaveEditEmpreitada} />}

            <header className="dashboard-header"><div><h1>{obraSelecionada.nome}</h1><p>Cliente: {obraSelecionada.cliente}</p></div><button onClick={() => setObraSelecionada(null)} className="voltar-btn">&larr; Ver Todas as Obras</button></header>
            <div className="kpi-grid"><div className="kpi-card total-geral"><span>Total Geral</span><h2>{formatCurrency(sumarios.total_geral)}</h2></div><div className="kpi-card total-pago"><span>Total Pago</span><h2>{formatCurrency(sumarios.total_pago)}</h2></div><div className="kpi-card total-a-pagar"><span>Total a Pagar</span><h2>{formatCurrency(sumarios.total_a_pagar)}</h2><small>{pagamentosPendentes.length} pendência(s)</small></div></div>
            
            <div className="card-full">
                 <div className="card-header"><h3>Empreitadas</h3><button className="acao-btn add-btn" onClick={() => setAddEmpreitadaModalVisible(true)}>+ Nova Empreitada</button></div>
                <div className="lista-empreitadas">
                    {empreitadas.length > 0 ? empreitadas.map(emp => {
                        const valorPago = emp.pagamentos.filter(p => p.status === 'Pago').reduce((total, pag) => total + pag.valor, 0);
                        const progresso = emp.valor_global > 0 ? (valorPago / emp.valor_global) * 100 : 0;
                        return (
                            <div key={emp.id} className="card-empreitada-item" onClick={() => setViewingEmpreitada(emp)}>
                                <div className="empreitada-header"><h4>{emp.nome}</h4><span>{formatCurrency(emp.valor_global)}</span></div>
                                <small>Responsável: {emp.responsavel}</small>
                                <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${progresso}%` }}></div></div>
                                <div className="empreitada-sumario"><span>Pago: {formatCurrency(valorPago)}</span><span>Restante: {formatCurrency(emp.valor_global - valorPago)}</span><span>{progresso.toFixed(1)}%</span></div>
                                <form onSubmit={(e) => handleAddPagamentoParcial(e, emp.id)} className="form-pagamento-parcial" onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        name="valorPagamento" 
                                        placeholder="Valor do Pagamento" 
                                        required
                                        style={{flex: 2}}
                                    />
                                    <select 
                                        name="statusPagamento" 
                                        defaultValue="Pago" 
                                        required
                                        style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
                                    >
                                        <option value="Pago">Pago</option>
                                        <option value="A Pagar">A Pagar</option>
                                    </select>
                                    <button type="submit">Adicionar</button>
                                </form>
                            </div>
                        )
                    }) : <p>Nenhuma empreitada cadastrada.</p>}
                </div>
            </div>
            
            <div className="main-grid">
                <div className="card-main">
                    <div className="card-header"><h3>Pagamentos Pendentes</h3></div>
                    <div className="lista-pendentes">{pagamentosPendentes.length > 0 ? pagamentosPendentes.map(lanc => (<div key={lanc.id} className="item-pendente"><div className="item-info"><span className="item-descricao">{lanc.descricao} - {lanc.tipo}</span><small>{new Date(lanc.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}</small></div><div className="item-acao"><span className="item-valor">{formatCurrency(lanc.valor)}</span><button onClick={() => handleMarcarComoPago(lanc.id)} className="marcar-pago-btn">Marcar como Pago</button></div></div>)) : <p>Nenhum pagamento pendente.</p>}</div>
                </div>
                <div className="card-main">
                    <div className="card-header"><h3>Total por Segmento</h3></div>
                    <div className="lista-segmento">{Object.entries(sumarios.total_por_segmento).map(([segmento, valor]) => (<div key={segmento} className="item-segmento"><span>{segmento}</span><span className="valor-segmento">{formatCurrency(valor)}</span></div>))}</div>
                </div>
            </div>

            <div className="card-full">
                <div className="card-header"><h3>Histórico de Gastos</h3><div className="header-actions"><button className="acao-btn add-btn" onClick={() => setAddLancamentoModalVisible(true)}>+ Novo Gasto</button><button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/csv`)} className="export-btn">CSV</button><button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`)} className="export-btn pdf">PDF</button></div></div>
                <table className="tabela-historico">
                    <thead><tr><th>Data</th><th>Descrição</th><th>Segmento</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
                    <tbody>{lancamentos.map(lanc => (<tr key={lanc.id}><td>{new Date(lanc.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}</td><td>{lanc.descricao}</td><td>{lanc.tipo}</td><td className="status-cell">{lanc.status === 'A Pagar' ? (<button onClick={() => handleMarcarComoPago(lanc.id)} className="quick-pay-btn" title="Marcar como Pago">A Pagar ✓</button>) : (<span className="status pago">Pago</span>)}</td><td>{formatCurrency(lanc.valor)}</td><td className="acoes-cell"><button onClick={() => setEditingLancamento(lanc)} className="acao-icon-btn edit-btn" title="Editar">✏️</button><button onClick={() => handleDeletarLancamento(lanc.id)} className="acao-icon-btn delete-btn" title="Excluir">🗑️</button></td></tr>))}</tbody>
                </table>
            </div> 
        </div>
    );
} 

export default App;