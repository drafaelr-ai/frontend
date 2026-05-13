# Notas de Refactor — Pendências Identificadas

## E3 TODO: remover/modificar auto-redirect pra última obra após login (descoberto em E1)

**Mecanismo atual (puro URL-based, sem localStorage):**
- Não há "auto-redirect para última obra" persistido — nenhum `localStorage.setItem('lastObra', ...)`
- O fluxo atual é: Login → `ObraDetalhe` que lê `window.location.search`
  - Se URL tem `?obra=<id>&page=<pageName>` → carrega `fetchObraData(obraId)`, seta `currentPage`
  - Se URL sem `?obra=` → `currentPage = 'obras'` (mostra lista de obras dentro do ObraDetalhe)
- O "redirect" ocorre apenas se o usuário volta via URL bookmarked ou browser history com `?obra=X`
- Arquivo: `src/screens/ObraDetalhe/index.jsx` — `useEffect` linha ~360, `currentPage` lazy init linha ~101

**O que muda com o novo Dashboard panorâmico (E2):**
- Fluxo novo: Login → Dashboard panorâmico (lista de obras, visão geral) → clica obra → ObraDetalhe
- O `?obra=X` na URL continua funcional (deep link direto ainda é válido)
- O "continuar onde parou" explícito seria um botão na tela nova que constrói a URL `?obra=X&page=home`
  com o ID da última obra clicada (persistido via localStorage ou contexto)

**Ação E3:**
- Remover ou isolar a lógica de URL init em `ObraDetalhe` que chama `fetchObraData` no mount
  (ou mantê-la para suportar deep links — decisão de produto)
- Decidir se o "continuar onde parou" é: (a) restaurado automaticamente, (b) botão explícito, ou (c) removido
- Avaliar se `?obra=X` deep link deve continuar funcionando independente do Dashboard novo

---

## Utilitários duplicados (descoberto em fase 2, setup)

Os seguintes arquivos têm cópias LOCAIS de funções já centralizadas em utils/:

- AppAdmin.js — formatCurrency, possivelmente getTodayString
- BiModule.js — formatCurrency
- (outros componentes podem ter, verificar)

**Risco:** implementações podem divergir com o tempo (uma usa pt-BR, outra en-US, etc.),
causando bugs sutis de formatação.

**Quando consolidar:** após fase 3 (telas grandes extraídas), criar uma fase "fase-3.5"
ou incluir no início da fase 6 (design system) — momento natural para padronizar formatação.

---

## Componentes irmãos com duplicação estrutural

### Pagamento Futuro: Cadastrar vs Editar
- Arquivos: src/components/modals/CadastrarPagamentoFuturoModal.jsx, EditarPagamentoFuturoModal.jsx
- Duplicação: ~100 linhas (mesmos campos, layout, validações)
- Diferenças: estado inicial, título do modal, endpoint (POST vs PATCH)
- Solução futura: extrair PagamentoFuturoForm em src/components/forms/, modais viram wrappers finos
- Quando: após fase 3 (telas grandes extraídas)

### Nota Fiscal: Visualizar vs Upload
- Arquivos: src/components/modals/VisualizarNotaFiscalModal.jsx, UploadNotaFiscalModal.jsx
- Duplicação: lógica de construir realItemId a partir de item.tipo_registro
- Solução futura: helper em src/utils/notaFiscal.js — getRealItemId(item)
- Quando: pode ser feito em qualquer momento (low risk)

### Orçamento: Add vs Edit
- Arquivos: src/components/modals/AddOrcamentoModal.jsx, EditOrcamentoModal.jsx
- Duplicação: campos idênticos (descricao, fornecedor, valor, dadosPagamento, tipo, servicoId, observacoes, anexos)
- Diferenças: Add tem `dataVencimento`/`numeroParcelas`/`periodicidade` (condições de pagamento); Edit tem `existingAnexos` (fetch + delete), `newAnexos`; título e endpoint diferentes
- Solução futura: extrair OrcamentoForm em src/components/forms/ (mais complexo que o par PagamentoFuturo por causa das diferenças maiores)
- Quando: após fase 3 (telas grandes extraídas), consolidar todos os pares Add/Edit juntos

