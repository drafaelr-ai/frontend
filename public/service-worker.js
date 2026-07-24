/*
 * Obraly PWA
 *
 * Não armazenamos HTML nem chamadas da API: isso evita exibir dados de outra
 * sessão e mantém todas as operações autenticadas sob as regras do backend.
 */
const STATIC_CACHE = 'obraly-static-v1';
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

function isStaticAsset(url) {
    return url.pathname.startsWith('/static/')
        || url.pathname === '/manifest.webmanifest'
        || url.pathname.endsWith('.png')
        || url.pathname.endsWith('.ico');
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

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
