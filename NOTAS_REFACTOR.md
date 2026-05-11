# Notas de Refactor — Pendências Identificadas

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

## Padrão observado

Modais "Add X" / "Edit X" sempre têm essa duplicação. Confirmado em 2 pares:
1. CadastrarPagamentoFuturoModal vs EditarPagamentoFuturoModal
2. AddOrcamentoModal vs EditOrcamentoModal
Aguardar para ver se aparece em mais pares, depois consolidar todos juntos em fase específica.
