import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import '../../styles/tokens.css';
import { API_URL } from '../../config';

function dataBR(iso) {
    if (!iso) return null;
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return null;
    return `${d}/${m}/${y}`;
}

function dataHoraBR(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return dataBR(iso) || '—'; }
}

// fetch direto: rota pública sem JWT — mesma exceção do SuperlinkPublico.
export default function SolicitacaoPublica({ token }) {
    const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(`${API_URL}/solicitacoes/publico/${token}`);
                if (cancelled) return;
                if (r.ok) { setData(await r.json()); setStatus('ok'); return; }
                setStatus('notfound');
            } catch (_) {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

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

    if (status !== 'ok') {
        return (
            <div className={styles.page}>
                <div className={styles.center}>
                    <i className="ti ti-file-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
                    <h2 style={{ margin: '16px 0 4px' }}>Solicitação não encontrada</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {status === 'error'
                            ? 'Não foi possível carregar a solicitação. Verifique sua conexão e tente novamente.'
                            : 'O link pode estar incorreto ou a solicitação foi removida.'}
                    </p>
                </div>
            </div>
        );
    }

    const necessidade = dataBR(data.data_necessidade);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.brand}>
                        <img src="/obraly-mark.png" alt="" className={styles.brandMark} /> Obraly
                    </div>
                    <h1 className={styles.title}>Solicitação de compra</h1>
                    <p className={styles.sub}>
                        <i className="ti ti-building" /> {data.obra_nome || 'Obra'}
                        <span className={styles.badge}><i className="ti ti-tag" /> {data.tipo}</span>
                        <span className={styles.badge}>{data.status}</span>
                    </p>
                </div>
            </div>

            <div className={styles.body}>
                <div className={styles.card}>
                    <div className={styles.cardTitle}><i className="ti ti-list-details" /> Itens solicitados</div>
                    {(data.itens || []).map((i, idx) => (
                        <div className={styles.item} key={idx}>
                            <div>
                                <div className={styles.itemDesc}>{i.descricao}</div>
                                {i.observacao && <div className={styles.itemObs}>{i.observacao}</div>}
                            </div>
                            <div className={styles.itemQtd}>{i.quantidade} {i.unidade || ''}</div>
                        </div>
                    ))}
                </div>

                <div className={styles.card}>
                    <div className={styles.meta}>
                        <span>Solicitada por <b>{data.solicitante_nome || '—'}</b> em <b>{dataHoraBR(data.data_criacao)}</b></span>
                        {necessidade && <span>Necessária para <b>{necessidade}</b></span>}
                        {data.observacao && <span>Observação: <b>{data.observacao}</b></span>}
                    </div>
                </div>

                <div className={styles.footer}>Gerado pelo Obraly — módulo Solicitações</div>
            </div>
        </div>
    );
}