### Relatórios: ModalRelatorioCronograma vs RelatoriosModal (endpoint compartilhado)
- Arquivos: src/components/modals/ModalRelatorioCronograma.jsx, RelatoriosModal.jsx
- Duplicação: ambos chamam `/relatorio-cronograma-pdf` para download de PDF
- Diferença de escopo: ModalRelatorioCronograma é global (sidebar, permite escolher qualquer obra); RelatoriosModal é per-obra (dentro da tela da obra, já tem obraId)
- NÃO são pares estruturais — responsabilidades e contextos distintos
- Nota: se o endpoint de download de PDF for centralizado no futuro, seria natural extrair um helper `downloadCronogramaPDF(obraId, obraNome)` em src/utils/
- Quando: fase 6 (design system) ou quando surgir terceiro caller

## Investigação: ModalOrcamentos vs OrcamentosModal

**Hipótese confirmada: C — responsabilidades completamente distintas**

- `ModalOrcamentos` (modal 23): visualizador read-only de todas as solicitações por status. Filtros por Aprovado/Rejeitado/Pendente/Todos. Sem ações destrutivas. Usa `new Intl.NumberFormat('pt-BR', ...)` inline em vez de importar `formatCurrency` — inconsistência de formatação a consolidar na fase 6.
- `OrcamentosModal` (modal 24): painel de ação admin para solicitações PENDENTES. Aprova individualmente ou em lote, rejeita, cria nova solicitação, edita. Depende de sub-modais já extraídos: `ModalAprovarOrcamento`, `AddOrcamentoModal`, `EditOrcamentoModal`. Usa `formatCurrency` corretamente importado.

**NÃO são pares estruturais** — escopo, público-alvo e conjunto de ações são diferentes. Não consolidar.

**Nota de formatação inline em ModalOrcamentos:** `Intl.NumberFormat` direto em vez de `formatCurrency` — terceiro caso de helper de formatação inline após `ModalWhatsAppCronograma` e `RelatoriosModal`. Consolidar todos na fase 6.

---

## Padrão observado

Modais "Add X" / "Edit X" sempre têm essa duplicação. Confirmado em 2 pares:
1. CadastrarPagamentoFuturoModal vs EditarPagamentoFuturoModal
2. AddOrcamentoModal vs EditOrcamentoModal
Aguardar para ver se aparece em mais pares, depois consolidar todos juntos em fase específica.

---

## Inconsistências arquiteturais identificadas durante fase 2

### Modais que não usam o Modal genérico
- `src/components/modals/ModalWhatsAppCronograma.jsx`: tem overlay e backdrop próprios em vez de usar o componente Modal genérico
- `src/components/modals/ModalNovaMovimentacaoCaixa.jsx`: usa `<Modal customWidth="600px">` SEM prop `onClose` — fecha só via botão interno
- `src/components/modals/CaixaObraModal.jsx`: usa `<Modal customWidth="1200px">` SEM prop `onClose` — mesmo padrão
- `src/components/NotaFiscalIcon.jsx`: é componente que ABRE modais, mas tem renderização própria — verificar na fase 6

**Ação:** padronizar todos os modais para usar o Modal genérico na fase 6 (junto com aplicação do design system v2.0). Documento: `_refactor/design-system/04-modal-crud.md`

### Helpers de formatação inline (não importados de utils/)
- `ModalWhatsAppCronograma` usa `formatVal`/`formatDate` inline em vez de importar de `utils/format.js`
- `ModalOrcamentos` usa `new Intl.NumberFormat('pt-BR', ...)` inline em vez de `formatCurrency`
- `CadastrarBoletoModal` usa `.toLocaleString('pt-BR', { minimumFractionDigits: 2 })` inline na lista de múltiplos boletos
- Consolidar todos juntos na fase 6 antes de aplicar design tokens

### Modais que NÃO usam fetchWithAuth (regressão da fase 1)

