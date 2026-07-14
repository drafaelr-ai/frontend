import React, { useState, useEffect, lazy, Suspense } from 'react';
import './App.css';
import { ToastContainer } from './utils/notify';
import { logger } from './utils/logger';
import { AuthContext } from './auth/AuthContext';
import { fetchWithAuth } from './auth/fetchWithAuth';
import { setToken as storeToken, getToken as loadToken, removeToken as deleteToken } from './auth/tokenStorage';
import { API_URL } from './config';
import LoginScreen from './auth/LoginScreen';
import ModuleSelectorScreen from './layout/ModuleSelectorScreen';
import ObraDetalhe from './screens/ObraDetalhe';
import Dashboard from './screens/Dashboard';
import SuperlinkPublico from './screens/SuperlinkPublico';
import AdminPanelModal from './components/modals/AdminPanelModal';
import TrocarSenhaModal from './components/modals/TrocarSenhaModal';

const AppAdmin = lazy(() => import('./AppAdmin'));
const RHModule = lazy(() => import('./screens/RH'));
const FrotaModule = lazy(() => import('./screens/Frota'));

const TODOS_MODULOS = ['obras', 'admin', 'rh', 'frota'];

// Módulos que o usuário pode ver: master → todos; lista null/ausente → todos.
function getAllowedModules(user) {
    if (!user) return [];
    if (user.role === 'master') return TODOS_MODULOS;
    if (user.modulos_permitidos == null) return TODOS_MODULOS;
    return TODOS_MODULOS.filter(m => user.modulos_permitidos.includes(m));
}

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState(null); // null = seletor, 'obras' ou 'admin'
    const [accessPanelOpen, setAccessPanelOpen] = useState(false);
    const [trocarSenhaOpen, setTrocarSenhaOpen] = useState(false);
    const [obrasParaPainel, setObrasParaPainel] = useState([]);

    // Lista de obras para o painel de acessos (aberto pelo master no seletor).
    useEffect(() => {
        if (!accessPanelOpen) return;
        fetchWithAuth(`${API_URL}/obras`)
            .then(res => res.json())
            .then(data => setObrasParaPainel(Array.isArray(data) ? data : []))
            .catch(e => logger.error('Erro ao carregar obras p/ painel de acessos:', e));
    }, [accessPanelOpen]);

    useEffect(() => {
        const loadAuth = async () => {
            try {
                const savedToken = await loadToken('token');
                const savedUser = await loadToken('user');
                const savedModule = await loadToken('selectedModule');

                if (savedToken && savedUser) {
                    setToken(savedToken);
                    let freshUser = JSON.parse(savedUser);
                    // Refresca o user (role/módulos podem ter mudado). Falha de
                    // rede → segue com o salvo; 401/422 → o fetchWithAuth limpa
                    // o storage e recarrega sozinho.
                    try {
                        const res = await fetchWithAuth(`${API_URL}/me`);
                        if (res.ok) {
                            freshUser = await res.json();
                            await storeToken('user', JSON.stringify(freshUser));
                        }
                    } catch (e) {
                        logger.warn('GET /me falhou, usando user salvo:', e);
                    }
                    setUser(freshUser);
                    // Só restaura o módulo salvo se ainda for permitido.
                    const allowed = getAllowedModules(freshUser);
                    if (savedModule && allowed.includes(savedModule)) {
                        setSelectedModule(savedModule);
                    } else if (savedModule) {
                        await deleteToken('selectedModule');
                    }
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

    // Login principal vem ANTES do seletor — só entra quem está autenticado.
    if (!user) {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={{ user, token, login, logout, onBackToSelector: handleBackToSelector }}>
                    <LoginScreen />
                </AuthContext.Provider>
            </>
        );
    }

    // Seletor de módulos filtrado pelo acesso do usuário (corrige também o bug
    // do "voltar aos módulos", que antes caía direto no módulo Obras).
    if (!selectedModule) {
        return (
            <>
                <ToastContainer />
                <ModuleSelectorScreen
                    user={user}
                    allowedModules={getAllowedModules(user)}
                    onSelectModule={handleSelectModule}
                    onLogout={logout}
                    onManageAccess={user.role === 'master' ? () => setAccessPanelOpen(true) : undefined}
                    onChangePassword={() => setTrocarSenhaOpen(true)}
                />
                {accessPanelOpen && (
                    <AdminPanelModal
                        allObras={obrasParaPainel}
                        onClose={() => setAccessPanelOpen(false)}
                    />
                )}
                {trocarSenhaOpen && (
                    <TrocarSenhaModal onClose={() => setTrocarSenhaOpen(false)} />
                )}
            </>
        );
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
