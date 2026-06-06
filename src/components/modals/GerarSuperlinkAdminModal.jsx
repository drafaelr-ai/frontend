import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchWithAuthAdmin } from '../../auth/fetchWithAuthAdmin';
import { notify } from '../../utils/notify';

const API_URL_ADMIN = 'https://obraly-admin-api.fly.dev';

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function _autoTituloAdmin(items, imovelNome) {
  const hasBoleto = items.some(i => i.codigo_barras);
  const hasPix    = items.some(i => !i.codigo_barras);
  const suffix    = imovelNome ? ` — ${imovelNome}` : '';
  if (hasBoleto && hasPix)  return `Pagamentos e boletos${suffix}`;
  if (hasBoleto)             return `Boletos${suffix}`;
  return `Cobranças${suffix}`;
}

/**
 * GerarSuperlinkAdminModal
 *
 * Props:
 *   lancamentos — array de lancamentos admin (com pix_chave e codigo_barras)
 *   boletos     — array de AdminBoleto (código de barras já salvo); opcional
 *   imovelNome  — nome do imóvel para o título automático; opcional
 *   onClose     — fn()
 */
export default function GerarSuperlinkAdminModal({ lancamentos = [], boletos = [], imovelNome = '', onClose }) {
  // Combina lançamentos e boletos como itens unificados
  const todosItens = useMemo(() => [
    ...lancamentos,
    ...boletos
        .filter(b => b.codigo_barras)
        .map(b => ({
            id:          `boleto-${b.id}`,
            descricao:   b.descricao || b.beneficiario || 'Boleto',
            valor:       b.valor || 0,
            imovel_nome: b.imovel_nome || imovelNome,
            pix_chave:   null,
            codigo_barras: b.codigo_barras,
            _isBoleto:   true,
        })),
  ], [lancamentos, boletos, imovelNome]);

  const userEditedTitle             = useRef(false);
  const [titulo, setTitulo]         = useState('');
  const [selecionados, setSel]      = useState(() => new Set(todosItens.map(i => i.id)));
  const [pixMap, setPixMap]         = useState(() => {
    const m = {};
    lancamentos.forEach(l => { m[l.id] = l.pix_chave || ''; });
    return m;
  });
  const [loading, setLoading]       = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const [copied, setCopied]         = useState(false);

  // Recalcula título quando seleção muda
  useEffect(() => {
    if (userEditedTitle.current) return;
    const sel = todosItens.filter(i => selecionados.has(i.id));
    const base = sel.length > 0 ? sel : todosItens;
    setTitulo(_autoTituloAdmin(base, imovelNome));
  }, [selecionados, todosItens, imovelNome]);

  // Reset ao reabrir
  useEffect(() => {
    userEditedTitle.current = false;
    setSel(new Set(todosItens.map(i => i.id)));
    setPixMap(() => {
      const m = {};
      lancamentos.forEach(l => { m[l.id] = l.pix_chave || ''; });
      return m;
    });
    setLinkGerado(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosItens]);

  const toggle = (id) => setSel(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const itensAtivos = todosItens.filter(i => selecionados.has(i.id));
  const total = itensAtivos.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  const handleGerar = async () => {
    if (!itensAtivos.length) { notify.warning('Selecione ao menos um item'); return; }
    if (!titulo.trim())       { notify.warning('Informe o título do link');   return; }

    const itens = itensAtivos.map(i => ({
      descricao:     i.descricao,
      valor:         Number(i.valor) || 0,
      contexto:      i.imovel_nome || imovelNome || '',
      forma:         i.codigo_barras ? 'boleto' : 'pix',
      pix_chave:     i.codigo_barras ? undefined : (pixMap[i.id] || ''),
      codigo_barras: i.codigo_barras || undefined,
    }));

    const semPix = itens.filter(i => i.forma === 'pix' && !i.pix_chave);
    if (semPix.length) {
      notify.warning(`${semPix.length} item(ns) sem chave Pix preenchida`);
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
              onChange={e => { userEditedTitle.current = true; setTitulo(e.target.value); }}
              placeholder="Ex: Aluguéis — Junho/2026"
              disabled={!!linkGerado}
            />
          </div>

          {/* Lista de itens (lançamentos + boletos) */}
          {!linkGerado && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Selecione os itens ({todosItens.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todosItens.map(item => {
                  const sel = selecionados.has(item.id);
                  const isBoleto = !!item.codigo_barras;
                  return (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${sel ? 'var(--brand-primary)' : 'var(--border-subtle)'}`, borderRadius: 8, background: sel ? 'var(--surface-subtle)' : 'var(--surface-card)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(item.id)} style={{ width: 18, height: 18, accentColor: 'var(--brand-primary)', cursor: 'pointer' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.descricao}
                          {isBoleto && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
                              Boleto
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          <i className={`ti ${isBoleto ? 'ti-receipt' : 'ti-home'}`} /> {item.imovel_nome}
                        </div>
                        {sel && !isBoleto && (
                          <input
                            style={{ marginTop: 8, width: '100%', padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                            placeholder="Chave Pix (obrigatório)"
                            value={pixMap[item.id] || ''}
                            onChange={e => setPixMap(m => ({ ...m, [item.id]: e.target.value }))}
                            onClick={ev => ev.stopPropagation()}
                          />
                        )}
                        {isBoleto && sel && (
                          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <i className="ti ti-barcode" /> {item.codigo_barras}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtCurrency(item.valor)}
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
