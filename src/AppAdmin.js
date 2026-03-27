/**
 * ===================================================================================
 * OBRALY - MÓDULO ADMINISTRATIVO (Frontend)
 * Gestão Patrimonial - Controle de imóveis, despesas e receitas
 * ===================================================================================
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

// ===================================================================================
// CONFIGURAÇÃO
// ===================================================================================

const API_URL_ADMIN = 'https://obraly-admin-api.fly.dev';

// ===================================================================================
// CONTEXTO DE AUTENTICAÇÃO
// ===================================================================================

const AuthAdminContext = createContext();

const useAuthAdmin = () => useContext(AuthAdminContext);

// ===================================================================================
// HELPERS
// ===================================================================================

const formatCurrency = (value) => {
    if (typeof value !== 'number') value = 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// ===================================================================================
// COMPONENTE: TELA DE LOGIN
// ===================================================================================

const LoginScreenAdmin = ({ onBack }) => {
    const { login } = useAuthAdmin();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL_ADMIN}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || 'Erro ao fazer login');
            }

            login(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.loginContainer}>
            {/* Botão Voltar */}
            <button onClick={onBack} style={styles.backButton}>
                ← Voltar
            </button>

            <div style={styles.loginCard}>
                {/* Header */}
                <div style={styles.loginHeader}>
                    <div style={styles.loginIcon}>🏢</div>
                    <h1 style={styles.loginTitle}>Administração</h1>
                    <p style={styles.loginSubtitle}>Gestão Patrimonial</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.loginForm}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        required
                    />
                    {error && <p style={styles.error}>{error}</p>}
                    <button type="submit" style={styles.submitButton} disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: SIDEBAR
// ===================================================================================

const Sidebar = ({ activeMenu, setActiveMenu, user, onLogout }) => {
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'imoveis', icon: '🏠', label: 'Imóveis' },
        { id: 'lancamentos', icon: '💰', label: 'Lançamentos' },
        { id: 'relatorios', icon: '📈', label: 'Relatórios' },
    ];
    
    // Menu de admin (apenas para role='admin')
    if (user?.role === 'admin') {
        menuItems.push({ id: 'usuarios', icon: '👥', label: 'Usuários' });
    }

    return (
        <div style={styles.sidebar}>
            {/* Logo */}
            <div style={styles.sidebarHeader}>
                <span style={styles.sidebarLogo}>🏢</span>
                <div>
                    <div style={styles.sidebarTitle}>Obraly</div>
                    <div style={styles.sidebarSubtitle}>Administração</div>
                </div>
            </div>

            {/* Menu */}
            <nav style={styles.sidebarNav}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveMenu(item.id)}
                        style={{
                            ...styles.menuItem,
                            ...(activeMenu === item.id ? styles.menuItemActive : {})
                        }}
                    >
                        <span style={styles.menuIcon}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* User */}
            <div style={styles.sidebarFooter}>
                <div style={styles.userInfo}>
                    <div style={styles.userAvatar}>👤</div>
                    <div>
                        <div style={styles.userName}>{user?.nome || 'Usuário'}</div>
                        <div style={styles.userRole}>{user?.role || 'operador'}</div>
                    </div>
                </div>
                <button onClick={onLogout} style={styles.logoutButton}>
                    Sair
                </button>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: DASHBOARD
// ===================================================================================

