# Componente: Dashboard — v2.0

**Status:** Aprovado para produção (11/05/2026)
**Arquivo alvo:** `frontend/src/screens/Dashboard/` (após Fase 3)
**Substitui:** função `Dashboard()` atual no App.js (linhas ~6709-8035, 1.327 linhas)

---

## Estrutura geral

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard Obras Orçamentos Pagamentos    [🔔 3] [DR] │  Nav (slate 950)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Visão geral                              [📅 mês▾] [+ Nova]│  Page header
│  Resumo · Maio 2026                                          │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────⫶ alerta⫷                │  4 stat cards
│  │ 17   │ │R$287k│ │R$194k│ │  5   │                         │
│  │obras │ │a pgr │ │pago  │ │bolt. │                         │
│  └──────┘ └──────┘ └──────┘ └──────┘                         │
│                                                              │
│  ┌─────────────────────────────┐ ┌────────────────────────┐ │
│  │ Obras em andamento  Ver →   │ │ Atividade recente      │ │  2 colunas
│  │ ─────────────────────────── │ │ ────────────────────── │ │  1.6fr / 1fr
│  │ Costa Verde   R$1.2M  72%   │ │ ✓ Pgto R$12k aprovado  │ │
│  │ ────────────────────━━━━━━━ │ │ 📃 Novo boleto         │ │
│  │ Aurora       R$890k   45%   │ │ 📄 Orçamento aprovado  │ │
│  │ ────────────━━━━━━━         │ │ ✏ Diário atualizado    │ │
│  │ Galpão Norte R$540k   88%   │ └────────────────────────┘ │
│  │ ────────━━━━━━━━━━━━━━━━━━━ │                            │
│  │ Reforma C.   R$215k   22%   │                            │
│  │ ━━━━━                       │                            │
│  └─────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Especificação

### 1. Navbar superior (componente compartilhado)

Vai virar `frontend/src/layout/TopNav.jsx`. Não pertence só ao Dashboard — usado em todas as telas autenticadas.

- **Altura:** 48px
- **Background:** `#0b1220`
- **Padding lateral:** 20px

**Lado esquerdo (gap 32px):**
- Logo: caixa 22×22 amber + texto "Obraly" 14px weight 500
- Nav items: gap 4px entre eles
  - Item normal: padding `6px 10px`, color `rgba(255,255,255,0.55)`, fonte 12px
  - Item ativo: background `rgba(255,255,255,0.08)`, color branco
  - Border-radius 5px

**Lado direito (gap 12px):**
- Sino com badge: ícone `bell` 18px + badge amber redondo com contador
- Avatar: círculo 28px com iniciais (fundo `#1e293b`, texto branco 11px)

### 2. Page header

- **Espaçamento abaixo do nav:** 24px (margin-top do container interno = padding)
- **Layout:** flex justify-between

**Lado esquerdo:**
- H1: "Visão geral" — 22px weight 500 color `#0f172a` letter-spacing -0.01em
- Subtítulo: "Resumo de todas as obras · Maio 2026" — 12px color `#64748b`

**Lado direito (gap 8px):**
- Filtro de período: botão branco com ícone calendar + label + chevron-down
  - Height 32px, padding `0 12px`, border `0.5px solid #cbd5e1`, radius 6px, font 12px
- CTA primária: "Nova obra" — botão slate sólido
  - Height 32px, padding `0 12px`, background `#0b1220`, color branco, radius 6px, font 12px
  - Ícone plus 14px à esquerda

### 3. Stat cards (4 em linha)

**Grid:**
- `grid-template-columns: repeat(4, 1fr)` (desktop)
- gap 10px
- Em mobile: `repeat(2, 1fr)` ou `repeat(auto-fit, minmax(160px, 1fr))`

**Card padrão (3 dos 4):**
- Background `#ffffff`
- Border `0.5px solid #e2e8f0`
- Border-radius 8px
- Padding 14px

**Estrutura interna:**
- Linha 1: ícone 13px color `#475569` + label 11px uppercase tracking `0.03em` color `#334155`, gap 6px
- Linha 2: número grande — 24px weight 500 color `#0f172a` letter-spacing `-0.01em`
- Linha 3: contexto — 11px, cor varia por tipo:
  - Sucesso/positivo: color `#047857` (green-700)
  - Neutro/info: color `#475569`
  - Warning: color `#b45309` (amber-700)

**Card de alerta (4º, "Boletos vencendo"):**
- Border externa: `0.5px solid #fde68a` (amber 200)
- Borda lateral esquerda: 3px sólida amber `#f59e0b`, absolute, height total, radius `8px 0 0 8px`
- Ícone: alert-triangle color `#b45309`
- Label: color `#b45309` (mesma cor do ícone)
- Número: continua color `#0f172a`
- Contexto: color `#b45309`

**Padrão:** sempre que um card tiver caráter de "atenção/urgência", aplicar essa borda lateral amber.

### 4. Layout em 2 colunas

- `grid-template-columns: 1.6fr 1fr` (proporção esquerda 60% / direita 40%)
- gap 16px
- Em mobile: `1fr` (empilhado)

