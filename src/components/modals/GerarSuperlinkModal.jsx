import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { notify } from '../../utils/notify';
import { API_URL } from '../../config';

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TIPO_CHIP = {
  servico:    { label: 'Serviço',    bg: 'var(--status-info-bg)',     color: 'var(--status-info-text)' },
  futuro:     { label: 'Futuro',     bg: 'var(--status-warning-bg)',  color: 'var(--status-warning-text)' },
  parcelado:  { label: 'Parcelado',  bg: '#ede9fe',                   color: '#6b21a8' },
  boleto:     { label: 'Boleto',     bg: 'var(--surface-muted)',      color: 'var(--text-muted)' },
};

/**
 * GerarSuperlinkModal (Main)
 *
 * Props:
 *   pagamentos    — array de objetos { id, descricao, valor, tipo, contexto, pix_chave?, codigo_barras? }
 *   tituloDefault — string opcional; pré-preenche o campo título (ex: "Pagamentos pendentes — Alphaville")
 *   onClose       — fn()
 */
export default function GerarSuperlinkModal({ pagamentos = [], tituloDefault = 'Pagamentos pendentes', onClose }) {
  const [titulo, setTitulo]         = useState(tituloDefault);
  const [selecionados, setSel]      = useState(() => new Set(pagamentos.map(p => p.id)));
  const [pixMap, setPixMap]         = useState(() => {
    const m = {};
    pagamentos.forEach(p => { m[p.id] = p.pix_chave || ''; });
    return m;
  });
  const [loading, setLoading]       = useState(false);
  const [linkGerado, setLinkGerado] = useState(null); // { token, url }
  const [copied, setCopied]         = useState(false);

  // Limpa estado ao abrir
  useEffect(() => {
    setSel(new Set(pagamentos.map(p => p.id)));
    setPixMap(() => {
      const m = {};
      pagamentos.forEach(p => { m[p.id] = p.pix_chave || ''; });
      return m;
    });
    setLinkGerado(null);
    setTitulo(tituloDefault);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentos]);

  const toggleItem = (id) => setSel(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const itensSelecionados = pagamentos.filter(p => selecionados.has(p.id));
  const total = itensSelecionados.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  const handleGerar = async () => {
    if (!itensSelecionados.length) { notify.warning('Selecione ao menos um pagamento'); return; }
    if (!titulo.trim())            { notify.warning('Informe o título do link');         return; }

    const itens = itensSelecionados.map(p => ({
      descricao:     p.descricao,
      valor:         Number(p.valor) || 0,
      contexto:      p.contexto || '',
      forma:         p.codigo_barras ? 'boleto' : 'pix',
      pix_chave:     p.codigo_barras ? undefined : (pixMap[p.id] || ''),
      codigo_barras: p.codigo_barras || undefined,
    }));

    const semPix = itens.filter(i => i.forma === 'pix' && !i.pix_chave);
    if (semPix.length) {
      notify.warning(`${semPix.length} item(ns) sem chave Pix preenchida`);
      return;
    }

    setLoading(true);
    try {
      const r = await fetchWithAuth(`${API_URL}/superlink`, {
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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Gerar superlink de pagamento"
      width="large"
      scrollBody
      footer={
        linkGerado ? (
          <button className="m-btn-cancel" onClick={onClose}>Fechar</button>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {itensSelecionados.length} selecionados · expira em 7 dias
              </span>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtCurrency(total)}
              </span>
            </div>
            <button className="m-btn-primary" onClick={handleGerar} disabled={loading}>
              <i className="ti ti-link" />
              {loading ? 'Gerando…' : 'Gerar superlink'}
            </button>
          </>
        )
      }
    >
      {/* Título */}
      <div className="m-field">
        <label className="m-label">Título do link</label>
        <input
          className="m-input"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Ex: Pagamentos — Obra Alphaville"
          disabled={!!linkGerado}
        />
      </div>

      {/* Seleção de pagamentos */}
      {!linkGerado && (
        <div className="m-field" style={{ marginTop: 'var(--space-5)' }}>
          <label className="m-label">Selecione os pagamentos</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {pagamentos.map(p => {
              const sel = selecionados.has(p.id);
              const chip = TIPO_CHIP[p.tipo] || TIPO_CHIP.servico;
              return (
                <label
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    border: `1px solid ${sel ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-lg)',
                    background: sel ? 'var(--surface-subtle)' : 'var(--surface-card)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleItem(p.id)}
                    style={{ width: 18, height: 18, accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 'var(--text-md)' }}>{p.descricao}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 600, background: chip.bg, color: chip.color }}>{chip.label}</span>
                      {p.contexto && <><i className="ti ti-building-skyscraper" />{p.contexto}</>}
                    </div>
                    {sel && !p.codigo_barras && (
                      <input
                        className="m-input"
                        style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}
                        placeholder="Chave Pix (obrigatório)"
                        value={pixMap[p.id] || ''}
                        onChange={e => setPixMap(m => ({ ...m, [p.id]: e.target.value }))}
                        onClick={ev => ev.stopPropagation()}
                      />
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCurrency(p.valor)}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Link gerado */}
      {linkGerado && (
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px',
            background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}>
            <i className="ti ti-link" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <code style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {linkGerado.url}
            </code>
            <button
              style={{ fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 500, background: copied ? 'var(--status-success)' : 'var(--surface-card)', color: copied ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
              onClick={copyLink}
            >
              <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              style={{ fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 500, background: 'var(--status-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={openWhatsApp}
            >
              <i className="ti ti-brand-whatsapp" />
            </button>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            <i className="ti ti-clock" /> Expira em 7 dias
          </p>
        </div>
      )}
    </Modal>
  );
}