- `src/components/modals/CadastrarBoletoModal.jsx`: **CORRIGIDO na fase-2-hotfix** (`7bc754b`)
- `src/layout/NotificacoesDropdown.jsx`: **5 fetch diretos** — fetchCount, fetchNotificacoes, toggleLida, limparLidas, limparTodas, marcarTodasLidas — identificado durante fase-3 sub-lote A, extraído como está
- `src/components/GestaoBoletos/index.jsx`: **6 fetch diretos** — fetchBoletos, fetchResumo, verificarAlertas, marcarPago, deletarBoleto, verPreview — identificado durante fase-3 sub-lote B2, extraído como está
- Modal 27 (`EditarParcelasModal`): usa `fetchWithAuth` corretamente — OK
- Modal 28 (`InserirPagamentoModal`): **nenhuma chamada de API direta** — delega tudo via callback `onSave` — OK
- Verificar nos componentes restantes de App.js (Dashboard, HistoricoPagamentosCard, GestaoBoletos, CronogramaFinanceiro) durante sub-lotes B/C

**Risco:** requests que bypassam `fetchWithAuth` podem quebrar silenciosamente em cenários de token expirado, refresh automático, ou qualquer mudança futura no mecanismo de auth.

**Ação — fase 1.5 hotfix** (antes da fase 6, ou imediatamente se houver mudança de auth):
```
grep -rn "localStorage.getItem('token')" frontend/src/components/modals/
grep -rn "fetch(" frontend/src/components/modals/ | grep -v "fetchWithAuth"
```
Substituir todas as ocorrências por `fetchWithAuth` de `auth/fetchWithAuth`.

### Lógica de compressão de imagem duplicada inline
- `CaixaObraModal.handleReanexarComprovante`: tem função `compressImage` inline (canvas/FileReader) em vez de usar `compressImages` de `utils/imageCompression.js`
- Já existe a util — só não foi importada. Risco de divergência de parâmetros (quality, MAX_WIDTH)
- Candidato a fix rápido em qualquer fase; registrado aqui para fase 6

### Estado complexo (candidatos a useReducer — fase 5)
- `CadastrarBoletoModal`: 8 useStates (formData, arquivo, arquivoBase64, extraindo, salvando, multiplosboletos, salvandoTodos, servicos)
- `CaixaObraModal`: 8 useStates (caixa, movimentacoes, isLoading, modalAberto, mesAno, filtroTipo, reanexandoId, deletandoId)
- `EditarParcelasModal`: 7 useStates (parcelas, isLoading, error, parcelaEditando, observacaoEditando, editandoDadosGerais, dadosGerais)
- `InserirPagamentoModal`: **23 useStates** — caso extremo, prioritário para useReducer na fase 5
  - data, dataVencimento, descricao, fornecedor, pix, codigoBarras, valor, tipo, status, orcamentoItemId
  - tipoFormaPagamento, meioPagamento, numeroParcelas, periodicidade, dataPrimeiraParcela
  - temEntrada, percentualEntrada, dataEntrada, valoresIguais, boletosConfig
  - contadorInseridos, toastMsg, isSubmitting
  - Múltiplos "passos" implícitos: avista / parcelado / boleto (muda campos renderizados)
  - Valores derivados calculados inline: valor por parcela, valor entrada, boletos config — candidatos a useMemo
  - Feature "Salvar e Novo": incrementa contadorInseridos para forçar re-mount (workaround técnico)

### Padrão de toast — 3 abordagens distintas (fase 6)
- `notify()` do utils/notify — padrão correto, usado na maioria dos modais
- `document.createElement('div')` inline — `EditarParcelasModal` (função `showToast`)
- useState + JSX condicional — `InserirPagamentoModal` (estado `toastMsg`)
- Consolidar todas as instâncias para `notify()` na fase 6

---

## Fase 2 — COMPLETA

28 modais extraídos de App.js para `src/components/modals/`.
App.js final: 6.666 linhas (era ~10.500 no início da fase 2).

### Candidatos a refactor futuro — mapa consolidado

#### Fase 1.5 hotfix (urgente se houver mudança de auth)
- `CadastrarBoletoModal`: migrar `fetch()` + `localStorage.getItem('token')` → `fetchWithAuth`

#### Fase 3.5 / início fase 6 — consolidar utils
- Todos os modais com formatação inline → importar de `utils/format.js` (`formatCurrency`, `getTodayString`)
- Casos identificados: `ModalWhatsAppCronograma` (formatVal/formatDate inline), `ModalOrcamentos` (Intl.NumberFormat inline), `CadastrarBoletoModal` (toLocaleString inline), `RelatoriosModal`

