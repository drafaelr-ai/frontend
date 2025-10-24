import React, { useState, useEffect, useMemo } from 'react'; // Adicionado useMemo
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
    // Garante que a data está no formato YYYY-MM-DD para o input
    useEffect(() => {
         if (lancamento) {
             // Clona o objeto para não modificar o estado original
             const initialData = { ...lancamento };
             // Formata a data se ela existir
             if (initialData.data) {
                 try {
                     // Tenta criar uma data e formatar. Adiciona T00:00:00 para evitar problemas de fuso
                     initialData.data = new Date(initialData.data + 'T00:00:00').toISOString().split('T')[0];
                 } catch (e) {
                     console.error("Erro ao formatar data para edição:", e);
                     initialData.data = ''; // Define como vazio se houver erro
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
                <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div> {/* Tornando PIX opcional */}
                <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required /></div>
                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Mão de Obra'} onChange={handleChange} required>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Material</option>
                        <option>Equipamentos</option> {/* <-- OPÇÃO EXISTENTE */}
                    </select>
                </div>
                <div className="form-group"><label>Status</label><select name="status" value={formData.status || 'A Pagar'} onChange={handleChange} required><option>A Pagar</option><option>Pago</option></select></div>
                <div className="form-actions"><button type="button" onClick={onClose} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Alterações</button></div>
            </form>
        </Modal>
    );
};

// Passando fetchObraData como prop para poder recarregar os dados
const EmpreitadaDetailsModal = ({ empreitada, onClose, onSave, fetchObraData, obraId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
     // Garante que o valor global está formatado corretamente
     useEffect(() => {
         if (empreitada) {
             setFormData({
                 ...empreitada,
                 valor_global: empreitada.valor_global || 0 // Garante que é número
             });
         } else {
             setFormData({});
         }
     }, [empreitada]);

    const handleChange = (e) => { const { name, value } = e.target; const finalValue = name === 'valor_global' ? parseFloat(value) || 0 : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); setIsEditing(false); };

    const handleDeletarPagamento = (pagamentoId) => {
        console.log("Solicitando deleção de pagamento (ID:", pagamentoId, "). Idealmente, use um modal de confirmação.");
        fetch(`${API_URL}/empreitadas/${empreitada.id}/pagamentos/${pagamentoId}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao deletar');
            return res.json();
        })
        .then(() => {
            // Recarrega os dados da obra atual após deletar pagamento
             if (fetchObraData && obraId) {
                 fetchObraData(obraId); // Chama a função para recarregar
                 onClose(); // Fecha o modal após a ação
             } else {
                 window.location.reload(); // Fallback
             }
        })
        .catch(error => {
            console.error('Erro:', error);
            // alert('Erro ao deletar o pagamento. Tente novamente.'); // Evitar alert
        });
    };

    const handleDeletarEmpreitada = () => {
        console.log("Solicitando deleção de empreitada. Idealmente, use um modal.");
        fetch(`${API_URL}/empreitadas/${empreitada.id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Erro ao deletar');
            return res.json();
        })
        .then(() => {
             if (fetchObraData && obraId) {
                 fetchObraData(obraId); // Chama a função para recarregar
                 onClose(); // Fecha o modal após a ação
             } else {
                 window.location.reload(); // Fallback
             }
        })
        .catch(error => {
            console.error('Erro:', error);
            // alert('Erro ao deletar a empreitada. Tente novamente.'); // Evitar alert
        });
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
                    {/* Exibe N/A se o campo for nulo ou vazio */}
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
                                <th style={{width: '80px'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empreitada.pagamentos && empreitada.pagamentos.length > 0 ? (
                                empreitada.pagamentos.map((pag) => (
                                    <tr key={pag.id}>
                                        {/* Adiciona + 'T00:00:00' para tentar evitar problemas de fuso */}
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
                                ))
                             ) : (
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
                    <div className="form-group"><label>Descrição</label><input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" value={formData.responsavel || ''} onChange={handleChange} /></div> {/* Tornando opcional */}
                    <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" value={formData.valor_global || 0} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" value={formData.pix || ''} onChange={handleChange} /></div> {/* Tornando opcional */}
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
    const [lancamentos, setLancamentos] = useState([]); // Gastos gerais
    const [empreitadas, setEmpreitadas] = useState([]); // Empreitadas e seus pagamentos
    const [sumarios, setSumarios] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddEmpreitadaModalVisible, setAddEmpreitadaModalVisible] = useState(false);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [viewingEmpreitada, setViewingEmpreitada] = useState(null);

    // Efeito para buscar obras na montagem do componente
    useEffect(() => {
        console.log("Buscando lista de obras...");
        fetch(`${API_URL}/obras`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Obras recebidas:", data);
                setObras(Array.isArray(data) ? data : []); // Garante que é um array
            })
            .catch(error => {
                console.error("Erro ao buscar obras:", error);
                setObras([]); // Define como array vazio em caso de erro
                // alert("Falha ao carregar obras. Verifique o backend."); // Evitar alert
            });
    }, []);

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        console.log(`Buscando dados da obra ID: ${obraId}`);
        fetch(`${API_URL}/obras/${obraId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Dados da obra recebidos:", data);
                setObraSelecionada(data.obra || null);
                // Garante que lancamentos e empreitadas são sempre arrays
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                // Garante que pagamentos dentro de empreitadas também são arrays
                const empreitadasComPagamentosArray = (Array.isArray(data.empreitadas) ? data.empreitadas : []).map(emp => ({
                    ...emp,
                    pagamentos: Array.isArray(emp.pagamentos) ? emp.pagamentos : []
                }));
                setEmpreitadas(empreitadasComPagamentosArray);
                setSumarios(data.sumarios || null); // Define sumarios ou null
            })
            .catch(error => {
                console.error(`Erro ao buscar dados da obra ${obraId}:`, error);
                // Limpa os dados em caso de erro para evitar inconsistências
                setObraSelecionada(null);
                setLancamentos([]);
                setEmpreitadas([]);
                setSumarios(null);
                // alert("Falha ao carregar dados da obra."); // Evitar alert
            })
            .finally(() => setIsLoading(false));
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => {
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null; // Envia null se vazio
        console.log("Adicionando nova obra:", { nome, cliente });
        fetch(`${API_URL}/obras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cliente })
        })
        .then(res => {
            if (!res.ok) {
                 // Tenta ler a mensagem de erro do backend se houver
                 return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao adicionar obra') });
            }
            return res.json();
        })
        .then(novaObra => {
            console.log("Obra adicionada:", novaObra);
            setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome)));
            e.target.reset();
        })
        .catch(error => {
            console.error('Erro ao adicionar obra:', error);
            // alert(`Erro ao adicionar obra: ${error.message}`); // Evitar alert
        });
    };

    const handleDeletarObra = (obraId, obraNome) => {
        console.log(`Solicitando deleção da obra ID: ${obraId}. Idealmente, use um modal.`);
        fetch(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao deletar obra') });
            }
            return res.json();
        })
        .then(() => {
            console.log("Obra deletada:", obraId);
            setObras(prevObras => prevObras.filter(o => o.id !== obraId));
            // alert('Obra deletada com sucesso!'); // Evitar alert
        })
        .catch(error => {
            console.error('Erro ao deletar obra:', error);
            // alert(`Erro ao deletar a obra: ${error.message}`); // Evitar alert
        });
    };

    const handleMarcarComoPago = (itemId) => {
        // Usa uniqueId que começa com 'lanc-'
        const isPayment = String(itemId).startsWith('emp-pag-');
        const actualId = String(itemId).split('-').pop(); // Extrai o ID numérico

        if (isPayment) {
            console.log("Tentativa de marcar pagamento de empreitada como pago (não implementado diretamente na tabela histórica):", actualId);
            // Pagamentos de empreitada não são marcados como pagos aqui
        } else {
             // Lógica original para lançamentos gerais (usa o ID numérico)
            console.log("Marcando lançamento geral como pago:", actualId);
             fetch(`${API_URL}/lancamentos/${actualId}/pago`, { method: 'PATCH' })
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
         // Usa uniqueId que começa com 'lanc-' ou 'emp-pag-'
         const isPayment = String(itemId).startsWith('emp-pag-');
         const actualId = String(itemId).split('-').pop(); // Extrai o ID numérico

        if (isPayment) {
            console.log("Deleção de pagamento de empreitada deve ser feita no modal da empreitada:", actualId);
             // Para deletar aqui, precisaríamos encontrar a empreitada associada. É mais seguro fazer no modal.
        } else {
            // Lógica original para lançamentos gerais (usa o ID numérico)
            console.log("Deletando lançamento geral:", actualId);
            fetch(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) {
                        return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao deletar lançamento') });
                    }
                    return res.json();
                })
                .then(() => {
                    fetchObraData(obraSelecionada.id);
                })
                .catch(error => {
                    console.error('Erro ao deletar lançamento:', error);
                    // alert(`Erro ao deletar o lançamento: ${error.message}`); // Evitar alert
                });
        }
    };

    const handleEditLancamento = (item) => {
        // Verifica se o item é um pagamento de empreitada (usando a flag)
        if (item.isEmpreitadaPayment) {
             console.log("Edição de pagamento de empreitada deve ser feita no modal da empreitada:", item.uniqueId);
            // Pagamentos de empreitada não são editáveis diretamente aqui
        } else {
            // É um lançamento geral, abre o modal de edição
            setEditingLancamento(item);
        }
    };


    const handleSaveEdit = (updatedLancamento) => {
        // Garante que o valor é número
        const dataToSend = { ...updatedLancamento, valor: parseFloat(updatedLancamento.valor) || 0 };
        console.log("Salvando edição do lançamento:", dataToSend.id);
        fetch(`${API_URL}/lancamentos/${dataToSend.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
        lancamentoData.data = getTodayString(); // Define a data no momento do salvamento
        lancamentoData.valor = parseFloat(lancamentoData.valor) || 0; // Garante que valor é número
        lancamentoData.pix = lancamentoData.pix || null; // Envia null se vazio
        console.log("Salvando novo lançamento:", lancamentoData);
        fetch(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        }).catch(error => {
            console.error("Erro ao salvar lançamento:", error);
            // alert(`Erro ao salvar o gasto: ${error.message}`); // Evitar alert
        });
    };

    const handleSaveEmpreitada = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const empreitadaData = Object.fromEntries(formData.entries());
        empreitadaData.valor_global = parseFloat(empreitadaData.valor_global) || 0; // Garante que valor é número
        empreitadaData.responsavel = empreitadaData.responsavel || null; // Envia null se vazio
        empreitadaData.pix = empreitadaData.pix || null; // Envia null se vazio
        console.log("Salvando nova empreitada:", empreitadaData);
        fetch(`${API_URL}/obras/${obraSelecionada.id}/empreitadas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        // Garante que valor é número e campos opcionais são null se vazios
        const dataToSend = {
            ...updatedEmpreitada,
            valor_global: parseFloat(updatedEmpreitada.valor_global) || 0,
            responsavel: updatedEmpreitada.responsavel || null,
            pix: updatedEmpreitada.pix || null
        };
        console.log("Salvando edição da empreitada:", dataToSend.id);
        fetch(`${API_URL}/empreitadas/${dataToSend.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
            valor: parseFloat(valorPagamento) || 0, // Garante que é número
            data: getTodayString(),
            status: statusPagamento
        };
        console.log("Adicionando pagamento parcial:", pagamento);
        fetch(`${API_URL}/empreitadas/${empreitadaId}/pagamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pagamento)
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido ao adicionar pagamento') });
            }
            return res.json(); // Espera a resposta do backend (empreitada atualizada)
        })
        .then((empreitadaAtualizada) => {
             // Atualiza o estado das empreitadas com os novos dados recebidos
             setEmpreitadas(prevEmpreitadas =>
                 prevEmpreitadas.map(emp =>
                     emp.id === empreitadaId ? empreitadaAtualizada : emp
                 )
             );
             // Atualiza também o modal que está aberto (se for o caso)
             if (viewingEmpreitada && viewingEmpreitada.id === empreitadaId) {
                 setViewingEmpreitada(empreitadaAtualizada);
             }
             e.target.reset(); // Limpa o formulário só se der certo
             // Recarrega todos os dados para garantir consistência dos sumários
             fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
             console.error("Erro ao adicionar pagamento:", error);
             // alert(`Erro ao adicionar pagamento: ${error.message}`); // Evitar alert
        });
    };

     // --- LÓGICA PARA COMBINAR HISTÓRICO ---
     const historicoCompleto = useMemo(() => {
         // Garante que lancamentos e empreitadas são arrays antes de mapear
         const safeLancamentos = Array.isArray(lancamentos) ? lancamentos : [];
         const safeEmpreitadas = Array.isArray(empreitadas) ? empreitadas : [];

         // 1. Mapeia os lançamentos gerais
         const gastosGerais = safeLancamentos.map(lanc => ({
             ...lanc,
             isEmpreitadaPayment: false,
             uniqueId: `lanc-${lanc.id}`
         }));

         // 2. Mapeia os pagamentos de empreitadas
         const pagamentosEmpreitada = safeEmpreitadas.flatMap(emp =>
              // Garante que emp.pagamentos é um array
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

         // 3. Combina
         const combinado = [...gastosGerais, ...pagamentosEmpreitada];

         // 4. Ordena por data (mais recente primeiro)
         combinado.sort((a, b) => {
             const dateA = a.data ? new Date(a.data) : new Date(0);
             const dateB = b.data ? new Date(b.data) : new Date(0);
             // Se as datas forem iguais, ordena por ID (ou uniqueId) para estabilidade
             if (dateB - dateA === 0) {
                 // IDs numéricos (lancamentos) vêm antes de IDs de string (empreitadas) para desempate
                 const idA = a.uniqueId;
                 const idB = b.uniqueId;
                 if (idA < idB) return -1;
                 if (idA > idB) return 1;
                 return 0;
             }
             return dateB - dateA;
         });

         return combinado;
     }, [lancamentos, empreitadas]); // Dependências


    // --- RENDERIZAÇÃO ---
    // (Renderização da lista de obras permanece a mesma)
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
                    {obras.length > 0 ? (
                        obras.map(obra => (
                            <div key={obra.id} className="card-obra" style={{position: 'relative'}}>
                                <div onClick={() => fetchObraData(obra.id)} style={{cursor: 'pointer', paddingRight: '40px'}}>
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p> {/* Mostra N/A se cliente for nulo */}
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
                        ))
                    ) : (
                        <p>Nenhuma obra cadastrada ainda. Use o formulário acima para começar.</p>
                    )}
                </div>
            </div>
        );
    }


    if (isLoading || !sumarios) { return <div className="loading-screen">Carregando...</div>; }

    // Usar apenas lancamentos originais (e que são array) para a lista de pagamentos pendentes
    const pagamentosPendentesGerais = (Array.isArray(lancamentos) ? lancamentos : []).filter(l => l.status === 'A Pagar');

    return (
        <div className="dashboard-container">
            {/* --- Modais --- */}
            {editingLancamento && <EditLancamentoModal lancamento={editingLancamento} onClose={() => setEditingLancamento(null)} onSave={handleSaveEdit} />}
            {isAddEmpreitadaModalVisible && (
                <Modal onClose={() => setAddEmpreitadaModalVisible(false)}>
                    <h2>Cadastrar Nova Empreitada</h2>
                    <form onSubmit={handleSaveEmpreitada}>
                        <div className="form-group"><label>Descrição da Contratação</label><input type="text" name="nome" placeholder="Ex: Serviço de Pintura" required /></div>
                        <div className="form-group"><label>Responsável</label><input type="text" name="responsavel" placeholder="Ex: Carlos (Pintor)" /></div> {/* Tornando opcional */}
                        <div className="form-group"><label>Valor Global (R$)</label><input type="number" step="0.01" name="valor_global" placeholder="10000.00" required /></div>
                        <div className="form-group"><label>Dados de Pagamento (PIX)</label><input type="text" name="pix" placeholder="Email, Celular, etc." /></div> {/* Tornando opcional */}
                        <div className="form-actions"><button type="button" onClick={() => setAddEmpreitadaModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Empreitada</button></div>
                    </form>
                </Modal>
            )}
            {isAddLancamentoModalVisible && (
                <Modal onClose={() => setAddLancamentoModalVisible(false)}>
                    <h2>Adicionar Novo Gasto</h2>
                    <form onSubmit={handleSaveLancamento}>
                        <div className="form-group"><label>Descrição</label><input type="text" name="descricao" required /></div>
                        <div className="form-group"><label>Chave PIX</label><input type="text" name="pix" /></div> {/* Tornando PIX opcional */}
                        <div className="form-group"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" required /></div>
                        <div className="form-group"><label>Tipo/Segmento</label>
                            <select name="tipo" defaultValue="Mão de Obra" required>
                                <option>Mão de Obra</option>
                                <option>Serviço</option>
                                <option>Material</option>
                                <option>Equipamentos</option> {/* <-- OPÇÃO EXISTENTE */}
                            </select>
                        </div>
                        <div className="form-group"><label>Status</label><select name="status" defaultValue="A Pagar" required><option>A Pagar</option><option>Pago</option></select></div>
                        <div className="form-actions"><button type="button" onClick={() => setAddLancamentoModalVisible(false)} className="cancel-btn">Cancelar</button><button type="submit" className="submit-btn">Salvar Gasto</button></div>
                    </form>
                </Modal>
            )}
             {/* Passa as props necessárias para EmpreitadaDetailsModal */}
             {viewingEmpreitada && <EmpreitadaDetailsModal
                                     empreitada={viewingEmpreitada}
                                     onClose={() => setViewingEmpreitada(null)}
                                     onSave={handleSaveEditEmpreitada}
                                     fetchObraData={fetchObraData} // Passa a função
                                     obraId={obraSelecionada.id} // Passa o ID da obra
                                 />}


            {/* --- Cabeçalho --- */}
            <header className="dashboard-header"><div><h1>{obraSelecionada.nome}</h1><p>Cliente: {obraSelecionada.cliente || 'N/A'}</p></div><button onClick={() => setObraSelecionada(null)} className="voltar-btn">&larr; Ver Todas as Obras</button></header>

            {/* --- KPIs --- */}
            {/* Exibe os KPIs apenas se sumarios existir */}
             {sumarios && (
                 <div className="kpi-grid">
                     <div className="kpi-card total-geral"><span>Total Geral</span><h2>{formatCurrency(sumarios.total_geral)}</h2></div>
                     <div className="kpi-card total-pago"><span>Total Pago</span><h2>{formatCurrency(sumarios.total_pago)}</h2></div>
                     <div className="kpi-card total-a-pagar"><span>Total a Pagar</span><h2>{formatCurrency(sumarios.total_a_pagar)}</h2><small>{pagamentosPendentesGerais.length} pendência(s) gerais</small></div>
                 </div>
             )}


            {/* --- Empreitadas --- */}
            <div className="card-full">
                 <div className="card-header"><h3>Empreitadas</h3><button className="acao-btn add-btn" onClick={() => setAddEmpreitadaModalVisible(true)}>+ Nova Empreitada</button></div>
                <div className="lista-empreitadas">
                    {/* Garante que empreitadas é um array antes de mapear */}
                    {(Array.isArray(empreitadas) ? empreitadas : []).length > 0 ? (Array.isArray(empreitadas) ? empreitadas : []).map(emp => {
                        // Garante que emp.pagamentos é um array
                        const safePagamentos = Array.isArray(emp.pagamentos) ? emp.pagamentos : [];
                        const valorPago = safePagamentos.filter(p => p.status === 'Pago').reduce((total, pag) => total + (pag.valor || 0), 0);
                        const valorGlobalNum = emp.valor_global || 0; // Garante que é número
                        const progresso = valorGlobalNum > 0 ? (valorPago / valorGlobalNum) * 100 : 0;
                        return (
                            <div key={emp.id} className="card-empreitada-item" onClick={() => setViewingEmpreitada(emp)}>
                                <div className="empreitada-header"><h4>{emp.nome}</h4><span>{formatCurrency(valorGlobalNum)}</span></div>
                                <small>Responsável: {emp.responsavel || 'N/A'}</small>
                                <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${progresso}%` }}></div></div>
                                <div className="empreitada-sumario"><span>Pago: {formatCurrency(valorPago)}</span><span>Restante: {formatCurrency(valorGlobalNum - valorPago)}</span><span>{progresso.toFixed(1)}%</span></div>
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
                        ); // Fechamento do div
                    }) : <p>Nenhuma empreitada cadastrada.</p>}
                </div> {/* Fechamento do div lista-empreitadas */}
            </div> {/* Fechamento do card-full Empreitadas */}


            {/* --- Grid Principal (Pendentes e Segmentos) --- */}
             {sumarios && sumarios.total_por_segmento && ( // Exibe apenas se sumarios e total_por_segmento existirem
                 <div className="main-grid">
                     <div className="card-main">
                         <div className="card-header"><h3>Pagamentos Pendentes (Gerais)</h3></div>
                         {/* Usar pagamentosPendentesGerais que filtra apenas dos lancamentos */}
                         <div className="lista-pendentes">{pagamentosPendentesGerais.length > 0 ? pagamentosPendentesGerais.map(lanc => (
                            <div key={lanc.id} className="item-pendente">
                                <div className="item-info">
                                    <span className="item-descricao">{lanc.descricao} - {lanc.tipo}</span>
                                     {/* Adiciona + 'T00:00:00' para tentar evitar problemas de fuso */}
                                    <small>{lanc.data ? new Date(lanc.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Inválida'}</small>
                                </div>
                                <div className="item-acao">
                                    <span className="item-valor">{formatCurrency(lanc.valor)}</span>
                                    {/* Passa o ID original */}
                                    <button onClick={() => handleMarcarComoPago(`lanc-${lanc.id}`)} className="marcar-pago-btn">Marcar como Pago</button> {/* Passa uniqueId */}
                                </div>
                             </div>
                         )) : <p>Nenhum pagamento geral pendente.</p>}</div>
                     </div> {/* Fechamento do card-main Pagamentos Pendentes */}
                     <div className="card-main">
                         <div className="card-header"><h3>Total por Segmento (Geral)</h3></div>
                         {/* Usa os sumários que vêm do backend */}
                         <div className="lista-segmento">{Object.entries(sumarios.total_por_segmento).map(([segmento, valor]) => (<div key={segmento} className="item-segmento"><span>{segmento}</span><span className="valor-segmento">{formatCurrency(valor)}</span></div>))}</div>
                     </div> {/* Fechamento do card-main Total por Segmento */}
                 </div> // Fechamento do main-grid
             )}


            {/* --- Histórico de Gastos --- */}
            <div className="card-full">
                <div className="card-header"><h3>Histórico Completo (Gastos e Pag. Empreitadas)</h3><div className="header-actions"><button className="acao-btn add-btn" onClick={() => setAddLancamentoModalVisible(true)}>+ Novo Gasto Geral</button><button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/csv`)} className="export-btn">CSV (Geral)</button><button onClick={() => window.open(`${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`)} className="export-btn pdf">PDF (Pendentes)</button></div></div>
                <table className="tabela-historico">
                    <thead><tr><th>Data</th><th>Descrição</th><th>Segmento</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
                     {/* Alterado para usar historicoCompleto */}
                    <tbody>
                         {/* Adiciona verificação para garantir que historicoCompleto é um array */}
                        {(Array.isArray(historicoCompleto) ? historicoCompleto : []).map(item => (
                        <tr key={item.uniqueId}> {/* Usar uniqueId */}
                            {/* Adiciona + 'T00:00:00' para tentar evitar problemas de fuso */}
                            <td>{item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data Inválida'}</td>
                            <td>{item.descricao}</td>
                            <td>{item.tipo}</td>
                            <td className="status-cell">
                                {/* Botão "A Pagar" clicável só para lançamentos gerais */}
                                {item.status === 'A Pagar' && !item.isEmpreitadaPayment ? (
                                    <button onClick={() => handleMarcarComoPago(item.uniqueId)} className="quick-pay-btn" title="Marcar como Pago">A Pagar ✓</button>
                                ) : (
                                     // Span para Pagamentos de Empreitada (mesmo se 'A Pagar') ou Lançamentos Pagos
                                    <span className={`status ${item.status === 'Pago' ? 'pago' : 'a-pagar'}`} // Adiciona classe 'a-pagar' se necessário
                                        style={{ backgroundColor: item.status === 'Pago' ? 'var(--cor-verde)' : 'var(--cor-vermelho)' }}>
                                        {item.status}
                                    </span>
                                )}
                            </td>
                            <td>{formatCurrency(item.valor)}</td>
                            <td className="acoes-cell">
                                 {/* Botões de Ação só para lançamentos gerais */}
                                {!item.isEmpreitadaPayment ? (
                                    <>
                                        {/* Passa o objeto 'item' completo */}
                                        <button onClick={() => handleEditLancamento(item)} className="acao-icon-btn edit-btn" title="Editar">✏️</button>
                                        {/* Passa o uniqueId para deletar */}
                                        <button onClick={() => handleDeletarLancamento(item.uniqueId)} className="acao-icon-btn delete-btn" title="Excluir">🗑️</button>
                                    </>
                                ) : (
                                     <span title="Gerenciado na seção Empreitadas">-</span> // Indicador para pagamentos de empreitada
                                )}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
                 {/* Adiciona mensagem se histórico estiver vazio */}
                 {(Array.isArray(historicoCompleto) ? historicoCompleto : []).length === 0 && (
                     <p style={{ textAlign: 'center', marginTop: '15px' }}>Nenhum gasto ou pagamento registrado.</p>
                 )}
            </div> {/* Fechamento do card-full Histórico */}
        </div> // Fechamento do dashboard-container
    );
}

export default App;

