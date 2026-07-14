import React, { useState } from 'react';

const ModuleSelectorScreen = ({ onSelectModule, user, allowedModules, onLogout, onManageAccess }) => {
    const [hoveredModule, setHoveredModule] = useState(null);

    const modules = [
        {
            id: 'obras',
            icon: '🏗️',
            title: 'Obras',
            subtitle: 'Gestão de Construções',
            description: 'Gerencie obras, orçamentos, cronogramas, pagamentos e equipes.',
            color: '#6366f1',
            gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        },
        {
            id: 'admin',
            icon: '🏢',
            title: 'Administração',
            subtitle: 'Gestão Patrimonial',
            description: 'Controle custos de imóveis, aluguéis, despesas e receitas.',
            color: '#10b981',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        },
        {
            id: 'rh',
            icon: <i className="ti ti-users-group" style={{ color: '#fff' }} />,
            title: 'Pessoal / RH',
            subtitle: 'Gestão de Pessoas',
            description: 'Funcionários, convenções, pagamentos de salário e encargos de todas as obras.',
            color: '#f59e0b',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
        },
        {
            id: 'frota',
            icon: <i className="ti ti-truck" style={{ color: '#fff' }} />,
            title: 'Frota',
            subtitle: 'Controle de Veículos',
            description: 'Veículos alocados em obras e imóveis, documentos, manutenções, abastecimentos e multas.',
            color: '#0ea5e9',
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
        }
    ];

    // Sem lista de permitidos (uso legado) → mostra tudo.
    const visibleModules = allowedModules
        ? modules.filter(m => allowedModules.includes(m.id))
        : modules;

    const headerBtn = {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff',
        borderRadius: '10px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            position: 'relative'
        }}>
            {/* Ações do usuário logado */}
            {(user || onManageAccess) && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    {user && (
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                            <i className="ti ti-user" style={{ marginRight: 4 }} /> {user.username}
                        </span>
                    )}
                    {onManageAccess && (
                        <button style={headerBtn} onClick={onManageAccess}>
                            <i className="ti ti-users-plus" /> Gerenciar acessos
                        </button>
                    )}
                    {onLogout && (
                        <button style={headerBtn} onClick={onLogout}>
                            <i className="ti ti-logout" /> Sair
                        </button>
                    )}
                </div>
            )}

            {/* Logo */}
            <div style={{
                marginBottom: '40px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '48px',
                    fontWeight: '700',
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '-1px',
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    Obraly
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '8px'
                }}>
                    {visibleModules.length > 0
                        ? 'Selecione o módulo para continuar'
                        : 'Seu usuário não tem acesso a nenhum módulo — fale com o administrador.'}
                </p>
            </div>

            {/* Cards de Módulos */}
            <div style={{
                display: 'flex',
                gap: '30px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '800px'
            }}>
                {visibleModules.map(module => (
                    <div
                        key={module.id}
                        onClick={() => onSelectModule(module.id)}
                        onMouseEnter={() => setHoveredModule(module.id)}
                        onMouseLeave={() => setHoveredModule(null)}
                        style={{
                            width: '320px',
                            padding: '40px 30px',
                            borderRadius: '24px',
                            background: hoveredModule === module.id
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(20px)',
                            border: hoveredModule === module.id
                                ? `2px solid ${module.color}`
                                : '2px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            transform: hoveredModule === module.id ? 'translateY(-8px) scale(1.02)' : 'translateY(0)',
                            boxShadow: hoveredModule === module.id
                                ? `0 20px 40px rgba(0,0,0,0.4), 0 0 60px ${module.color}30`
                                : '0 10px 30px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Ícone */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: module.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            marginBottom: '24px',
                            boxShadow: `0 10px 30px ${module.color}40`
                        }}>
                            {module.icon}
                        </div>

                        {/* Título */}
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: '#fff',
                            margin: '0 0 4px 0'
                        }}>
                            {module.title}
                        </h2>

                        {/* Subtítulo */}
                        <p style={{
                            fontSize: '14px',
                            color: module.color,
                            fontWeight: '600',
                            margin: '0 0 16px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            {module.subtitle}
                        </p>

                        {/* Descrição */}
                        <p style={{
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.6)',
                            margin: 0,
                            lineHeight: '1.6'
                        }}>
                            {module.description}
                        </p>

                        {/* Botão */}
                        <div style={{
                            marginTop: '24px',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            background: hoveredModule === module.id ? module.gradient : 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            textAlign: 'center',
                            transition: 'all 0.3s ease'
                        }}>
                            {hoveredModule === module.id ? 'Entrar →' : 'Selecionar'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <p style={{
                marginTop: '50px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)'
            }}>
                © 2026 Obraly - Sistema de Gestão
            </p>
        </main>
    );
};

export default ModuleSelectorScreen;
