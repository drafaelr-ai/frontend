import React, { useState, useEffect } from 'react';

const API_URL = 'https://backend-production-78c9.up.railway.app';

const formatCurrency = (value) => {
    if (typeof value !== 'number') { value = 0; }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

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

const CronogramaObra = ({ obraId }) => {
    const [servicos, setServicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('Todos');
    const [expandedCards, setExpandedCards] = useState({});
    const [globalExpanded, setGlobalExpanded] = useState(true);

    useEffect(() => {
        carregarServicos();
    }, [obraId]);

    const carregarServicos = async () => {
        setIsLoading(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/servicos/obra/${obraId}`);
            if (response.ok) {
                const data = await response.json();
                setServicos(data);
                
                // Inicializa todos os cards como expandidos
                const initialExpanded = {};
                data.forEach(servico => {
                    initialExpanded[servico.id] = true;
                });
                setExpandedCards(initialExpanded);
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
        }
        setIsLoading(false);
    };

    const toggleCard = (servicoId) => {
        setExpandedCards(prev => ({
            ...prev,
            [servicoId]: !prev[servicoId]
        }));
    };

    const toggleAllCards = () => {
        const newState = !globalExpanded;
        setGlobalExpanded(newState);
        
        const newExpandedState = {};
        servicos.forEach(servico => {
            newExpandedState[servico.id] = newState;
        });
        setExpandedCards(newExpandedState);
    };

    const calcularStatus = (servico) => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const dataInicio = servico.data_inicio ? new Date(servico.data_inicio + 'T00:00:00') : null;
        const dataFim = servico.data_fim ? new Date(servico.data_fim + 'T00:00:00') : null;

        const percentualExecucao = parseFloat(servico.percentual_execucao) || 0;

        if (!dataInicio || !dataFim) {
            return { status: 'SEM DATA', cor: '#6c757d' };
        }

        if (percentualExecucao >= 100) {
            return { status: 'CONCLUÍDO', cor: '#28a745' };
        }

        if (hoje < dataInicio) {
            return { status: 'AGENDADO', cor: '#17a2b8' };
        }

        if (hoje >= dataInicio && hoje <= dataFim) {
            const diasTotais = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));
            const diasDecorridos = Math.ceil((hoje - dataInicio) / (1000 * 60 * 60 * 24));
            const progressoEsperado = (diasDecorridos / diasTotais) * 100;

            if (percentualExecucao < progressoEsperado - 10) {
                return { status: 'ATRASADO', cor: '#dc3545' };
            }
            return { status: 'EM ANDAMENTO', cor: '#007bff' };
        }

        if (hoje > dataFim && percentualExecucao < 100) {
            return { status: 'ATRASADO', cor: '#dc3545' };
        }

        return { status: 'PENDENTE', cor: '#6c757d' };
    };

    const calcularEVM = (servico) => {
        const orcado = parseFloat(servico.valor_orcado) || 0;
        const pago = parseFloat(servico.valor_pago) || 0;
        const percentualExec = parseFloat(servico.percentual_execucao) || 0;

        const valorAgregado = (orcado * percentualExec) / 100;
        const variacaoCusto = valorAgregado - pago;
        const percentualVariacao = orcado > 0 ? (variacaoCusto / orcado) * 100 : 0;

        let statusEVM = 'NO PRAZO';
        let corEVM = '#28a745';

        if (percentualVariacao < -10) {
            statusEVM = 'ATRASO CRÍTICO';
            corEVM = '#dc3545';
        } else if (percentualVariacao < 0) {
            statusEVM = 'ATRASO MODERADO';
            corEVM = '#ffc107';
        } else if (percentualVariacao > 10) {
            statusEVM = 'ADIANTADO';
            corEVM = '#17a2b8';
        }

        return {
            orcado,
            pago,
            valorAgregado,
            variacaoCusto,
            percentualVariacao,
            statusEVM,
            corEVM
        };
    };

    const servicosFiltrados = servicos.filter(servico => {
        if (filtroStatus === 'Todos') return true;
        const { status } = calcularStatus(servico);
        return status === filtroStatus;
    });

    if (isLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando cronograma...</div>;
    }

    return (
        <div className="cronograma-container">
            <div className="card-header">
                <h3>📅 Cronograma da Obra</h3>
                <div className="header-actions">
                    <select 
                        className="filtro-status"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                    >
                        <option value="Todos">Todos</option>
                        <option value="AGENDADO">Agendados</option>
                        <option value="EM ANDAMENTO">Em Andamento</option>
                        <option value="ATRASADO">Atrasados</option>
                        <option value="CONCLUÍDO">Concluídos</option>
                    </select>
                    
                    <button 
                        className="acao-btn add-btn"
                        onClick={toggleAllCards}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '5px',
                            backgroundColor: '#6c757d'
                        }}
                    >
                        <span>{globalExpanded ? '📕' : '📖'}</span>
                        {globalExpanded ? 'Recolher Todos' : 'Expandir Todos'}
                    </button>
                </div>
            </div>

            {servicosFiltrados.length === 0 ? (
                <div className="empty-state">
                    <p>Nenhum serviço encontrado no cronograma.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {servicosFiltrados.map(servico => {
                        const { status, cor } = calcularStatus(servico);
                        const evm = calcularEVM(servico);
                        const isExpanded = expandedCards[servico.id];
                        const percentualExec = parseFloat(servico.percentual_execucao) || 0;

                        return (
                            <div 
                                key={servico.id} 
                                className="card-cronograma"
                                style={{
                                    border: `2px solid ${cor}`,
                                    borderRadius: '8px',
                                    padding: '16px',
                                    backgroundColor: 'white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                {/* CABEÇALHO - SEMPRE VISÍVEL */}
                                <div 
                                    onClick={() => toggleCard(servico.id)}
                                    style={{ 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: isExpanded ? '15px' : '0'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div className="cronograma-title" style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            marginBottom: '8px'
                                        }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1em', color: '#1a202c' }}>
                                                📋 {servico.nome_servico || 'Sem nome'} #{servico.item_number || ''}
                                            </h4>
                                            <span 
                                                className="badge-status"
                                                style={{
                                                    backgroundColor: cor,
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75em',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {status}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.85em', color: '#4a5568' }}>
                                            📏 {servico.tipo_medicao === 'empreitada' ? 'Medição por Empreitada' : 'Medição por Área/Quantidade'}
                                        </div>

                                        {servico.tipo_medicao !== 'empreitada' && (
                                            <div style={{ fontSize: '0.85em', color: '#4a5568', marginTop: '4px' }}>
                                                Total: <strong>{servico.quantidade_total || 0} {servico.unidade || 'm²'}</strong> | 
                                                Executado: <strong style={{ color: '#10b981' }}> {servico.quantidade_executada || 0} {servico.unidade || 'm²'}</strong>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCard(servico.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '1.5em',
                                            cursor: 'pointer',
                                            padding: '5px',
                                            color: '#4a5568'
                                        }}
                                    >
                                        {isExpanded ? '🔽' : '▶️'}
                                    </button>
                                </div>

                                {/* BARRA DE PROGRESSO - SEMPRE VISÍVEL */}
                                <div className="progress-container" style={{
                                    backgroundColor: '#e9ecef',
                                    borderRadius: '4px',
                                    height: '28px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    marginBottom: isExpanded ? '15px' : '0'
                                }}>
                                    <div 
                                        className="progress-fill"
                                        style={{
                                            height: '100%',
                                            width: `${Math.min(percentualExec, 100)}%`,
                                            backgroundColor: percentualExec >= 100 ? '#28a745' : 
                                                           percentualExec >= 75 ? '#10b981' :
                                                           percentualExec >= 50 ? '#ffc107' : '#dc3545',
                                            transition: 'width 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span className="progress-text" style={{
                                            fontWeight: 'bold',
                                            fontSize: '0.85em',
                                            color: 'white',
                                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                            position: 'absolute'
                                        }}>
                                            {percentualExec.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* CONTEÚDO EXPANSÍVEL */}
                                {isExpanded && (
                                    <>
                                        {/* PLANEJAMENTO */}
                                        <div style={{ 
                                            backgroundColor: '#f8f9fa', 
                                            padding: '12px', 
                                            borderRadius: '6px',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.9em', 
                                                fontWeight: 'bold', 
                                                marginBottom: '8px',
                                                color: '#4a5568'
                                            }}>
                                                📊 PLANEJAMENTO
                                            </div>
                                            
                                            <div className="timeline-dates" style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.85em',
                                                color: '#1a202c',
                                                marginBottom: '8px'
                                            }}>
                                                <span>
                                                    📅 Início: <strong>
                                                        {servico.data_inicio ? 
                                                            new Date(servico.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : 
                                                            '-'
                                                        }
                                                    </strong>
                                                </span>
                                                <span className="arrow">→</span>
                                                <span>
                                                    🏁 Fim: <strong>
                                                        {servico.data_fim ? 
                                                            new Date(servico.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : 
                                                            '-'
                                                        }
                                                    </strong>
                                                </span>
                                            </div>

                                            {servico.data_inicio && servico.data_fim && (
                                                <div style={{ fontSize: '0.85em', color: '#4a5568' }}>
                                                    ⏱️ {Math.ceil(
                                                        (new Date(servico.data_fim + 'T00:00:00') - 
                                                         new Date(servico.data_inicio + 'T00:00:00')) / 
                                                        (1000 * 60 * 60 * 24)
                                                    )} dias planejados
                                                </div>
                                            )}
                                        </div>

                                        {/* EXECUÇÃO REAL */}
                                        {servico.data_inicio_real && (
                                            <div style={{ 
                                                backgroundColor: '#f0f9ff', 
                                                padding: '12px', 
                                                borderRadius: '6px',
                                                marginBottom: '12px'
                                            }}>
                                                <div style={{ 
                                                    fontSize: '0.9em', 
                                                    fontWeight: 'bold', 
                                                    marginBottom: '8px',
                                                    color: '#4a5568'
                                                }}>
                                                    ⚡ EXECUÇÃO REAL
                                                </div>
                                                
                                                <div style={{ fontSize: '0.85em', color: '#1a202c' }}>
                                                    <span>
                                                        📅 Início: <strong>
                                                            {new Date(servico.data_inicio_real + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                        </strong>
                                                    </span>
                                                    
                                                    {servico.data_fim_real && (
                                                        <>
                                                            <span style={{ margin: '0 10px' }}>→</span>
                                                            <span>
                                                                🏁 Fim: <strong>
                                                                    {new Date(servico.data_fim_real + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                                </strong>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {servico.data_fim_real && (
                                                    <div style={{ fontSize: '0.85em', color: '#4a5568', marginTop: '8px' }}>
                                                        ⏱️ {Math.ceil(
                                                            (new Date(servico.data_fim_real + 'T00:00:00') - 
                                                             new Date(servico.data_inicio_real + 'T00:00:00')) / 
                                                            (1000 * 60 * 60 * 24)
                                                        )} dias restam
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ANÁLISE EVM */}
                                        <div style={{ 
                                            backgroundColor: '#fef3c7', 
                                            padding: '12px', 
                                            borderRadius: '6px',
                                            marginBottom: '12px',
                                            border: `2px solid ${evm.corEVM}`
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.9em', 
                                                fontWeight: 'bold', 
                                                marginBottom: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ color: '#4a5568' }}>💰 Análise de Valor Agregado (EVM)</span>
                                                <span style={{
                                                    backgroundColor: evm.corEVM,
                                                    color: 'white',
                                                    padding: '3px 8px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.8em'
                                                }}>
                                                    {evm.statusEVM}
                                                </span>
                                            </div>

                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: '1fr 1fr', 
                                                gap: '8px',
                                                fontSize: '0.85em'
                                            }}>
                                                <div>
                                                    <div style={{ color: '#4a5568' }}>💵 Total Orçado:</div>
                                                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(evm.orcado)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#4a5568' }}>✅ Já Pago:</div>
                                                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(evm.pago)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#4a5568' }}>📊 Área Total:</div>
                                                    <div style={{ fontWeight: 'bold' }}>
                                                        {servico.tipo_medicao !== 'empreitada' ? 
                                                            `${servico.quantidade_total || 0} ${servico.unidade || 'm²'}` : 
                                                            '-'
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#4a5568' }}>✔️ Executado:</div>
                                                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                                                        {servico.tipo_medicao !== 'empreitada' ? 
                                                            `${servico.quantidade_executada || 0} ${servico.unidade || 'm²'}` : 
                                                            `${percentualExec.toFixed(1)}%`
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ 
                                                marginTop: '12px',
                                                padding: '10px',
                                                backgroundColor: 'white',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75em', color: '#4a5568' }}>💰 Pago:</div>
                                                    <div style={{ fontSize: '0.95em', fontWeight: 'bold' }}>
                                                        {evm.pago > evm.valorAgregado ? '🔴' : '🟢'} {((evm.pago / evm.orcado) * 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75em', color: '#4a5568' }}>✅ Executado:</div>
                                                    <div style={{ fontSize: '0.95em', fontWeight: 'bold' }}>
                                                        {percentualExec >= 75 ? '🟢' : percentualExec >= 50 ? '🟡' : '🔴'} {percentualExec.toFixed(1)}%
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.75em', color: '#4a5568' }}>
                                                        {evm.variacaoCusto >= 0 ? '⚠️ Ação necessária:' : '✅ Status:'}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '0.85em', 
                                                        fontWeight: 'bold',
                                                        color: evm.variacaoCusto >= 0 ? '#dc3545' : '#28a745'
                                                    }}>
                                                        {evm.variacaoCusto >= 0 ? 
                                                            'Revise os pagamentos ou acelere a execução!' : 
                                                            'Pagou muito mais do que executou'
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* OBSERVAÇÕES */}
                                        {servico.observacoes && (
                                            <div className="cronograma-obs" style={{
                                                backgroundColor: '#f8f9fa',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                borderLeft: '3px solid #3b82f6',
                                                marginBottom: '12px'
                                            }}>
                                                <small style={{ color: '#4a5568' }}>
                                                    📝 {servico.observacoes}
                                                </small>
                                            </div>
                                        )}

                                        {/* BOTÕES DE AÇÃO */}
                                        <div className="cronograma-actions" style={{
                                            display: 'flex',
                                            gap: '8px',
                                            paddingTop: '12px',
                                            borderTop: '1px solid #eee'
                                        }}>
                                            <button className="btn-editar" style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#4f46e5',
                                                color: 'white',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}>
                                                ✏️ Editar
                                            </button>
                                            <button className="btn-delete" style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                background: '#f8f9fa',
                                                color: '#ef4444',
                                                border: '1px solid #e9ecef',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}>
                                                🗑️ Excluir
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CronogramaObra;
