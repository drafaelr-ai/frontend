// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

/**
 * Middleware de autenticação Clerk.
 * - Libera acesso público a páginas básicas e arquivos estáticos.
 * - Protege o restante da aplicação.
 */
export default authMiddleware({
  // Rotas públicas que não exigem login
  publicRoutes: [
    "/",                // página inicial
    "/manifest.json",   // manifesto do PWA
    "/favicon.ico",     // ícone do app
    "/robots.txt",      // SEO
    "/api/health"       // rota de teste / saúde
  ],
  // (Opcional) Desative redirecionamentos automáticos em rotas públicas
  ignoredRoutes: [
    "/manifest.json",
    "/favicon.ico",
    "/robots.txt",
    "/api/health"
  ]
});

/**
 * Configuração do matcher:
 * - Evita aplicar middleware em arquivos estáticos (_next, .js, .css, .json, etc.)
 * - Evita interferir em imagens, ícones e assets
 */
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
