import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import './ModuleSelectorScreen.css';

const MODULES = [
    {
        id: 'obras',
        icon: 'building-skyscraper',
        title: 'Obras',
        description: 'Gestão de construções, orçamentos e pagamentos.',
        color: '#0061FC',
        colorDark: '#0138A5',
        gradient: 'linear-gradient(135deg, #0061FC 0%, #0138A5 100%)'
    },
    {
        id: 'admin',
        icon: 'home-2',
        title: 'Administração',
        description: 'Patrimônio: imóveis, aluguéis e despesas.',
        color: '#25B663',
        colorDark: '#108C54',
        gradient: 'linear-gradient(135deg, #25B663 0%, #108C54 100%)'
    },
    {
        id: 'rh',
        icon: 'users-group',
        title: 'Pessoal / RH',
        description: 'Funcionários, convenções e encargos.',
        color: '#FE6901',
        colorDark: '#CD4E00',
        gradient: 'linear-gradient(135deg, #FE6901 0%, #CD4E00 100%)'
    },
    {
        id: 'frota',
        icon: 'truck',
        title: 'Frota',
        description: 'Veículos, manutenções e documentos.',
        color: '#632ED6',
        colorDark: '#4818A8',
        gradient: 'linear-gradient(135deg, #632ED6 0%, #4818A8 100%)'
    }
];

const MOD_LABEL = { obras: 'OBRAS', admin: 'ADM', rh: 'RH', frota: 'FROTA' };
const MOD_COLOR = { obras: '#0061FC', admin: '#25B663', rh: '#FE6901', frota: '#632ED6' };

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

function saudacao() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

const ModuleSelectorScreen = ({ onSelectModule, user, allowedModules, onLogout, onManageAccess, onChangePassword }) => {
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

    // Mesmo mapeamento de tipo → aba usado na Obras Home, pra abrir direto
    // na ocorrência (lançamento/boleto/parcela) em vez da home genérica.
    const PAGINA_POR_TIPO = { lancamento: 'financeiro', parcela: 'financeiro', pagamento_futuro: 'financeiro', boleto: 'boletos' };

    const abrirPendencia = async (p) => {
        await onSelectModule(p.modulo === 'admin' ? 'admin' : 'obras');
        if (p.modulo === 'obras' && p.origem_id) {
            const pagina = PAGINA_POR_TIPO[p.tipo];
            window.location.href = pagina ? `?obra=${p.origem_id}&page=${pagina}` : `?obra=${p.origem_id}`;
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
    const heroModule = visibleModules[0];
    const restModules = visibleModules.slice(1);

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, var(--module-navy) 0%, var(--module-navy-soft) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            fontFamily: 'var(--font-sans)'
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
                    <img src="/obraly-mark.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
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
            <div style={{ margin: '40px 0 28px', textAlign: 'center', maxWidth: '640px' }}>
                <h1 style={{
                    fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0,
                    letterSpacing: '-0.5px'
                }}>
                    {saudacao()}{user?.username ? `, ${user.username}` : ''}
                </h1>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginTop: '6px' }}>
                    {visibleModules.length > 0
                        ? 'Escolha um módulo para continuar'
                        : 'Seu usuário não tem acesso a nenhum módulo — fale com o administrador.'}
                </p>
            </div>

            {heroModule && (
                <div className="ms-body">
                    {/* Card hero — módulo principal */}
                    <div
                        className={`ms-hero-card${restModules.length === 0 ? ' ms-hero-card--solo' : ''}`}
                        onClick={() => onSelectModule(heroModule.id)}
                        style={{
                            borderRadius: '24px',
                            background: heroModule.gradient,
                            padding: '26px 28px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            boxShadow: `0 12px 32px ${heroModule.color}40`
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{
                                width: '58px', height: '58px', borderRadius: '17px',
                                background: 'rgba(255,255,255,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <i className={`ti ti-${heroModule.icon}`} style={{ color: '#fff', fontSize: 26 }} />
                            </div>
                            {vencidosPorModulo[heroModule.id] > 0 && (
                                <span style={{
                                    background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)',
                                    fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '999px'
                                }}>
                                    {vencidosPorModulo[heroModule.id]} vencido{vencidosPorModulo[heroModule.id] !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
                                {heroModule.title}
                            </h2>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0', lineHeight: 1.5 }}>
                                {heroModule.description}
                            </p>
                        </div>
                        <div style={{
                            marginTop: 'auto', padding: '13px 0', borderRadius: '12px',
                            background: '#fff', color: heroModule.color, fontSize: '14px', fontWeight: '700',
                            textAlign: 'center'
                        }}>
                            Entrar em {heroModule.title} →
                        </div>
                    </div>

                    {/* Demais módulos — linhas compactas */}
                    {restModules.length > 0 && (
                        <div className="ms-rows-col">
                            {restModules.map(module => {
                                const vencidos = vencidosPorModulo[module.id] || 0;
                                return (
                                    <div
                                        key={module.id}
                                        className="ms-row-card"
                                        onClick={() => onSelectModule(module.id)}
                                        style={{
                                            flex: 1,
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '20px',
                                            padding: '18px 20px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: '46px', height: '46px', borderRadius: '14px',
                                            background: `${module.color}38`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <i className={`ti ti-${module.icon}`} style={{ color: module.color, fontSize: 20 }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{module.title}</span>
                                                {vencidos > 0 && (
                                                    <span style={{
                                                        background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)',
                                                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px'
                                                    }}>
                                                        {vencidos} vencido{vencidos !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
                                                {module.description}
                                            </p>
                                        </div>
                                        <i className="ti ti-chevron-right" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Painel Atenção hoje */}
            {pendencias.length > 0 && (
                <div style={{
                    width: '100%', maxWidth: '1080px', marginTop: '20px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '20px', padding: '18px 22px 14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <i className="ti ti-alert-triangle" style={{ color: 'var(--status-warning)', fontSize: 16 }} />
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
                                color: p.situacao === 'vencido' ? '#f87171' : 'var(--status-warning)',
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
