# Componente: Modal CRUD padrão — v2.0

**Status:** Aprovado para produção (11/05/2026, com contraste corrigido)
**Aplica-se a:** todos os modais em `frontend/src/components/modals/` (27 modais — NotaFiscalIcon foi pra components/)
**Implementação:** Fase 6, após Fase 2 terminar de extrair os modais

---

## Por que esse padrão importa

Hoje os modais do Obraly têm visuais inconsistentes — cada um foi feito num momento, com decisões diferentes. O usuário paga em carga cognitiva. Esse padrão se aplica aos 27 modais sem exceção. **Diferentes funcionalmente, idênticos visualmente.**

---

## Estrutura obrigatória

```
┌────────────────────────────────────────────┐
│  Título do modal              [X fechar]  │ ← HEADER
│  Subtítulo de contexto                    │
├────────────────────────────────────────────┤
│                                            │
│  [campos do form]                          │ ← BODY
│                                            │
├────────────────────────────────────────────┤
│  ⓘ hint informativo    [Cancelar] [✓ Ok] │ ← FOOTER
└────────────────────────────────────────────┘
```

---

## Container

- **Background:** `#ffffff` (explícito, sempre)
- **Border-radius:** 10px
- **Width padrão:** `max-width: 480px` (formulários). Variantes: 360px (confirmação), 640px (médio), 800px (grande)
- **Box-shadow:** `0 20px 60px rgba(15,23,42,0.25)`
- **Overlay (backdrop):** `rgba(11, 18, 32, 0.55)` cobrindo viewport inteiro
- **`color-scheme: light`** deve estar declarado na raiz do app (vide regra 7 do design system)

---

## Header

- **Padding:** `18px 20px`
- **Background:** `#ffffff` (explícito)
- **Border-bottom:** `0.5px solid #e2e8f0`
- **Layout:** flex, justify-between, gap 16px, align-items flex-start

**Lado esquerdo:**
- Título: 16px, weight 500, color `#0f172a`, letter-spacing -0.01em, margin-bottom 2px
- Subtítulo (opcional): 12px, color `#475569` — contexto: nome da obra, número de documento, etc.

**Botão fechar:**
- 28×28px, background `#ffffff`, sem border, radius 6px
- Ícone `x` 16px, color `#475569`
- Hover: background `#f1f5f9`
- `aria-label="Fechar"`

---

## Body

- **Padding:** 20px
- **Background:** `#ffffff` (explícito)

### Padrão de campos

Cada campo é um bloco com:
- **Label:** display block, font 12px weight 500, color `#334155`, margin-bottom 6px
- **Sufixo opcional:** "(opcional)" em weight 400 color `#64748b`
- **Input/select/textarea:** height 38px (textarea: min-height 80px), padding `0 12px`, border `0.5px solid #cbd5e1`, radius 6px, font 13px, **background `#ffffff` explícito**, color `#0f172a`
- **Margin-bottom entre blocos:** 14px

### Grid de campos relacionados

Campos correlatos curtos (valor + data, início + fim, qtd + unidade) sempre em **2 colunas com gap 12px**. Nunca empilhados verticalmente.

### Inputs com prefixos/ícones

- **Prefixo monetário (R$):** span absolute, left 12px, top 10px, font 13px color `#475569`, z-index 1. Input com padding-left 36px.
- **Ícone à esquerda:** Tabler 14-16px, absolute, left 12px, top 11px, color `#475569`, z-index 1. Input com padding-left 36px.
- **Chevron à direita (select):** absolute right 12px, top 12px, font 14px color `#475569`, z-index 1.

### Pills binárias (toggle)

Quando o campo tem 2 opções claras (Material vs MO, Receita vs Despesa, Pago vs Pendente), use pills lado a lado em vez de select dropdown:

- **Container:** grid 2 colunas, gap 8px
- **Pill ativa:** height 36px, background `#0b1220`, color `#ffffff`, border-none, radius 6px, font 12px weight 500, ícone 14px à esquerda do label, gap 6px
- **Pill inativa:** mesmo height/radius/font, background `#ffffff`, color `#334155`, border `0.5px solid #cbd5e1`

### Drop zone (upload de arquivo)

- Border `0.5px dashed #94a3b8`
- Background `#fafaf9`
- Padding 14px
- Layout: flex, gap 10px, items center
- Ícone `upload` 18px color `#334155`
- Texto principal: 12px weight 500 color `#334155`
- Hint: 11px color `#475569`, margin-top 1px

---

## Footer

- **Padding:** `14px 20px`
- **Border-top:** `0.5px solid #e2e8f0`
- **Background:** `#fafaf9` (sutil, separa visualmente do body)
- **Border-radius:** `0 0 10px 10px`
- **Layout:** flex, justify-between, align-items center, gap 12px

### Hint informativo (esquerda, opcional)

- Display flex, gap 6px, font 11px color `#334155`
- Ícone `info-circle` 13px
- Texto: consequência da ação ("Será salvo como pendente", "Notificação enviada ao gestor", "Esta ação não pode ser desfeita")
- Quando ação é destrutiva: ícone e texto color `#b91c1c` (red-700)

