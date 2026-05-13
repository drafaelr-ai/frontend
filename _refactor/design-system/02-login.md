# Componente: Login — v2.0

**Status:** Aprovado para produção (11/05/2026)
**Arquivo alvo:** `frontend/src/auth/LoginScreen.jsx` (após Fase 3)
**CSS alvo:** `frontend/src/auth/LoginScreen.css` ou incorporado no design system global

---

## Estrutura

Split-screen, 42% / 58%.
```
┌─────────────────────────────────────────────────────────┐
│ [📐 Logo Obraly]                                        │   ← Painel escuro
│                                                         │     (slate 950)
│                                                         │
│   Gestão de obras                                       │
│   de ponta a ponta.                                     │
│                                                         │
│   Orçamentos, pagamentos, cronogramas.                  │
│   Tudo num só lugar.                                    │
│                                                         │
│ ─────────────                                           │
│ 17 OBRAS ATIVAS │ v2.0 2026                             │
└─────────────────┴───────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                                                         │   ← Painel claro
│       Bem-vindo de volta                                │     (white)
│       Entre com suas credenciais para continuar.        │
│                                                         │
│       Usuário                                           │
│       👤 admin_principal                                │
│                                                         │
│       Senha                                             │
│       🔒 ••••••••••••                                   │
│                                            Esqueci ↗   │
│                                                         │
│       [        Entrar       →]                          │
│                                                         │
│       Problemas para entrar? Contate o admin.           │
└─────────────────────────────────────────────────────────┘
```

---

## Especificação

### Painel escuro (esquerda — 42%)

- **Background:** `#0b1220` sólido (sem gradiente)
- **Pattern sutil:** grade 24×24px em amber 0.06 opacity, sem animação
- **Padding:** 28px
- **Layout:** `flex-direction: column`, `justify-content: space-between`

**Logo (topo):**
- Caixa 32×32 amber (`#f59e0b`), border-radius 7px
- Ícone interno: `building-skyscraper` (Tabler ou Lucide), 20px, cor slate
- Texto "Obraly", 20px, weight 500, letter-spacing -0.01em, cor branco

**Headline (meio):**
- "Gestão de obras / de ponta a ponta." (2 linhas)
- 24px, weight 500, line-height 1.25, cor branco
- Subtítulo: "Orçamentos, pagamentos, cronogramas. Tudo num só lugar."
- 13px, cor `rgba(255,255,255,0.55)`, line-height 1.55

**Stats (rodapé):**
- Border-top: `0.5px solid rgba(255,255,255,0.08)`, padding-top 16px
- Dois blocos lado a lado com divisor vertical
- Bloco 1: número 18px weight 500 ("17") + label 10px uppercase ("OBRAS ATIVAS")
- Bloco 2: idem ("v2.0" / "2026")
- Label cor: `rgba(255,255,255,0.4)`, letter-spacing 0.04em

### Painel claro (direita — 58%)

- **Background:** `#ffffff`
- **Padding:** 56px 48px
- **Centralização:** flex vertical center, conteúdo max-width 320px centralizado

**Título:**
- "Bem-vindo de volta", 22px weight 500, color `#0f172a`, letter-spacing -0.01em
- Subtítulo: "Entre com suas credenciais para continuar.", 13px color `#64748b`
- margin-bottom no subtítulo: 32px

**Labels de campos:**
- 12px weight 500, color `#334155`, margin-bottom 6px

**Inputs:**
- Altura 40px, padding `0 12px 0 36px` (espaço pro ícone), font 14px
- Border: `0.5px solid #cbd5e1`, radius 7px
- Ícone à esquerda dentro do input: 16px color `#94a3b8`
- Username: ícone `user`
- Senha: ícone `lock`
- gap entre campos: 14px

**Link "Esqueci minha senha":**
- 12px color `#64748b`, alinhado à direita
- margin-bottom 20px

**Botão "Entrar":**
- Width 100%, altura 42px
- Background `#0b1220`, color branco
- Radius 7px, sem border
- Font 14px weight 500
- Ícone arrow-right (16px) à direita do texto, gap 8px
- Hover: background `#1e293b`

**Texto auxiliar (rodapé):**
- "Problemas para entrar? Contate o admin."
- 11px color `#94a3b8`, alinhado ao centro, margin-top 24px

---

## Responsivo

Em mobile (< 768px):
- Painel escuro vira topo (altura 200px) ao invés de lado
- Painel claro ocupa o resto
- Padding lateral 24px no formulário

(Detalhes finais quando chegar a fase 6/7.)

---

## O que cai junto

- Apagar `App.css` linhas 69-243 (todo o bloco `.login-screen`, `.login-card`, animações, floating-shapes)
- Apagar arquivo `LoginBackground.jsx` (não usado mais)
- Apagar arquivo `login-background.css`
- Substituir por componente `LoginScreen.jsx` reescrito conforme spec acima

---

## Conexão com o estado React

Mantém o mesmo: estado `username`, `password`, função `handleLogin`. Apenas o **layout/styling** muda.