#### Fase 5 — performance / legibilidade
- `InserirPagamentoModal` (23 useStates) → useReducer, prioridade máxima
- `CadastrarBoletoModal` (8 useStates) → useReducer
- `CaixaObraModal` (8 useStates) → useReducer
- `EditarParcelasModal` (7 useStates) → useReducer (borderline)
- `InserirPagamentoModal` — valores derivados (parcelas, entrada) → useMemo

#### Fase 6 — design system
- Toast: unificar 3 padrões → tudo via `notify()` (`EditarParcelasModal`, `InserirPagamentoModal`, outros)
- Modal sem `onClose`: `ModalNovaMovimentacaoCaixa`, `CaixaObraModal` → padronizar
- `ModalWhatsAppCronograma`: overlay próprio → usar componente Modal genérico
- `CaixaObraModal`: `compressImage` inline → importar `compressImages` de `utils/imageCompression.js`
- `ModalOrcamentos`: `Intl.NumberFormat` inline → `formatCurrency`
- AppAdmin.js, BiModule.js: `formatCurrency` local → importar de utils

#### Após fase 3 — extrair formulários compartilhados
- `CadastrarPagamentoFuturoModal` + `EditarPagamentoFuturoModal` → `PagamentoFuturoForm` em `src/components/forms/`
- `AddOrcamentoModal` + `EditOrcamentoModal` → `OrcamentoForm` em `src/components/forms/`

#### Nota fiscal — helper (pode ser feito a qualquer momento)
- `VisualizarNotaFiscalModal` + `UploadNotaFiscalModal` → extrair `getRealItemId(item)` em `utils/notaFiscal.js`

---

## Aprendizado crítico: encoding do projeto

### Descoberta
Em 12/05/2026, durante smoke test da fase 3, identificado que o App.js original
estava codificado em Windows-1252 (CP1252), não UTF-8. Quando o Dashboard foi
extraído na fase 3 sub-lote D, os caracteres acentuados multibyte (\xc3\xa7 = ç,
\xc3\xa3 = ã, etc.) foram corrompidos a U+FFFD na escrita do novo arquivo.

### Sintomas
- "Orçamento" → "Or?amento" / "Or◆amento" no display
- "Início" → "In?cio"
- "Página" → "P?gina"
- Console: manifest.webmanifest com syntax error (efeito colateral do BOM)

### Fix aplicado (commit b7e9b7c)
- Leitura do App.js original como Win-1252
- Indexação por ASCII skeleton (Or_amento → Orçamento via posição)
- Reescrita do Dashboard/index.jsx em UTF-8 sem BOM
- 134/134 linhas restauradas

### Regra pra próximas extrações
- Sempre ler arquivos antigos especificando encoding explicitamente
- Quando o arquivo for ANCESTRAL (existe há tempo no projeto), tenta Win-1252 primeiro
- Quando o arquivo for RECENTE (criado depois da fase 1), provavelmente é UTF-8
- Sempre escrever novos arquivos como UTF-8 SEM BOM
- Validar após escrita: grep -c $'�' arquivo.jsx → deve retornar 0

### Arquivos verificados em 12/05/2026 (todos UTF-8 válido sem FFFD)
- AgendaDemandas.js, CronogramaObra.js, DashboardObra.jsx, DiarioObras.jsx,
  OrcamentoEngenharia.js, AppAdmin.js — limpos

### Arquivos NÃO verificados
- Demais arquivos em src/ — não verificados ainda. Podem ter o mesmo issue se
  forem antigos. Considerar scan completo antes da fase 6 sub-lote A.

---

## Features dormentes no Dashboard (descobertas em 12/05/2026)

Durante a fase 6 sub-lote B, identificadas referências quebradas no Dashboard
que serviam a 2 features nunca ativadas:

### Feature: Pagamento parcial em pop-up
- **Estado**: `payingItem` (useState)
- **Setter**: `setPayingItem(servico)` — NUNCA é chamado em lugar algum
- **Modal**: `<PartialPaymentModal item={payingItem} onClose onSave>` (após fix)
- **Handler**: `handleSavePartialPayment` — implementado mas não testado
- **Status**: código pronto, falta apenas o GATILHO UI (botão/ícone) que setaria payingItem
- **Onde estaria o gatilho lógico**: linha de serviço em alguma lista do Dashboard — botão "Pagar parcial"

