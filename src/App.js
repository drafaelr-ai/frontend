import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Imports do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// MUDAN�A 1: Import do componente DiarioObras
import DiarioObras from './components/DiarioObras';

// MUDAN�A 2: Import do componente CronogramaObra
import CronogramaObra from './components/CronogramaObra';

// NOVO: Import do Dashboard com gr�ficos
import DashboardObra from './components/DashboardObra';
import './components/DashboardObra.css';

// Import para compress�o de imagens
import { compressImages } from './utils/imageCompression';

// ?? M�DULO BI - Import do Business Intelligence Dashboard
// NOTA: Coloque o arquivo BiModule.js na pasta src/
import { BiDashboard } from './BiModule';

// ?? M�DULO OR�AMENTO DE ENGENHARIA
import OrcamentoEngenharia from './components/OrcamentoEngenharia';

// ?? M�DULO AGENDA DE DEMANDAS
import AgendaDemandas from './components/AgendaDemandas';

// ?? M�DULO ADMINISTRA��O (Gest�o Patrimonial)
import AppAdmin from './AppAdmin';
import { API_URL } from './config';
import { ToastContainer, notify, confirmDialog } from './utils/notify';
import { logger } from './utils/logger';
import { formatCurrency, getTodayString } from './utils/format';
import PrioridadeBadge from './components/PrioridadeBadge';
import { AuthContext, useAuth } from './auth/AuthContext';
import { fetchWithAuth, fetchWithAuthTimeout } from './auth/fetchWithAuth';
import Modal from './components/modals/Modal';
import EditPrioridadeModal from './components/modals/EditPrioridadeModal';
import ViewAnexosModal from './components/modals/ViewAnexosModal';
import PartialPaymentModal from './components/modals/PartialPaymentModal';
import ExportReportModal from './components/modals/ExportReportModal';
import UploadNotaFiscalModal from './components/modals/UploadNotaFiscalModal';
import EditLancamentoModal from './components/modals/EditLancamentoModal';
import VisualizarNotaFiscalModal from './components/modals/VisualizarNotaFiscalModal';
import CadastrarPagamentoFuturoModal from './components/modals/CadastrarPagamentoFuturoModal';
import EditarPagamentoFuturoModal from './components/modals/EditarPagamentoFuturoModal';
import ModalAprovarOrcamento from './components/modals/ModalAprovarOrcamento';
import AddLancamentoModal from './components/modals/AddLancamentoModal';
import UserPermissionsModal from './components/modals/UserPermissionsModal';
import AddOrcamentoModal from './components/modals/AddOrcamentoModal';
import EditOrcamentoModal from './components/modals/EditOrcamentoModal';
import AdminPanelModal from './components/modals/AdminPanelModal';
import NotaFiscalIcon from './components/NotaFiscalIcon';
import ModalRelatorioCronograma from './components/modals/ModalRelatorioCronograma';
import ModalWhatsAppCronograma from './components/modals/ModalWhatsAppCronograma';
import ModalNovaMovimentacaoCaixa from './components/modals/ModalNovaMovimentacaoCaixa';
import RelatoriosModal from './components/modals/RelatoriosModal';
import CadastrarPagamentoParceladoModal from './components/modals/CadastrarPagamentoParceladoModal';
import ModalOrcamentos from './components/modals/ModalOrcamentos';
import OrcamentosModal from './components/modals/OrcamentosModal';
import CadastrarBoletoModal from './components/modals/CadastrarBoletoModal';
import CaixaObraModal from './components/modals/CaixaObraModal';
import EditarParcelasModal from './components/modals/EditarParcelasModal';
import InserirPagamentoModal from './components/modals/InserirPagamentoModal';
import LoginScreen from './auth/LoginScreen';
import ModuleSelectorScreen from './layout/ModuleSelectorScreen';
import WindowsNavBar, { WindowsNavStyles } from './layout/WindowsNavBar';
import QuadroAlertasVencimento from './components/QuadroAlertasVencimento';
import GestaoBoletos from './components/GestaoBoletos';
import HistoricoPagamentosCard from './screens/HistoricoPagamentosCard';
import CronogramaFinanceiro from './screens/CronogramaFinanceiro';
import Dashboard from './screens/Dashboard';

// Registrar os componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// --- CONFIGURA��O INICIAL ---





// --- CONTEXTO DE AUTENTICA��O + FETCH ---
// fetchWithAuth, fetchWithAuthTimeout ? src/auth/fetchWithAuth.js
// AuthContext, useAuth              ? src/auth/AuthContext.jsx





// --- COMPONENTES DE MODAL (Existentes) ---
// <--- MUDAN�A: Modal de Edi��o (com valor_total e valor_pago) -->
// --- MODAIS DE ADMINISTRA��O ---

// ----------------------------------------------------

// Modal "Exportar Relat�rio Geral"
// ----------------------------------------------------


// ----------------------------------------------------


// Modal para Editar Prioridade
// ----------------------------------------------------




// --- NOVO MODAL PARA VER ANEXOS ---
// --- FIM DO NOVO MODAL ---


// --- FIM DO NOVO MODAL ---


// --- FIM DO MODAL DE UPLOAD DE NOTA FISCAL ---

// --- FIM DOS COMPONENTES DE NOTAS FISCAIS ---



// --- FIM DO MODAL DE RELAT�RIOS ---








// --- COMPONENTE PRINCIPAL (ROTEADOR) ---

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
            logger.error("Falha ao carregar dados de autentica��o:", error);
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

    // Se n�o h� m�dulo selecionado e n�o est� logado, mostrar seletor
    if (!selectedModule && !user) {
        return <ModuleSelectorScreen onSelectModule={handleSelectModule} />;
    }

    // Se selecionou Admin
    if (selectedModule === 'admin') {
        return <AppAdmin onBack={handleBackToSelector} />;
    }

    // Se selecionou Obras ou j� est� logado
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
