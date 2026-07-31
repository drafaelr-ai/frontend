/*
 * Obraly PWA
 *
 * Não armazenamos HTML nem chamadas da API: isso evita exibir dados de outra
 * sessão e mantém todas as operações autenticadas sob as regras do backend.
 * Este service worker roda também dentro do app Android (Capacitor aponta o
 * WebView para obraly.uk) — qualquer mudança aqui atinge o app publicado.
 *
 * CACHE_VERSION: incrementar a cada release que altere estratégia de cache
 * ou os arquivos pré-cacheados. O activate apaga caches de versões antigas.
 */
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `obraly-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key.startsWith('obraly-') && key !== STATIC_CACHE)
                .map((key) => caches.delete(key))
        ))
    );
});

// A atualização NUNCA é automática: o novo worker fica em "waiting" até o
// usuário aceitar no aviso "Nova versão disponível" (UpdateToast). Forçar
// reload no meio de um lançamento financeiro perderia o formulário digitado.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function isStaticAsset(url) {
    return url.pathname.startsWith('/static/')
        || url.pathname === '/manifest.webmanifest'
        || url.pathname.endsWith('.png')
        || url.pathname.endsWith('.ico');
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    // Cross-origin (APIs no Fly.io, fontes/ícones de CDN) passa direto pela
    // rede: valor financeiro jamais pode vir de cache, e resposta opaca de
    // CDN não é verificável antes de guardar.
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Navegação nunca é servida do cache: uma sessão encerrada não pode abrir
    // uma versão antiga da aplicação. Só há fallback para uma página neutra.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
        return;
    }

    if (!isStaticAsset(url)) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (response.ok && response.type === 'basic') {
                    const responseCopy = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseCopy));
                }
                return response;
            });
        })
    );
});