const Dashboard = () => {
    const { token } = useAuthAdmin();
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mesAno, setMesAno] = useState({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
    });

    useEffect(() => {
        fetchDashboard();
    }, [mesAno]);

    const fetchDashboard = async () => {
        try {
            const response = await fetch(
                `${API_URL_ADMIN}/dashboard?mes=${mesAno.mes}&ano=${mesAno.ano}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            setDados(data);
        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (loading) {
        return <div style={styles.loading}>Carregando...</div>;
    }

    return (
        <div style={styles.content}>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>📊 Dashboard</h1>
                <div style={styles.periodSelector}>
                    <select
                        value={mesAno.mes}
                        onChange={(e) => setMesAno({ ...mesAno, mes: parseInt(e.target.value) })}
                        style={styles.select}
                    >
                        {meses.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={mesAno.ano}
                        onChange={(e) => setMesAno({ ...mesAno, ano: parseInt(e.target.value) })}
                        style={styles.select}
                    >
                        {[2024, 2025, 2026, 2027].map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards Resumo */}
            <div style={styles.cardsGrid}>
                <div style={{ ...styles.card, ...styles.cardBlue }}>
                    <div style={styles.cardIcon}>🏠</div>
                    <div style={styles.cardInfo}>
                        <div style={styles.cardValue}>{dados?.resumo?.total_imoveis || 0}</div>
                        <div style={styles.cardLabel}>Imóveis</div>
                    </div>
                </div>
                <div style={{ ...styles.card, ...styles.cardRed }}>
                    <div style={styles.cardIcon}>📉</div>
                    <div style={styles.cardInfo}>
                        <div style={styles.cardValue}>{formatCurrency(dados?.resumo?.despesas_mes || 0)}</div>
                        <div style={styles.cardLabel}>Despesas do Mês</div>
                    </div>
                </div>
                <div style={{ ...styles.card, ...styles.cardGreen }}>
                    <div style={styles.cardIcon}>📈</div>
                    <div style={styles.cardInfo}>
                        <div style={styles.cardValue}>{formatCurrency(dados?.resumo?.receitas_mes || 0)}</div>
                        <div style={styles.cardLabel}>Receitas do Mês</div>
                    </div>
                </div>
                <div style={{ ...styles.card, ...(dados?.resumo?.saldo_mes >= 0 ? styles.cardGreen : styles.cardRed) }}>
                    <div style={styles.cardIcon}>💰</div>
                    <div style={styles.cardInfo}>
                        <div style={styles.cardValue}>{formatCurrency(dados?.resumo?.saldo_mes || 0)}</div>
                        <div style={styles.cardLabel}>Saldo do Mês</div>
                    </div>
                </div>
            </div>

            {/* Alertas de Vencimento */}
            {(dados?.alertas?.vencidos?.length > 0 || dados?.alertas?.a_vencer?.length > 0) && (
                <div style={styles.alertasSection}>
                    {/* Vencidos */}
                    {dados?.alertas?.vencidos?.length > 0 && (
                        <div style={styles.alertaVencido}>
                            <div style={styles.alertaHeader}>
                                <span style={styles.alertaIcon}>🚨</span>
                                <div>
                                    <strong>VENCIDOS</strong>
                                    <span style={styles.alertaTotal}>{formatCurrency(dados.alertas.total_vencido)}</span>
                                </div>
                            </div>
                            <div style={styles.alertaItems}>
                                {dados.alertas.vencidos.map((lanc, i) => (
                                    <div key={i} style={styles.alertaItem}>
                                        <div>
                                            <span style={styles.alertaCategoria}>{lanc.categoria_icone}</span>
                                            <strong>{lanc.descricao}</strong>
                                            <span style={styles.alertaImovel}> - {lanc.imovel_nome}</span>
                                        </div>
                                        <div style={styles.alertaInfo}>
                                            <span style={styles.alertaDias}>
                                                {Math.abs(lanc.dias_para_vencer)} dia(s) atraso
                                            </span>
                                            <span style={styles.alertaValor}>{formatCurrency(lanc.valor)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* A Vencer */}
                    {dados?.alertas?.a_vencer?.length > 0 && (
                        <div style={styles.alertaAVencer}>
                            <div style={styles.alertaHeader}>
                                <span style={styles.alertaIcon}>⏰</span>
                                <div>
                                    <strong>A VENCER (próx. 7 dias)</strong>
                                    <span style={styles.alertaTotal}>{formatCurrency(dados.alertas.total_a_vencer)}</span>
                                </div>
                            </div>
                            <div style={styles.alertaItems}>
                                {dados.alertas.a_vencer.map((lanc, i) => (
                                    <div key={i} style={styles.alertaItem}>
                                        <div>
                                            <span style={styles.alertaCategoria}>{lanc.categoria_icone}</span>
                                            <strong>{lanc.descricao}</strong>
                                            <span style={styles.alertaImovel}> - {lanc.imovel_nome}</span>
                                        </div>
                                        <div style={styles.alertaInfo}>
                                            <span style={styles.alertaDiasVencer}>
                                                {lanc.dias_para_vencer === 0 ? 'Vence HOJE!' : `Vence em ${lanc.dias_para_vencer} dia(s)`}
                                            </span>
                                            <span style={styles.alertaValor}>{formatCurrency(lanc.valor)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Alertas de Pendentes (fallback se não tiver alertas detalhados) */}
            {!dados?.alertas && dados?.resumo?.pendentes > 0 && (
                <div style={styles.alertBox}>
                    ⚠️ Você tem <strong>{formatCurrency(dados.resumo.pendentes)}</strong> em despesas pendentes
                </div>
            )}

            {/* Despesas por Categoria */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>💳 Despesas por Categoria</h2>
                <div style={styles.categoryList}>
                    {dados?.despesas_por_categoria?.length > 0 ? (
                        dados.despesas_por_categoria.map((cat, i) => (
                            <div key={i} style={styles.categoryItem}>
                                <div style={styles.categoryInfo}>
                                    <span style={styles.categoryIcon}>{cat.icone}</span>
                                    <span>{cat.nome}</span>
                                </div>
                                <div style={styles.categoryBar}>
                                    <div 
                                        style={{
                                            ...styles.categoryBarFill,
                                            width: `${(cat.total / (dados.resumo.despesas_mes || 1)) * 100}%`,
                                            backgroundColor: cat.cor
                                        }}
                                    />
                                </div>
                                <div style={styles.categoryValue}>{formatCurrency(cat.total)}</div>
                            </div>
                        ))
                    ) : (
                        <p style={styles.emptyText}>Nenhuma despesa no período</p>
                    )}
                </div>
            </div>

            {/* Últimos Lançamentos */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>📋 Últimos Lançamentos</h2>
                <div style={styles.tableContainer}>
                    {dados?.ultimos_lancamentos?.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Data</th>
                                    <th style={styles.th}>Imóvel</th>
                                    <th style={styles.th}>Descrição</th>
                                    <th style={styles.th}>Tipo</th>
                                    <th style={styles.thRight}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.ultimos_lancamentos.map((lanc, i) => (
                                    <tr key={i} style={styles.tr}>
                                        <td style={styles.td}>{formatDate(lanc.data_lancamento)}</td>
                                        <td style={styles.td}>{lanc.imovel_nome}</td>
                                        <td style={styles.td}>
                                            <span style={styles.lancIcon}>{lanc.categoria_icone}</span>
                                            {lanc.descricao}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                backgroundColor: lanc.tipo === 'receita' ? '#dcfce7' : '#fee2e2',
                                                color: lanc.tipo === 'receita' ? '#16a34a' : '#dc2626'
                                            }}>
                                                {lanc.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                                            </span>
                                        </td>
                                        <td style={{
                                            ...styles.tdRight,
                                            color: lanc.tipo === 'receita' ? '#16a34a' : '#dc2626',
                                            fontWeight: '600'
                                        }}>
                                            {lanc.tipo === 'receita' ? '+' : '-'} {formatCurrency(lanc.valor)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.emptyText}>Nenhum lançamento encontrado</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: MODAL LANÇAMENTOS DO IMÓVEL
// ===================================================================================

const LancamentosImovelModal = ({ imovel, token, onClose }) => {
    const hoje = new Date();
    const [mes, setMes] = useState(hoje.getMonth() + 1);
    const [ano, setAno] = useState(hoje.getFullYear());
    const [tipo, setTipo] = useState('');
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editandoLanc, setEditandoLanc] = useState(null);
    const [categorias, setCategorias] = useState([]);

    useEffect(() => {
        fetch(`${API_URL_ADMIN}/categorias`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => setCategorias(Array.isArray(d) ? d : [])).catch(() => {});
    }, [token]);

    const carregar = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ imovel_id: imovel.id, mes, ano });
            if (tipo) params.append('tipo', tipo);
            const r = await fetch(`${API_URL_ADMIN}/lancamentos?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await r.json();
            setLancamentos(Array.isArray(d) ? d : []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { carregar(); }, [mes, ano, tipo]);

    const handleDelete = async (id) => {
        if (!window.confirm('Remover este lançamento?')) return;
        await fetch(`${API_URL_ADMIN}/lancamentos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        carregar();
    };

    const isProprio = imovel.status === 'proprio';
    const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
    const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
    const saldo = totalReceitas - totalDespesas;

    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];

    return (
        <>
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
             onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'960px', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Header */}
                <div style={{ padding:'18px 24px', background:'#1e293b', borderRadius:'16px 16px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        <h2 style={{ margin:0, color:'#fff', fontSize:'17px', fontWeight:700 }}>📋 Lançamentos — {imovel.nome}</h2>
                        <p style={{ margin:'2px 0 0', color:'#94a3b8', fontSize:'13px' }}>{imovel.status === 'proprio' ? '🏠 Imóvel próprio' : imovel.status}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer', fontSize:'18px' }}>×</button>
                </div>
                {/* Filtros */}
                <div style={{ padding:'12px 24px', background:'#f8fafc', borderBottom:'1px solid #e5e7eb', display:'flex', gap:'10px', flexWrap:'wrap' }}>
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} style={styles.select}>
                        {mesesNomes.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))} style={styles.select}>
                        {anos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={tipo} onChange={e => setTipo(e.target.value)} style={styles.select}>
                        <option value=''>Todos</option>
                        <option value='despesa'>Despesas</option>
                        <option value='receita'>Receitas</option>
                    </select>
                </div>
                {/* Resumo */}
                <div style={{ padding:'10px 24px', background:'#f0f4ff', borderBottom:'1px solid #e5e7eb', display:'flex', gap:'24px', alignItems:'center' }}>
                    <div><span style={{ fontSize:'12px', color:'#64748b' }}>Despesas </span><strong style={{ color:'#ef4444' }}>{formatCurrency(totalDespesas)}</strong></div>
                    {!isProprio && <div><span style={{ fontSize:'12px', color:'#64748b' }}>Receitas </span><strong style={{ color:'#22c55e' }}>{formatCurrency(totalReceitas)}</strong></div>}
                    {!isProprio && <div><span style={{ fontSize:'12px', color:'#64748b' }}>Saldo </span><strong style={{ color: saldo >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(saldo)}</strong></div>}
                    {isProprio && <span style={{ fontSize:'12px', color:'#94a3b8', fontStyle:'italic' }}>Imóvel próprio — receitas/saldo não aplicáveis</span>}
                    <div style={{ marginLeft:'auto' }}><span style={{ fontSize:'12px', color:'#64748b' }}>{lancamentos.length} lançamentos</span></div>
                </div>
                {/* Tabela */}
                <div style={{ overflow:'auto', flex:1 }}>
                    {loading ? <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>Carregando…</div> :
                     lancamentos.length === 0 ? <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>Nenhum lançamento neste período.</div> : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    {['Data','Categoria','Descrição','Tipo','Status','Valor','Comprovante',''].map(h =>
                                        <th key={h} style={styles.th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {lancamentos.map(l => (
                                    <tr key={l.id} style={styles.tr}>
                                        <td style={styles.td}>{formatDate(l.data_lancamento)}</td>
                                        <td style={styles.td}>{l.categoria_icone} {l.categoria_nome}</td>
                                        <td style={{ ...styles.td, maxWidth:'240px' }}>
                                            {l.descricao}
                                            {l.observacoes && <div style={{ fontSize:'11px', color:'#94a3b8' }}>{l.observacoes}</div>}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ ...styles.badge, background: l.tipo==='despesa'?'#fee2e2':'#dcfce7', color: l.tipo==='despesa'?'#b91c1c':'#15803d' }}>
                                                {l.tipo === 'despesa' ? 'Despesa' : 'Receita'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ ...styles.badge, background: l.status==='pago'?'#dcfce7':l.status==='cancelado'?'#f1f5f9':'#fef3c7', color: l.status==='pago'?'#166534':l.status==='cancelado'?'#94a3b8':'#92400e' }}>
                                                {l.status==='pago'?'✓ Pago':l.status==='cancelado'?'Cancelado':'⏳ Pendente'}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.tdRight, color: l.tipo==='despesa'?'#ef4444':'#22c55e', fontWeight:700 }}>
                                            {l.tipo==='despesa'?'-':'+'}{formatCurrency(l.valor)}
                                        </td>
                                        <td style={{ ...styles.td, textAlign:'center' }}>
                                            {l.comprovante_url ? <a href={l.comprovante_url} target='_blank' rel='noreferrer' style={{ fontSize:'18px', textDecoration:'none' }}>📎</a> : <span style={{ color:'#d1d5db' }}>—</span>}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display:'flex', gap:'6px' }}>
                                                <button onClick={() => setEditandoLanc(l)} style={{ ...styles.smallButton, color:'#2563eb', background:'#eff6ff', padding:'4px 8px', borderRadius:'6px' }}>✏️ Editar</button>
                                                <button onClick={() => handleDelete(l.id)} style={{ ...styles.smallButton, color:'#dc2626', background:'#fff0f0', padding:'4px 8px', borderRadius:'6px' }}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
        {editandoLanc && (
            <EditarLancamentoModal
                lancamento={editandoLanc}
                token={token}
                categorias={categorias}
                onClose={() => setEditandoLanc(null)}
                onSalvo={() => { setEditandoLanc(null); carregar(); }}
            />
        )}
        </>
    );
};

// ===================================================================================
// COMPONENTE: MODAL EDITAR LANÇAMENTO
// ===================================================================================

const EditarLancamentoModal = ({ lancamento, token, categorias, onClose, onSalvo }) => {
    const [form, setForm] = useState({
        descricao: lancamento.descricao || '',
        valor: lancamento.valor || '',
        tipo: lancamento.tipo || 'despesa',
        status: lancamento.status || 'pendente',
        data_lancamento: lancamento.data_lancamento || '',
        data_vencimento: lancamento.data_vencimento || '',
        data_pagamento: lancamento.data_pagamento || '',
        categoria_id: lancamento.categoria_id || '',
        observacoes: lancamento.observacoes || '',
        pix_chave: lancamento.pix_chave || '',
        codigo_barras: lancamento.codigo_barras || '',
    });
    const [comprovantePreview, setComprovantePreview] = useState(lancamento.comprovante_url || null);
    const [comprovanteBase64, setComprovanteBase64] = useState(undefined);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const fileRef = React.useRef();

    const categoriasFiltradas = categorias.filter(c => c.tipo === form.tipo);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setErro('Arquivo muito grande. Máximo 5MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => { setComprovanteBase64(reader.result); setComprovantePreview(reader.result); };
        reader.readAsDataURL(file);
    };

    const removerComprovante = () => { setComprovanteBase64(null); setComprovantePreview(null); if (fileRef.current) fileRef.current.value = ''; };

    const handleSalvar = async () => {
        if (!form.descricao.trim()) { setErro('Descrição é obrigatória.'); return; }
        if (!form.valor || Number(form.valor) <= 0) { setErro('Valor inválido.'); return; }
        if (!form.categoria_id) { setErro('Selecione uma categoria.'); return; }
        setSalvando(true); setErro('');
        try {
            const payload = {
                descricao: form.descricao.trim(),
                valor: Number(form.valor),
                tipo: form.tipo,
                status: form.status,
                categoria_id: Number(form.categoria_id),
                observacoes: form.observacoes || null,
                pix_chave: form.pix_chave || null,
                codigo_barras: form.codigo_barras || null,
                data_lancamento: form.data_lancamento || undefined,
                data_vencimento: form.data_vencimento || undefined,
                data_pagamento: form.data_pagamento || undefined,
            };
            if (comprovanteBase64 !== undefined) payload.comprovante_base64 = comprovanteBase64;
            const resp = await fetch(`${API_URL_ADMIN}/lancamentos/${lancamento.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) { setErro(data.erro || 'Erro ao salvar.'); return; }
            onSalvo(data);
        } catch (e) { setErro('Erro de conexão.'); } finally { setSalvando(false); }
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
             onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'540px', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>
                <div style={{ padding:'16px 24px', background:'#1e293b', borderRadius:'16px 16px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{ margin:0, color:'#fff', fontSize:'16px', fontWeight:700 }}>✏️ Editar Lançamento #{lancamento.id}</h3>
                    <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'16px' }}>×</button>
                </div>
                <div style={{ overflow:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>
                    {/* Tipo */}
                    <div style={{ display:'flex', gap:'10px' }}>
                        {['despesa','receita'].map(t => (
                            <button key={t} type='button' onClick={() => setForm(f => ({ ...f, tipo:t, categoria_id:'' }))}
                                style={{ flex:1, padding:'10px', borderRadius:'10px', border:'2px solid', cursor:'pointer', fontWeight:700, fontSize:'14px',
                                    borderColor: form.tipo===t ? (t==='despesa'?'#ef4444':'#22c55e') : '#e5e7eb',
                                    background: form.tipo===t ? (t==='despesa'?'#fee2e2':'#dcfce7') : '#fff',
                                    color: form.tipo===t ? (t==='despesa'?'#b91c1c':'#15803d') : '#94a3b8' }}>
                                {t==='despesa'?'📤 Despesa':'📥 Receita'}
                            </button>
                        ))}
                    </div>
                    {/* Descrição */}
                    <div>
                        <label style={styles.label}>Descrição *</label>
                        <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao:e.target.value }))} style={styles.input} placeholder='Ex: Manutenção da piscina' />
                    </div>
                    {/* Valor + Categoria */}
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Valor (R$) *</label>
                            <input type='number' step='0.01' min='0' value={form.valor} onChange={e => setForm(f => ({ ...f, valor:e.target.value }))} style={styles.input} placeholder='0,00' />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Categoria *</label>
                            <select value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id:e.target.value }))} style={styles.select}>
                                <option value=''>Selecione…</option>
                                {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* Datas */}
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Data do Lançamento</label>
                            <input type='date' value={form.data_lancamento||''} onChange={e => setForm(f => ({ ...f, data_lancamento:e.target.value }))} style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Data de Vencimento</label>
                            <input type='date' value={form.data_vencimento||''} onChange={e => setForm(f => ({ ...f, data_vencimento:e.target.value }))} style={styles.input} />
                        </div>
                    </div>
                    {/* Status + Data pagamento */}
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Status</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))} style={styles.select}>
                                <option value='pendente'>⏳ Pendente</option>
                                <option value='pago'>✓ Pago</option>
                                <option value='cancelado'>✗ Cancelado</option>
                            </select>
                        </div>
                        {form.status === 'pago' && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Data do Pagamento</label>
                                <input type='date' value={form.data_pagamento||''} onChange={e => setForm(f => ({ ...f, data_pagamento:e.target.value }))} style={styles.input} />
                            </div>
                        )}
                    </div>
                    {/* Observações */}
                    <div>
                        <label style={styles.label}>Observações</label>
                        <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes:e.target.value }))} rows={2} style={{ ...styles.input, resize:'vertical' }} placeholder='Informações adicionais…' />
                    </div>
                    {/* Dados de Pagamento */}
                    <div style={{ padding:'14px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'#166534', marginBottom:'10px' }}>💳 Dados para Pagamento (opcional)</div>
                        <div>
                            <label style={styles.label}>Chave PIX</label>
                            <input value={form.pix_chave} onChange={e => setForm(f => ({ ...f, pix_chave:e.target.value }))} style={styles.input} placeholder='CPF, CNPJ, email, telefone ou chave aleatória' />
                        </div>
                        <div style={{ marginTop:'10px' }}>
                            <label style={styles.label}>Código de Barras / Linha Digitável</label>
                            <input value={form.codigo_barras} onChange={e => setForm(f => ({ ...f, codigo_barras:e.target.value }))} style={styles.input} placeholder='Ex: 34191.09008 12345.678901...' />
                        </div>
                    </div>
                    {/* Comprovante */}
                    <div>
                        <label style={styles.label}>Comprovante</label>
                        {comprovantePreview ? (
                            <div style={{ border:'1px solid #e5e7eb', borderRadius:'10px', padding:'12px', display:'flex', alignItems:'center', gap:'12px', background:'#f8fafc' }}>
                                {comprovantePreview.startsWith('data:image') ? (
                                    <img src={comprovantePreview} alt='Comprovante' style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'6px' }} />
                                ) : <div style={{ fontSize:'28px' }}>📄</div>}
                                <div style={{ flex:1, fontSize:'13px', color:'#475569' }}>
                                    {comprovanteBase64 !== undefined && comprovanteBase64 !== null ? '✅ Novo comprovante selecionado' : '📎 Comprovante atual'}
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                    <button type='button' onClick={() => fileRef.current?.click()} style={{ ...styles.smallButton, color:'#2563eb', background:'#eff6ff', padding:'5px 10px', borderRadius:'6px' }}>🔄 Trocar</button>
                                    <button type='button' onClick={removerComprovante} style={{ ...styles.smallButton, color:'#dc2626', background:'#fff0f0', padding:'5px 10px', borderRadius:'6px' }}>🗑️ Remover</button>
                                </div>
                            </div>
                        ) : (
                            <button type='button' onClick={() => fileRef.current?.click()} style={{ width:'100%', padding:'14px', borderRadius:'10px', border:'2px dashed #cbd5e1', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:'14px' }}>
                                📎 Clique para anexar comprovante (imagem ou PDF)
                            </button>
                        )}
                        <input ref={fileRef} type='file' accept='image/*,application/pdf' style={{ display:'none' }} onChange={handleFile} />
                    </div>
                    {erro && <div style={{ padding:'10px 14px', borderRadius:'8px', background:'#fee2e2', color:'#b91c1c', fontSize:'13px' }}>⚠️ {erro}</div>}
                </div>
                <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:'10px', background:'#f8fafc', borderRadius:'0 0 16px 16px' }}>
                    <button type='button' onClick={onClose} style={{ ...styles.cancelButton }}>Cancelar</button>
                    <button type='button' onClick={handleSalvar} disabled={salvando} style={{ ...styles.primaryButton, opacity: salvando ? 0.7 : 1 }}>
                        {salvando ? '⏳ Salvando…' : '✅ Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: LISTA DE IMÓVEIS
// ===================================================================================

const Imoveis = () => {
    const { token } = useAuthAdmin();
    const [imoveis, setImoveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [imovelLancamentos, setImovelLancamentos] = useState(null); // Para o modal de lançamentos
    const [form, setForm] = useState({
        nome: '',
        tipo: 'apartamento',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        status: 'proprio',
        valor_aluguel: '',
        valor_mercado: '',
        observacoes: ''
    });

    useEffect(() => {
        fetchImoveis();
    }, []);

    const fetchImoveis = async () => {
        try {
            const response = await fetch(`${API_URL_ADMIN}/imoveis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setImoveis(data);
        } catch (err) {
            console.error('Erro ao carregar imóveis:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editando 
                ? `${API_URL_ADMIN}/imoveis/${editando.id}`
                : `${API_URL_ADMIN}/imoveis`;
            
            const response = await fetch(url, {
                method: editando ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    valor_aluguel: parseFloat(form.valor_aluguel) || 0,
                    valor_mercado: parseFloat(form.valor_mercado) || 0
                })
            });

            if (response.ok) {
                fetchImoveis();
                closeModal();
            }
        } catch (err) {
            console.error('Erro ao salvar imóvel:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este imóvel?')) return;
        
        try {
            await fetch(`${API_URL_ADMIN}/imoveis/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchImoveis();
        } catch (err) {
            console.error('Erro ao deletar imóvel:', err);
        }
    };

    const openModal = (imovel = null) => {
        if (imovel) {
            setEditando(imovel);
            setForm({
                nome: imovel.nome || '',
                tipo: imovel.tipo || 'apartamento',
                endereco: imovel.endereco || '',
                cidade: imovel.cidade || '',
                estado: imovel.estado || '',
                cep: imovel.cep || '',
                status: imovel.status || 'proprio',
                valor_aluguel: imovel.valor_aluguel || '',
                valor_mercado: imovel.valor_mercado || '',
                observacoes: imovel.observacoes || ''
            });
        } else {
            setEditando(null);
            setForm({
                nome: '',
                tipo: 'apartamento',
                endereco: '',
                cidade: '',
                estado: '',
                cep: '',
                status: 'proprio',
                valor_aluguel: '',
                valor_mercado: '',
                observacoes: ''
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditando(null);
    };

    const tiposImovel = [
        { value: 'apartamento', label: '🏢 Apartamento' },
        { value: 'casa', label: '🏠 Casa' },
        { value: 'sala_comercial', label: '🏪 Sala Comercial' },
        { value: 'terreno', label: '🌳 Terreno' },
        { value: 'escritorio', label: '💼 Escritório' },
        { value: 'galpao', label: '🏭 Galpão' },
    ];

    const statusImovel = [
        { value: 'proprio', label: 'Próprio', icon: '🏠', cor: '#e0e7ff', corTexto: '#4f46e5' },
        { value: 'alugado', label: 'Alugado', icon: '💰', cor: '#dcfce7', corTexto: '#16a34a' },
        { value: 'alugado_terceiro', label: 'Alugado (Inquilino)', icon: '🔑', cor: '#dbeafe', corTexto: '#2563eb' },
        { value: 'a_venda', label: 'À Venda', icon: '🏷️', cor: '#fef3c7', corTexto: '#d97706' },
        { value: 'vendido', label: 'Vendido', icon: '✅', cor: '#d1fae5', corTexto: '#059669' },
        { value: 'em_obra', label: 'Em Obra', icon: '🏗️', cor: '#fae8ff', corTexto: '#a855f7' },
        { value: 'em_espera', label: 'Em Espera', icon: '⏸️', cor: '#f1f5f9', corTexto: '#64748b' },
        { value: 'inativo', label: 'Inativo', icon: '🚫', cor: '#fee2e2', corTexto: '#dc2626' },
    ];

    if (loading) {
        return <div style={styles.loading}>Carregando...</div>;
    }

    return (
        <div style={styles.content}>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>🏠 Imóveis</h1>
                <button onClick={() => openModal()} style={styles.primaryButton}>
                    + Novo Imóvel
                </button>
            </div>

            {/* Lista de Imóveis */}
            <div style={styles.imoveisGrid}>
                {imoveis.length > 0 ? (
                    imoveis.map(imovel => (
                        <div key={imovel.id} style={styles.imovelCard}>
                            <div style={styles.imovelHeader}>
                                <span style={styles.imovelIcon}>
                                    {tiposImovel.find(t => t.value === imovel.tipo)?.label?.split(' ')[0] || '🏠'}
                                </span>
                                {(() => {
                                    const statusInfo = statusImovel.find(s => s.value === imovel.status);
                                    return (
                                        <span style={{
                                            ...styles.statusBadge,
                                            backgroundColor: statusInfo?.cor || '#e0e7ff',
                                            color: statusInfo?.corTexto || '#4f46e5'
                                        }}>
                                            {statusInfo?.icon} {statusInfo?.label || imovel.status}
                                        </span>
                                    );
                                })()}
                            </div>
                            <h3 style={styles.imovelNome}>{imovel.nome}</h3>
                            <p style={styles.imovelEndereco}>
                                📍 {imovel.endereco || 'Endereço não informado'}
                                {imovel.cidade && `, ${imovel.cidade}`}
                            </p>
                            
                            <div style={styles.imovelStats}>
                                <div style={styles.imovelStat}>
                                    <span style={styles.statLabel}>Despesas</span>
                                    <span style={{ ...styles.statValue, color: '#dc2626' }}>
                                        {formatCurrency(imovel.total_despesas || 0)}
                                    </span>
                                </div>
                                {imovel.status !== 'proprio' && (
                                    <div style={styles.imovelStat}>
                                        <span style={styles.statLabel}>Receitas</span>
                                        <span style={{ ...styles.statValue, color: '#16a34a' }}>
                                            {formatCurrency(imovel.total_receitas || 0)}
                                        </span>
                                    </div>
                                )}
                                {imovel.status !== 'proprio' && (
                                    <div style={styles.imovelStat}>
                                        <span style={styles.statLabel}>Saldo</span>
                                        <span style={{ 
                                            ...styles.statValue, 
                                            color: (imovel.saldo || 0) >= 0 ? '#16a34a' : '#dc2626' 
                                        }}>
                                            {formatCurrency(imovel.saldo || 0)}
                                        </span>
                                    </div>
                                )}
                                {imovel.status === 'proprio' && (
                                    <div style={{ ...styles.imovelStat, gridColumn: '2 / span 2' }}>
                                        <span style={{ ...styles.statLabel, fontStyle: 'italic', color: '#94a3b8' }}>sem receita de aluguel</span>
                                    </div>
                                )}
                            </div>

                            <div style={styles.imovelActions}>
                                <button 
                                    onClick={() => setImovelLancamentos(imovel)} 
                                    style={{ ...styles.actionButton, color: '#0369a1', background: '#f0f9ff' }}
                                >
                                    📋 Lançamentos
                                </button>
                                <button 
                                    onClick={() => openModal(imovel)} 
                                    style={styles.actionButton}
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleDelete(imovel.id)} 
                                    style={{ ...styles.actionButton, color: '#dc2626' }}
                                >
                                    🗑️ Remover
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>🏠</div>
                        <p>Nenhum imóvel cadastrado</p>
                        <button onClick={() => openModal()} style={styles.primaryButton}>
                            Cadastrar primeiro imóvel
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Lançamentos do Imóvel */}
            {imovelLancamentos && (
                <LancamentosImovelModal
                    imovel={imovelLancamentos}
                    token={token}
                    onClose={() => setImovelLancamentos(null)}
                />
            )}

            {/* Modal */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                {editando ? '✏️ Editar Imóvel' : '🏠 Novo Imóvel'}
                            </h2>
                            <button onClick={closeModal} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nome do Imóvel *</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                    style={styles.input}
                                    placeholder="Ex: Apartamento 101 - Ed. Central"
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Tipo</label>
                                    <select
                                        value={form.tipo}
                                        onChange={e => setForm({ ...form, tipo: e.target.value })}
                                        style={styles.select}
                                    >
                                        {tiposImovel.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        style={styles.select}
                                    >
                                        {statusImovel.map(s => (
                                            <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Endereço</label>
                                <input
                                    type="text"
                                    value={form.endereco}
                                    onChange={e => setForm({ ...form, endereco: e.target.value })}
                                    style={styles.input}
                                    placeholder="Rua, número, complemento"
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Cidade</label>
                                    <input
                                        type="text"
                                        value={form.cidade}
                                        onChange={e => setForm({ ...form, cidade: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Estado</label>
                                    <input
                                        type="text"
                                        value={form.estado}
                                        onChange={e => setForm({ ...form, estado: e.target.value })}
                                        style={styles.input}
                                        maxLength={2}
                                        placeholder="BA"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>CEP</label>
                                    <input
                                        type="text"
                                        value={form.cep}
                                        onChange={e => setForm({ ...form, cep: e.target.value })}
                                        style={styles.input}
                                        placeholder="00000-000"
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Valor Aluguel (R$)</label>
                                    <input
                                        type="number"
                                        value={form.valor_aluguel}
                                        onChange={e => setForm({ ...form, valor_aluguel: e.target.value })}
                                        style={styles.input}
                                        placeholder="0,00"
                                        step="0.01"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Valor de Mercado (R$)</label>
                                    <input
                                        type="number"
                                        value={form.valor_mercado}
                                        onChange={e => setForm({ ...form, valor_mercado: e.target.value })}
                                        style={styles.input}
                                        placeholder="0,00"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Observações</label>
                                <textarea
                                    value={form.observacoes}
                                    onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Anotações sobre o imóvel..."
                                />
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={closeModal} style={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.primaryButton}>
                                    {editando ? 'Salvar Alterações' : 'Cadastrar Imóvel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===================================================================================
// COMPONENTE: MODAL RELATÓRIO DE LANÇAMENTOS
// ===================================================================================

const RelatorioLancamentosModal = ({ lancamentos, imoveis, filtros, onClose }) => {
    const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const imovelNome = filtros.imovel_id ? (imoveis.find(i => String(i.id) === String(filtros.imovel_id))?.nome || 'Imóvel') : 'Todos os imóveis';
    const periodoLabel = `${mesesNomes[filtros.mes - 1]} de ${filtros.ano}`;
    const tipoLabel = filtros.tipo === 'despesa' ? 'Despesas' : filtros.tipo === 'receita' ? 'Receitas' : 'Despesas e Receitas';

    const pendentes = lancamentos.filter(l => l.status === 'pendente');
    const pagos = lancamentos.filter(l => l.status === 'pago');
    const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((a,l) => a + l.valor, 0);
    const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((a,l) => a + l.valor, 0);
    const totalPendente = pendentes.reduce((a,l) => a + l.valor, 0);
    const saldo = totalReceitas - totalDespesas;

    const pendentesPorImovel = pendentes.reduce((acc, l) => {
        const nome = l.imovel_nome || 'Sem imóvel';
        if (!acc[nome]) acc[nome] = [];
        acc[nome].push(l);
        return acc;
    }, {});

    const gerarTexto = () => {
        const linhas = [];
        linhas.push(`📋 *RELATÓRIO PATRIMONIAL - OBRALY*`);
        linhas.push(`🏠 ${imovelNome} | ${periodoLabel}`);
        linhas.push(`─────────────────────────`);
        linhas.push(`💸 Total Despesas: ${formatCurrency(totalDespesas)}`);
        linhas.push(`💚 Total Receitas: ${formatCurrency(totalReceitas)}`);
        linhas.push(`${saldo >= 0 ? '✅' : '🔴'} Saldo: ${formatCurrency(saldo)}`);
        linhas.push(`⏳ A Pagar (pendente): ${formatCurrency(totalPendente)}`);
        linhas.push(`─────────────────────────`);
        if (pendentes.length > 0) {
            linhas.push(`\n📌 *LANÇAMENTOS PENDENTES (${pendentes.length})*`);
            Object.entries(pendentesPorImovel).forEach(([imovel, items]) => {
                linhas.push(`\n🏠 ${imovel}`);
                items.forEach(l => {
                    const venc = l.data_vencimento ? ` | Vence: ${formatDate(l.data_vencimento)}` : '';
                    linhas.push(`  ${l.categoria_icone} ${l.descricao} — ${formatCurrency(l.valor)}${venc}`);
                    if (l.pix_chave) linhas.push(`  🔑 PIX: ${l.pix_chave}`);
                    if (l.codigo_barras) linhas.push(`  📋 Cód. Barras: ${l.codigo_barras}`);
                });
            });
        }
        if (pagos.length > 0) {
            linhas.push(`\n✅ *PAGOS NO PERÍODO (${pagos.length})*`);
            pagos.forEach(l => linhas.push(`  ${l.categoria_icone} ${l.descricao} — ${formatCurrency(l.valor)}`));
        }
        linhas.push(`\n_Gerado pelo Obraly Administração_`);
        return linhas.join('\n');
    };

    const compartilharWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(gerarTexto())}`, '_blank');
    const compartilharEmail = () => {
        const assunto = `Relatório Patrimonial - ${imovelNome} - ${periodoLabel}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(gerarTexto().replace(/\*/g,'').replace(/_/g,''))}`;
    };
    const imprimir = () => {
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Relatório Patrimonial</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:20px;border-bottom:2px solid #1e293b;padding-bottom:8px}h2{font-size:15px;color:#475569;margin:20px 0 8px}.kpis{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px;min-width:140px}.kpi-label{font-size:11px;color:#64748b;text-transform:uppercase}.kpi-value{font-size:18px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}th{background:#f8fafc;padding:8px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e5e7eb}td{padding:8px 12px;border-bottom:1px solid #f1f5f9}.pix-info{font-size:11px;color:#166534;background:#f0fdf4;padding:3px 8px;border-radius:4px;margin-top:3px}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;text-align:right}</style>
        </head><body>${document.getElementById('relatorio-print-area').innerHTML}
        <div class="footer">Gerado em ${new Date().toLocaleDateString('pt-BR')} pelo Obraly Administração</div>
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 400);
    };

    return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
             onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{background:'#fff',borderRadius:'16px',width:'100%',maxWidth:'820px',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.35)'}}>
                {/* Header */}
                <div style={{padding:'18px 24px',background:'#1e293b',borderRadius:'16px 16px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                        <h2 style={{margin:0,color:'#fff',fontSize:'17px',fontWeight:700}}>📊 Relatório de Lançamentos</h2>
                        <p style={{margin:'2px 0 0',color:'#94a3b8',fontSize:'13px'}}>{imovelNome} · {periodoLabel} · {tipoLabel}</p>
                    </div>
                    <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:'8px',width:'34px',height:'34px',cursor:'pointer',fontSize:'18px'}}>×</button>
                </div>
                {/* Botões */}
                <div style={{padding:'14px 24px',background:'#f8fafc',borderBottom:'1px solid #e5e7eb',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                    <button onClick={compartilharWhatsApp} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 18px',borderRadius:'10px',border:'none',background:'#25D366',color:'#fff',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                        <span style={{fontSize:'18px'}}>💬</span> WhatsApp
                    </button>
                    <button onClick={compartilharEmail} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 18px',borderRadius:'10px',border:'none',background:'#3b82f6',color:'#fff',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                        <span style={{fontSize:'18px'}}>📧</span> Email
                    </button>
                    <button onClick={imprimir} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 18px',borderRadius:'10px',border:'1px solid #e5e7eb',background:'#fff',color:'#1e293b',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                        <span style={{fontSize:'18px'}}>🖨️</span> Imprimir / PDF
                    </button>
                </div>
                {/* Conteúdo */}
                <div style={{overflow:'auto',padding:'24px',flex:1}}>
                    <div id="relatorio-print-area">
                        <h1 style={{margin:'0 0 4px',fontSize:'20px',fontWeight:800,color:'#1e293b'}}>📋 Relatório Patrimonial</h1>
                        <p style={{margin:'0 0 20px',color:'#64748b',fontSize:'14px'}}>{imovelNome} · {periodoLabel} · Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                        {/* KPIs */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:'12px',marginBottom:'24px'}}>
                            {[
                                {label:'Despesas',value:formatCurrency(totalDespesas),color:'#dc2626',bg:'#fee2e2'},
                                {label:'Receitas',value:formatCurrency(totalReceitas),color:'#16a34a',bg:'#dcfce7'},
                                {label:'Saldo',value:formatCurrency(saldo),color:saldo>=0?'#16a34a':'#dc2626',bg:saldo>=0?'#dcfce7':'#fee2e2'},
                                {label:'A Pagar',value:formatCurrency(totalPendente),color:'#d97706',bg:'#fef3c7'},
                                {label:'Pendentes',value:pendentes.length,color:'#d97706',bg:'#fef3c7'},
                            ].map(k => (
                                <div key={k.label} style={{background:k.bg,borderRadius:'10px',padding:'14px 16px'}}>
                                    <div style={{fontSize:'11px',color:'#64748b',fontWeight:600,textTransform:'uppercase',marginBottom:'4px'}}>{k.label}</div>
                                    <div style={{fontSize:'17px',fontWeight:800,color:k.color}}>{k.value}</div>
                                </div>
                            ))}
                        </div>
                        {/* Pendentes */}
                        {pendentes.length > 0 && (
                            <div style={{marginBottom:'24px'}}>
                                <h2 style={{fontSize:'15px',fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'8px 14px',borderRadius:'8px',margin:'0 0 10px'}}>
                                    ⏳ Pendentes — a pagar ({pendentes.length}) · {formatCurrency(totalPendente)}
                                </h2>
                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                                    <thead>
                                        <tr style={{background:'#f8fafc',borderBottom:'2px solid #e5e7eb'}}>
                                            {['Imóvel','Categoria','Descrição','Vencimento','Pagamento','Valor'].map(h =>
                                                <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'#475569',fontWeight:600}}>{h}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendentes.map(l => (
                                            <tr key={l.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                                <td style={{padding:'8px 12px',color:'#64748b',fontSize:'12px'}}>{l.imovel_nome}</td>
                                                <td style={{padding:'8px 12px'}}>{l.categoria_icone} {l.categoria_nome}</td>
                                                <td style={{padding:'8px 12px',fontWeight:500}}>
                                                    {l.descricao}
                                                    {l.pix_chave && <div style={{fontSize:'11px',color:'#166534',background:'#f0fdf4',padding:'2px 6px',borderRadius:'4px',marginTop:'3px'}}>🔑 PIX: {l.pix_chave}</div>}
                                                    {l.codigo_barras && <div style={{fontSize:'11px',color:'#1d4ed8',background:'#eff6ff',padding:'2px 6px',borderRadius:'4px',marginTop:'3px'}}>📋 {l.codigo_barras}</div>}
                                                </td>
                                                <td style={{padding:'8px 12px',color:l.data_vencimento && new Date(l.data_vencimento+'T00:00:00')<new Date()?'#dc2626':'#64748b',fontWeight:500}}>
                                                    {l.data_vencimento ? formatDate(l.data_vencimento) : '—'}
                                                    {l.data_vencimento && new Date(l.data_vencimento+'T00:00:00') < new Date() && <span style={{marginLeft:'6px',fontSize:'11px',background:'#fee2e2',color:'#dc2626',padding:'1px 6px',borderRadius:'999px',fontWeight:700}}>VENCIDO</span>}
                                                </td>
                                                <td style={{padding:'8px 12px',fontSize:'12px'}}>
                                                    {l.pix_chave ? '🔑 PIX' : l.codigo_barras ? '📋 Boleto' : '—'}
                                                </td>
                                                <td style={{padding:'8px 12px',fontWeight:700,color:l.tipo==='despesa'?'#dc2626':'#16a34a',textAlign:'right'}}>
                                                    {l.tipo==='despesa'?'-':'+'}{formatCurrency(l.valor)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* Pagos */}
                        {pagos.length > 0 && (
                            <div>
                                <h2 style={{fontSize:'15px',fontWeight:700,color:'#166534',background:'#dcfce7',padding:'8px 14px',borderRadius:'8px',margin:'0 0 10px'}}>
                                    ✅ Pagos no período ({pagos.length})
                                </h2>
                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                                    <thead>
                                        <tr style={{background:'#f8fafc',borderBottom:'2px solid #e5e7eb'}}>
                                            {['Imóvel','Categoria','Descrição','Pagamento','Valor'].map(h =>
                                                <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'#475569',fontWeight:600}}>{h}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagos.map(l => (
                                            <tr key={l.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                                <td style={{padding:'8px 12px',color:'#64748b',fontSize:'12px'}}>{l.imovel_nome}</td>
                                                <td style={{padding:'8px 12px'}}>{l.categoria_icone} {l.categoria_nome}</td>
                                                <td style={{padding:'8px 12px',fontWeight:500}}>{l.descricao}</td>
                                                <td style={{padding:'8px 12px',color:'#64748b'}}>{l.data_pagamento ? formatDate(l.data_pagamento) : '—'}</td>
                                                <td style={{padding:'8px 12px',fontWeight:700,color:l.tipo==='despesa'?'#dc2626':'#16a34a',textAlign:'right'}}>
                                                    {l.tipo==='despesa'?'-':'+'}{formatCurrency(l.valor)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {lancamentos.length === 0 && <div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>Nenhum lançamento encontrado no período.</div>}
                    </div>
                </div>
                <div style={{padding:'14px 24px',borderTop:'1px solid #e5e7eb',background:'#f8fafc',borderRadius:'0 0 16px 16px',display:'flex',justifyContent:'flex-end'}}>
                    <button onClick={onClose} style={{padding:'9px 20px',borderRadius:'8px',border:'1px solid #e5e7eb',background:'#fff',color:'#475569',fontWeight:600,cursor:'pointer',fontSize:'14px'}}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: LANÇAMENTOS
// ===================================================================================

const Lancamentos = () => {
    const { token } = useAuthAdmin();
    const [lancamentos, setLancamentos] = useState([]);
    const [imoveis, setImoveis] = useState([]);
    const [showRelatorio, setShowRelatorio] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filtros, setFiltros] = useState({
        imovel_id: '',
        tipo: '',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
    });
    const [form, setForm] = useState({
        imovel_id: '',
        categoria_id: '',
        descricao: '',
        valor: '',
        tipo: 'despesa',
        data_lancamento: getTodayString(),
        data_vencimento: '',
        data_pagamento: '',
        status: 'pendente',
        recorrente: false,
        recorrencia_meses: '1',
        qtd_parcelas: '12',
        observacoes: '',
        pix_chave: '',
        codigo_barras: ''
    });

    useEffect(() => {
        fetchDados();
    }, [filtros]);

    const fetchDados = async () => {
        try {
            // Carregar lançamentos
            let url = `${API_URL_ADMIN}/lancamentos?mes=${filtros.mes}&ano=${filtros.ano}`;
            if (filtros.imovel_id) url += `&imovel_id=${filtros.imovel_id}`;
            if (filtros.tipo) url += `&tipo=${filtros.tipo}`;

            const [lancRes, imovRes, catRes] = await Promise.all([
                fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL_ADMIN}/imoveis`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL_ADMIN}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            setLancamentos(await lancRes.json());
            setImoveis(await imovRes.json());
            setCategorias(await catRes.json());
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL_ADMIN}/lancamentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    valor: parseFloat(form.valor) || 0,
                    recorrencia_meses: parseInt(form.recorrencia_meses) || 1,
                    qtd_parcelas: parseInt(form.qtd_parcelas) || 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                const msg = data.message || 'Lançamento criado!';
                alert(msg);
                fetchDados();
                setShowModal(false);
                setForm({
                    imovel_id: '',
                    categoria_id: '',
                    descricao: '',
                    valor: '',
                    tipo: 'despesa',
                    data_lancamento: getTodayString(),
                    data_vencimento: '',
                    data_pagamento: '',
                    status: 'pendente',
                    recorrente: false,
                    recorrencia_meses: '1',
                    qtd_parcelas: '12',
                    observacoes: ''
                });
            }
        } catch (err) {
            console.error('Erro ao salvar lançamento:', err);
        }
    };

    const [showModalPagar, setShowModalPagar] = useState(false);
    const [lancamentoPagar, setLancamentoPagar] = useState(null);
    const [pagamentoForm, setPagamentoForm] = useState({
        data_pagamento: getTodayString(),
        comprovante_base64: ''
    });

    const abrirModalPagar = (lancamento) => {
        setLancamentoPagar(lancamento);
        setPagamentoForm({
            data_pagamento: getTodayString(),
            comprovante_base64: ''
        });
        setShowModalPagar(true);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.match(/image\/(jpeg|png|jpg)|application\/pdf/)) {
            alert('Formato inválido. Use JPG, PNG ou PDF.');
            return;
        }

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 5MB.');
            return;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (event) => {
            setPagamentoForm({ ...pagamentoForm, comprovante_base64: event.target.result });
        };
        reader.readAsDataURL(file);
    };

    const handlePagar = async () => {
        if (!lancamentoPagar) return;
        
        try {
            // Primeiro marcar como pago
            const response = await fetch(`${API_URL_ADMIN}/lancamentos/${lancamentoPagar.id}/pagar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    data_pagamento: pagamentoForm.data_pagamento,
                    comprovante_url: pagamentoForm.comprovante_base64 || null
                })
            });

            if (response.ok) {
                setShowModalPagar(false);
                setLancamentoPagar(null);
                fetchDados();
            }
        } catch (err) {
            console.error('Erro ao marcar como pago:', err);
        }
    };

    const [showComprovante, setShowComprovante] = useState(null);
    const [editandoLanc, setEditandoLanc] = useState(null);

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este lançamento?')) return;
        
        try {
            await fetch(`${API_URL_ADMIN}/lancamentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDados();
        } catch (err) {
            console.error('Erro ao deletar lançamento:', err);
        }
    };

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const categoriasFiltradas = categorias.filter(c => c.tipo === form.tipo);

    if (loading) {
        return <div style={styles.loading}>Carregando...</div>;
    }

    return (
        <div style={styles.content}>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>💰 Lançamentos</h1>
                <div style={{ display:'flex', gap:'10px' }}>
                    <button onClick={() => setShowRelatorio(true)}
                        style={{ ...styles.primaryButton, background:'#475569', display:'flex', alignItems:'center', gap:'6px' }}>
                        📊 Gerar Relatório
                    </button>
                    <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
                        + Novo Lançamento
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div style={styles.filtrosBar}>
                <select
                    value={filtros.imovel_id}
                    onChange={e => setFiltros({ ...filtros, imovel_id: e.target.value })}
                    style={styles.select}
                >
                    <option value="">Todos os imóveis</option>
                    {imoveis.map(i => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                    ))}
                </select>
                <select
                    value={filtros.tipo}
                    onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}
                    style={styles.select}
                >
                    <option value="">Todos os tipos</option>
                    <option value="despesa">Despesas</option>
                    <option value="receita">Receitas</option>
                </select>
                <select
                    value={filtros.mes}
                    onChange={e => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
                    style={styles.select}
                >
                    {meses.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select
                    value={filtros.ano}
                    onChange={e => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
                    style={styles.select}
                >
                    {[2024, 2025, 2026, 2027].map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>

            {/* Tabela */}
            <div style={styles.tableContainer}>
                {lancamentos.length > 0 ? (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Data</th>
                                <th style={styles.th}>Imóvel</th>
                                <th style={styles.th}>Categoria</th>
                                <th style={styles.th}>Descrição</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.thRight}>Valor</th>
                                <th style={styles.th}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lancamentos.map(lanc => (
                                <tr key={lanc.id} style={styles.tr}>
                                    <td style={styles.td}>{formatDate(lanc.data_lancamento)}</td>
                                    <td style={styles.td}>{lanc.imovel_nome}</td>
                                    <td style={styles.td}>
                                        <span style={styles.lancIcon}>{lanc.categoria_icone}</span>
                                        {lanc.categoria_nome}
                                    </td>
                                    <td style={styles.td}>{lanc.descricao}</td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.badge,
                                            backgroundColor: lanc.status === 'pago' ? '#dcfce7' : 
                                                            lanc.status === 'pendente' ? '#fef3c7' : '#fee2e2',
                                            color: lanc.status === 'pago' ? '#16a34a' : 
                                                   lanc.status === 'pendente' ? '#d97706' : '#dc2626'
                                        }}>
                                            {lanc.status === 'pago' ? '✓ Pago' : 
                                             lanc.status === 'pendente' ? '⏳ Pendente' : '✗ Cancelado'}
                                        </span>
                                    </td>
                                    <td style={{
                                        ...styles.tdRight,
                                        color: lanc.tipo === 'receita' ? '#16a34a' : '#dc2626',
                                        fontWeight: '600'
                                    }}>
                                        {lanc.tipo === 'receita' ? '+' : '-'} {formatCurrency(lanc.valor)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {lanc.status === 'pendente' && (
                                                <button
                                                    onClick={() => abrirModalPagar(lanc)}
                                                    style={{ ...styles.smallButton, color: '#16a34a', fontWeight: '600' }}
                                                    title="Registrar pagamento"
                                                >
                                                    💵 Pagar
                                                </button>
                                            )}
                                            {lanc.status === 'pago' && lanc.comprovante_url && (
                                                <button
                                                    onClick={() => setShowComprovante(lanc)}
                                                    style={{ ...styles.smallButton, color: '#3b82f6' }}
                                                    title="Ver comprovante"
                                                >
                                                    📎
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditandoLanc(lanc)}
                                                style={{ ...styles.smallButton, color: '#2563eb' }}
                                                title="Editar lançamento"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lanc.id)}
                                                style={{ ...styles.smallButton, color: '#dc2626' }}
                                                title="Remover"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>💰</div>
                        <p>Nenhum lançamento encontrado</p>
                        <button onClick={() => setShowModal(true)} style={styles.primaryButton}>
                            Criar primeiro lançamento
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Relatório */}
            {showRelatorio && (
                <RelatorioLancamentosModal
                    lancamentos={lancamentos}
                    imoveis={imoveis}
                    filtros={filtros}
                    onClose={() => setShowRelatorio(false)}
                />
            )}

            {/* Modal Registrar Pagamento */}
            {showModalPagar && lancamentoPagar && (
                <div style={styles.modalOverlay} onClick={() => setShowModalPagar(false)}>
                    <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>💵 Registrar Pagamento</h2>
                            <button onClick={() => setShowModalPagar(false)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            {/* Info do Lançamento */}
                            <div style={styles.pagamentoInfo}>
                                <div style={styles.pagamentoLinha}>
                                    <span>{lancamentoPagar.categoria_icone}</span>
                                    <strong>{lancamentoPagar.descricao}</strong>
                                </div>
                                <div style={styles.pagamentoLinha}>
                                    <span style={{ color: '#64748b' }}>Imóvel:</span>
                                    <span>{lancamentoPagar.imovel_nome}</span>
                                </div>
                                <div style={styles.pagamentoLinha}>
                                    <span style={{ color: '#64748b' }}>Valor:</span>
                                    <span style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
                                        {formatCurrency(lancamentoPagar.valor)}
                                    </span>
                                </div>
                                {lancamentoPagar.data_vencimento && (
                                    <div style={styles.pagamentoLinha}>
                                        <span style={{ color: '#64748b' }}>Vencimento:</span>
                                        <span>{formatDate(lancamentoPagar.data_vencimento)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Data do Pagamento */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Data do Pagamento *</label>
                                <input
                                    type="date"
                                    value={pagamentoForm.data_pagamento}
                                    onChange={e => setPagamentoForm({ ...pagamentoForm, data_pagamento: e.target.value })}
                                    style={styles.input}
                                />
                            </div>

                            {/* Upload de Comprovante */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Comprovante (opcional)</label>
                                <div style={styles.uploadArea}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                                        onChange={handleFileChange}
                                        style={styles.fileInput}
                                        id="comprovante-input"
                                    />
                                    <label htmlFor="comprovante-input" style={styles.uploadLabel}>
                                        {pagamentoForm.comprovante_base64 ? (
                                            <div style={styles.uploadPreview}>
                                                {pagamentoForm.comprovante_base64.startsWith('data:image') ? (
                                                    <img 
                                                        src={pagamentoForm.comprovante_base64} 
                                                        alt="Preview" 
                                                        style={styles.previewImg}
                                                    />
                                                ) : (
                                                    <div style={styles.pdfIcon}>📄 PDF</div>
                                                )}
                                                <span style={styles.uploadedText}>✓ Arquivo selecionado</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '32px' }}>📎</span>
                                                <span>Clique para anexar comprovante</span>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>JPG, PNG ou PDF (máx. 5MB)</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                {pagamentoForm.comprovante_base64 && (
                                    <button 
                                        type="button"
                                        onClick={() => setPagamentoForm({ ...pagamentoForm, comprovante_base64: '' })}
                                        style={styles.removeFileButton}
                                    >
                                        ✕ Remover arquivo
                                    </button>
                                )}
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowModalPagar(false)} style={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button type="button" onClick={handlePagar} style={styles.primaryButton}>
                                    ✓ Confirmar Pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Comprovante */}
            {showComprovante && (
                <div style={styles.modalOverlay} onClick={() => setShowComprovante(null)}>
                    <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>📎 Comprovante</h2>
                            <button onClick={() => setShowComprovante(null)} style={styles.closeButton}>×</button>
                        </div>
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <p style={{ marginBottom: '16px', color: '#64748b' }}>
                                {showComprovante.descricao} - {formatCurrency(showComprovante.valor)}
                            </p>
                            {showComprovante.comprovante_url?.startsWith('data:image') ? (
                                <img 
                                    src={showComprovante.comprovante_url} 
                                    alt="Comprovante" 
                                    style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px' }}
                                />
                            ) : showComprovante.comprovante_url?.startsWith('data:application/pdf') ? (
                                <div>
                                    <p style={{ fontSize: '48px', marginBottom: '16px' }}>📄</p>
                                    <a 
                                        href={showComprovante.comprovante_url} 
                                        download={`comprovante_${showComprovante.id}.pdf`}
                                        style={styles.primaryButton}
                                    >
                                        📥 Baixar PDF
                                    </a>
                                </div>
                            ) : (
                                <p>Formato não suportado</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Lançamento */}
            {editandoLanc && (
                <EditarLancamentoModal
                    lancamento={editandoLanc}
                    token={token}
                    categorias={categorias}
                    onClose={() => setEditandoLanc(null)}
                    onSalvo={() => { setEditandoLanc(null); fetchDados(); }}
                />
            )}

            {/* Modal Novo Lançamento */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>💰 Novo Lançamento</h2>
                            <button onClick={() => setShowModal(false)} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} style={styles.modalBody}>
                            {/* Tipo */}
                            <div style={styles.tipoSelector}>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, tipo: 'despesa', categoria_id: '' })}
                                    style={{
                                        ...styles.tipoButton,
                                        ...(form.tipo === 'despesa' ? styles.tipoButtonActiveDespesa : {})
                                    }}
                                >
                                    ↓ Despesa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, tipo: 'receita', categoria_id: '' })}
                                    style={{
                                        ...styles.tipoButton,
                                        ...(form.tipo === 'receita' ? styles.tipoButtonActiveReceita : {})
                                    }}
                                >
                                    ↑ Receita
                                </button>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Imóvel *</label>
                                    <select
                                        value={form.imovel_id}
                                        onChange={e => setForm({ ...form, imovel_id: e.target.value })}
                                        style={styles.select}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {imoveis.map(i => (
                                            <option key={i.id} value={i.id}>{i.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Categoria *</label>
                                    <select
                                        value={form.categoria_id}
                                        onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                                        style={styles.select}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {categoriasFiltradas.map(c => (
                                            <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Descrição *</label>
                                <input
                                    type="text"
                                    value={form.descricao}
                                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                                    style={styles.input}
                                    placeholder="Ex: Condomínio Fevereiro"
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Valor (R$) *</label>
                                    <input
                                        type="number"
                                        value={form.valor}
                                        onChange={e => setForm({ ...form, valor: e.target.value })}
                                        style={styles.input}
                                        placeholder="0,00"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Data de Vencimento</label>
                                    <input
                                        type="date"
                                        value={form.data_vencimento}
                                        onChange={e => setForm({ ...form, data_vencimento: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Status do Pagamento */}
                            <div style={styles.statusSelector}>
                                <label style={styles.label}>Status do Pagamento</label>
                                <div style={styles.statusOptions}>
                                    <label 
                                        style={{
                                            ...styles.statusOption,
                                            ...(form.status === 'pendente' ? styles.statusOptionActivePendente : {})
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="status"
                                            value="pendente"
                                            checked={form.status === 'pendente'}
                                            onChange={e => setForm({ ...form, status: e.target.value, data_pagamento: '' })}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={styles.statusIcon}>⏳</span>
                                        <div>
                                            <div style={styles.statusTitle}>Lançamento Futuro</div>
                                            <div style={styles.statusDesc}>Aguardando pagamento</div>
                                        </div>
                                    </label>
                                    <label 
                                        style={{
                                            ...styles.statusOption,
                                            ...(form.status === 'pago' ? styles.statusOptionActivePago : {})
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="status"
                                            value="pago"
                                            checked={form.status === 'pago'}
                                            onChange={e => setForm({ ...form, status: e.target.value, data_pagamento: getTodayString() })}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={styles.statusIcon}>✅</span>
                                        <div>
                                            <div style={styles.statusTitle}>Já Pago</div>
                                            <div style={styles.statusDesc}>Pagamento realizado</div>
                                        </div>
                                    </label>
                                </div>
                                
                                {/* Data de Pagamento se já pago */}
                                {form.status === 'pago' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <label style={styles.label}>Data do Pagamento</label>
                                        <input
                                            type="date"
                                            value={form.data_pagamento || getTodayString()}
                                            onChange={e => setForm({ ...form, data_pagamento: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                )}
                                
                                {/* Alerta de vencimento */}
                                {form.status === 'pendente' && form.data_vencimento && (
                                    <div style={styles.alertaVencimentoForm}>
                                        ⏰ Este lançamento aparecerá nos alertas quando o vencimento estiver próximo
                                    </div>
                                )}
                            </div>

                            {/* Recorrência */}
                            <div style={styles.recorrenciaBox}>
                                <label style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={form.recorrente}
                                        onChange={e => setForm({ ...form, recorrente: e.target.checked })}
                                        style={styles.checkbox}
                                    />
                                    <span>🔄 Lançamento recorrente</span>
                                </label>
                                
                                {form.recorrente && (
                                    <div style={styles.recorrenciaOptions}>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Repetir a cada</label>
                                            <select
                                                value={form.recorrencia_meses}
                                                onChange={e => setForm({ ...form, recorrencia_meses: e.target.value })}
                                                style={styles.select}
                                            >
                                                <option value="1">1 mês</option>
                                                <option value="2">2 meses</option>
                                                <option value="3">3 meses (trimestral)</option>
                                                <option value="6">6 meses (semestral)</option>
                                                <option value="12">12 meses (anual)</option>
                                            </select>
                                        </div>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Quantidade de parcelas</label>
                                            <input
                                                type="number"
                                                value={form.qtd_parcelas}
                                                onChange={e => setForm({ ...form, qtd_parcelas: e.target.value })}
                                                style={styles.input}
                                                min="1"
                                                max="60"
                                                placeholder="12"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dados de Pagamento PIX/Boleto */}
                            <div style={{ padding:'14px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:'4px' }}>
                                <div style={{ fontSize:'13px', fontWeight:700, color:'#166534', marginBottom:'10px' }}>💳 Dados para Pagamento (opcional)</div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Chave PIX</label>
                                    <input
                                        type="text"
                                        value={form.pix_chave}
                                        onChange={e => setForm({ ...form, pix_chave: e.target.value })}
                                        style={styles.input}
                                        placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
                                    />
                                </div>
                                <div style={{ ...styles.formGroup, marginTop:'10px' }}>
                                    <label style={styles.label}>Código de Barras / Linha Digitável</label>
                                    <input
                                        type="text"
                                        value={form.codigo_barras}
                                        onChange={e => setForm({ ...form, codigo_barras: e.target.value })}
                                        style={styles.input}
                                        placeholder="Ex: 34191.09008 12345.678901..."
                                    />
                                </div>
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.primaryButton}>
                                    Salvar Lançamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===================================================================================
// COMPONENTE: RELATÓRIOS (Placeholder)
// ===================================================================================

const Relatorios = () => {
    return (
        <div style={styles.content}>
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>📈 Relatórios</h1>
            </div>
            <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📊</div>
                <p>Módulo de relatórios em desenvolvimento</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Em breve: Fluxo de caixa, Rentabilidade, DRE por imóvel</p>
            </div>
        </div>
    );
};

// ===================================================================================
// COMPONENTE: USUÁRIOS (Admin Only)
// ===================================================================================

const Usuarios = () => {
    const { token } = useAuthAdmin();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState({
        username: '',
        nome: '',
        email: '',
        password: '',
        role: 'operador'
    });
    const [erro, setErro] = useState('');

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const response = await fetch(`${API_URL_ADMIN}/usuarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsuarios(data);
            }
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        
        try {
            const url = editando 
                ? `${API_URL_ADMIN}/usuarios/${editando.id}`
                : `${API_URL_ADMIN}/usuarios`;
            
            const body = editando 
                ? { nome: form.nome, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) }
                : form;
            
            const response = await fetch(url, {
                method: editando ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            
            if (!response.ok) {
                setErro(data.erro || 'Erro ao salvar usuário');
                return;
            }

            fetchUsuarios();
            closeModal();
        } catch (err) {
            setErro('Erro ao salvar usuário');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja desativar este usuário?')) return;
        
        try {
            await fetch(`${API_URL_ADMIN}/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchUsuarios();
        } catch (err) {
            console.error('Erro ao desativar usuário:', err);
        }
    };

    const openModal = (usuario = null) => {
        if (usuario) {
            setEditando(usuario);
            setForm({
                username: usuario.username,
                nome: usuario.nome || '',
                email: usuario.email || '',
                password: '',
                role: usuario.role || 'operador'
            });
        } else {
            setEditando(null);
            setForm({
                username: '',
                nome: '',
                email: '',
                password: '',
                role: 'operador'
            });
        }
        setErro('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditando(null);
        setErro('');
    };

    if (loading) {
        return <div style={styles.loading}>Carregando...</div>;
    }

    return (
        <div style={styles.content}>
            {/* Header */}
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>👥 Usuários</h1>
                <button onClick={() => openModal()} style={styles.primaryButton}>
                    + Novo Usuário
                </button>
            </div>

            {/* Lista de Usuários */}
            <div style={styles.section}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Usuário</th>
                            <th style={styles.th}>Nome</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Perfil</th>
                            <th style={styles.th}>Criado em</th>
                            <th style={styles.th}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(usuario => (
                            <tr key={usuario.id} style={styles.tr}>
                                <td style={styles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={styles.avatarSmall}>
                                            {usuario.nome?.charAt(0)?.toUpperCase() || '👤'}
                                        </div>
                                        <strong>{usuario.username}</strong>
                                    </div>
                                </td>
                                <td style={styles.td}>{usuario.nome}</td>
                                <td style={styles.td}>{usuario.email || '-'}</td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: usuario.role === 'admin' ? '#fee2e2' : '#e0e7ff',
                                        color: usuario.role === 'admin' ? '#dc2626' : '#4f46e5'
                                    }}>
                                        {usuario.role === 'admin' ? '👑 Admin' : '👤 Operador'}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td style={styles.td}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => openModal(usuario)}
                                            style={styles.smallButton}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(usuario.id)}
                                            style={{ ...styles.smallButton, color: '#dc2626' }}
                                            title="Desativar"
                                        >
                                            🚫
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {usuarios.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>👥</div>
                        <p>Nenhum usuário cadastrado</p>
                        <button onClick={() => openModal()} style={styles.primaryButton}>
                            Cadastrar primeiro usuário
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                {editando ? '✏️ Editar Usuário' : '👤 Novo Usuário'}
                            </h2>
                            <button onClick={closeModal} style={styles.closeButton}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} style={styles.modalBody}>
                            {!editando && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Username *</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                        style={styles.input}
                                        placeholder="usuario123"
                                        required
                                    />
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nome Completo *</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                    style={styles.input}
                                    placeholder="João da Silva"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    style={styles.input}
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    {editando ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    style={styles.input}
                                    placeholder="Mínimo 6 caracteres"
                                    {...(!editando && { required: true, minLength: 6 })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Perfil de Acesso</label>
                                <div style={styles.roleSelector}>
                                    <label 
                                        style={{
                                            ...styles.roleOption,
                                            ...(form.role === 'operador' ? styles.roleOptionActive : {})
                                        }}
                                        onClick={() => setForm({ ...form, role: 'operador' })}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value="operador"
                                            checked={form.role === 'operador'}
                                            onChange={() => {}}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '24px' }}>👤</span>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>Operador</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Acesso básico</div>
                                        </div>
                                    </label>
                                    <label 
                                        style={{
                                            ...styles.roleOption,
                                            ...(form.role === 'admin' ? styles.roleOptionActiveAdmin : {})
                                        }}
                                        onClick={() => setForm({ ...form, role: 'admin' })}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={form.role === 'admin'}
                                            onChange={() => {}}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '24px' }}>👑</span>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>Administrador</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Acesso total</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {erro && <p style={styles.error}>{erro}</p>}

                            <div style={styles.modalFooter}>
                                <button type="button" onClick={closeModal} style={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.primaryButton}>
                                    {editando ? 'Salvar Alterações' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===================================================================================
// COMPONENTE: DASHBOARD PRINCIPAL (Layout)
// ===================================================================================

const DashboardAdmin = () => {
    const { user, logout } = useAuthAdmin();
    const [activeMenu, setActiveMenu] = useState('dashboard');

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'imoveis': return <Imoveis />;
            case 'lancamentos': return <Lancamentos />;
            case 'relatorios': return <Relatorios />;
            case 'usuarios': return <Usuarios />;
            default: return <Dashboard />;
        }
    };

    return (
        <div style={styles.layout}>
            <Sidebar 
                activeMenu={activeMenu} 
                setActiveMenu={setActiveMenu} 
                user={user}
                onLogout={logout}
            />
            <main style={styles.main}>
                {renderContent()}
            </main>
        </div>
    );
};

// ===================================================================================
// COMPONENTE PRINCIPAL: APP ADMIN
// ===================================================================================

const AppAdmin = ({ onBack }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('token_admin');
        const savedUser = localStorage.getItem('user_admin');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (data) => {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token_admin', data.access_token);
        localStorage.setItem('user_admin', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token_admin');
        localStorage.removeItem('user_admin');
    };

    if (loading) {
        return <div style={styles.loadingScreen}>Carregando...</div>;
    }

    return (
        <AuthAdminContext.Provider value={{ user, token, login, logout }}>
            {user ? <DashboardAdmin /> : <LoginScreenAdmin onBack={onBack} />}
        </AuthAdminContext.Provider>
    );
};

// ===================================================================================
// ESTILOS
// ===================================================================================

const styles = {
    // Layout
    layout: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
    },
    main: {
        flex: 1,
        overflow: 'auto',
    },
    content: {
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
    },

    // Sidebar
    sidebar: {
        width: '260px',
        backgroundColor: '#1e293b',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
    },
    sidebarHeader: {
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid #334155',
    },
    sidebarLogo: {
        fontSize: '32px',
    },
    sidebarTitle: {
        fontSize: '20px',
        fontWeight: '700',
    },
    sidebarSubtitle: {
        fontSize: '12px',
        color: '#94a3b8',
    },
    sidebarNav: {
        flex: 1,
        padding: '16px 12px',
    },
    menuItem: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#cbd5e1',
        fontSize: '15px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
        marginBottom: '4px',
    },
    menuItemActive: {
        backgroundColor: '#10b981',
        color: '#fff',
    },
    menuIcon: {
        fontSize: '18px',
    },
    sidebarFooter: {
        padding: '16px',
        borderTop: '1px solid #334155',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
    },
    userName: {
        fontSize: '14px',
        fontWeight: '600',
    },
    userRole: {
        fontSize: '12px',
        color: '#94a3b8',
    },
    logoutButton: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #475569',
        backgroundColor: 'transparent',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '14px',
    },

    // Page Header
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    pageTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
    },

    // Cards
    cardsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
    },
    card: {
        padding: '24px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
    cardBlue: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#fff',
    },
    cardGreen: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
    },
    cardRed: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
    },
    cardIcon: {
        fontSize: '40px',
    },
    cardInfo: {},
    cardValue: {
        fontSize: '24px',
        fontWeight: '700',
    },
    cardLabel: {
        fontSize: '14px',
        opacity: 0.9,
    },

    // Alert
    alertBox: {
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        color: '#92400e',
        marginBottom: '24px',
        fontSize: '15px',
    },

    // Section
    section: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        marginTop: 0,
        marginBottom: '20px',
    },

    // Category List
    categoryList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    categoryItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    categoryInfo: {
        width: '150px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#475569',
    },
    categoryIcon: {
        fontSize: '18px',
    },
    categoryBar: {
        flex: 1,
        height: '8px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    categoryBarFill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.3s',
    },
    categoryValue: {
        width: '100px',
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
    },

    // Table
    tableContainer: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        textAlign: 'left',
        padding: '12px 16px',
        borderBottom: '2px solid #e2e8f0',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    thRight: {
        textAlign: 'right',
        padding: '12px 16px',
        borderBottom: '2px solid #e2e8f0',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    tr: {
        borderBottom: '1px solid #f1f5f9',
    },
    td: {
        padding: '14px 16px',
        fontSize: '14px',
        color: '#334155',
    },
    tdRight: {
        padding: '14px 16px',
        fontSize: '14px',
        textAlign: 'right',
    },
    lancIcon: {
        marginRight: '8px',
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
    },

    // Imóveis Grid
    imoveisGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
    },
    imovelCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    imovelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    imovelIcon: {
        fontSize: '32px',
    },
    statusBadge: {
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
    },
    imovelNome: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 8px 0',
    },
    imovelEndereco: {
        fontSize: '14px',
        color: '#64748b',
        margin: '0 0 16px 0',
    },
    imovelStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        padding: '16px 0',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
    },
    imovelStat: {
        textAlign: 'center',
    },
    statLabel: {
        display: 'block',
        fontSize: '12px',
        color: '#64748b',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '16px',
        fontWeight: '700',
    },
    imovelActions: {
        display: 'flex',
        gap: '12px',
        marginTop: '16px',
    },
    actionButton: {
        flex: 1,
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        color: '#475569',
        fontSize: '14px',
        cursor: 'pointer',
    },

    // Empty State
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748b',
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px',
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        padding: '20px',
    },

    // Buttons
    primaryButton: {
        padding: '12px 24px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '12px 24px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        color: '#64748b',
        fontSize: '15px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    smallButton: {
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '14px',
        cursor: 'pointer',
    },

    // Filtros
    filtrosBar: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
    },

    // Selects
    select: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        backgroundColor: '#fff',
        minWidth: '150px',
    },
    periodSelector: {
        display: 'flex',
        gap: '8px',
    },

    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#1e293b',
        margin: 0,
    },
    closeButton: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#f1f5f9',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#64748b',
    },
    modalBody: {
        padding: '24px',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '24px',
    },

    // Form
    formGroup: {
        marginBottom: '16px',
        flex: 1,
    },
    formRow: {
        display: 'flex',
        gap: '16px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '6px',
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        fontSize: '15px',
        boxSizing: 'border-box',
    },

    // Tipo Selector
    tipoSelector: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
    },
    tipoButton: {
        flex: 1,
        padding: '14px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        color: '#64748b',
    },
    tipoButtonActiveDespesa: {
        borderColor: '#ef4444',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
    },
    tipoButtonActiveReceita: {
        borderColor: '#10b981',
        backgroundColor: '#dcfce7',
        color: '#059669',
    },

    // Login
    loginContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: '30px',
        left: '30px',
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    loginCard: {
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        borderRadius: '24px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    },
    loginHeader: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    loginIcon: {
        width: '70px',
        height: '70px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        margin: '0 auto 16px',
        boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
    },
    loginTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1f2937',
        margin: '0 0 4px 0',
    },
    loginSubtitle: {
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
    },
    loginForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    submitButton: {
        padding: '14px',
        borderRadius: '12px',
        border: 'none',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    error: {
        color: '#dc2626',
        fontSize: '14px',
        textAlign: 'center',
        margin: 0,
    },

    // Loading
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: '#64748b',
        fontSize: '16px',
    },
    loadingScreen: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        fontSize: '16px',
    },

    // Alertas de Vencimento
    alertasSection: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
    },
    alertaVencido: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '16px',
        padding: '20px',
        borderLeft: '4px solid #dc2626',
    },
    alertaAVencer: {
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '16px',
        padding: '20px',
        borderLeft: '4px solid #f59e0b',
    },
    alertaHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
    },
    alertaIcon: {
        fontSize: '28px',
    },
    alertaTotal: {
        marginLeft: '12px',
        fontSize: '18px',
        fontWeight: '700',
    },
    alertaItems: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    alertaItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: '8px',
        fontSize: '14px',
    },
    alertaCategoria: {
        marginRight: '8px',
    },
    alertaImovel: {
        color: '#64748b',
        fontWeight: 'normal',
    },
    alertaInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    alertaDias: {
        color: '#dc2626',
        fontWeight: '600',
        fontSize: '12px',
    },
    alertaDiasVencer: {
        color: '#d97706',
        fontWeight: '600',
        fontSize: '12px',
    },
    alertaValor: {
        fontWeight: '700',
        fontSize: '15px',
    },

    // Recorrência
    recorrenciaBox: {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '500',
        color: '#374151',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    recorrenciaOptions: {
        display: 'flex',
        gap: '16px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
    },

    // Pagamento e Comprovante
    pagamentoInfo: {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
    },
    pagamentoLinha: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #e2e8f0',
    },
    uploadArea: {
        position: 'relative',
    },
    fileInput: {
        position: 'absolute',
        opacity: 0,
        width: '100%',
        height: '100%',
        cursor: 'pointer',
    },
    uploadLabel: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '30px',
        border: '2px dashed #e2e8f0',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        color: '#64748b',
    },
    uploadPreview: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    previewImg: {
        maxWidth: '150px',
        maxHeight: '100px',
        borderRadius: '8px',
        objectFit: 'cover',
    },
    pdfIcon: {
        fontSize: '48px',
        marginBottom: '8px',
    },
    uploadedText: {
        color: '#16a34a',
        fontWeight: '600',
    },
    removeFileButton: {
        marginTop: '8px',
        padding: '6px 12px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#dc2626',
        fontSize: '13px',
        cursor: 'pointer',
    },

    // Status Selector (Já pago / Lançamento futuro)
    statusSelector: {
        marginBottom: '16px',
    },
    statusOptions: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    statusOption: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    statusOptionActivePendente: {
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
    },
    statusOptionActivePago: {
        borderColor: '#10b981',
        backgroundColor: '#dcfce7',
    },
    statusIcon: {
        fontSize: '28px',
    },
    statusTitle: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1e293b',
    },
    statusDesc: {
        fontSize: '12px',
        color: '#64748b',
    },
    alertaVencimentoForm: {
        marginTop: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        color: '#92400e',
        fontSize: '13px',
    },

    // Usuários
    avatarSmall: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#e0e7ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '600',
        color: '#4f46e5',
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
    },
    roleSelector: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    roleOption: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    roleOptionActive: {
        borderColor: '#4f46e5',
        backgroundColor: '#eef2ff',
    },
    roleOptionActiveAdmin: {
        borderColor: '#dc2626',
        backgroundColor: '#fef2f2',
    },
};

export default AppAdmin;
