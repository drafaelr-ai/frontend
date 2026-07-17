// Serve a página de /solicitacao/:token com meta tags (og:title, og:description)
// dinâmicas — mesmo motivo do pagar-meta.js: o link é compartilhado no WhatsApp
// e os bots de preview não executam JS.
const API_MAIN = 'https://obraly-api.fly.dev';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buscarSolicitacao(token) {
  try {
    const r = await fetch(`${API_MAIN}/solicitacoes/publico/${token}`);
    if (r.ok) return await r.json();
  } catch (_) { /* mantém fallback genérico */ }
  return null;
}

module.exports = async function handler(req, res) {
  const token = req.query.token || '';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;

  let titulo = 'Solicitação de compra';
  let descricao = 'Veja os itens solicitados pela Obraly.';

  const data = token ? await buscarSolicitacao(token) : null;
  if (data) {
    if (data.obra_nome) titulo = `Solicitação de compra — ${data.obra_nome}`;
    const itens = data.itens || [];
    if (itens.length) {
      const primeiro = itens[0];
      const resto = itens.length > 1 ? ` (+${itens.length - 1} itens)` : '';
      descricao = `${primeiro.quantidade ?? ''} ${primeiro.unidade || ''} ${primeiro.descricao}`.trim() + resto;
    }
  }

  let html;
  try {
    const base = await fetch(`${origin}/index.html`);
    html = await base.text();
  } catch (_) {
    res.status(502).send('Erro ao carregar página');
    return;
  }

  const t = escapeHtml(titulo);
  const d = escapeHtml(descricao);
  const url = `${origin}/solicitacao/${escapeHtml(token)}`;

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:url" content=")[^"]*(")/, `$1${url}$2`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
