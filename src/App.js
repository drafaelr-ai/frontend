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
import GlobalPlanejamento from './screens/Planejamento/GlobalPlanejamento';
import GlobalFinanceiro from './screens/Financeiro/GlobalFinanceiro';
import SuperlinkPublico from './screens/SuperlinkPublico';
import AdminPanelModal from './components/modals/AdminPanelModal';
import TrocarSenhaModal from './components/modals/TrocarSenhaModal';
import { initializeNativePush, deactivateNativePush } from './pwa/nativePush';

const AppAdmin = lazy(() => import('./AppAdmin'));
const RHModule = lazy(() => import('./screens/RH'));
const FrotaModule = lazy(() => import('./screens/Frota'));
const SolicitacoesModule = lazy(() => import('./screens/Solicitacoes'));
const AlmoxarifadoModule = lazy(() => import('./screens/Almoxarifado'));
const SolicitacaoPublica = lazy(() => import('./screens/SolicitacaoPublica'));
const AbastecimentoPublico = lazy(() => import('./screens/AbastecimentoPublico'));

const MODULOS_BASE = ['obras', 'admin', 'rh', 'frota', 'solicitacoes', 'almoxarifado'];
const MODULOS_DERIVADOS_DE_OBRAS = ['financeiro', 'planejamento'];
const TODOS_MODULOS = ['obras', ...MODULOS_DERIVADOS_DE_OBRAS, 'admin', 'rh', 'frota', 'solicitacoes', 'almoxarifado'];
const PAGINAS_FINANCEIRAS = new Set(['financeiro', 'pagamento', 'boletos', 'relatorios', 'caixa']);

// Módulos que o usuário pode ver: master → todos; lista null/ausente → todos.
function getAllowedModules(user) {
    if (!user) return [];
    if (user.role === 'master') return TODOS_MODULOS;
    if (user.modulos_permitidos == null) return TODOS_MODULOS;
    const base = MODULOS_BASE.filter(m => user.modulos_permitidos.includes(m));
    return base.includes('obras')
        ? [...base, ...MODULOS_DERIVADOS_DE_OBRAS]
        : base;
}

