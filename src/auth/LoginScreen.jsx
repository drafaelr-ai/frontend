import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

const LoginScreen = ({ onBack }) => {
    const { login } = useAuth();
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
            login(data);
        })
        .catch(err => {
            logger.error("Erro no login:", err);
            setError(err.message || "Credenciais inválidas. Verifique seu usuário e senha.");
            setIsLoading(false);
        });
    };

    return (
        <div className="login-screen">
            {/* Overlay para profundidade */}
            <div className="overlay"></div>

            {/* Elementos flutuantes decorativos */}
            <div className="floating-shape circle-1"></div>
            <div className="floating-shape square-1"></div>
            <div className="floating-shape triangle-1"></div>

            {/* Botão Voltar */}
            {onBack && (
                <button
                    onClick={onBack}
                    style={{
                        position: 'absolute',
                        top: '30px',
                        left: '30px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                >
                    ← Voltar
                </button>
            )}

            {/* Card de login */}
            <div className="login-card">
                <h1 style={{
                    color: '#4f46e5',
                    textAlign: 'center',
                    fontSize: '2.5em',
                    marginBottom: '30px',
                    fontWeight: '700',
                    margin: '0 0 30px 0'
                }}>
                    Obraly
                </h1>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            padding: '12px',
                            fontSize: '1em',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                        onBlur={(e) => e.target.style.borderColor = '#ccc'}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: '12px',
                            fontSize: '1em',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            transition: 'all 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                        onBlur={(e) => e.target.style.borderColor = '#ccc'}
                        required
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '12px',
                            fontSize: '1em',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontWeight: '600'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4338ca'}
                        onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                    {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