### Feature: Editar prioridade de serviço em pop-up
- **Estado**: `editingServicoPrioridade` (useState)
- **Setter**: `setEditingServicoPrioridade(servico)` — NUNCA é chamado
- **Modal**: `<EditPrioridadeModal item={editingServicoPrioridade} onClose onSave>` (após fix)
- **Handler**: `handleSaveServicoPrioridade` — implementado
- **Status**: pronto, falta gatilho UI

### Recomendação
Decidir caso a caso na fase 5 (review de funcionalidades) ou fase 7 (a11y/UX):

---

## Bug detectado em VisualizarNotaFiscalModal (descoberto na fase 6 D2)

- **Arquivo**: `src/components/modals/VisualizarNotaFiscalModal.jsx`
- **Função**: `handleDownload`
- **Problema**: `window.open(`${API_URL}/notas-fiscais/${nota.id}`, '_blank')` — chama a URL da API diretamente sem `fetchWithAuth`, sem token de autenticação
- **Impacto**: o download falha silenciosamente se a rota exigir auth (retorna 401 ou redireciona)
- **Contraste**: `handleDelete` no mesmo arquivo usa `fetchWithAuth` corretamente
- **Nota**: não corrigido em D2 (fora do escopo). Corrigir em fase de bug fixes: substituir `window.open` por `fetchWithAuth(...).then(res => res.blob()).then(blob => URL.createObjectURL(blob))` e abrir o blob URL
- Manter código (caso a feature volte a ser priorizada)
- Remover por completo (setter, handler, modal-call) se decidido que não é necessária

Não é prioritário — código já funciona corretamente (modais nunca renderizam,
handlers nunca executam).

---

## Bug detectado em CadastrarBoletoModal (descoberto na fase 6 D2 Batch 4)

- **Arquivo**: `src/components/modals/CadastrarBoletoModal.jsx`
- **Função**: `cadastrarTodosBoletos`
- **Linha**: ~163 (após D2, linha mantida com comentário)
- **Problema**: `notify.error(\`✅ ${sucessos} boletos cadastrados com sucesso!...\`)` — usa `notify.error` para mensagem de sucesso. Deveria ser `notify.success`.
- **Impacto**: mensagem exibida com ícone/cor de erro em vez de sucesso, confundindo o usuário
- **Nota**: não corrigido em D2 (fora do escopo de D2 que é apenas wrapper + tokens). Corrigir: trocar `notify.error` por `notify.success` nessa linha.

---

## TODO Sub-lote F (cleanup): Eliminar legacy Modal.jsx

**Status pós-D2 (12/05/2026):**
- 26 modais em `components/modals/` migrados pro novo wrapper `components/Modal/`
- Legacy `components/modals/Modal.jsx` PRESERVADO porque:
  - `src/screens/Dashboard/index.jsx` ainda importa
  - `src/screens/CronogramaFinanceiro/index.jsx` ainda importa

**Plano:**
- Dashboard será REESCRITO no sub-lote E (novo Dashboard panorâmico).
  Aproveita pra usar o novo Modal wrapper na reescrita.
- CronogramaFinanceiro precisa swap dedicado: avaliar se é trocar
  import simples ou se requer refactor da JSX.
- Após ambos resolvidos: deletar `src/components/modals/Modal.jsx`

---

## Bug detectado em ModalOrcamentos (descoberto na fase 6 D2 Batch 6)

- **Arquivo**: `src/components/modals/ModalOrcamentos.jsx`
- **Função**: `handleDownloadAnexo`
- **Problema**: `window.open(`${API_URL}/anexos/${anexoId}`, '_blank')` — chama a URL da API diretamente sem `fetchWithAuth`, sem token de autenticação
- **Impacto**: download de anexo falha silenciosamente se a rota exigir auth (retorna 401 ou redireciona para login)
- **Contraste**: `carregarOrcamentos` no mesmo arquivo usa `fetchWithAuth` corretamente
- **Padrão**: mesmo bug de `VisualizarNotaFiscalModal.handleDownload` — catalogado em D2 Batch 3
- **Nota**: não corrigido em D2 (fora do escopo). Corrigir: substituir `window.open` por `fetchWithAuth(...).then(res => res.blob()).then(blob => URL.createObjectURL(blob))` e abrir o blob URL com `window.open`

---

## TODO: tabs sticky no Modal wrapper (descoberto na fase 6 D2 Batch 5)

