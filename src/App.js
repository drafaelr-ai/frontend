import React, { useState, useEffect } from 'react';
import './App.css';
import AppAdmin from './AppAdmin';
import { ToastContainer } from './utils/notify';
import { logger } from './utils/logger';
import { AuthContext } from './auth/AuthContext';
import LoginScreen from './auth/LoginScreen';
import ModuleSelectorScreen from './layout/ModuleSelectorScreen';
import Dashboard from './screens/Dashboard';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState(null); // null = seletor, 'obras' ou 'admin'

    useEffect(() => {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            const savedModule = localStorage.getItem('selectedModule');

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
                setSelectedModule(savedModule || 'obras');
            }
        } catch (error) {
            logger.error("Falha ao carregar dados de autenticação:", error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedModule');
        }
        setIsLoading(false);
    }, []);

    const handleSelectModule = (moduleId) => {
        setSelectedModule(moduleId);
        localStorage.setItem('selectedModule', moduleId);
    };

    const handleBackToSelector = () => {
        setSelectedModule(null);
        localStorage.removeItem('selectedModule');
    };

    const login = (data) => {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setSelectedModule(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedModule');
    };

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    if (!selectedModule && !user) {
        return <ModuleSelectorScreen onSelectModule={handleSelectModule} />;
    }

    if (selectedModule === 'admin') {
        return <AppAdmin onBack={handleBackToSelector} />;
    }

    return (
        <>
            <ToastContainer />
            <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                {user ? <Dashboard /> : <LoginScreen onBack={handleBackToSelector} />}
            </AuthContext.Provider>
        </>
    );
}

export default App;
