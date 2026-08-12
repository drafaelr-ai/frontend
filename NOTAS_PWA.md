# NOTAS — Obraly PWA (iOS)

Trabalho executado em 2026-07-31 (branch `feature/pwa-ios`, base `main`).

---

## Registro de mudanças (deployado em produção)

**`f82b0ed` — feat(pwa) — 2026-07-31** (fases 1–6, mergeado na `main`):

| Área | Arquivos | O que mudou |
|---|---|---|
| Manifest/metas | `public/manifest.webmanifest`, `public/index.html` | name/scope/lang/orientation; metas Apple (standalone, black-translucent, title); `viewport-fit=cover` + zoom travado; manifest `?v=5` |
| Service worker | `public/service-worker.js`, `src/pwa/serviceWorkerRegistration.js` | `CACHE_VERSION = 'v2'`; `skipWaiting` só via aceite do usuário; registro detecta worker em waiting e emite `obraly:sw-update` |
| Adaptação iOS | `src/styles/mobile.css` (novo), `src/pwa/platform.js` (novo), `src/utils/notify.jsx`, `src/layout/ModuleSelectorScreen.jsx` | tudo sob `body.platform-ios`: safe areas (navbars, headers, modais, toasts), 100dvh, inputs 16px, touch-callout/tap-highlight; teclado centraliza campo focado. Nenhum token global alterado |
| Offline/atualização | `src/pwa/PwaExtras.jsx` (novo), `src/pwa/pwa.css` (novo), `src/auth/networkNotice.js` (novo) | OfflineBanner + OfflineState + UpdateToast montados na raiz; falha de rede vira aviso claro com trava anti-spam de 8s |
| Sessão | `src/auth/fetchWithAuth.js`, `src/auth/fetchWithAuthAdmin.js`, `src/auth/LoginScreen.jsx/.css` | 401/422 marca `sessionStorage.obraly_sessao_expirada`; LoginScreen mostra aviso azul neutro "Sua sessão expirou, entre novamente" |
| Instalação iOS | `src/pwa/PwaExtras.jsx` (InstallHint) | folha discreta iOS-only (Compartilhar → Adicionar à Tela de Início); detecta navegador embutido (WhatsApp etc) e manda abrir no Safari; dispensa persistida em `localStorage.obraly_pwa_hint_dismissed` |

**`bf49ffb` — fix(seletor) — 2026-08-01**: em ≤760px o `flex-basis: 380px`
do desktop virava altura mínima do card hero (card "Obras" gigante com vazio
no meio). Agora `flex: 0 0 auto` no breakpoint — altura do conteúdo.
Atinge web mobile, PWA iOS e o app Android (mesma tela).

**Validação até agora (2026-08-01)**:
- ✅ Emulação desktop (Chrome/Edge, UA iPhone): card hero correto, folha de
  instalação aparece, service worker v2 ativo, artefatos todos no ar
  (conferidos via curl em `www.obraly.uk` — o apex `obraly.uk` responde 307
  para `www`).
- ⏳ PENDENTE: checklist FASE 7 em iPhone físico (Compartilhar → Adicionar à
  Tela de Início, standalone, splash, safe areas reais, teclado, sessão
  após horas) — impossível em emulador/Windows, a barra do Safari não existe
  fora do aparelho.
- ⏳ PENDENTE: regressão do Obraly Pro no Honor Magic 8 Pro (o SW v2 entra no
  app publicado no primeiro acesso).
Contexto: o mesmo site roda no navegador, no PWA instalado do iPhone **e**
dentro do app Android publicado (Capacitor com `server.url: https://obraly.uk`).
Tudo que o service worker faz atinge os três.

---

## Kill switch do service worker (rota de emergência)

Cenário: um deploy ruim deixou um service worker defeituoso preso nos
aparelhos dos usuários (inclusive dentro do Obraly Pro da Play Store).

O desenho atual já limita o estrago — navegação NUNCA é servida de cache, então
o HTML novo sempre chega e traz o `service-worker.js` novo no próximo ciclo.
Se mesmo assim for preciso desativar tudo, publicar este conteúdo como
`public/service-worker.js` e fazer deploy:

```js
// SW de emergência: desregistra e limpa todos os caches.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => self.registration.unregister())
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then((clients) => clients.forEach((c) => c.navigate(c.url)))
    );
});
```

Passos:
1. Substituir `public/service-worker.js` pelo bloco acima.
2. Commit + push na `main` (deploy automático Vercel).
3. Aguardar até 1h (intervalo do `registration.update()`) ou pedir para o
   usuário fechar e reabrir o app/site — o SW novo assume, limpa e se remove.
