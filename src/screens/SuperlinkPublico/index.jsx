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
            {itens.length} pagamento{itens.length !== 1 ? 's' : ''} pendente{itens.length !== 1 ? 's' : ''}
          </p>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{formatCurrency(valor_total)}</span>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {itens.map((item, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardDesc}>{item.descricao}</div>
                {showCtx && item.contexto && (
                  <div className={styles.cardCtx}>
                    <i className="ti ti-building-skyscraper" />
                    {item.contexto}
                  </div>
                )}
              </div>
              <div className={styles.cardVal}>{formatCurrency(item.valor)}</div>
            </div>

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