function resolveModuleFromUrl(savedModule, allowedModules) {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('obra')) return savedModule;
    const page = params.get('page');
    if (page === 'planejamento' && allowedModules.includes('planejamento')) return 'planejamento';
    if (PAGINAS_FINANCEIRAS.has(page) && allowedModules.includes('financeiro')) {
        return 'financeiro';
    }
    return savedModule;
}

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState(null); // null = seletor, 'obras' ou 'admin'
    const [accessPanelOpen, setAccessPanelOpen] = useState(false);
    const [trocarSenhaOpen, setTrocarSenhaOpen] = useState(false);
    const [obrasParaPainel, setObrasParaPainel] = useState([]);

    useEffect(() => {
        if (!user || !token) return undefined;
        let disposed = false;
        let cleanup = () => {};
        initializeNativePush(token)
            .then(removeListeners => {
                if (disposed) removeListeners();
                else cleanup = removeListeners;
            })
            .catch(error => logger.error('Não foi possível ativar o push nativo:', error));
        return () => {
            disposed = true;
            cleanup();
        };
    }, [user, token]);

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
                    const resolvedModule = resolveModuleFromUrl(savedModule, allowed);
                    if (resolvedModule && allowed.includes(resolvedModule)) {
                        setSelectedModule(resolvedModule);
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
        // Entrar em Obras pelo seletor deve sempre abrir a Dashboard nova —
        // um ?obra= preso na URL de uma sessão anterior faria cair na tela
        // antiga (ObraDetalhe/WindowsNavBar) sem essa limpeza.
        if (window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        setSelectedModule(moduleId);
        await storeToken('selectedModule', moduleId);
    };

    const handleBackToSelector = async () => {
        if (window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        setSelectedModule(null);
        await deleteToken('selectedModule');
    };

    const handleGoToDashboard = async () => {
        // O logotipo Obraly é o atalho global para a primeira tela após o login.
        await handleBackToSelector();
    };

    const handleNavigateBack = async () => {
        // Page changes inside a work use pushState, so the global button can
        // respect the exact in-app history. A directly opened/reloaded work has
        // no safe history marker; in that case, return to its module home.
        if (window.location.search) {
            const currentState = window.history.state;
            if (currentState?.page || currentState?.obraId) {
                window.history.back();
            } else {
                window.location.assign(window.location.pathname);
            }
            return;
        }

        await handleBackToSelector();
    };

    const login = async (data) => {
        setToken(data.access_token);
        setUser(data.user);
        await storeToken('token', data.access_token);
        await storeToken('user', JSON.stringify(data.user));
        // Zera o contexto de navegação de qualquer sessão anterior neste
        // aparelho: sem isso, um selectedModule salvo + ?obra= preso na URL
        // (sobras de outro usuário cuja sessão expirou) faziam o próximo
        // login cair direto dentro de uma obra em vez do seletor de módulos.
        setSelectedModule(null);
        await deleteToken('selectedModule');
        if (window.location.search) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    };

    const logout = async () => {
        await deactivateNativePush(token);
        setToken(null);
        setUser(null);
        setSelectedModule(null);
        await deleteToken('token');
        await deleteToken('user');
        await deleteToken('selectedModule');
    };

    const authContextValue = {
        user, token, login, logout,
        onBackToSelector: handleBackToSelector,
        onGoToDashboard: handleGoToDashboard,
        onNavigateBack: handleNavigateBack,
        selectModule: handleSelectModule,
    };

    // Rotas públicas — fora do fluxo de autenticação
    const _path = window.location.pathname;
    if (_path.startsWith('/pagar/')) {
        const _token = _path.replace('/pagar/', '').split('/')[0];
        return <SuperlinkPublico token={_token} />;
    }
    if (_path.startsWith('/solicitacao/')) {
        const _token = _path.replace('/solicitacao/', '').split('/')[0];
        return (
            <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
                <SolicitacaoPublica token={_token} />
            </Suspense>
        );
    }
    if (_path.startsWith('/abastecimento/')) {
        const _token = _path.replace('/abastecimento/', '').split('/')[0];
        return (
            <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
                <AbastecimentoPublico token={_token} />
            </Suspense>
        );
    }

    if (isLoading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    // Login principal vem ANTES do seletor — só entra quem está autenticado.
    if (!user) {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
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
                <AppAdmin
                    onBack={handleBackToSelector}
                    onGoToDashboard={handleGoToDashboard}
                    onNavigateBack={handleNavigateBack}
                />
            </Suspense>
        );
    }

    if (selectedModule === 'rh') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
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
                <AuthContext.Provider value={authContextValue}>
                    {user
                        ? <Suspense fallback={<div className="loading-screen">Carregando...</div>}><FrotaModule /></Suspense>
                        : <LoginScreen onBack={handleBackToSelector} />}
                </AuthContext.Provider>
            </>
        );
    }

    if (selectedModule === 'solicitacoes') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
                    {user
                        ? <Suspense fallback={<div className="loading-screen">Carregando...</div>}><SolicitacoesModule /></Suspense>
                        : <LoginScreen onBack={handleBackToSelector} />}
                </AuthContext.Provider>
            </>
        );
    }

    if (selectedModule === 'almoxarifado') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
                    {user
                        ? <Suspense fallback={<div className="loading-screen">Carregando...</div>}><AlmoxarifadoModule /></Suspense>
                        : <LoginScreen onBack={handleBackToSelector} />}
                </AuthContext.Provider>
            </>
        );
    }

    if (selectedModule === 'planejamento') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
                    {new URLSearchParams(window.location.search).get('obra')
                        ? <ObraDetalhe moduleMode="planejamento" />
                        : <GlobalPlanejamento />}
                </AuthContext.Provider>
            </>
        );
    }

    if (selectedModule === 'financeiro') {
        return (
            <>
                <ToastContainer />
                <AuthContext.Provider value={authContextValue}>
                    {new URLSearchParams(window.location.search).get('obra')
                        ? <ObraDetalhe moduleMode="financeiro" />
                        : <GlobalFinanceiro />}
                </AuthContext.Provider>
            </>
        );
    }

    return (
        <>
            <ToastContainer />
            <AuthContext.Provider value={authContextValue}>
                {user
                    ? (new URLSearchParams(window.location.search).get('obra')
                        ? <ObraDetalhe moduleMode="obras" />
                        : <Dashboard />)
                    : <LoginScreen onBack={handleBackToSelector} />}
            </AuthContext.Provider>
        </>
    );
}

export default App;
