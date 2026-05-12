import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchWithAuth, fetchWithAuthTimeout } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency, getTodayString } from '../../utils/format';
import { BiDashboard } from '../../BiModule';
import OrcamentoEngenharia from '../../components/OrcamentoEngenharia';
import AgendaDemandas from '../../components/AgendaDemandas';
import DiarioObras from '../../components/DiarioObras';
import CronogramaObra from '../../components/CronogramaObra';
import DashboardObra from '../../components/DashboardObra';
import EditLancamentoModal from '../../components/modals/EditLancamentoModal';
import AddLancamentoModal from '../../components/modals/AddLancamentoModal';
import AdminPanelModal from '../../components/modals/AdminPanelModal';
import OrcamentosModal from '../../components/modals/OrcamentosModal';
import InserirPagamentoModal from '../../components/modals/InserirPagamentoModal';
import PartialPaymentModal from '../../components/modals/PartialPaymentModal';
import EditPrioridadeModal from '../../components/modals/EditPrioridadeModal';
import CaixaObraModal from '../../components/modals/CaixaObraModal';
import ModalRelatorioCronograma from '../../components/modals/ModalRelatorioCronograma';
import RelatoriosModal from '../../components/modals/RelatoriosModal';
import WindowsNavBar, { WindowsNavStyles } from '../../layout/WindowsNavBar';
import HistoricoPagamentosCard from '../HistoricoPagamentosCard';
import CronogramaFinanceiro from '../CronogramaFinanceiro';
import GestaoBoletos from '../../components/GestaoBoletos';
function ObraDetalhe() {
    const { user, logout } = useAuth();
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [lancamentos, setLancamentos] = useState([]);
    const [servicos, setServicos] = useState([]); // Mantido para compatibilidade
    const [itensOrcamento, setItensOrcamento] = useState([]); // NOVO: Itens do orçamento para dropdown
    const [sumarios, setSumarios] = useState(null);
    const [historicoUnificado, setHistoricoUnificado] = useState([]);
    
    // CORREÇÃO: Verificar URL uma única vez no início
    const urlParamsInicial = new URLSearchParams(window.location.search);
    const obraIdDaUrl = urlParamsInicial.get('obra');
    const temObraNaUrl = !!obraIdDaUrl;
    
    // CORREÇÃO: Iniciar loading se tiver obra na URL
    const [isLoading, setIsLoading] = useState(temObraNaUrl);
    // NOVO: Flag para saber se estamos carregando obra da URL (usar useRef para não causar re-render)
    const [carregandoObraDaUrl, setCarregandoObraDaUrl] = useState(temObraNaUrl);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isAddLancamentoModalVisible, setAddLancamentoModalVisible] = useState(false);
    const [isAdminPanelVisible, setAdminPanelVisible] = useState(false);
    
    const [isExportModalVisible, setExportModalVisible] = useState(false);
    const [isRelatorioCronogramaVisible, setRelatorioCronogramaVisible] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [orcamentos, setOrcamentos] = useState([]);
    const [isAddOrcamentoModalVisible, setAddOrcamentoModalVisible] = useState(false);
    
    // NOVO: Estado para cronograma de obras (Gantt)
    const [cronogramaObras, setCronogramaObras] = useState([]);
    
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);
    
    // <--- MUDANÇA: Novo estado para o modal de pagamento -->
    const [payingItem, setPayingItem] = useState(null);
    
    const [isServicosCollapsed, setIsServicosCollapsed] = useState(false);
    const [editingServicoPrioridade, setEditingServicoPrioridade] = useState(null);
    const [filtroPendencias, setFiltroPendencias] = useState('');
    
    // <--- NOVO: Estados para Notas Fiscais -->
    const [notasFiscais, setNotasFiscais] = useState([]);
    const [uploadingNFFor, setUploadingNFFor] = useState(null);
    const isLoadingNotasFiscais = React.useRef(false); // Proteção contra múltiplas requisições
    
    // <--- NOVO: Estado para controlar meses expandidos/recolhidos -->
    const [mesesExpandidos, setMesesExpandidos] = useState({}); // Item que está recebendo upload
    
    // <--- NOVO: Estado para modal de relatórios -->
    const [isRelatoriosModalVisible, setRelatoriosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal de orçamentos -->
    const [isOrcamentosModalVisible, setOrcamentosModalVisible] = useState(false);
    
    // <--- NOVO: Estado para modal do Cronograma Financeiro -->
    const [isCronogramaFinanceiroVisible, setCronogramaFinanceiroVisible] = useState(false);
    
    // MUDANÇA 2: Estado para modal do Diário de Obras
    const [isDiarioVisible, setDiarioVisible] = useState(false);
    
    // MUDANÇA 3: NOVO estado para modal de Inserir Pagamento
    const [isInserirPagamentoModalVisible, setInserirPagamentoModalVisible] = useState(false);
    
    // NOVO: Estado para modal do Caixa de Obra
    const [isCaixaObraVisible, setCaixaObraVisible] = useState(false);
    
    // NOVO: Estado para mostrar obras concluídas
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
    
    // === NOVO: Estados para Sidebar ===
    // CORREÇÃO: Iniciar como null para não piscar na tela de obras
    const [currentPage, setCurrentPage] = useState(() => {
        // Ler da URL imediatamente para evitar flash
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const obraFromUrl = urlParams.get('obra');
        if (obraFromUrl) return pageFromUrl || 'home';
        if (pageFromUrl) return pageFromUrl;
        return 'obras';
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // === NAVEGAÇÃO COM HISTÓRICO DO BROWSER ===
    // Função para navegar COM histórico do browser (botão voltar funciona)
    const navigateTo = (page, obraId = null) => {
        const state = { page, obraId };
        const url = obraId ? `?obra=${obraId}&page=${page}` : `?page=${page}`;
        window.history.pushState(state, '', url);
        setCurrentPage(page);
    };

    // Expor navigateTo globalmente para uso no Sidebar
    window.navigateTo = navigateTo;
    
    // Estado para controlar se a URL inicial já foi processada
    const [urlProcessada, setUrlProcessada] = useState(false);

    // Escutar botão voltar do navegador
    useEffect(() => {
        const handlePopState = (event) => {
            logger.debug('PopState event:', event.state);
            if (event.state) {
                setCurrentPage(event.state.page || 'obras');
                if (event.state.obraId) {
                    // fetchObraData será chamado pelo useEffect abaixo
                    const obraId = event.state.obraId;
                    setIsLoading(true);
                    fetchWithAuth(`${API_URL}/obras/${obraId}`)
                        .then(res => res.json())
                        .then(data => {
                            setObraSelecionada(data.obra || null);
                            setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                            const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                                ...serv,
                                pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                            }));
                            setServicos(servicosComPagamentosArray);
                            setSumarios(data.sumarios || null);
                            setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                            setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                        })
                        .catch(error => logger.error('Erro popstate:', error))
                        .finally(() => setIsLoading(false));
                } else {
                    setObraSelecionada(null);
                }
            } else {
                // Se não tem estado, voltar para lista de obras
                setCurrentPage('obras');
                setObraSelecionada(null);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

const totalOrcamentosPendentes = useMemo(() => {
        // A variável 'orcamentos' já contém
        // apenas os orçamentos com status 'Pendente' vindos do backend.
        return (Array.isArray(orcamentos) ? orcamentos : [])
            .reduce((total, orc) => total + (orc.valor || 0), 0);
    }, [orcamentos]);

   const itemsAPagar = useMemo(() => {
    // <--- MUDANÇA: Filtros de 'A Pagar' e 'Pagos' atualizados -->
    return (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item =>
        (item.valor_total || 0) > (item.valor_pago || 0)
    )
},
[historicoUnificado]
);
    
    const itemsAPagarFiltrados = useMemo(() => {
        if (!filtroPendencias) {
            return itemsAPagar;
        }
        const lowerCaseFiltro = filtroPendencias.toLowerCase();
        return itemsAPagar.filter(item => 
            (item.descricao && item.descricao.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.fornecedor && item.fornecedor.toLowerCase().includes(lowerCaseFiltro)) ||
            (item.tipo && item.tipo.toLowerCase().includes(lowerCaseFiltro))
        );
    }, [itemsAPagar, filtroPendencias]);

 // --- NOVO BLOCO DO CRONOGRAMA (LUGAR CORRETO) ---
    const cronogramaPagamentos = useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera a hora para comparação de datas

        const data7Dias = new Date(hoje);
        data7Dias.setDate(hoje.getDate() + 7);

        const data30Dias = new Date(hoje);
        data30Dias.setDate(hoje.getDate() + 30);

        const totais = {
            atrasados: 0,
            hoje: 0,
            prox7dias: 0,
            prox30dias: 0,
            totalAPagar: 0
        };

        // Usa a variável 'itemsAPagar' que já foi definida ANTES
        (Array.isArray(itemsAPagar) ? itemsAPagar : []).forEach(item => {
            const valorRestante = (item.valor_total || 0) - (item.valor_pago || 0);
            // Usa data_vencimento se existir, senão usa data como fallback
            const dataParaUsar = item.data_vencimento || item.data;
            const dataVencimento = new Date(dataParaUsar + 'T00:00:00'); 
            
            totais.totalAPagar += valorRestante;

            if (dataVencimento < hoje) {
                totais.atrasados += valorRestante;
            } else if (dataVencimento.getTime() === hoje.getTime()) {
                totais.hoje += valorRestante;
            } else if (dataVencimento <= data7Dias) {
                totais.prox7dias += valorRestante;
            } else if (dataVencimento <= data30Dias) {
                totais.prox30dias += valorRestante;
            }
        });

        return totais;
    }, [itemsAPagar]); // A dependência é 'itemsAPagar'
    // --- FIM DO NOVO BLOCO ---


    const itemsPagos = useMemo(() => 
        (Array.isArray(historicoUnificado) ? historicoUnificado : []).filter(item => 
            (item.valor_total || 0) - (item.valor_pago || 0) < 0.01 // Totalmente pago
        ),
        [historicoUnificado]
    );
    
    // <--- NOVO: Função para agrupar pagamentos por mês -->
    const pagamentosPorMes = useMemo(() => {
        const grupos = {};
        
        itemsPagos.forEach(item => {
            const dataItem = new Date((item.data_vencimento || item.data) + 'T00:00:00');
            const mesAno = `${dataItem.getFullYear()}-${String(dataItem.getMonth() + 1).padStart(2, '0')}`;
            const mesAnoLabel = dataItem.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase()); // Capitalizar primeira letra
            
            if (!grupos[mesAno]) {
                grupos[mesAno] = {
                    label: mesAnoLabel,
                    items: [],
                    total: 0,
                    dataOrdem: dataItem // Para ordenação
                };
            }
            
            grupos[mesAno].items.push(item);
            grupos[mesAno].total += item.valor_pago || 0;
        });
        
        // Ordenar por data (mais recente primeiro)
        return Object.entries(grupos)
            .sort(([, a], [, b]) => b.dataOrdem - a.dataOrdem)
            .map(([mesAno, dados]) => ({ mesAno, ...dados }));
    }, [itemsPagos]);
    
    // <--- NOVO: Função para toggle de expandir/recolher mês -->
    const toggleMes = (mesAno) => {
        setMesesExpandidos(prev => ({
            ...prev,
            [mesAno]: !prev[mesAno]
        }));
    };


    // Efeito para buscar obras
    useEffect(() => {
        logger.debug("Buscando lista de obras...");
        const url = mostrarConcluidas 
            ? `${API_URL}/obras?mostrar_concluidas=true` 
            : `${API_URL}/obras`;
        fetchWithAuth(url)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => { logger.debug("Obras recebidas:", data); setObras(Array.isArray(data) ? data : []); })
            .catch(error => { logger.error("Erro ao buscar obras:", error); setObras([]); });
    }, [mostrarConcluidas]); 
    
    // Callback para abrir modal de orçamentos
    useEffect(() => {
        window.abrirModalOrcamentos = () => {
            setOrcamentosModalVisible(true);
        };
        return () => {
            delete window.abrirModalOrcamentos;
        };
    }, []);

    const fetchObraData = (obraId) => {
        setIsLoading(true);
        logger.debug(`Buscando dados da obra ID: ${obraId}`);
        
        // OTIMIZAÇÃO: Carregar dados principais primeiro, secundários em paralelo
        fetchWithAuth(`${API_URL}/obras/${obraId}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
            .then(data => {
                logger.debug("Dados da obra recebidos:", data);
                
                setObraSelecionada(data.obra || null);
                setLancamentos(Array.isArray(data.lancamentos) ? data.lancamentos : []);
                const servicosComPagamentosArray = (Array.isArray(data.servicos) ? data.servicos : []).map(serv => ({
                    ...serv,
                    pagamentos: Array.isArray(serv.pagamentos) ? serv.pagamentos : []
                }));
                setServicos(servicosComPagamentosArray);
                setSumarios(data.sumarios || null);
                setHistoricoUnificado(Array.isArray(data.historico_unificado) ? data.historico_unificado : []);
                setOrcamentos(Array.isArray(data.orcamentos) ? data.orcamentos : []);
                
                // Carregar dados secundários (não bloqueia a tela principal)
                fetchCronogramaObras(obraId);
                fetchItensOrcamento(obraId);
                
                // Notas fiscais - tentar carregar mas não falhar se não existir
                try {
                    fetchNotasFiscais(obraId);
                } catch (error) {
                    logger.debug("Notas fiscais não disponíveis");
                }
            })
            .catch(error => { logger.error(`Erro ao buscar dados da obra ${obraId}:`, error); setObraSelecionada(null); setLancamentos([]); setServicos([]); setSumarios(null); setOrcamentos([]); setItensOrcamento([]); })
            .finally(() => { setIsLoading(false); setCarregandoObraDaUrl(false); });
    };
    
    // NOVO: Buscar itens do orçamento para dropdown
    const fetchItensOrcamento = async (obraId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`);
            if (response.ok) {
                const data = await response.json();
                setItensOrcamento(data);
            }
        } catch (error) {
            logger.debug("Itens do orçamento não disponíveis:", error);
            setItensOrcamento([]);
        }
    };
    
    // CORREÇÃO: Processar URL inicial ao montar o componente
    useEffect(() => {
        if (urlProcessada) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const obraFromUrl = urlParams.get('obra');
        
        logger.debug("[URL INIT] Parâmetros:", { page: pageFromUrl, obra: obraFromUrl });
        
        if (obraFromUrl) {
            const obraId = parseInt(obraFromUrl);
            if (!isNaN(obraId)) {
                logger.debug("[URL INIT] Carregando obra:", obraId);
                fetchObraData(obraId);
                setCurrentPage(pageFromUrl || 'home');
            } else {
                setCarregandoObraDaUrl(false);
            }
        } else {
            setCarregandoObraDaUrl(false);
            if (pageFromUrl) {
                setCurrentPage(pageFromUrl);
            }
        }
        
        // Atualizar history state
        window.history.replaceState(
            { page: pageFromUrl || 'obras', obraId: obraFromUrl ? parseInt(obraFromUrl) : null },
            '',
            window.location.href
        );
        
        setUrlProcessada(true);
    }, [urlProcessada]);
    
    // NOVO: Função para buscar cronograma de obras (etapas para Gantt)
    const fetchCronogramaObras = async (obraId) => {
        try {
            // Buscar cronogramas da obra (CronogramaObra = serviços com cronograma)
            // As etapas já vêm incluídas na resposta do backend via to_dict()
            const response = await fetchWithAuth(`${API_URL}/cronograma/${obraId}`);
            if (!response.ok) {
                setCronogramaObras([]);
                return;
            }
            
            const cronogramasData = await response.json();
            logger.debug("Cronogramas da obra (raw):", cronogramasData);
            
            if (!Array.isArray(cronogramasData) || cronogramasData.length === 0) {
                setCronogramaObras([]);
                return;
            }
            
            // As etapas já vêm na resposta do backend, não precisa buscar separadamente
            const cronogramasFormatados = cronogramasData.map((cron) => ({
                servico_id: cron.servico_id,
                servico_nome: cron.servico_nome || cron.nome || `Cronograma ${cron.id}`,
                cronograma_id: cron.id,
                // Usar diretamente as etapas que já vieram na resposta
                etapas: Array.isArray(cron.etapas) ? cron.etapas : [],
                // Incluir dados adicionais do cronograma para o Gantt
                data_inicio: cron.data_inicio,
                data_fim_prevista: cron.data_fim_prevista,
                percentual_conclusao: cron.percentual_conclusao || 0
            }));
            
            logger.debug("Cronogramas de obras carregados:", cronogramasFormatados);
            setCronogramaObras(cronogramasFormatados);
        } catch (error) {
            // Silencioso — cronograma de obras é feature secundária
            setCronogramaObras([]);
        }
    };
    
    // <--- NOVO: Função para buscar notas fiscais -->
    const fetchNotasFiscais = (obraId) => {
        // Proteção contra múltiplas requisições simultâneas
        if (isLoadingNotasFiscais.current) {
            logger.debug("Já está carregando notas fiscais, ignorando requisição duplicada");
            return;
        }
        
        isLoadingNotasFiscais.current = true;
        
        // CORREÇÃO: Verificar se a rota existe antes de fazer a requisição
        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`)
            .then(res => {
                if (!res.ok) {
                    // Se for 404, significa que a rota não existe - ignorar silenciosamente
                    if (res.status === 404) {
                        logger.debug("Rota de notas fiscais não disponível (404) - ignorando");
                        throw new Error('NOT_FOUND');
                    }
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                logger.debug("Notas fiscais recebidas:", data);
                setNotasFiscais(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                // CORREÇÃO: Não logar erro se for NOT_FOUND ou erro de rede
                if (error.message === 'NOT_FOUND') {
                    // Silencioso - rota não implementada ainda
                    setNotasFiscais([]);
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    // Erro de rede - não logar (evita spam no console)
                    logger.warn("Notas fiscais: rota não disponível");
                    setNotasFiscais([]);
                } else {
                    // Outros erros - logar normalmente
                    logger.error("Erro ao buscar notas fiscais:", error);
                    setNotasFiscais([]);
                }
            })
            .finally(() => {
                isLoadingNotasFiscais.current = false;
            });
    };
    
    // <--- NOVO: Helper para verificar se item tem nota fiscal -->
    const itemHasNotaFiscal = (item) => {
        // <-- CORREÇÃO: Usar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento' 
            ? item.lancamento_id 
            : item.pagamento_id;
            
        return notasFiscais.some(nf => 
            nf.item_id === realItemId && nf.item_type === item.tipo_registro
        );
    };

    // --- FUNÇÕES DE AÇÃO (CRUD) ---
    const handleAddObra = (e) => {
        // ... (código inalterado)
        e.preventDefault();
        const nome = e.target.nome.value;
        const cliente = e.target.cliente.value || null;
        fetchWithAuth(`${API_URL}/obras`, { method: 'POST', body: JSON.stringify({ nome, cliente }) })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(novaObra => { setObras(prevObras => [...prevObras, novaObra].sort((a, b) => a.nome.localeCompare(b.nome))); e.target.reset(); })
        .catch(error => logger.error('Erro ao adicionar obra:', error));
    };
    const handleDeletarObra = (obraId, obraNome) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setObras(prevObras => prevObras.filter(o => o.id !== obraId)); })
        .catch(error => logger.error('Erro ao deletar obra:', error));
    };
    
    // NOVO: Função para marcar obra como concluída/reabrir
    const handleConcluirObra = async (obraId, concluida) => {
        const acao = concluida ? 'reabrir' : 'concluir';
        if (!await confirmDialog(`Deseja ${acao} esta obra?`, { confirmText: 'Confirmar' })) return;
        
        fetchWithAuth(`${API_URL}/obras/${obraId}/concluir`, { 
            method: 'PATCH',
            body: JSON.stringify({ concluida: !concluida })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then((data) => { 
            notify.success(data.sucesso);
            // Atualiza a lista de obras
            setObras(prevObras => prevObras.map(o => 
                o.id === obraId ? { ...o, concluida: !concluida } : o
            ).filter(o => mostrarConcluidas || !o.concluida));
        })
        .catch(error => { logger.error('Erro ao concluir obra:', error); notify.error('Erro: ' + error.message); });
    };
    
    // <--- MUDANÇA: Esta função (marcar pago 100%) será chamada pelo modal de edição, não mais pelo botão -->
    const handleMarcarComoPago = (itemId) => {
        const isLancamento = String(itemId).startsWith('lanc-');
        const isServicoPag = String(itemId).startsWith('serv-pag-');
        const actualId = String(itemId).split('-').pop(); 

        let url = '';
        if (isLancamento) {
            url = `${API_URL}/lancamentos/${actualId}/pago`;
        } else if (isServicoPag) {
            url = `${API_URL}/servicos/pagamentos/${actualId}/status`;
        } else {
            return; 
        }

        logger.debug("Alternando status para:", itemId);
        fetchWithAuth(url, { method: 'PATCH' })
             .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
             .then(() => fetchObraData(obraSelecionada.id))
             .catch(error => logger.error("Erro ao marcar como pago:", error));
    };

    const handleDeletarLancamento = (itemId) => {
        // ... (código inalterado)
         const isLancamento = String(itemId).startsWith('lanc-');
         const actualId = String(itemId).split('-').pop();
        if (isLancamento) {
            logger.debug("Deletando lançamento geral:", actualId);
            fetchWithAuth(`${API_URL}/lancamentos/${actualId}`, { method: 'DELETE' })
                .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
                .then(() => { fetchObraData(obraSelecionada.id); })
                .catch(error => logger.error('Erro ao deletar lançamento:', error));
        }
    };
    
    const handleEditLancamento = (item) => {
        if (item.tipo_registro === 'lancamento') { setEditingLancamento(item); }
    };
    
    // <--- MUDANÇA: Atualizado para enviar valor_total e valor_pago -->
    const handleSaveEdit = (updatedLancamento) => {
        const dataToSend = { 
            ...updatedLancamento, 
            valor_total: parseFloat(updatedLancamento.valor_total) || 0, // <-- MUDANÇA
            valor_pago: parseFloat(updatedLancamento.valor_pago) || 0, // <-- MUDANÇA
            servico_id: updatedLancamento.servico_id || null 
        };
        // Remove 'valor' se existir por acidente
        delete dataToSend.valor;
        
        fetchWithAuth(`${API_URL}/lancamentos/${updatedLancamento.lancamento_id}`, { 
            method: 'PUT',
            body: JSON.stringify(dataToSend)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setEditingLancamento(null); fetchObraData(obraSelecionada.id); })
        .catch(error => logger.error("Erro ao salvar edição:", error));
    };
    
    // <--- MUDANÇA: handleSaveLancamento (o 'valor' do formulário é o 'valor_total') -->
    const handleSaveLancamento = (lancamentoData) => {
        logger.debug("Salvando novo lançamento:", lancamentoData);
        // O formulário envia 'valor', mas o backend espera 'valor'
        // A lógica do backend já converte 'valor' para 'valor_total' e 'valor_pago'
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/lancamentos`, {
            method: 'POST',
            body: JSON.stringify(lancamentoData)
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => { setAddLancamentoModalVisible(false); fetchObraData(obraSelecionada.id); })
        .catch(error => logger.error("Erro ao salvar lançamento:", error));
    };
    
    // MUDANÇA 3: NOVO handler para Inserir Pagamento
    const handleInserirPagamento = async (pagamentoData) => {
        logger.debug("Inserindo novo pagamento:", pagamentoData);
        
        const response = await fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/inserir-pagamento`, {
            method: 'POST',
            body: JSON.stringify(pagamentoData)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.erro || 'Erro ao inserir pagamento');
        }
        
        await response.json();
        fetchObraData(obraSelecionada.id); // Atualiza dados em background
        // Não mostra alert - o modal cuida do toast
        // Não fecha modal - isso é controlado pelo callback onSave
    };

    // --- Handlers de Orçamento (inalterados) ---
    const handleSaveOrcamento = (formData) => {
        // ... (código inalterado)
        logger.debug("Salvando novo orçamento...");
        fetchWithAuth(`${API_URL}/obras/${obraSelecionada.id}/orcamentos`, {
            method: 'POST',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setAddOrcamentoModalVisible(false);
            fetchObraData(obraSelecionada.id); 
        })
        .catch(error => {
            logger.error("Erro ao salvar orçamento:", error);
            notify.error(`Erro ao salvar orçamento: ${error.message}\n\nVerifique o console para mais detalhes (F12).`);
        });
    };
    const handleSaveEditOrcamento = (orcamentoId, formData, newFiles) => {
        // ... (código inalterado)
        logger.debug("Salvando edição do orçamento:", orcamentoId);
        
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, {
            method: 'PUT',
            body: formData
        }).then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            
            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });
                
                return fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/anexos`, {
                    method: 'POST',
                    body: fileFormData
                });
            }
            
            return Promise.resolve();
            
        }).then(fileRes => {
            if (fileRes && !fileRes.ok) {
                 return fileRes.json().then(err => { throw new Error(err.erro || 'Erro ao enviar anexos') });
            }
            
            setEditingOrcamento(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            logger.error("Erro ao salvar edição do orçamento:", error);
            notify.error(`Erro ao salvar edição: ${error.message}`);
        });
    };
    const handleAprovarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}/aprovar`, { method: 'POST' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => logger.error("Erro ao aprovar orçamento:", error));
    };
    const handleRejeitarOrcamento = (orcamentoId) => {
        // ... (código inalterado)
        fetchWithAuth(`${API_URL}/orcamentos/${orcamentoId}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
             fetchObraData(obraSelecionada.id); 
        })
        .catch(error => logger.error("Erro ao rejeitar solicitação:", error));
    };

    // Handler do PDF da Obra
    const handleExportObraPDF = () => {
        // ... (código inalterado)
        if (!obraSelecionada) return;
        
        setIsExportingPDF(true);
        const url = `${API_URL}/obras/${obraSelecionada.id}/export/pdf_pendentes`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o PDF da obra.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                setIsExportingPDF(false);
            })
            .catch(err => {
                logger.error("Erro ao gerar PDF da obra:", err);
                notify.error("Não foi possível gerar o PDF. Verifique o console para mais detalhes.");
                setIsExportingPDF(false);
            });
    };

    // Handler de Prioridade
    const handleSaveServicoPrioridade = (novaPrioridade) => {
        // ... (código inalterado)
        if (!editingServicoPrioridade) return;

        const pagamentoId = editingServicoPrioridade.pagamento_id;
        
        fetchWithAuth(`${API_URL}/servicos/pagamentos/${pagamentoId}/prioridade`, {
            method: 'PATCH',
            body: JSON.stringify({ prioridade: novaPrioridade })
        })
        .then(res => { if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro') }); } return res.json(); })
        .then(() => {
            setEditingServicoPrioridade(null);
            fetchObraData(obraSelecionada.id);
        })
        .catch(error => {
            logger.error("Erro ao salvar prioridade do serviço:", error);
            notify.error(`Erro ao salvar prioridade: ${error.message}`);
        });
    };

    // <--- MUDANÇA: NOVA FUNÇÃO HANDLER PARA PAGAMENTO PARCIAL ---
    const handleSavePartialPayment = (valor_a_pagar) => {
        if (!payingItem) return;

        const { tipo_registro, id } = payingItem;
        // O ID vem como "lanc-123" ou "serv-pag-456"
        const item_type = tipo_registro === 'lancamento' ? 'lancamento' : 'pagamento_servico';
        const item_id = id.split('-').pop();

        logger.debug(`Registrando pagamento de ${valor_a_pagar} para ${item_type} ${item_id}`);

        fetchWithAuth(`${API_URL}/pagamentos/${item_type}/${item_id}/pagar`, {
            method: 'PATCH',
            body: JSON.stringify({ valor_a_pagar })
        })
        .then(res => {
            if (!res.ok) { return res.json().then(err => { throw new Error(err.erro || 'Erro desconhecido') }); }
            return res.json();
        })
        .then(() => {
            setPayingItem(null); // Fecha o modal
            fetchObraData(obraSelecionada.id); // Recarrega os dados
        })
        .catch(error => {
            logger.error("Erro ao registrar pagamento parcial:", error);
            // Mostra o erro de validação (ex: "valor maior que o restante")
            // Precisamos garantir que o modal esteja aberto para mostrar o erro
            if (payingItem) {
                notify.error(`Erro: ${error.message}`);
            }
        });
    };
    // <--- FIM DA NOVA FUNÇÃO ---


    // --- RENDERIZAÇÃO ---
    
    // Função para selecionar obra e ir para cronograma financeiro
    const handleSelectObra = (obraId) => {
        fetchObraData(obraId);
        // Usar navigateTo para atualizar histórico do browser
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('home', obraId);
        } else {
            setCurrentPage('home');
        }
    };
    
    // Expor handleSelectObra globalmente para o Sidebar
    window.handleSelectObra = handleSelectObra;

    // === TELA INICIAL (SEM OBRA SELECIONADA) - SEM SIDEBAR ===
    // CORREÇÃO: Se estiver carregando obra da URL, mostrar loading
    if (carregandoObraDaUrl) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: 'var(--cor-fundo, #f5f5f5)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #e0e0e0',
                        borderTop: '4px solid var(--cor-primaria, #6c5ce7)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                    }} />
                    <p style={{ color: '#666' }}>Carregando...</p>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!obraSelecionada) {
        // ?? Se estiver na página de BI, mostrar dashboard
        if (currentPage === 'bi') {
            return (
                <BiDashboard
                    apiUrl={API_URL}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setCurrentPage('obras')}
                />
            );
        }
        
        return (
            <div className="container">
                {isAdminPanelVisible && <AdminPanelModal 
                    allObras={obras}
                    onClose={() => setAdminPanelVisible(false)} 
                />}
                
                {isRelatorioCronogramaVisible && <ModalRelatorioCronograma 
                    obras={obras}
                    onClose={() => setRelatorioCronogramaVisible(false)} 
                />}
                
                <header className="dashboard-header">
                    <h1>Minhas Obras</h1>
                    <div className="header-actions">
                        {/* ?? Botão BI Dashboard */}
                        <button 
                            onClick={() => setCurrentPage('bi')} 
                            className="export-btn" 
                            style={{marginRight: '10px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6'}}
                        >
                            ?? BI Dashboard
                        </button>
                        
                        <button 
                            onClick={() => setRelatorioCronogramaVisible(true)} 
                            className="export-btn pdf" 
                            style={{marginRight: '10px'}}
                        >
                            ?? Relatório Financeiro
                        </button>
                        
                        {user.role === 'master' && (
                            <button onClick={() => setAdminPanelVisible(true)} className="submit-btn" style={{marginRight: '10px'}}>
                                Gerenciar Usuários
                            </button>
                        )}
                        <button onClick={logout} className="voltar-btn" style={{backgroundColor: '#6c757d'}}>Sair (Logout)</button>
                    </div>
                </header>

                {(user.role === 'administrador' || user.role === 'master') && (
                    <div className="card-full">
                        <h3>Cadastrar Nova Obra</h3>
                        <form onSubmit={handleAddObra} className="form-add-obra">
                            <input type="text" name="nome" placeholder="Nome da Obra" required />
                            <input type="text" name="cliente" placeholder="Nome do Cliente" />
                            <button type="submit" className="submit-btn">Adicionar Obra</button>
                        </form>
                    </div>
                )}
                
                {/* Toggle para mostrar obras concluídas */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginBottom: '15px',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--cor-texto-secundario)',
                        fontSize: '0.9em'
                    }}>
                        <input 
                            type="checkbox"
                            checked={mostrarConcluidas}
                            onChange={(e) => setMostrarConcluidas(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        Mostrar obras concluídas
                    </label>
                </div>
                
                <div className="lista-obras">
                    {obras.length > 0 ? (
                        obras.map(obra => (
                            <div 
                                key={obra.id} 
                                className="card-obra"
                                style={{
                                    opacity: obra.concluida ? 0.7 : 1,
                                    border: obra.concluida ? '2px solid #22c55e' : undefined,
                                    position: 'relative'
                                }}
                            >
                                {obra.concluida && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        backgroundColor: '#22c55e',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75em',
                                        fontWeight: 'bold'
                                    }}>
                                        ? CONCLUÍDA
                                    </div>
                                )}
                                
                                {(user.role === 'administrador' || user.role === 'master') && (
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleConcluirObra(obra.id, obra.concluida); }}
                                            className="card-obra-action-btn"
                                            title={obra.concluida ? 'Reabrir Obra' : 'Marcar como Concluída'}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.1em',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                opacity: 0.7
                                            }}
                                        >
                                            {obra.concluida ? '??' : '?'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeletarObra(obra.id, obra.nome); }}
                                            className="card-obra-delete-btn"
                                            title="Excluir Obra"
                                        >
                                            ???
                                        </button>
                                    </div>
                                )}
                                
                                <div onClick={() => handleSelectObra(obra.id)} className="card-obra-content">
                                    <h3>{obra.nome}</h3>
                                    <p>Cliente: {obra.cliente || 'N/A'}</p>
                                    
                                    <div className="obra-kpi-summary">
                                        <div>
                                            <span>Orçamento Total</span>
                                            <strong style={{ color: 'var(--cor-vermelho)' }}>
                                                {formatCurrency(obra.orcamento_total || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Valores Pagos</span>
                                            <strong style={{ color: 'var(--cor-primaria)' }}>
                                                {formatCurrency(obra.total_pago || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Liberado (Fila)</span>
                                            <strong style={{ color: 'var(--cor-acento)' }}>
                                                {formatCurrency(obra.liberado_pagamento || 0)}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Despesas Extras</span>
                                            <strong style={{ color: '#9333ea' }}>
                                                {formatCurrency(obra.despesas_extras || 0)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Nenhuma obra cadastrada ou você ainda não tem permissão para ver nenhuma.</p>
                    )}
                </div>
            </div>
        );
    }

    // === TELA DE LOADING ===
    if (isLoading || !sumarios) {
        return <div className="loading-screen">Carregando dados da obra...</div>;
    }

    // === LAYOUT COM NAVEGAÇÃO WINDOWS (OBRA SELECIONADA) ===
    return (
        <>
            <WindowsNavStyles />
            <div className="app-layout-windows">
                {/* Navegação Windows */}
                <WindowsNavBar 
                    user={user}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    obraSelecionada={obraSelecionada}
                    setObraSelecionada={setObraSelecionada}
                    obras={obras}
                    onLogout={logout}
                />
                
                {/* Conteúdo Principal */}
                <main className="main-content-windows">

                    {/* === PÁGINA: HOME (Dashboard + Quadro Informativo) === */}
                    {currentPage === 'home' && (
                        <div className="home-page-container">
                            {/* Header com Título + Cards de Resumo */}
                            {/* Header com Título + Cards de Resumo */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                background: '#fff',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                            {/* Título */}
                                <h1 style={{ 
                                    margin: 0,
                                    fontSize: '1.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#1e293b'
                                }}>
                                    <i className="ti ti-home" aria-hidden="true" /> Início - {obraSelecionada.nome}
                                </h1>

                                {/* Cards de Resumo - Usando valores do backend (sumarios) */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #ef4444',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Orçamento Total</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444' }}>
                                            {formatCurrency(sumarios?.orcamento_total || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #3b82f6',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Valores Pagos</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#3b82f6' }}>
                                            {formatCurrency(sumarios?.valores_pagos || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #22c55e',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Liberado (Fila)</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e' }}>
                                            {formatCurrency(sumarios?.liberado_pagamento || 0)}
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid #a855f7',
                                        minWidth: '130px'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Despesas Extras</div>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#a855f7' }}>
                                            {formatCurrency(sumarios?.despesas_extras || 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Dashboard com Gráficos */}
                            <DashboardObra 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                servicos={servicos}
                                lancamentos={lancamentos}
                                cronograma={cronogramaObras}
                            />
                            
                            {/* Cronograma Financeiro Simplificado */}
                            <CronogramaFinanceiro 
                                obraId={obraSelecionada.id}
                                obraNome={obraSelecionada.nome}
                                onClose={() => {
                                    setObraSelecionada(null);
                                    setCurrentPage('obras');
                                }}
                                embedded={true}
                                simplified={true}
                            />
                            
                            {/* Histórico de Pagamentos */}
                            <HistoricoPagamentosCard 
                                itemsPagos={itemsPagos}
                                itemsAPagar={itemsAPagar}
                                user={user}
                                fetchObraData={fetchObraData}
                                obraId={obraSelecionada.id}
                            />
                        </div>
                    )}

                    {/* === PÁGINA: CRONOGRAMA DE OBRAS (com EVM e Etapas) === */}
                    {currentPage === 'cronograma-obra' && (
                        <CronogramaObra 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: ORÇAMENTO DE ENGENHARIA === */}
                    {currentPage === 'orcamento-eng' && (
                        <OrcamentoEngenharia 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            apiUrl={API_URL}
                            onClose={() => setCurrentPage('home')}
                        />
                    )}

                    {/* === PÁGINA: CRONOGRAMA FINANCEIRO (Completo) === */}
                    {currentPage === 'financeiro' && (
                        <CronogramaFinanceiro 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => {
                                setObraSelecionada(null);
                                setCurrentPage('obras');
                            }}
                            embedded={true}
                            simplified={false}
                        />
                    )}

                    {/* === PÁGINA: INSERIR PAGAMENTO === */}
                    {currentPage === 'pagamento' && (
                        <InserirPagamentoModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            onSave={async (formData, salvarENovo = false) => {
                                await handleInserirPagamento(formData);
                                if (!salvarENovo) {
                                    setCurrentPage('home');
                                }
                            }}
                            itensOrcamento={itensOrcamento}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: RELATÓRIOS === */}
                    {currentPage === 'relatorios' && (
                        <RelatoriosModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            sumarios={sumarios}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: ORÇAMENTOS === */}
                    {currentPage === 'orcamentos' && (
                        <OrcamentosModal
                            obraId={obraSelecionada.id}
                            onClose={() => setCurrentPage('home')}
                            onSave={() => fetchObraData(obraSelecionada.id)}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: DIÁRIO DE OBRAS === */}
                    {currentPage === 'diario' && (
                        <DiarioObras 
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: AGENDA DE DEMANDAS === */}
                    {currentPage === 'agenda' && (
                        <AgendaDemandas 
                            obraId={obraSelecionada.id}
                            apiUrl={API_URL}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: CAIXA DE OBRA === */}
                    {currentPage === 'caixa' && (
                        <CaixaObraModal
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onClose={() => setCurrentPage('home')}
                            embedded={true}
                        />
                    )}

                    {/* === PÁGINA: GESTÃO DE BOLETOS === */}
                    {currentPage === 'boletos' && (
                        <GestaoBoletos
                            obraId={obraSelecionada.id}
                            obraNome={obraSelecionada.nome}
                            onUpdate={() => fetchObraData(obraSelecionada.id)}
                        />
                    )}

                    {/* === PÁGINA: GERENCIAR USUÁRIOS === */}
                    {currentPage === 'usuarios' && (
                        <AdminPanelModal 
                            allObras={obras}
                            onClose={() => setCurrentPage('home')} 
                            embedded={true}
                        />
                    )}

                    {/* Modais que aparecem por cima */}
                    {payingItem && (
                        <PartialPaymentModal
                            item={payingItem}
                            onClose={() => setPayingItem(null)}
                            onSave={handleSavePartialPayment}
                        />
                    )}

                    {editingServicoPrioridade && (
                        <EditPrioridadeModal
                            item={editingServicoPrioridade}
                            onClose={() => setEditingServicoPrioridade(null)}
                            onSave={handleSaveServicoPrioridade}
                        />
                    )}
                    
                    {editingLancamento && <EditLancamentoModal 
                        lancamento={editingLancamento} 
                        onClose={() => setEditingLancamento(null)} 
                        onSave={handleSaveEdit}
                        itensOrcamento={itensOrcamento}
                    />}

                    {isAddLancamentoModalVisible && <AddLancamentoModal 
                        onClose={() => setAddLancamentoModalVisible(false)} 
                        onSave={handleSaveLancamento}
                        itensOrcamento={itensOrcamento}
                    />}
                </main>

                {/* Barra de Status */}
                <div className="windows-status-bar">
                    <div className="status-bar-left">
                        <span className="status-bar-item"><i className="ti ti-building" aria-hidden="true" /> {obraSelecionada.nome}</span>
                        <span className="status-bar-item">•</span>
                        <span className="status-bar-item">Página: {currentPage}</span>
                    </div>
                    <div className="status-bar-right">
                        <span className="status-bar-item"><i className="ti ti-user" aria-hidden="true" /> {user.nome} ({user.role === 'master' ? 'Master' : user.role === 'administrador' ? 'Admin' : 'Operador'})</span>
                        <span className="status-bar-item">•</span>
                        <span className="status-bar-item">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            {/* Estilos adicionais */}
            <style>{`
                .page-top-header {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                    padding: 0 10px;
                }
                
                .page-top-header .submit-btn {
                    padding: 10px 20px;
                    font-size: 14px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.3);
                }
                
                @media (max-width: 768px) {
                    .page-top-header {
                        margin-top: 10px;
                    }
                }
            `}</style>
        </>
    );
}
export default ObraDetalhe;