- **Contexto**: modais com layout em abas (RelatoriosModal, AdminPanelModal, OrcamentosModal) renderizam as abas DENTRO do `children` do `<Modal>`. Com `scrollBody={true}`, as abas scrollam junto com o conteúdo em vez de permanecerem fixas no topo da área de conteúdo.
- **Impacto**: subótimo em UX — ao scrollar, o usuário perde o contexto das abas. Aceitável como estado atual.
- **Solução futura**: adicionar suporte a `tabs` como prop do `<Modal>` wrapper, renderizando-as fora da área scrollável (sticky abaixo do header). Exemplo: `<Modal tabs={[...]} activeTab={tab} onTabChange={setTab}>...</Modal>`
- **Quando**: futura melhoria do design system (fase 7 ou design system v2.1)

---

## Estreitamento de largura em modais migrados para xlarge (fase 6 D2 Batch 5)

Dois modais tinham `customWidth` maiores que o máximo disponível (`xlarge` = 800px):

- **CaixaObraModal**: `customWidth="1200px"` → `width="xlarge"` (800px). Perda de 400px de largura. Layout de dashboard cards (grid 3 colunas) e tabela de movimentações pode ficar comprimido em telas menores.
- **OrcamentosModal**: `customWidth="96%"` → `width="xlarge"` (800px). Em telas grandes (>840px), o modal era quase fullscreen; agora é fixo em 800px. Tabela de solicitações pendentes pode precisar de scroll horizontal.

**Ação futura**: se o feedback de UX indicar problemas, considerar adicionar `width="fullscreen"` ou `customWidth` como escape hatch no Modal wrapper.

---

## TODO Performance: HistoricoPagamentosCard — virtualização (fase 5)

- **Arquivo**: `src/screens/HistoricoPagamentosCard/index.jsx`
- **Problema**: componente renderiza todos os itens pagos em memória + DOM sem paginação ou virtualização. Smoke test com 339 itens mostrou lentidão.
- **Spec**: `_refactor/design-system/05-lista-densa.md` diz "Virtualização obrigatória quando > 200 linhas — usar `react-window` ou similar"
- **Mitigação atual**: `mostrarTodos` (mostra 10 por padrão, expand opcional). Não resolve o problema de 339 itens em memória.
- **Solução fase 5**: paginação server-side (50/pág default) em `/obras/<id>/lancamentos` ou virtualização client-side com `react-window`. Verificar se `react-window` já está no `package.json` antes de instalar.
- **Nota**: filtros e busca atuais são client-side — paginação server-side exige reescrever para filtros via query params.

## Token ausente: overlay de modal inline (fase 7 ou design system v2.1)

- `rgba(0,0,0,0.5)` usado em `HistoricoPagamentosCard` (edit modal) e provavelmente em outros modais inline.
- Não há token para cor de overlay/backdrop no design system v2.0.
- Candidato a adicionar: `var(--overlay-bg)` = `rgba(0, 0, 0, 0.45)` em `tokens.css`.
- Catalogado aqui para a revisão de tokens da fase 7.

---

## TODO Backend: endpoint PATCH /obras/<id>/arquivar ausente (descoberto em E5 AJUSTADO)

- **Contexto**: Dashboard kebab menu "Arquivar" implementado como botão disabled (tooltip "Em breve") porque o endpoint não existe no backend.
- **Frontend pronto**: `ObraCardActions.jsx` tem a estrutura (botão arquivar já presente, disabled).
- **Backend necessário**: criar rota `PATCH /obras/<id>/arquivar` que seta `obra.concluida = True` (ou similar) sem apagar dados.
- **Diferença de semântica**: `PATCH /obras/<id>/concluir` EXISTS mas tem conotação de "conclusão de obra" (com lógica de progresso). "Arquivar" é uma ação administrativa diferente — ocultar da listagem ativa sem alterar dados de execução.
- **Alternativa simples**: adicionar campo `archived_at` (nullable datetime) na tabela obras + filtrar nas queries de listagem.
- **Quando**: fase backend (após fase 6 frontend completa).

---

## Emojis residuais corrigidos em ObraDetalhe status bar (descoberto em E5)

