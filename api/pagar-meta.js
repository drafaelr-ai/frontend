// Serve a página de /pagar/:token com meta tags (og:title, og:description) dinâmicas.
// Necessário porque o app é uma SPA client-rendered: bots de preview (WhatsApp,
// Facebook, etc.) não executam JS, então sem isso sempre viam o title genérico
// do index.html estático ("Obraly — Gestão de Obras e Patrimônio").
const API_MAIN  = 'https://obraly-api.fly.dev';
const API_ADMIN = 'https://obraly-admin-api.fly.dev';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function buscarSuperlink(token) {
  try {
    let r = await fetch(`${API_MAIN}/superlink/${token}`);
    if (r.ok) return await r.json();
  } catch (_) { /* tenta admin */ }

  try {
    let r = await fetch(`${API_ADMIN}/admin/superlink/${token}`);
    if (r.ok) return await r.json();
  } catch (_) { /* mantém fallback genérico */ }

  return null;
}

module.exports = async function handler(req, res) {
  const token = req.query.token || '';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;

  let titulo = 'Pagamentos pendentes';
  let descricao = 'Pague via Pix ou boleto pela Obraly.';

  const data = token ? await buscarSuperlink(token) : null;
  if (data) {
    const itens = data.itens || [];
    const contextos = [...new Set(itens.map(i => i.contexto).filter(Boolean))];
    titulo = contextos.length === 1 ? `Pagamentos — ${contextos[0]}` : (data.titulo || titulo);
    if (data.valor_total != null) {
      descricao = `Total: ${fmtCurrency(data.valor_total)} · Pague via Pix ou boleto pela Obraly.`;
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
  const url = `${origin}/pagar/${escapeHtml(token)}`;

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
