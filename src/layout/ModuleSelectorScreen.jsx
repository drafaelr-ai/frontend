import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

const MODULES = [
    {
        id: 'obras',
        icon: '🏗️',
        title: 'Obras',
        description: 'Gestão de construções, orçamentos e pagamentos.',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    {
        id: 'admin',
        icon: '🏢',
        title: 'Administração',
        description: 'Patrimônio: imóveis, aluguéis e despesas.',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
        id: 'rh',
        icon: <i className="ti ti-users-group" style={{ color: '#fff' }} />,
        title: 'Pessoal / RH',
        description: 'Funcionários, convenções e encargos.',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
        id: 'frota',
        icon: <i className="ti ti-truck" style={{ color: '#fff' }} />,
        title: 'Frota',
        description: 'Veículos, manutenções e documentos.',
        color: '#0ea5e9',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    }
];

const MOD_LABEL = { obras: 'OBRAS', admin: 'ADM', rh: 'RH', frota: 'FROTA' };
const MOD_COLOR = { obras: '#818cf8', admin: '#34d399', rh: '#fbbf24', frota: '#38bdf8' };

function dataBR(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

function brl(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function situacaoLabel(p) {
    if (p.situacao === 'vencido') return `vencido há ${Math.abs(p.dias)} dia${Math.abs(p.dias) !== 1 ? 's' : ''}`;
    if (p.situacao === 'vence_hoje') return 'vence hoje';
    if (p.dias === 1) return 'vence amanhã';
    return `vence ${dataBR(p.data_vencimento)}`;
}

const ModuleSelectorScreen = ({ onSelectModule, user, allowedModules, onLogout, onManageAccess, onChangePassword }) => {
    const [hoveredModule, setHoveredModule] = useState(null);
    const [alertas, setAlertas] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetchWithAuth(`${API_URL}/home/alertas`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => { if (data) setAlertas(data); })
            .catch(e => logger.warn('alertas da home indisponíveis:', e));
    }, [user]);

    const visibleModules = allowedModules
        ? MODULES.filter(m => allowedModules.includes(m.id))
        : MODULES;

    const vencidosPorModulo = {
        obras: alertas?.resumo?.obras?.vencidos || 0,
        admin: alertas?.resumo?.admin?.vencidos || 0,
    };

    const abrirPendencia = async (p) => {
        await onSelectModule(p.modulo === 'admin' ? 'admin' : 'obras');
        if (p.modulo === 'obras' && p.origem_id) {
            window.location.href = `?obra=${p.origem_id}`;
        }
    };

    const headerBtn = {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff',
        borderRadius: '10px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    };

    const pendencias = alertas?.pendencias || [];

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
            {/* Topbar */}
            <div style={{
                width: '100%',
                maxWidth: '1080px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                paddingTop: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: '#6366f1', display: 'inline-block' }} />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Obraly</span>
                </div>
                <span style={{ flex: 1 }} />
                {user && (
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                        <i className="ti ti-user" style={{ marginRight: 4 }} /> {user.username}{user.role === 'master' ? ' · master' : ''}
                    </span>
                )}
                {onManageAccess && (
                    <button style={headerBtn} onClick={onManageAccess}>
                        <i className="ti ti-users-plus" /> Gerenciar acessos
                    </button>
                )}
                {onChangePassword && (
                    <button style={headerBtn} onClick={onChangePassword}>
                        <i className="ti ti-key" /> Alterar senha
                    </button>
                )}
                {onLogout && (
                    <button style={headerBtn} onClick={onLogout}>
                        <i className="ti ti-logout" /> Sair
                    </button>
                )}
            </div>

            {/* Saudação */}
            <div style={{ margin: '42px 0 26px', textAlign: 'center' }}>
                <h1 style={{
                    fontSize: '30px', fontWeight: '700', color: '#fff', margin: 0,
                    letterSpacing: '-0.5px', textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    Obraly
                </h1>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>
                    {visibleModules.length > 0
                        ? 'Escolha um módulo para continuar'
                        : 'Seu usuário não tem acesso a nenhum módulo — fale com o administrador.'}
                </p>
            </div>

            {/* Cards de módulo */}
            <div style={{
                display: 'flex', gap: '18px', flexWrap: 'wrap',
                justifyContent: 'center', maxWidth: '1080px'
            }}>
                {visibleModules.map(module => {
                    const vencidos = vencidosPorModulo[module.id] || 0;
                    const hovered = hoveredModule === module.id;
                    return (
                        <div
                            key={module.id}
                            onClick={() => onSelectModule(module.id)}
                            onMouseEnter={() => setHoveredModule(module.id)}
                            onMouseLeave={() => setHoveredModule(null)}
                            style={{
                                width: '244px',
                                padding: '22px',
                                borderRadius: '20px',
                                background: hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(20px)',
                                border: hovered ? `1.5px solid ${module.color}` : '1.5px solid rgba(255,255,255,0.14)',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                                boxShadow: hovered
                                    ? `0 16px 34px rgba(0,0,0,0.4), 0 0 50px ${module.color}30`
                                    : '0 8px 24px rgba(0,0,0,0.2)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '14px',
                                    background: module.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px',
                                    boxShadow: `0 8px 22px ${module.color}55`
                                }}>
                                    {module.icon}
                                </div>
                                {vencidos > 0 && (
                                    <span style={{
                                        background: '#ef4444', color: '#fff', fontSize: '11px',
                                        fontWeight: 700, padding: '3px 9px', borderRadius: '999px'
                                    }}>
                                        {vencidos} vencido{vencidos !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '14px 0 4px' }}>
                                {module.title}
                            </h2>
                            <p style={{
                                fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                                margin: 0, lineHeight: '1.5', minHeight: '39px'
                            }}>
                                {module.description}
                            </p>
                            <div style={{
                                marginTop: '16px', padding: '8px 0', borderRadius: '10px',
                                background: hovered ? module.gradient : 'rgba(255,255,255,0.12)',
                                color: '#fff', fontSize: '13px', fontWeight: '600',
                                textAlign: 'center', transition: 'all 0.25s ease'
                            }}>
                                Entrar →
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Painel Atenção hoje */}
            {pendencias.length > 0 && (
                <div style={{
                    width: '100%', maxWidth: '1060px', marginTop: '28px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1.5px solid rgba(255,255,255,0.13)',
                    borderRadius: '20px', padding: '18px 22px 14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ color: '#fbbf24', fontSize: '15px' }}>⚠</span>
                        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Atenção hoje</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                            · {pendencias.length} pendência{pendencias.length !== 1 ? 's' : ''} vencida{pendencias.length !== 1 ? 's' : ''} ou vencendo
                        </span>
                        <span style={{ flex: 1 }} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500 }}>
                            {[
                                alertas?.resumo?.obras?.qtd ? `${alertas.resumo.obras.qtd} em Obras` : null,
                                alertas?.resumo?.admin?.qtd ? `${alertas.resumo.admin.qtd} em Administração` : null,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    </div>
                    {pendencias.slice(0, 8).map((p, i) => (
                        <div
                            key={i}
                            onClick={() => abrirPendencia(p)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                                background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                                padding: '9px 14px', marginBottom: '6px', cursor: 'pointer'
                            }}
                        >
                            <span style={{
                                width: '58px', textAlign: 'center',
                                border: `1px solid ${MOD_COLOR[p.modulo] || '#fff'}80`,
                                background: `${MOD_COLOR[p.modulo] || '#fff'}2e`,
                                color: MOD_COLOR[p.modulo] || '#fff',
                                fontSize: '10px', fontWeight: 700, borderRadius: '999px', padding: '3px 0'
                            }}>
                                {MOD_LABEL[p.modulo] || p.modulo}
                            </span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                                {p.descricao} — {brl(p.valor)}
                            </span>
                            <span style={{
                                color: p.situacao === 'vencido' ? '#f87171' : '#fbbf24',
                                fontSize: '12px', fontWeight: 500
                            }}>
                                · {situacaoLabel(p)}
                            </span>
                            <span style={{ flex: 1 }} />
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                                em {p.origem || '—'}
                            </span>
                            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>Ver →</span>
                        </div>
                    ))}
                    {alertas?.aviso_admin && (
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: '6px 2px 0' }}>
                            {alertas.aviso_admin}
                        </p>
                    )}
                </div>
            )}

            {/* Footer */}
            <p style={{ marginTop: '40px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                © 2026 Obraly - Sistema de Gestão
            </p>
        </main>
    );
};

export default ModuleSelectorScreen;