- **Arquivo**: `src/screens/ObraDetalhe/index.jsx` linhas 1312 e 1317
- **Problema**: dois `??` literals na barra de status — prováveis emojis (🏗️ e 👤) que foram corrompidos em edição anterior.
- **Fix aplicado em E5**: substituídos por Tabler icons `<i className="ti ti-building">` e `<i className="ti ti-user">`.
- **Outros emojis no projeto**: `WindowsNavBar.jsx`, `BiModule.js`, `AppAdmin.js`, `ModuleSelectorScreen.jsx` ainda usam emojis nativos — funcionam em maioria dos browsers mas podem falhar em ambientes sem suporte a emoji (ex: status bars de sistemas operacionais, exports de relatório). Não é urgente — apenas documentar.
- **Regra**: novas telas devem usar Tabler icons em vez de emojis nativos.

---

## TODO Refactor: DiarioObras weather select usa emojis

- **Arquivo**: `src/components/DiarioObras.jsx` — 30+ emojis em `<option>` tags do `<select>` de condição climática (☀️ Ensolarado, ⛅ Parcialmente nublado, ☁️ Nublado, 🌧️ Chuvoso) e em section titles (📎 📝 ✅ 👷 🧱 🔧 💭 etc.)
- **Problema**: HTML `<select>` não aceita JSX em `<option>`, portanto não é possível substituir emojis em option values com Tabler icons diretamente.
- **Solução proposta**: substituir `<select>` por dropdown custom (pattern já existe em `NotificacoesDropdown` e `ObraCardActions`).
- **Outros emojis no arquivo**: section titles e botões podem ser substituídos com Tabler icons normalmente.
- **Defer**: refactor visual dedicado (não escopo da fase 6). Emojis de clima renderizam bem na maioria dos browsers (diferente de 🏠/🏗️ que têm fallback ruim em alguns ambientes).

---

## TODO Fase 8 (Patrimonial): AppAdmin.js emojis

- **Arquivo**: `src/AppAdmin.js` — dezenas de emojis em sidebar (`🏠 Imóveis`, `💰 Lançamentos`), headers, cards, modals e relatórios HTML inline.
- **Escopo**: fora da fase 6 (frontend main — módulo de obras).
- **Quando**: tratar ao iniciar refactor visual do módulo patrimonial (Fase 8 planejada).

---

## TODO Futura: BiModule.js emojis

- **Arquivo**: `src/BiModule.js` — emojis em tab labels (`💰 Financeiro`, `🏗️ Obras`, `📅 Calendário`), ChartCard titles e alert badges.
- **Escopo**: módulo BI tem refactor visual próprio não planejado na fase 6.
- **Quando**: ao dedicar sprint ao módulo BI (sem data definida).

---

## TODO Refactor: Converter modais que viraram pseudo-páginas em embedded components

Páginas via `?page=` que atualmente renderizam como Modal overlays flutuantes em vez de páginas integradas ao layout:

| ?page= | Componente | Situação atual |
|---|---|---|
| caixa | CaixaObraModal | sem prop embedded — Modal overlay |
| relatorios | RelatoriosModal | sem prop embedded — Modal overlay |
| orcamentos | OrcamentosModal | sem prop embedded — Modal overlay |
| pagamento | InserirPagamentoModal | parcial — needs embedded path |
| usuarios | AdminPanelModal | sem prop embedded — Modal overlay |

**Problema**: quando o usuário navega via sidebar para essas páginas, o componente renderiza como modal flutuante por cima da página vazia, não como conteúdo inline.

**Solução**: adicionar suporte a `embedded={true}` em cada modal, similar ao padrão já implementado em `CronogramaObra`, `DiarioObras`, `OrcamentoEngenharia`. Quando `embedded=true`, renderiza sem overlay/backdrop, full-width, sem `<Modal>` wrapper.

**Cabe em**: Fase 6.5 (polish dedicado) ou refactor visual futuro.

**Estimativa**: 1-2 dias para cobrir todos os 5 componentes.

---

## Fase 6 — COMPLETA (12/05/2026)

### Sumário executivo

Design system v2.0 aplicado ao módulo de obras. Sub-lotes A–F concluídos: tokens CSS, migração de `var(--cor-*)` legados para novos tokens, extração de componentes, limpeza de hex hardcoded, deleção do Modal.jsx legado.

### Métricas finais

