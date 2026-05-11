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

## Padrão observado

Modais "Cadastrar X" e "Editar X" sempre têm essa duplicação. Aguardar para ver se aparece em outros pares (provavelmente Orçamento e Boleto), depois consolidar todos juntos em uma fase específica.
