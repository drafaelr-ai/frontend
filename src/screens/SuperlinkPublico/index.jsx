import React, { useState, useEffect, useCallback } from 'react';
import styles from './index.module.css';

// fetch direto: rota pública sem JWT — exceção documentada (ver CONVENCOES.md)
const API_MAIN  = 'https://obraly-api.fly.dev';
const API_ADMIN = 'https://obraly-admin-api.fly.dev';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatExpiry(isoStr) {
  try {
    return new Date(isoStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return ''; }
}

function formatVencimento(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr + 'T12:00:00');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const diff = Math.round((d - hoje) / 86400000);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (diff < 0)  return { label: `Venceu em ${label}`, urgency: 'danger' };
    if (diff === 0) return { label: `Vence HOJE`,         urgency: 'warning' };
    if (diff <= 3)  return { label: `Vence em ${label}`,  urgency: 'warning' };
    return          { label: `Vence em ${label}`,         urgency: 'neutral' };
  } catch { return null; }
}

export default function SuperlinkPublico({ token }) {
  const [status, setStatus] = useState('loading'); // loading | ok | expired | notfound | error
  const [data, setData]     = useState(null);
  const [copied, setCopied] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Tenta Main
      try {
        const r = await fetch(`${API_MAIN}/superlink/${token}`);
        if (cancelled) return;
        if (r.ok)             { setData(await r.json()); setStatus('ok');      return; }
        if (r.status === 410) { setStatus('expired');                           return; }
      } catch (_) { /* network error — tenta admin */ }

      // Tenta Admin
      try {
        const r = await fetch(`${API_ADMIN}/admin/superlink/${token}`);
        if (cancelled) return;
        if (r.ok)             { setData(await r.json()); setStatus('ok');      return; }
        if (r.status === 410) { setStatus('expired');                           return; }
        setStatus('notfound');
      } catch (_) {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  const copy = useCallback((key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [key]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 1600);
    });
  }, []);

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <i className="ti ti-loader" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <i className="ti ti-clock-off" style={{ fontSize: 40, color: 'var(--status-warning)' }} />
          <h2 style={{ marginTop: 16, marginBottom: 8 }}>Link expirado</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Este link de pagamento não está mais disponível. Solicite um novo ao remetente.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <i className="ti ti-link-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
          <h2 style={{ marginTop: 16, marginBottom: 8 }}>Link não encontrado</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Verifique o link ou solicite um novo ao remetente.
          </p>
        </div>
      </div>
    );
  }

  const { titulo, itens, valor_total, expira_em } = data;

  const itensPendentes = itens.filter(i => !i.pago);
  const qtdPagos = itens.length - itensPendentes.length;

  // Deriva nome da obra a partir do contexto dos itens (campo confiável, setado como obraNome)
  const contextos = [...new Set(itens.map(i => i.contexto).filter(Boolean))];
  const obraUnica  = contextos.length === 1;
  const headerTitulo = obraUnica ? `Pagamentos — ${contextos[0]}` : (titulo || 'Pagamentos pendentes');
  // showCtx: mostra contexto nos cards só quando há múltiplas obras
  const showCtx = !obraUnica;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <i className="ti ti-building-skyscraper" />
            Obraly <span className={styles.dot}>·</span> Cobrança
          </div>
          <h1 className={styles.title}>{headerTitulo}</h1>
          <p className={styles.sub}>
            <i className="ti ti-receipt" />
            {itensPendentes.length} pagamento{itensPendentes.length !== 1 ? 's' : ''} pendente{itensPendentes.length !== 1 ? 's' : ''}
            {qtdPagos > 0 && ` · ${qtdPagos} pago${qtdPagos !== 1 ? 's' : ''}`}
          </p>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{formatCurrency(valor_total)}</span>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {itens.map((item, idx) => (
          <div key={idx} className={styles.card} style={item.pago ? { opacity: 0.6 } : {}}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardDesc} style={item.pago ? { textDecoration: 'line-through' } : {}}>
                  {item.descricao}
                </div>
                {item.pago && (
                  <span style={{
                    display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 999,
                    background: 'var(--status-success-bg, #dcfce7)',
                    color: 'var(--status-success, #16a34a)',
                  }}>
                    <i className="ti ti-check" /> pago
                  </span>
                )}
                {!item.pago && (() => {
                  const v = formatVencimento(item.data_vencimento);
                  if (!v) return null;
                  const colors = {
                    danger:  { bg: 'var(--status-danger-bg,  #fee2e2)', color: 'var(--status-danger,  #dc2626)' },
                    warning: { bg: 'var(--status-warning-bg, #fef3c7)', color: 'var(--status-warning, #d97706)' },
                    neutral: { bg: 'var(--surface-muted,    #f1f5f9)', color: 'var(--text-muted,     #64748b)' },
                  }[v.urgency];
                  return (
                    <span style={{
                      display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 999,
                      background: colors.bg, color: colors.color,
                    }}>
                      <i className="ti ti-calendar-due" /> {v.label}
                    </span>
                  );
                })()}
                {showCtx && item.contexto && (
                  <div className={styles.cardCtx}>
                    <i className="ti ti-building-skyscraper" />
                    {item.contexto}
                  </div>
                )}
              </div>
              <div className={styles.cardVal} style={item.pago ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}}>
                {formatCurrency(item.valor)}
              </div>
            </div>

            {!item.pago && (
            <div className={styles.paySection}>
              {item.forma === 'pix' && item.pix_chave ? (
                <>
                  <div className={styles.payLabel}>Chave Pix</div>
                  <div className={styles.payRow}>
                    <span className={styles.payKey}>{item.pix_chave}</span>
                    <button
                      className={`${styles.copyBtn}${copied[`p${idx}`] ? ` ${styles.copyBtnDone}` : ''}`}
                      onClick={() => copy(`p${idx}`, item.pix_chave)}
                    >
                      <i className={`ti ${copied[`p${idx}`] ? 'ti-check' : 'ti-copy'}`} />
                      {copied[`p${idx}`] ? 'Copiado!' : 'Copiar Pix'}
                    </button>
                  </div>
                  <div className={styles.payRow} style={{ marginTop: 8 }}>
                    <button
                      className={`${styles.copyBtn} ${styles.copyBtnGhost} ${styles.copyBtnBlock}`}
                      onClick={() => copy(`v${idx}`, String(item.valor))}
                    >
                      <i className="ti ti-currency-real" />
                      {copied[`v${idx}`] ? 'Copiado!' : 'Copiar valor'}
                    </button>
                  </div>
                </>
              ) : item.forma === 'boleto' && item.codigo_barras ? (
                <>
                  <div className={styles.payLabel}>Linha digitável</div>
                  <div className={styles.payRow}>
                    <span className={styles.payKey}>{item.codigo_barras}</span>
                    <button
                      className={`${styles.copyBtn}${copied[`b${idx}`] ? ` ${styles.copyBtnDone}` : ''}`}
                      onClick={() => copy(`b${idx}`, item.codigo_barras)}
                    >
                      <i className={`ti ${copied[`b${idx}`] ? 'ti-check' : 'ti-copy'}`} />
                      {copied[`b${idx}`] ? 'Copiado!' : 'Copiar código'}
                    </button>
                  </div>
                  <div className={styles.payRow} style={{ marginTop: 8 }}>
                    <button
                      className={`${styles.copyBtn} ${styles.copyBtnGhost} ${styles.copyBtnBlock}`}
                      onClick={() => copy(`v${idx}`, String(item.valor))}
                    >
                      <i className="ti ti-currency-real" />
                      {copied[`v${idx}`] ? 'Copiado!' : 'Copiar valor'}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.expireNote}>
          <i className="ti ti-clock" />
          Este link expira em {formatExpiry(expira_em)}
        </span>
      </div>
    </div>
  );
}