4. Depois do incidente, publicar um SW normal com `CACHE_VERSION` incrementada.

Nunca renomear/remover o arquivo `service-worker.js` do deploy: sem um arquivo
no mesmo caminho, o SW velho fica registrado para sempre (até o iOS expirar).

## Atualização de versão — operação normal

- `CACHE_VERSION` em `public/service-worker.js` deve ser incrementada a cada
  release que mude estratégia de cache ou arquivos pré-cacheados (hoje: `v3`).
- O usuário vê "Nova versão disponível — Atualizar" (UpdateToast) e decide
  quando aplicar. Nada de `skipWaiting()` automático: atualização forçada no
  meio de um lançamento financeiro perde o formulário digitado.

**Release 2026-08-03:** cache atualizado para `v3`, manifesto para `?v=6` e
registro com `updateViaCache: 'none'`. A Vercel revalida o service worker e o
manifesto em toda consulta (`max-age=0, must-revalidate`), garantindo que o app
Android detecte a versão nova sem reutilizar o arquivo de atualização antigo.

**Release 2026-08-12:** removido `display_override: window-controls-overlay`
(manifesto para `?v=7`). No PWA desktop o overlay tirava a barra de título e,
sem região `app-region: drag` no app, a janela ficava impossível de arrastar
quando não maximizada. Volta ao `standalone` puro — barra de título nativa,
janela arrastável. Apps já instalados pegam a mudança 1–2 aberturas depois
(Chrome/Edge revalidam o manifesto no launch); persistindo, reinstalar.

## Passo a passo de instalação para mandar aos usuários (WhatsApp)

> **Instalar o Obraly no iPhone**
> 1. Abra https://obraly.uk no **Safari** (se abriu por aqui, toque em ⋯ →
>    "Abrir no navegador" primeiro).
> 2. Toque no botão **Compartilhar** (quadrado com seta pra cima, no rodapé).
> 3. Role e toque em **Adicionar à Tela de Início**.
> 4. Toque em **Adicionar**. Pronto — o ícone do Obraly aparece como app.
>
> No Android não precisa: o Obraly Pro está na Play Store.

O próprio site também guia: no iPhone fora do app instalado, uma folha
discreta mostra os dois passos (e detecta navegador embutido tipo WhatsApp,
mandando abrir no Safari).

## Sessão e formulários — decisão registrada

- 401/422 → limpa storage, marca `sessionStorage.obraly_sessao_expirada`,
  recarrega; o LoginScreen mostra "Sua sessão expirou, entre novamente"
  (aviso neutro, sem stack trace, sem loop).
- **Perda de formulário em sessão caída no submit**: comportamento mínimo
  atual = o toast avisa e a tela recarrega após ~0,5s; o conteúdo digitado é
  perdido. Rascunho automático (persistir campos antes do submit e reidratar
  após login) é ESCOPO NOVO — não implementar sem aprovação. Registrado como
  candidato a fase futura, começando por `InserirPagamentoModal` e
  `AddLancamentoModal`.

## Futuro (fora do escopo desta entrega)

- **Passkey/WebAuthn** como desbloqueio biométrico no lugar de senha —
  substituto natural quando o iOS descartar storage; exige backend.
- **Push notifications iOS**: só funciona com o PWA instalado na tela de
  início; exige backend (Web Push) — fase separada.
- **Cache offline de dados da API**: proibido por decisão (valores
  financeiros desatualizados são piores que indisponíveis).
- **Cache dos assets de CDN** (fontes Google/ícones Tabler via jsdelivr): o SW
  ignora cross-origin de propósito — resposta opaca não é verificável e infla
  quota. Se um dia o offline precisar de ícones, servir os assets do próprio
  domínio (self-host) em vez de cachear CDN.

## Observações de escopo levantadas durante o trabalho

- `viewport` agora tem `maximum-scale=1.0, user-scalable=no` (exigência do
  prompt para matar zoom acidental) — custo de acessibilidade conhecido.
- Ícones: conjunto completo já existia (favicon 64, 192/512 any + maskable,
  apple-touch-icon 180) — todos achatados sobre BRANCO (alfa 255) e o
  maskable com o logo na zona segura central. Nada regenerado.
- Cores do manifest mantidas na paleta real da marca (`#001560` splash /
  `#0061FC` theme), consistentes com o splash do app Android publicado —
  o `#0b1220` sugerido no prompt era o dark do design system, não a marca.
