import React, { useState, useEffect, useMemo } from 'react';
import './DashboardObra.css';

const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para fetch com autenticação
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    return fetch(url, { ...options, headers });
};

// Helper para formatar moeda
const formatCurrency = (value) => {
    if (typeof value !== 'number') value = 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper para formatar datas
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Helper para normalizar nomes de materiais
const normalizarNomeMaterial = (nome) => {
    if (!nome) return 'Outros';
    
    // Converter para lowercase e remover espaços extras
    let normalizado = nome.trim().toLowerCase();
    
    // Mapeamento de variações para nome padrão
    const mapeamento = {
        'areia': ['areia', 'areia média', 'areia fina', 'areia grossa', 'areia lavada'],
        'cimento': ['cimento', 'cimento cp2', 'cimento cp3', 'cimento cpii', 'cimento cpiii', 'cimento portland'],
        'brita': ['brita', 'brita 0', 'brita 1', 'brita 2', 'pedra brita', 'brita graduada'],
        'tijolo': ['tijolo', 'tijolos', 'tijolo cerâmico', 'tijolo baiano', 'tijolo furado'],
        'ferro': ['ferro', 'aço', 'vergalhão', 'ferro 3/8', 'ferro 1/2', 'ferro 5/16', 'barra de ferro'],
        'madeira': ['madeira', 'tábua', 'ripa', 'caibro', 'viga', 'pontalete', 'sarrafo'],
        'tinta': ['tinta', 'tinta acrílica', 'tinta látex', 'tinta esmalte', 'tinta pva'],
        'argamassa': ['argamassa', 'massa corrida', 'reboco', 'emboço'],
        'piso': ['piso', 'cerâmica', 'porcelanato', 'revestimento'],
        'tubo': ['tubo', 'cano', 'tubo pvc', 'tubo cpvc', 'conexão', 'conexões'],
        'fio': ['fio', 'cabo', 'fio elétrico', 'cabo elétrico', 'fio 2.5mm', 'fio 4mm'],
        'cal': ['cal', 'cal hidratada', 'cal virgem'],
        'impermeabilizante': ['impermeabilizante', 'manta', 'manta asfáltica', 'vedacit'],
        'gesso': ['gesso', 'drywall', 'placa de gesso', 'forro de gesso'],
    };
    
    // Procurar correspondência
    for (const [padrao, variacoes] of Object.entries(mapeamento)) {
        for (const variacao of variacoes) {
            if (normalizado.includes(variacao)) {
                // Retornar com primeira letra maiúscula
                return padrao.charAt(0).toUpperCase() + padrao.slice(1);
            }
        }
    }
    
    // Se não encontrou, capitalizar a primeira letra
    return nome.trim().charAt(0).toUpperCase() + nome.trim().slice(1).toLowerCase();
};

// Cores para os gráficos
const CORES = {
    maoDeObra: '#4f46e5',
    material: '#10b981', 
    equipamento: '#f59e0b',
    outros: '#6b7280'
};

const CORES_MATERIAIS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9'
];