**Build:**
- Bundle JS: 292.36 kB (gzip) — `-271 B` vs pré-F3
- Bundle CSS: 16.06 kB (gzip) — `-329 B` vs pré-F3
- Status: `Compiled successfully`

**F3 — Hex hardcoded hunt (commit f4af068):**
- 12 arquivos modificados, 537 insertions, 537 deletions
- 471 hex substituídos por `var(--*)` tokens
- 35 hex mantidos intencionalmente (ver abaixo)

### Hex intencionalmente mantidos

#### Marca / brand colors de terceiros

| Cor | Valor | Arquivo | Linha | Motivo |
|-----|-------|---------|-------|--------|
| WhatsApp | `#25D366` | `CronogramaFinanceiro/index.jsx` | 612 | Cor oficial da marca WhatsApp |
| Material blue | `#1976d2` | `CronogramaObra.js` | 1106 | Hint de edição inline (padrão MUI) |
| Material blue | `#1976d2` | `GestaoBoletos/index.jsx` | 171 | Cor de link de edição (padrão MUI) |

#### Paletas de visualização de dados (chart series)

Não tokenizadas — cada cor representa uma série de dado distinta, sem semântica de estado.

| Arquivo | Linhas | Cores |
|---------|--------|-------|
| `DashboardObra.jsx` | 59–70 | `#4f46e5` `#10b981` `#f59e0b` `#6b7280` `#3b82f6` `#ef4444` `#f97316` `#8b5cf6` `#ec4899` `#06b6d4` `#84cc16` `#6366f1` `#14b8a6` `#a855f7` `#eab308` `#22c55e` `#0ea5e9` |

#### Material Design — formulário de medição (CronogramaObra.js)

Paleta de 3 seções coloridas (azul = área, laranja = etapas, verde = execução). Contexto: único formulário de medição dentro da tela de cronograma.

| Arquivo | Linhas | Cores |
|---------|--------|-------|
| `CronogramaObra.js` | 1739–1785 | `#e3f2fd` `#1565c0` `#90caf9` `#fff3e0` `#e65100` `#e8f5e9` `#2e7d32` |

#### Gradientes e hovers computados

Gradientes customizados e cores de hover derivadas por escurecimento manual — tokenizar exigiria variáveis de escopo muito restrito.

| Arquivo | Linhas | Cores | Contexto |
|---------|--------|-------|----------|
| `App.css` | 200–204 | `#9333ea` `#7e22ce` `#6b21a8` | Gradiente do card KPI Despesas Extras |
| `App.css` | 309, 310, 1015 | `#0e8a6a` `#c83b3b` `#4338ca` | Hovers computados (escurecimento de tokens de status) |
| `DashboardObra.css` | 227 | `#1e3a5f` `#2d5a87` | Gradiente do header de serviço no Gantt |
| `CronogramaObra.css` | 1091, 1239 | `#4338ca` | Hover computado de `.btn-save:hover` |

#### Paleta roxa local — EditStageModal + login

Gradiente `#667eea`/`#764ba2` não está no sistema de tokens. Tokenizar exigiria `--brand-purple`/`--brand-purple-dark` — fora do escopo da fase 6.

| Arquivo | Linhas |
|---------|--------|
| `EditStageModal.css` | 100, 153, 166, 178, 269, 280, 289, 298, 315, 334, 387 |
| `login-background.css` | 13 |

### TODO pós-fase-6

- [ ] **GestaoBoletos/index.jsx**: migrar 6 fetch diretos → `fetchWithAuth`
- [ ] **NotificacoesDropdown.jsx**: migrar 5 fetch diretos → `fetchWithAuth`
- [ ] **VisualizarNotaFiscalModal.handleDownload**: `window.open()` sem auth → `fetchWithAuth` + blob URL
- [ ] **ModalOrcamentos.handleDownloadAnexo**: mesmo padrão, mesmo fix
- [ ] **CadastrarBoletoModal**: `notify.error(✅ ...)` para sucesso → trocar por `notify.success`
- [ ] **Modal wrapper**: adicionar `width="fullscreen"` para CaixaObraModal e OrcamentosModal
- [ ] **PRs GitHub**: `refactor/fase-4-backend → main` e `refactor/fase-6-design → main`
- [ ] **Smoke test**: obraly.uk incógnito após Vercel deploy da branch
