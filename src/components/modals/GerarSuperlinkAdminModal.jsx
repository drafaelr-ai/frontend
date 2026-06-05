import React, { useState, useEffect } from 'react';
import { fetchWithAuthAdmin } from '../../auth/fetchWithAuthAdmin';
import { notify } from '../../utils/notify';

const API_URL_ADMIN = 'https://obraly-admin-api.fly.dev';

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * GerarSuperlinkAdminModal
 *
 * Props:
 *   lancamentos — array de lancamentos admin (com pix_chave e codigo_barras)
 *   onClose     — fn()
 */
export default function GerarSuperlinkAdminModal({ lancamentos = [], onClose }) {
  const [titulo, setTitulo]         = useState('Cobranças');
  const [selecionados, setSel]      = useState(() => new Set(lancamentos.map(l => l.id)));
  const [pixMap, setPixMap]         = useState(() => {
    const m = {};
    lancamentos.forEach(l => { m[l.id] = l.pix_chave || ''; });
    return m;
  });
  const [loading, setLoading]       = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    setSel(new Set(lancamentos.map(l => l.id)));
    setPixMap(() => {
      const m = {};
      lancamentos.forEach(l => { m[l.id] = l.pix_chave || ''; });
      return m;
    });
    setLinkGerado(null);
  }, [lancamentos]);

  const toggle = (id) => setSel(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const itensAtivos = lancamentos.filter(l => selecionados.has(l.id));
  const total = itensAtivos.reduce((s, l) => s + (Number(l.valor) || 0), 0);

  const handleGerar = async () => {
    if (!itensAtivos.length) { notify.warning('Selecione ao menos um lançamento'); return; }
    if (!titulo.trim())       { notify.warning('Informe o título do link');          return; }

    const itens = itensAtivos.map(l => ({
      descricao:     l.descricao,
      valor:         Number(l.valor) || 0,
      contexto:      l.imovel_nome || '',
      forma:         l.codigo_barras ? 'boleto' : 'pix',
      pix_chave:     l.codigo_barras ? undefined : (pixMap[l.id] || ''),
      codigo_barras: l.codigo_barras || undefined,
    }));

    const semPix = itens.filter(i => i.forma === 'pix' && !i.pix_chave);
    if (semPix.length) {
      notify.warning(`${semPix.length} lançamento(s) sem chave Pix preenchida`);
      return;
    }

    setLoading(true);
    try {
      const r = await fetchWithAuthAdmin(`${API_URL_ADMIN}/admin/superlink`, {
        method: 'POST',
        body: JSON.stringify({ titulo: titulo.trim(), itens }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || 'Erro ao gerar link');
      setLinkGerado(d);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!linkGerado) return;
    navigator.clipboard.writeText(linkGerado.url).then(() => {
      setCopied(true);
      notify.success('Link copiado!');
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const openWhatsApp = () => {
    if (!linkGerado) return;
    const text = encodeURIComponent(`${titulo}\n${linkGerado.url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Estilos inline seguindo tokens do projeto
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1300,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };
  const containerStyle = {
    background: 'var(--surface-card)', borderRadius: 16, width: '100%', maxWidth: 640,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(15,23,42,.15)',
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-share-2" /> Gerar superlink de pagamento
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Título */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Título do link</label>
            <input
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-card)' }}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Aluguéis — Junho/2026"
              disabled={!!linkGerado}
            />
          </div>

          {/* Lista de lançamentos */}
          {!linkGerado && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Selecione os lançamentos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lancamentos.map(l => {
                  const sel = selecionados.has(l.id);
                  return (
                    <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${sel ? 'var(--brand-primary)' : 'var(--border-subtle)'}`, borderRadius: 8, background: sel ? 'var(--surface-subtle)' : 'var(--surface-card)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(l.id)} style={{ width: 18, height: 18, accentColor: 'var(--brand-primary)', cursor: 'pointer' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{l.descricao}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          <i className="ti ti-home" /> {l.imovel_nome}
                        </div>
                        {sel && !l.codigo_barras && (
                          <input
                            style={{ marginTop: 8, width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                            placeholder="Chave Pix (obrigatório)"
                            value={pixMap[l.id] || ''}
                            onChange={e => setPixMap(m => ({ ...m, [l.id]: e.target.value }))}
                            onClick={ev => ev.stopPropagation()}
                          />
                        )}
                        {l.codigo_barras && sel && (
                          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            <i className="ti ti-barcode" /> {l.codigo_barras}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtCurrency(l.valor)}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link gerado */}
          {linkGerado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                <i className="ti ti-link" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                  {linkGerado.url}
                </code>
                <button onClick={copyLink} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: copied ? 'var(--status-success)' : 'var(--surface-card)', color: copied ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button onClick={openWhatsApp} style={{ fontFamily: 'inherit', fontSize: 13, background: 'var(--status-success)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-brand-whatsapp" />
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                <i className="ti ti-clock" /> Expira em 7 dias
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {linkGerado ? (
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              Fechar
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itensAtivos.length} selecionados · expira em 7 dias</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(total)}</span>
              </div>
              <button
                onClick={handleGerar}
                disabled={loading}
                style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
              >
                <i className="ti ti-link" />
                {loading ? 'Gerando…' : 'Gerar superlink'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