// ============================================
// COMPONENTE: Gráfico de Pizza Simples
// ============================================
const PieChart = ({ data, onSegmentClick, title }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <p className="no-data">Sem dados disponíveis</p>;
    
    let cumulativePercent = 0;
    
    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };
    
    return (
        <div className="pie-chart-container">
            <h4>{title}</h4>
            <svg viewBox="-1.2 -1.2 2.4 2.4" className="pie-chart">
                {data.map((item, index) => {
                    if (item.value === 0) return null;
                    
                    const percent = item.value / total;
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = percent > 0.5 ? 1 : 0;
                    
                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        'L 0 0'
                    ].join(' ');
                    
                    const isHovered = hoveredIndex === index;
                    
                    return (
                        <path
                            key={index}
                            d={pathData}
                            fill={item.color}
                            stroke="white"
                            strokeWidth="0.02"
                            style={{
                                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center',
                                transition: 'transform 0.2s',
                                cursor: onSegmentClick ? 'pointer' : 'default'
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => onSegmentClick && onSegmentClick(item)}
                        />
                    );
                })}
            </svg>
            <div className="pie-legend">
                {data.map((item, index) => (
                    <div 
                        key={index} 
                        className={`legend-item ${hoveredIndex === index ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => onSegmentClick && onSegmentClick(item)}
                        style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                    >
                        <span className="legend-color" style={{ background: item.color }}></span>
                        <span className="legend-label">{item.label}</span>
                        <span className="legend-value">{formatCurrency(item.value)}</span>
                        <span className="legend-percent">({((item.value / total) * 100).toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// COMPONENTE: Gráfico de Gantt
// ============================================
const GanttChart = ({ cronograma }) => {
    const [zoomLevel, setZoomLevel] = useState('mes'); // 'semana' ou 'mes'
    
    // Coletar todas as etapas e subetapas, agrupadas por serviço
    const todasEtapas = useMemo(() => {
        const etapas = [];
        
        cronograma.forEach((servico, servicoIdx) => {
            // Adicionar linha de cabeçalho do serviço
            if (servico.etapas && servico.etapas.length > 0) {
                // Calcular datas min/max do serviço
                let servicoInicio = null;
                let servicoFim = null;
                let servicoPercentual = 0;
                let totalEtapas = 0;
                
                servico.etapas.forEach(etapa => {
                    if (etapa.data_inicio) {
                        const inicio = new Date(etapa.data_inicio);
                        if (!servicoInicio || inicio < servicoInicio) servicoInicio = inicio;
                    }
                    if (etapa.data_fim) {
                        const fim = new Date(etapa.data_fim);
                        if (!servicoFim || fim > servicoFim) servicoFim = fim;
                    }
                    servicoPercentual += etapa.percentual_conclusao || 0;
                    totalEtapas++;
                });
                
                // Header do serviço
                etapas.push({
                    id: `servico-${servico.cronograma_id || servicoIdx}`,
                    nome: servico.servico_nome || `Serviço ${servicoIdx + 1}`,
                    nivel: -1, // Nível especial para serviço
                    numero: `#${servicoIdx + 1}`,
                    dataInicio: servicoInicio ? servicoInicio.toISOString().split('T')[0] : null,
                    dataFim: servicoFim ? servicoFim.toISOString().split('T')[0] : null,
                    percentual: totalEtapas > 0 ? servicoPercentual / totalEtapas : 0,
                    servico: servico.servico_nome,
                    isServico: true,
                    isEtapaPai: false
                });
                
                servico.etapas.forEach((etapa, etapaIdx) => {
                    // Adicionar etapa pai
                    etapas.push({
                        id: `etapa-${etapa.id}`,
                        nome: etapa.nome,
                        nivel: 0,
                        numero: `${etapaIdx + 1}`,
                        dataInicio: etapa.data_inicio,
                        dataFim: etapa.data_fim,
                        percentual: etapa.percentual_conclusao || 0,
                        servico: servico.servico_nome,
                        isServico: false,
                        isEtapaPai: true
                    });
                    
                    // Adicionar subetapas
                    if (etapa.subetapas && etapa.subetapas.length > 0) {
                        etapa.subetapas.forEach((sub, subIdx) => {
                            etapas.push({
                                id: `sub-${sub.id}`,
                                nome: sub.nome,
                                nivel: 1,
                                numero: `${etapaIdx + 1}.${subIdx + 1}`,
                                dataInicio: sub.data_inicio,
                                dataFim: sub.data_fim,
                                percentual: sub.percentual_conclusao || 0,
                                servico: servico.servico_nome,
                                isServico: false,
                                isEtapaPai: false
                            });
                        });
                    }
                });
            }
        });
        
        return etapas;
    }, [cronograma]);
    
    // Calcular range de datas
    const { dataMin, dataMax, totalDias, hoje } = useMemo(() => {
        if (todasEtapas.length === 0) {
            const hoje = new Date();
            return { 
                dataMin: hoje, 
                dataMax: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000),
                totalDias: 30,
                hoje
            };
        }
        
        let min = null;
        let max = null;
        
        todasEtapas.forEach(etapa => {
            if (etapa.dataInicio) {
                const inicio = new Date(etapa.dataInicio + 'T00:00:00');
                if (!min || inicio < min) min = inicio;
            }
            if (etapa.dataFim) {
                const fim = new Date(etapa.dataFim + 'T00:00:00');
                if (!max || fim > max) max = fim;
            }
        });
        
        // Adicionar margem
        if (min) min = new Date(min.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (max) max = new Date(max.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const totalDias = min && max ? Math.ceil((max - min) / (24 * 60 * 60 * 1000)) : 30;
        
        return { dataMin: min || hoje, dataMax: max || hoje, totalDias, hoje };
    }, [todasEtapas]);
    
    // Gerar marcadores de tempo
    const marcadoresTempo = useMemo(() => {
        const marcadores = [];
        const current = new Date(dataMin);
        
        while (current <= dataMax) {
            if (zoomLevel === 'semana') {
                // Marcar início de cada semana
                if (current.getDay() === 1 || marcadores.length === 0) {
                    marcadores.push({
                        data: new Date(current),
                        label: formatDate(current.toISOString().split('T')[0])
                    });
                }
                current.setDate(current.getDate() + 1);
            } else {
                // Marcar início de cada mês
                if (current.getDate() === 1 || marcadores.length === 0) {
                    marcadores.push({
                        data: new Date(current),
                        label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                    });
                }
                current.setDate(current.getDate() + 7);
            }
        }
        
        return marcadores;
    }, [dataMin, dataMax, zoomLevel]);
    
    // Calcular posição e largura da barra
    const calcularBarra = (dataInicio, dataFim) => {
        if (!dataInicio || !dataFim) return { left: 0, width: 0 };
        
        const inicio = new Date(dataInicio + 'T00:00:00');
        const fim = new Date(dataFim + 'T00:00:00');
        
        const diasDoInicio = Math.max(0, (inicio - dataMin) / (24 * 60 * 60 * 1000));
        const duracao = Math.max(1, (fim - inicio) / (24 * 60 * 60 * 1000) + 1);
        
        const left = (diasDoInicio / totalDias) * 100;
        const width = (duracao / totalDias) * 100;
        
        return { left, width };
    };
    
    // Posição da linha de hoje
    const posicaoHoje = useMemo(() => {
        const diasAteHoje = (hoje - dataMin) / (24 * 60 * 60 * 1000);
        return (diasAteHoje / totalDias) * 100;
    }, [hoje, dataMin, totalDias]);
    
    // Cor da barra baseada no status
    const getCorBarra = (etapa) => {
        if (etapa.percentual >= 100) return '#10b981'; // Verde - concluído
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataFim = etapa.dataFim ? new Date(etapa.dataFim + 'T00:00:00') : null;
        
        if (dataFim && hoje > dataFim && etapa.percentual < 100) {
            return '#ef4444'; // Vermelho - atrasado
        }
        
        if (etapa.percentual > 0) return '#3b82f6'; // Azul - em andamento
        
        return '#94a3b8'; // Cinza - não iniciado
    };
    
    if (todasEtapas.length === 0) {
        return (
            <div className="gantt-empty">
                <p>📊 Nenhuma etapa cadastrada no cronograma.</p>
                <p>Adicione etapas para visualizar o gráfico de Gantt.</p>
            </div>
        );
    }
    
    return (
        <div className="gantt-container">
            <div className="gantt-header">
                <h4>📊 Gráfico de Gantt</h4>
                <div className="gantt-controls">
                    <button 
                        className={zoomLevel === 'semana' ? 'active' : ''}
                        onClick={() => setZoomLevel('semana')}
                    >
                        Semana
                    </button>
                    <button 
                        className={zoomLevel === 'mes' ? 'active' : ''}
                        onClick={() => setZoomLevel('mes')}
                    >
                        Mês
                    </button>
                </div>
            </div>
            
            <div className="gantt-chart">
                {/* Timeline header */}
                <div className="gantt-timeline">
                    <div className="gantt-labels-header">Etapa</div>
                    <div className="gantt-bars-header">
                        {marcadoresTempo.map((marcador, idx) => (
                            <div 
                                key={idx} 
                                className="gantt-time-marker"
                                style={{ 
                                    left: `${((marcador.data - dataMin) / (dataMax - dataMin)) * 100}%` 
                                }}
                            >
                                {marcador.label}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Rows */}
                <div className="gantt-body">
                    {todasEtapas.map((etapa, idx) => {
                        const { left, width } = calcularBarra(etapa.dataInicio, etapa.dataFim);
                        const cor = getCorBarra(etapa);
                        
                        // Linha de serviço (cabeçalho)
                        if (etapa.isServico) {
                            return (
                                <div key={etapa.id} className="gantt-row gantt-servico-header">
                                    <div className="gantt-label gantt-servico-label">
                                        <span className="gantt-servico-icon">📋</span>
                                        <span className="gantt-servico-nome" title={etapa.nome}>
                                            {etapa.nome.length > 35 ? etapa.nome.substring(0, 35) + '...' : etapa.nome}
                                        </span>
                                    </div>
                                    <div className="gantt-bar-container gantt-servico-bar">
                                        {/* Barra do serviço (mais fina, tracejada) */}
                                        {width > 0 && (
                                            <div 
                                                className="gantt-bar gantt-bar-servico"
                                                style={{ 
                                                    left: `${left}%`, 
                                                    width: `${width}%`
                                                }}
                                                title={`${etapa.nome}: ${formatDate(etapa.dataInicio)} - ${formatDate(etapa.dataFim)}`}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        
                        // Linha de etapa ou subetapa
                        return (
                            <div key={etapa.id} className={`gantt-row ${etapa.isEtapaPai ? 'etapa-pai' : 'subetapa'}`}>
                                <div className="gantt-label">
                                    <span className="gantt-numero">{etapa.numero}</span>
                                    <span className="gantt-nome" title={etapa.nome}>
                                        {etapa.nome.length > 25 ? etapa.nome.substring(0, 25) + '...' : etapa.nome}
                                    </span>
                                </div>
                                <div className="gantt-bar-container">
                                    {/* Linha de hoje */}
                                    {posicaoHoje >= 0 && posicaoHoje <= 100 && (
                                        <div 
                                            className="gantt-today-line"
                                            style={{ left: `${posicaoHoje}%` }}
                                        />
                                    )}
                                    
                                    {/* Barra */}
                                    {width > 0 && (
                                        <div 
                                            className="gantt-bar"
                                            style={{ 
                                                left: `${left}%`, 
                                                width: `${width}%`,
                                                backgroundColor: cor
                                            }}
                                            title={`${etapa.nome}: ${formatDate(etapa.dataInicio)} - ${formatDate(etapa.dataFim)} (${etapa.percentual}%)`}
                                        >
                                            {/* Progresso interno */}
                                            <div 
                                                className="gantt-bar-progress"
                                                style={{ width: `${etapa.percentual}%` }}
                                            />
                                            {width > 8 && (
                                                <span className="gantt-bar-label">
                                                    {etapa.percentual.toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Legenda */}
            <div className="gantt-legend">
                <span><i style={{ background: '#10b981' }}></i> Concluído</span>
                <span><i style={{ background: '#3b82f6' }}></i> Em Andamento</span>
                <span><i style={{ background: '#94a3b8' }}></i> Não Iniciado</span>
                <span><i style={{ background: '#ef4444' }}></i> Atrasado</span>
                <span><i className="today-marker"></i> Hoje</span>
            </div>
        </div>
    );
};

// ============================================
// COMPONENTE: Modal de Detalhes do Material
// ============================================
const MaterialDetalhesModal = ({ material, lancamentos, onClose }) => {
    // Filtrar lançamentos deste material
    const lancamentosDoMaterial = lancamentos.filter(l => {
        const nomeOriginal = l.material || l.descricao || l.nome || 'Outros';
        const nomeNormalizado = normalizarNomeMaterial(nomeOriginal);
        return nomeNormalizado === material;
    });
    
    const totalValor = lancamentosDoMaterial.reduce((sum, l) => sum + (l.valor || l.valor_total || 0), 0);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-material" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📦 Detalhes: {material}</h3>
                    <button onClick={onClose} className="modal-close">✕</button>
                </div>
                
                <div className="modal-body">
                    <div className="material-resumo">
                        <div className="resumo-item">
                            <span className="resumo-label">Total de Lançamentos</span>
                            <span className="resumo-value">{lancamentosDoMaterial.length}</span>
                        </div>
                        <div className="resumo-item">
                            <span className="resumo-label">Valor Total</span>
                            <span className="resumo-value">{formatCurrency(totalValor)}</span>
                        </div>
                    </div>
                    
                    <h4>Lançamentos</h4>
                    <div className="material-lancamentos">
                        {lancamentosDoMaterial.length === 0 ? (
                            <p className="no-data">Nenhum lançamento encontrado.</p>
                        ) : (
                            <table className="material-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Descrição Original</th>
                                        <th>Fornecedor</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lancamentosDoMaterial.map((l, idx) => (
                                        <tr key={idx}>
                                            <td>{formatDate(l.data)}</td>
                                            <td>{l.material || l.descricao || l.nome || '-'}</td>
                                            <td>{l.fornecedor || '-'}</td>
                                            <td>{formatCurrency(l.valor || l.valor_total || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// COMPONENTE PRINCIPAL: Dashboard da Obra
// ============================================
const DashboardObra = ({ obraId, obraNome, servicos, lancamentos, cronograma }) => {
    const [materialSelecionado, setMaterialSelecionado] = useState(null);
    
    // Calcular totais por categoria (MO, Material, Equipamento)
    const dadosCategorias = useMemo(() => {
        let totalMO = 0;
        let totalMaterial = 0;
        let totalEquipamento = 0;
        
        // Somar dos serviços
        if (servicos && Array.isArray(servicos)) {
            servicos.forEach(serv => {
                totalMO += serv.valor_global_mao_de_obra || serv.valor_mao_de_obra || 0;
                totalMaterial += serv.valor_global_material || serv.valor_material || 0;
            });
        }
        
        // Também somar dos lançamentos
        if (lancamentos && Array.isArray(lancamentos)) {
            lancamentos.forEach(l => {
                const tipo = (l.tipo || l.categoria || '').toLowerCase();
                const valor = l.valor || l.valor_total || 0;
                
                if (tipo.includes('mao') || tipo.includes('mão') || tipo.includes('obra') || tipo === 'mo') {
                    totalMO += valor;
                } else if (tipo.includes('material') || tipo.includes('mat')) {
                    totalMaterial += valor;
                } else if (tipo.includes('equip') || tipo.includes('ferramenta') || tipo.includes('aluguel')) {
                    totalEquipamento += valor;
                }
            });
        }
        
        return [
            { label: 'Mão de Obra', value: totalMO, color: CORES.maoDeObra },
            { label: 'Material', value: totalMaterial, color: CORES.material },
            { label: 'Equipamento', value: totalEquipamento, color: CORES.equipamento }
        ].filter(item => item.value > 0);
    }, [servicos, lancamentos]);
    
    // Calcular totais por tipo de material
    const dadosMateriais = useMemo(() => {
        const materiaisMap = {};
        
        if (lancamentos && Array.isArray(lancamentos)) {
            lancamentos.forEach(l => {
                const tipo = (l.tipo || l.categoria || '').toLowerCase();
                
                // Considerar apenas lançamentos de material
                if (tipo.includes('material') || tipo.includes('mat') || l.material) {
                    const nomeOriginal = l.material || l.descricao || l.nome || 'Outros';
                    const nomeNormalizado = normalizarNomeMaterial(nomeOriginal);
                    const valor = l.valor || l.valor_total || 0;
                    
                    if (!materiaisMap[nomeNormalizado]) {
                        materiaisMap[nomeNormalizado] = 0;
                    }
                    materiaisMap[nomeNormalizado] += valor;
                }
            });
        }
        
        // Converter para array e ordenar
        const materiaisArray = Object.entries(materiaisMap)
            .map(([label, value], index) => ({
                label,
                value,
                color: CORES_MATERIAIS[index % CORES_MATERIAIS.length]
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 materiais
        
        return materiaisArray;
    }, [lancamentos]);
    
    // Handler para clique no material
    const handleMaterialClick = (item) => {
        setMaterialSelecionado(item.label);
    };
    
    return (
        <div className="dashboard-obra">
            <h2>📊 Dashboard - {obraNome}</h2>
            
            {/* Gráfico de Gantt */}
            <div className="dashboard-section gantt-section">
                <GanttChart cronograma={cronograma || []} />
            </div>
            
            {/* Gráficos de Pizza lado a lado */}
            <div className="dashboard-charts-row">
                {/* Gráfico: MO x Material x Equipamento */}
                <div className="dashboard-section chart-section">
                    <PieChart 
                        data={dadosCategorias}
                        title="💰 Distribuição de Custos"
                    />
                </div>
                
                {/* Gráfico: Por Tipo de Material */}
                <div className="dashboard-section chart-section">
                    <PieChart 
                        data={dadosMateriais}
                        title="📦 Materiais (clique para detalhes)"
                        onSegmentClick={handleMaterialClick}
                    />
                </div>
            </div>
            
            {/* Modal de detalhes do material */}
            {materialSelecionado && (
                <MaterialDetalhesModal 
                    material={materialSelecionado}
                    lancamentos={lancamentos || []}
                    onClose={() => setMaterialSelecionado(null)}
                />
            )}
        </div>
    );
};

export default DashboardObra;
