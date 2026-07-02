import React, { useState } from 'react';

const ModuleSelectorScreen = ({ onSelectModule }) => {
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
        }
    ];

    return (
        <main style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
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
                    Selecione o módulo para continuar
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
                {modules.map(module => (
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
