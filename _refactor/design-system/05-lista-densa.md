# Componente: Lista densa (Lançamentos) — v2.0

**Status:** Aprovado para produção (11/05/2026)
**Arquivo alvo:** após Fase 3 — `frontend/src/screens/Lancamentos/` (já extraído como `screens/HistoricoPagamentosCard/` na fase 3)
**Substitui:** `HistoricoPagamentosCard` (1.011 linhas)

---

## Por que esse padrão importa

Esse é o template visual de **todas as listas operacionais densas** do Obraly. Aplicável a:
- Lançamentos
- Pagamentos (a pagar e pagos)
- Boletos
- Movimentações de caixa
- Notas fiscais
- Diário de obra (em modo lista)
- Notificações (em modo lista cheia)

Densidade alta = mais informação visível = menos scroll = mais produtividade.

---

## Estrutura geral

```
┌──────────────────────────────────────────────────────────┐
│ [TopNav escura]                                          │
├──────────────────────────────────────────────────────────┤
│ 🏢 Residencial Costa Verde >          [Export] [+ Novo] │  Breadcrumb + ações
│ Lançamentos                                              │
│                                                          │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                     │  Stat cards
│ │Total │ │Pago  │ │Pend. │ │Atras.│                     │  compactos (4)
│ └──────┘ └──────┘ └──────┘ └──────┘                     │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🔍 buscar...   [📅 mês▾] [🔘 Status•2] [🏷 Categ.]  │ │  Toolbar
│ ├──────────────────────────────────────────────────────┤ │
│ │ Data  │ Descrição          │ Categ.│ Valor │ Status │…│ │  Header tabela
│ │ 11/05 │ Compra cimento     │ Estr. │ 3,450 │ ● Pago │·│ │  Linha 1
│ │ 10/05 │ Pgto pedreiro      │ MO    │ 2,800 │ ● Pago │·│ │  Linha 2 (zebra)
│ │ 09/05 │ Boleto betoneira   │ Equip.│ 1,200 │ ● Pend │·│ │
│ │ ...                                                  │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ Exibindo 1-5 de 142          [← 1/29 →]              │ │  Paginação
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Page header

### Breadcrumb (contexto de obra)
- Display flex, gap 6px, font 11px color `#475569`, margin-bottom 4px
- Ícone `building` 12px
- Texto da obra: nome simples (ex: "Residencial Costa Verde")
- Separador: chevron-right 11px color `#94a3b8`

### Título
- H1: 22px weight 500 color `#0f172a` letter-spacing `-0.01em`, margin 0

### Ações (direita)
- Botão secundário "Exportar" com ícone `download`
- Botão primário "Novo lançamento" com ícone `plus`
- Padrão do design system (slate sólido)

---

## Stat cards compactos

Versão **mais densa** dos stat cards do Dashboard:

- Grid 4 colunas, gap 8px
- Cada card: background `#ffffff`, border `0.5px solid #e2e8f0`, radius 6px, padding `10px 12px`
- Linha 1: label 10px uppercase tracking `0.04em` color `#334155`
- Linha 2: valor 18px weight 500 com `font-variant-numeric: tabular-nums`
- Linha 3: contagem complementar 11px color `#475569`

**Cores do valor por tipo:**
- Total: `#0f172a` (neutro forte)
- Pago: `#047857` (green-700)
- Pendente: `#b45309` (amber-700)
- Atrasado: `#b91c1c` (red-700)

---

## Container da tabela

- Background `#ffffff`
- Border `0.5px solid #e2e8f0`
- Border-radius 8px
- Overflow hidden (pra paginação bater na borda)

---

## Toolbar (busca + filtros)

- Padding `10px 12px`
- Border-bottom `0.5px solid #e2e8f0`
- Layout flex, gap 8px, align-items center

### Busca (esquerda, flex: 1)
- Ícone `search` 14px à esquerda interno (left 10px, top 8px, color `#475569`)
- Input height 30px, padding `0 10px 0 32px`, border `0.5px solid #cbd5e1`, radius 6px, font 12px
- Placeholder: texto contextual ("Buscar descrição, fornecedor...")

### Filtros (direita)

Cada botão de filtro:
- Height 30px, padding `0 10px`, background `#ffffff`, border `0.5px solid #cbd5e1`, radius 6px, font 12px color `#334155`
- Layout flex, gap 5px
- Ícone Tabler 13px à esquerda + label + (opcional) chevron-down 11px ou badge

**Quando filtro tem valor aplicado:**
- Mostrar badge de contagem ao final: `background: #0b1220, color: #ffffff, font 10px, padding 0 5px, border-radius 8px, min-width 14px`
- Exemplo: `[🔘 Status •2]`

**Filtros mais comuns:**
- 📅 Período (sempre presente, default = mês corrente)
- 🔘 Status (Pago, Pendente, Atrasado)
- 🏷 Categoria
- 👤 Responsável (quando aplicável)

---

## Tabela

### Header (`<thead>`)
- Background `#fafaf9`
- Border-bottom `0.5px solid #e2e8f0`
- Cada `<th>`:
  - Padding `8px 12px`
  - Font 10px weight 500 color `#334155`
  - Text-transform uppercase
  - Letter-spacing `0.04em`
  - Text-align: depende da coluna (texto à esquerda, números à direita)

### Larguras de coluna (fixas)
- Data: 72px
- Descrição: flexível (sem width — pega o resto)
- Categoria: 110px
- Valor: 90px
- Status: 90px
- Ações (kebab): 28px

