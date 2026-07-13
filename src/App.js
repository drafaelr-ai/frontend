import React, { useState, useEffect, lazy, Suspense } from 'react';
import './App.css';
import { ToastContainer } from './utils/notify';
import { logger } from './utils/logger';
import { AuthContext } from './auth/AuthContext';
import { setToken as storeToken, getToken as loadToken, removeToken as deleteToken } from './auth/tokenStorage';
import LoginScreen from './auth/LoginScreen';
import ModuleSelectorScreen from './layout/ModuleSelectorScreen';
import ObraDetalhe from './screens/ObraDetalhe';
import Dashboard from './screens/Dashboard';
import SuperlinkPublico from './screens/SuperlinkPublico';

const AppAdmin = lazy(() => import('./AppAdmin'));
const RHModule = lazy(() => import('./screens/RH'));
const FrotaModule = lazy(() => import('./screens/Frota'));

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState(null); // null = seletor, 'obras' ou 'admin'

    useEffect(() => {
        const loadAuth = async () => {
            try {
                const savedToken = await loadToken('token');
                const savedUser = await loadToken('user');
                const savedModule = await loadToken('selectedModule');

                if (savedToken && savedUser) {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                    setSelectedModule(savedModule || 'obras');
                }
            } catch (error) {
                logger.error("Falha ao carregar dados de autenticação:", error);
                try { await deleteToken('token'); } catch {}
                try { await deleteToken('user'); } catch {}
                try { await deleteToken('selectedModule'); } catch {}
            } finally {
                setIsLoading(false);
            }
        };
        loadAuth();
    }, []);

    const handleSelectModule = async (moduleId) => {
        setSelectedModule(moduleId);
        await storeToken('selectedModule', moduleId);
    };

    const handleBackToSelector = async () => {
        setSelectedModule(null);
        await deleteToken('selectedModule');
    };

    const login = async (data) => {
        setToken(data.access_token);
        setUser(data.user);
        await storeToken('token', data.access_token);
        await storeToken('user', JSON.stringify(data.user));
    };

    const logout = async () => {
        setToken(null);
        setUser(null);
        setSelectedModule(null);
        await deleteToken('token');
        await deleteToken('user');
        await deleteToken('selectedModule');
    };

    // Rota pública — fora do fluxo de autenticação
    const _path = window.location.pathname;
    if (_path.startsWith('/pagar/')) {
        const _token = _path.replace('/pagar/', '').split('/')[0];
        return <SuperlinkPublico token={_token} />;
    }

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    if (!selectedModule && !user) {
        return <ModuleSelectorScreen onSelectModule={handleSelectModule} />;
    }

    if (selectedModule === 'admin') {
        return (
            <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
                <ToastContainer />
                <AppAdmin onBack={handleBackToSelector} />
            </Suspense>
        );
    }

    if (selectedModule === 'rh') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                    {user
                        ? <Suspense fallback={<div className="loading-screen">Carregando...</div>}><RHModule /></Suspense>
                        : <LoginScreen onBack={handleBackToSelector} />}
                </AuthContext.Provider>
            </>
        );
    }

    if (selectedModule === 'frota') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                    {user
                        ? <Suspense fallback={<div className="loading-screen">Carregando...</div>}><FrotaModule /></Suspense>
                        : <LoginScreen onBack={handleBackToSelector} />}
                </AuthContext.Provider>
            </>
        );
    }

    return (
        <>
            <ToastContainer />
            <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                {user
                    ? (new URLSearchParams(window.location.search).get('obra')
                        ? <ObraDetalhe />
                        : <Dashboard />)
                    : <LoginScreen onBack={handleBackToSelector} />}
            </AuthContext.Provider>
        </>
    );
}

export default App;