### Ações (direita)

Sempre 2 botões. Cancelar primeiro (esquerda), primário depois (direita), gap 8px.

**Botão Cancelar (secundário):**
- Height 34px, padding `0 14px`
- Background `#ffffff`, color `#334155`, border `0.5px solid #cbd5e1`, radius 6px
- Font 12px weight 500

**Botão primário:**
- Mesmas dimensões
- Background `#0b1220`, color `#ffffff`, sem border
- Font 12px weight 500
- Ícone à esquerda do texto (check, save, send, etc.), 14px, gap 6px

**Variante destrutiva:** substituir background do primário por `#dc2626` (red-600). Resto igual.

---

## Variantes do modal

### V1. Visualização (read-only)

- Body com `<dl>` semântico ao invés de inputs
- Cada par: label 12px color `#475569` (term) + valor 13px color `#0f172a` (definition)
- Footer só com botão "Fechar" à direita

### V2. Confirmação destrutiva

- Width `max-width: 360px`
- Sem body de formulário
- Body: ícone `alert-triangle` 32px color `#dc2626` no topo + pergunta clara em 14px color `#0f172a` + detalhe em 12px color `#475569`
- Footer com hint "Esta ação não pode ser desfeita" (red) e botão primário vermelho

### V3. Upload puro

- Body é a drop zone grande (min-height 180px) centralizada
- Sem outros campos
- Após drop, mostra preview do arquivo dentro da mesma área

### V4. Modal grande (mais de 5 campos)

- Width `max-width: 640px` ou `800px`
- Body com `max-height: 70vh; overflow-y: auto`
- Header e footer **não scrollam** — fixos relativo ao modal
- Pode organizar campos em seções com subtítulos: 11px uppercase tracking `0.04em` color `#475569`, margin-top 16px, margin-bottom 8px

### V5. Modal com tabs

- Tabs entre header e body
- Container das tabs: padding `0 20px`, border-bottom `0.5px solid #e2e8f0`
- Cada tab: padding `10px 0`, font 13px color `#475569`, border-bottom 2px transparente
- Tab ativa: color `#0f172a`, border-bottom `2px solid #0b1220`
- Body muda por tab

---

## Acessibilidade obrigatória

- Container: `role="dialog"` `aria-modal="true"` `aria-labelledby="<id do título>"`
- Título: `<h2 id="modal-X-titulo">`
- Esc fecha o modal
- Foco inicial vai pro primeiro input do body
- Tab cicla DENTRO do modal (focus trap)
- Backdrop click fecha (a menos que tenha alterações não salvas — aí confirma antes)

---

## Mapeamento por modal existente

Quando aplicar (fase 6), os 27 modais se encaixam nas variantes assim:

| Modal | Variante |
|---|---|
| Modal genérico (wrapper) | Padrão V0 (base) |
| EditPrioridadeModal | Padrão |
| ViewAnexosModal | V1 (read-only) |
| PartialPaymentModal | Padrão |
| ExportReportModal | Padrão (form curto) |
| UploadNotaFiscalModal | V3 (upload puro) |
| EditLancamentoModal | Padrão |
| VisualizarNotaFiscalModal | V1 (read-only) |
| CadastrarPagamentoFuturoModal | Padrão |
| EditarPagamentoFuturoModal | Padrão |
| ModalAprovarOrcamento | V2 (confirmação) ou padrão |
| AddLancamentoModal | Padrão |
| AddOrcamentoModal | V4 (grande) |
| EditOrcamentoModal | V4 (grande) |
| UserPermissionsModal | Padrão |
| AdminPanelModal | V5 (com tabs — usuários / sistema) |
| ModalNovaMovimentacaoCaixa | Padrão |
| ModalRelatorioCronograma | V4 (grande) |
| ModalWhatsAppCronograma | V4 (grande, com preview) |
| RelatoriosModal | V5 (tabs por tipo de relatório) |
| CadastrarPagamentoParceladoModal | V4 (grande) |
| CadastrarBoletoModal | V4 (grande) |
| OrcamentosModal | V5 (tabs) |
| ModalOrcamentos | V5 (tabs) |
| InserirPagamentoModal | V4 (grande) |
| CaixaObraModal | V4 (grande) |
| EditarParcelasModal | V4 (grande) |

**Nota:** NotaFiscalIcon NÃO é modal — vive em `components/NotaFiscalIcon.jsx`. Ignorar nesta fase.

---

## Componente compartilhado a criar

Quando a fase 6 chegar, criar `frontend/src/components/Modal/`:

- `Modal.jsx` — wrapper base (header, body, footer slots)
- `Modal.css` — estilos compartilhados
- `ModalConfirm.jsx` — wrapper de V2 já configurado
- `ModalView.jsx` — wrapper de V1 já configurado
- `useModalKeyboard.js` — hook pra Esc + focus trap

Cada um dos 27 modais individuais consome `Modal` e fornece o conteúdo do body. O CSS sai dos arquivos individuais.