### Linhas (`<tbody><tr>`)
- Border-bottom `0.5px solid #f1f5f9`
- **Zebra:** linhas pares têm background `#fafaf9`
- **Hover:** background `#f1f5f9` (toda a linha)
- Cursor: pointer (linha inteira clicável → abre modal de visualização)

### Cada `<td>`:
- Padding `9px 12px`
- Font 12px
- Vertical-align: middle

### Coluna Data
- Color `#475569`
- `font-variant-numeric: tabular-nums` (pra alinhar dias/meses)

### Coluna Descrição (2 níveis)
- Linha 1: 12px weight 500 color `#0f172a` (descrição principal)
- Linha 2: 11px color `#475569`, margin-top 1px (fornecedor/responsável/observação curta)

### Coluna Categoria (pill)
- Pill: padding `2px 8px`, radius 4px, font 11px
- **Cor por tipo:**
  - Estrutura (default neutro): bg `#f1f5f9`, color `#334155`
  - Mão de obra: bg `#fef3c7`, color `#b45309`
  - Equipamento: bg `#dbeafe`, color `#1d4ed8`
  - Operacional: bg `#ede9fe`, color `#6b21a8`
  - Personalizadas: padrão neutro com primeira letra do tipo

### Coluna Valor
- Text-align right
- Color `#0f172a`, font-weight 500
- `font-variant-numeric: tabular-nums`
- **Sem `R$` prefixo** em cada linha (já implícito no contexto da tela)

### Coluna Status (pill com dot)
- Display inline-flex, gap 4px, items center
- Pill: padding `2px 8px`, radius 4px, font 11px weight 500
- Dot: 6×6px, border-radius 50%, mesma cor escura do texto
- **Estados:**
  - **Pago:** bg `#d1fae5`, color/dot `#047857`
  - **Pendente:** bg `#fef3c7`, color/dot `#b45309`
  - **Atrasado:** bg `#fee2e2`, color/dot `#b91c1c`
  - **Cancelado:** bg `#f1f5f9`, color/dot `#475569`
  - **Agendado:** bg `#dbeafe`, color/dot `#1d4ed8`

### Coluna Ações (kebab)
- Width 28px, padding `9px 12px`
- Ícone `dots-vertical` 14px color `#475569`
- Click abre dropdown com: Ver / Editar / Excluir / [opcionais contextuais]

---

## Footer da tabela (paginação)

- Padding `10px 14px`
- Border-top `0.5px solid #e2e8f0`
- Background `#fafaf9`
- Layout flex, justify-between, align-items center
- Font 11px color `#475569`

### Esquerda: status
- "Exibindo X-Y de Z registros"

### Direita: navegação
- Botão prev: 24×24px, border `0.5px solid #cbd5e1`, radius 4px, ícone chevron-left 12px
- Indicador: "1 / 29" — padding 0 6px
- Botão next: mesmo padrão
- **Botões desabilitados:** color `#94a3b8` em vez de `#334155`
- Atalhos de teclado: ← → navegam, opcional

---

## Estados

### Loading
Skeleton da tabela com 5-10 linhas: cada célula vira retângulo cinza animado. Stat cards: valor vira retângulo cinza. Mantém estrutura, só esconde dado.

### Vazio
- Quando não há lançamentos: tabela mostra ilustração simples + texto "Nenhum lançamento ainda" + CTA "Criar primeiro lançamento"
- Quando filtros não retornam nada: "Nenhum resultado para os filtros aplicados" + link "Limpar filtros"

### Erro
- Banner vermelho no topo da tabela: "Falha ao carregar. Tentando novamente em 5s..." + botão "Tentar agora"

---

## Componentes que essa tela introduz no design system

1. **`<PageHeader breadcrumb title actions />`** — variante do PageHeader do Dashboard com breadcrumb
2. **`<StatCardCompact label value caption variant />`** — versão menor do StatCard
3. **`<Toolbar search filters />`** — barra de busca + filtros padronizada
4. **`<FilterButton icon label count />`** — botão de filtro com badge
5. **`<DataTable columns rows />`** — tabela densa padrão
6. **`<StatusPill status />`** — pill com dot por status (já catalogada parcialmente no Dashboard)
7. **`<CategoryTag category />`** — pill colorido por categoria
8. **`<KebabMenu actions />`** — menu de ações por linha
9. **`<Pagination current total onChange />`** — controles de paginação

---

## Performance

- **Virtualização obrigatória** quando > 200 linhas (usar `react-window` ou similar). HistoricoPagamentosCard atual carrega tudo e re-renderiza em qualquer mudança — vai ficar lento com 1k+ lançamentos.
- **Paginação servidor-side** (50/página default, max 200) — já planejado na fase 5.
- **Busca com debounce** (300ms) — não bater API a cada tecla.
- **Filtros aplicados em URL query string** — links compartilháveis, navegação backbutton funciona.

---

## Comparação com o que existe hoje

| Aspecto | Atual (HistoricoPagamentosCard) | Novo (lista densa) |
|---|---|---|
| Linhas/viewport | 5-8 | 18-20 |
| Altura por entrada | ~80-100px | 36px |
| Filtros | Embaralhados no header | Toolbar dedicada |
| Status | Texto ou badge inflada | Pill 11px com dot |
| Categoria | Texto | Pill colorido |
| Ações | Botões expostos | Kebab menu |
| Paginação | Não existe (?) | Server-side, 50/pág |
| Busca | Existe mas inconsistente | Toolbar padrão |

Implementação: substitui o componente atual. Lógica de fetch/filter pode reaproveitar.
