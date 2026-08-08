// Serve a página de /abastecimento/:token com meta tags (og:title, og:description)
// dinâmicas — mesmo motivo do solicitacao-meta.js: o link é mandado ao motorista
// pelo WhatsApp e os bots de preview não executam JS.
const API_MAIN = 'https://obraly-api.fly.dev';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function placaBR(p) {
  if (!p) return '';
  const s = String(p).toUpperCase();
  return s.length === 7 ? `${s.slice(0, 3)}-${s.slice(3)}` : s;
}

async function buscarAbastecimento(token) {
  try {
    const r = await fetch(`${API_MAIN}/abastecimento/${token}`);
    if (r.ok) return await r.json();
  } catch (_) { /* mantém fallback genérico */ }
  return null;
}

module.exports = async function handler(req, res) {
  const token = req.query.token || '';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;

  let titulo = 'Registrar abastecimento';
  let descricao = 'Informe o KM e os litros e anexe a foto do comprovante.';

  const data = token ? await buscarAbastecimento(token) : null;
  if (data) {
    const placa = placaBR(data.veiculo_placa);
    if (placa) {
      titulo = `Registrar abastecimento — ${placa}`
        + (data.veiculo_modelo ? ` (${data.veiculo_modelo})` : '');
    }
    // O preview nunca mostra o limite de valor: o link circula em grupo de
    // WhatsApp e o teto autorizado é informação interna da obra.
    if (data.status === 'concluida') descricao = 'Este abastecimento já foi registrado.';
    else if (data.status === 'cancelada') descricao = 'Este link foi cancelado pelo responsável.';
    else if (data.status === 'expirada') descricao = 'Este link expirou. Peça um novo ao responsável.';
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
  const url = `${origin}/abastecimento/${escapeHtml(token)}`;

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
  // Curto: o status do link muda quando o motorista envia.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
};
