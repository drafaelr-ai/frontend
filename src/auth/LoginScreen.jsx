import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import './LoginScreen.css';

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
        <div className="ls-wrapper">
            {/* Painel escuro esquerdo — 42% */}
            <div className="ls-dark">
                <div className="ls-logo">
                    <img src="/obraly-mark.png" alt="" className="ls-logo-box" />
                    <span className="ls-logo-text">Obraly</span>
                </div>

                <div className="ls-dark-mid">
                    <h1 className="ls-headline">
                        Gestão de obras<br />de ponta a ponta.
                    </h1>
                    <p className="ls-subheadline">
                        Orçamentos, pagamentos, cronogramas.<br />Tudo num só lugar.
                    </p>
                </div>

                <div className="ls-dark-stats">
                    <div className="ls-stat">
                        <span className="ls-stat-number">17</span>
                        <span className="ls-stat-label">OBRAS ATIVAS</span>
                    </div>
                    <div className="ls-stat-divider"></div>
                    <div className="ls-stat">
                        <span className="ls-stat-number">v2.0</span>
                        <span className="ls-stat-label">2026</span>
                    </div>
                </div>
            </div>

            {/* Painel claro direito — 58% */}
            <div className="ls-light">
                {onBack && (
                    <button className="ls-back" onClick={onBack} type="button">
                        ← Voltar
                    </button>
                )}

                <div className="ls-form-wrap">
                    <div className="ls-form-header">
                        <h2 className="ls-title">Bem-vindo de volta</h2>
                        <p className="ls-subtitle">Entre com suas credenciais para continuar.</p>
                    </div>

                    <form onSubmit={handleLogin} className="ls-form" noValidate>
                        <div className="ls-field">
                            <label className="ls-label" htmlFor="ls-username">Usuário</label>
                            <div className="ls-input-wrap">
                                <i className="ti ti-user ls-input-icon" aria-hidden="true"></i>
                                <input
                                    id="ls-username"
                                    type="text"
                                    className="ls-input"
                                    placeholder="admin_principal"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="ls-field">
                            <label className="ls-label" htmlFor="ls-password">Senha</label>
                            <div className="ls-input-wrap">
                                <i className="ti ti-lock ls-input-icon" aria-hidden="true"></i>
                                <input
                                    id="ls-password"
                                    type="password"
                                    className="ls-input"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="ls-forgot-row">
                            <span className="ls-forgot">Esqueci minha senha</span>
                        </div>

                        {error && (
                            <div className="ls-error" role="alert">
                                <i className="ti ti-alert-circle" aria-hidden="true"></i>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="ls-btn-submit"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Entrando...' : (
                                <>
                                    Entrar
                                    <i className="ti ti-arrow-right" aria-hidden="true"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="ls-footer-hint">Problemas para entrar? Contate o admin.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