### 5. Lista "Obras em andamento" (coluna esquerda)

**Container:**
- Background branco
- Border `0.5px solid #e2e8f0`, radius 8px
- Overflow hidden (pra divisores baterem com a borda)

**Header da lista:**
- Padding `12px 14px`
- Border-bottom `0.5px solid #e2e8f0`
- Layout: flex justify-between
- Esquerda: "Obras em andamento" — 13px weight 500 color `#0f172a`
- Direita: link "Ver todas →" — 11px color `#64748b`

**Cada linha de obra:**
- Padding `12px 14px`
- Border-bottom `0.5px solid #f1f5f9` (mais sutil que do header)
- Grid: `1fr 80px 60px`, gap 12px, items-center

**Coluna 1 (nome + barra):**
- Nome: 13px weight 500 color `#0f172a`, margin-bottom 4px
- Barra de progresso:
  - Trilho: height 4px, background `#f1f5f9`, radius 2px
  - Preenchimento: width = % de progresso, height 100%
  - **Cor por estado:**
    - `< 30%`: amber `#f59e0b`
    - `30-70%`: blue `#3b82f6`
    - `> 70%`: green `#10b981`

**Coluna 2 (valor):**
- Font 11px color `#64748b`, text-align right

**Coluna 3 (porcentagem):**
- Font 11px weight 500, text-align right
- Cor combina com a barra:
  - `< 30%`: `#b45309` (amber dark)
  - `30-70%`: `#1d4ed8` (blue dark)
  - `> 70%`: `#047857` (green dark)

**Última linha:** sem border-bottom.

### 6. Atividade recente (coluna direita)

**Container:** mesmo padrão de card que a lista de obras.

**Header:**
- Padding `12px 14px`
- Border-bottom `0.5px solid #e2e8f0`
- Ícone `activity` 13px color `#94a3b8` + texto "Atividade recente" 13px weight 500 color `#0f172a`, gap 6px

**Cada item:**
- Padding `10px 14px`
- Border-bottom `0.5px solid #f1f5f9`
- Display flex, gap 8px

**Ícone (círculo colorido 24×24):**
- Border-radius 50%
- Fundo claro do tipo, ícone com cor escura do mesmo tipo
- **Tipos:**
  - Sucesso (pagamento aprovado): fundo `#d1fae5` (green 100), ícone color `#047857`
  - Aviso (boleto novo): fundo `#fef3c7` (amber 100), ícone color `#b45309`
  - Info (orçamento aprovado): fundo `#dbeafe` (blue 100), ícone color `#1d4ed8`
  - Neutro (edição/atualização): fundo `#f1f5f9` (slate 100), ícone color `#64748b`

**Texto:**
- Linha 1: 12px color `#0f172a` line-height 1.4
  - Valores dentro do texto (R$ X) com font-weight 500
- Linha 2: timestamp + contexto — 11px color `#475569`, margin-top 2px

### 7. Padding e espaçamento global

- Padding do container interno do dashboard: 24px
- Margin-bottom entre seções: 20px

---

## Comportamentos

- **Cards e linhas são clicáveis.** Cada obra na lista abre detalhes da obra. Cada item de atividade leva pra fonte (ex: pagamento aprovado abre o pagamento).
- **Hover:** background `#fafaf9` em itens de lista. Cursor pointer.
- **Loading state:** skeleton (não spinner). Cards mantêm a mesma forma, com placeholders animados sutis.
- **Empty state:** quando não há obras, mostra ilustração discreta + texto + CTA "Criar primeira obra".

---

## Componentes que essa tela introduz no design system

Pra evitar duplicação em outras telas, os seguintes viram componentes reutilizáveis:

1. **`<TopNav />`** — navegação principal (vai pra `layout/`)
2. **`<PageHeader title subtitle actions />`** — header de qualquer página interna
3. **`<StatCard icon label value caption variant />`** — card de métrica
4. **`<AlertStatCard />`** — variante com borda amber lateral
5. **`<ProgressBar value />`** — barra com cor automática pelo valor
6. **`<ActivityItem type text time context />`** — item de atividade
7. **`<DataList header items renderItem />`** — wrapper de lista em card

---

## O que cai junto

- Apagar a função `Dashboard()` atual do App.js (1.327 linhas)
- Apagar os componentes embutidos: `QuadroAlertasVencimento`, `GastosPorSegmentoChart` (se não forem reutilizados)
- Substituir por:
  - `screens/Dashboard/index.jsx` — orquestrador, ~150 linhas
  - `screens/Dashboard/StatCards.jsx`
  - `screens/Dashboard/ObrasList.jsx`
  - `screens/Dashboard/ActivityFeed.jsx`

---

## O que NÃO está nessa versão (pendente de discussão)

- **Gráficos.** O atual tem charts; aqui simplifiquei. Pode entrar uma segunda dobra com gráfico de "Gastos por mês" se for útil.
- **Filtros avançados.** Apenas filtro de período no header. Filtros por status, por valor, etc. ficam para a tela de Obras propriamente dita.
- **Dark mode.** Não está nessa especificação. Quando definir, valores adaptam usando design tokens.
