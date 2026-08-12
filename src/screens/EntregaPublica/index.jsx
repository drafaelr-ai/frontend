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

// Muitos itens: a tabela ganha rolagem própria em vez de esticar a página —
// o botão de confirmar entrega precisa continuar à mão no celular.
const LIMITE_SEM_ROLAGEM = 8;

// fetch direto: rota pública sem JWT — mesma exceção do SolicitacaoPublica.
export default function EntregaPublica({ token }) {
    const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
    const [data, setData] = useState(null);
    const [obs, setObs] = useState('');
    const [msg, setMsg] = useState('');
    const [enviando, setEnviando] = useState(null);  // 'confirmar' | 'mensagem' | null
    const [msgEnviada, setMsgEnviada] = useState(false);
    const [erroAcao, setErroAcao] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(`${API_URL}/solicitacoes/entrega/${token}`);
                if (cancelled) return;
                if (r.ok) { setData(await r.json()); setStatus('ok'); return; }
                setStatus('notfound');
            } catch (_) {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const confirmar = async () => {
        setEnviando('confirmar');
        setErroAcao(null);
        try {
            const r = await fetch(`${API_URL}/solicitacoes/entrega/${token}/confirmar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observacao: obs.trim() }),
            });
            const corpo = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(corpo.erro || 'Não foi possível confirmar a entrega.');
            setData(prev => ({ ...prev, entregue_em: corpo.entregue_em, observacao_entrega: corpo.observacao_entrega }));
        } catch (e) {
            setErroAcao(e.message);
        } finally { setEnviando(null); }
    };

    const enviarMensagem = async () => {
        if (!msg.trim()) { setErroAcao('Escreva a mensagem antes de enviar.'); return; }
        setEnviando('mensagem');
        setErroAcao(null);
        try {
            const r = await fetch(`${API_URL}/solicitacoes/entrega/${token}/mensagem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: msg.trim() }),
            });
            const corpo = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(corpo.erro || 'Não foi possível enviar a mensagem.');
            setMsg('');
            setMsgEnviada(true);
        } catch (e) {
            setErroAcao(e.message);
        } finally { setEnviando(null); }
    };

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
                    <h2 style={{ margin: '16px 0 4px' }}>Entrega não encontrada</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {status === 'error'
                            ? 'Não foi possível carregar a entrega. Verifique sua conexão e tente novamente.'
                            : 'O link pode ter sido substituído por um novo — confirme com quem enviou.'}
                    </p>
                </div>
            </div>
        );
    }

    const entregue = Boolean(data.entregue_em);
    const encerrada = ['Cancelada', 'Rejeitada'].includes(data.status);
    const itens = data.itens || [];
    const comRolagem = itens.length > LIMITE_SEM_ROLAGEM;

    return (
        <div className={styles.page}>
            <header className={styles.topo}>
                <span className={styles.marca} /> Obraly · Entrega
            </header>

            <main className={styles.corpo}>
                <section className={styles.card}>
                    <div className={styles.titulo}>
                        Entrega — Solicitação #{data.numero}
                        {entregue
                            ? <span className={`${styles.badge} ${styles.bOk}`}><i className="ti ti-check" /> Entregue</span>
                            : encerrada
                                ? <span className={`${styles.badge} ${styles.bWarn}`}><i className="ti ti-ban" /> {data.status}</span>
                                : <span className={`${styles.badge} ${styles.bWarn}`}><i className="ti ti-clock" /> Aguardando entrega</span>}
                    </div>
                    <div className={styles.meta}>
                        {data.fornecedor && <div><b>Retirar em:</b> {data.fornecedor}</div>}
                        <div><b>Entregar na obra:</b> {data.obra_nome}</div>
                        {data.prazo_entrega && <div><b>Prazo combinado:</b> {data.prazo_entrega}</div>}
                        {dataBR(data.data_necessidade) && <div><b>Necessidade:</b> {dataBR(data.data_necessidade)}</div>}
                    </div>
                </section>

                <section className={styles.card}>
                    <div className={styles.secTitulo}>
                        <i className="ti ti-package" /> Material ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
                        <a
                            className={styles.pdfBtn}
                            href={`${API_URL}/solicitacoes/entrega/${token}/pedido.pdf`}
                            target="_blank" rel="noopener noreferrer"
                        >
                            <i className="ti ti-file-type-pdf" /> Pedido em PDF
                        </a>
                    </div>
                    <div className={comRolagem ? styles.itensRolagem : undefined} data-testid={comRolagem ? 'itens-rolagem' : 'itens'}>
                        <table className={styles.tabela}>
                            <thead>
                                <tr><th>Item</th><th>Qtd.</th><th>Un.</th></tr>
                            </thead>
                            <tbody>
                                {itens.map(i => (
                                    <tr key={i.id}>
                                        <td className={styles.celMain}>
                                            {i.descricao}
                                            {i.observacao && <span className={styles.celObs}>{i.observacao}</span>}
                                        </td>
                                        <td>{i.quantidade}</td>
                                        <td>{i.unidade || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.observacao && (
                        <div className={styles.hint}><i className="ti ti-note" /> Obs. do pedido: {data.observacao}</div>
                    )}
                </section>

                {!encerrada && (
                    <section className={styles.card}>
                        <div className={styles.secTitulo}><i className="ti ti-truck-delivery" /> Confirmar entrega na obra</div>
                        {entregue ? (
                            <div className={styles.entregueBox}>
                                <i className="ti ti-circle-check" />
                                <div>
                                    <b>Entregue em {dataHoraBR(data.entregue_em)}</b>
                                    {data.observacao_entrega && <div>{data.observacao_entrega}</div>}
                                </div>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    className={styles.inp} rows={2} maxLength={500} value={obs}
                                    onChange={e => setObs(e.target.value)}
                                    placeholder="Observação (opcional) — ex.: NF 4521, recebido pelo Diego no portão"
                                />
                                <button
                                    className={styles.btnPrimario}
                                    onClick={confirmar}
                                    disabled={enviando === 'confirmar'}
                                >
                                    <i className="ti ti-check" /> {enviando === 'confirmar' ? 'Confirmando…' : 'Material entregue na obra'}
                                </button>
                                <div className={styles.hint}>
                                    <i className="ti ti-info-circle" /> O comprador e o solicitante são avisados na hora.
                                </div>
                            </>
                        )}
                    </section>
                )}

                <section className={styles.card}>
                    <div className={styles.secTitulo}><i className="ti ti-message-circle" /> Falar com o comprador</div>
                    <textarea
                        className={styles.inp} rows={2} maxLength={500} value={msg}
                        onChange={e => { setMsg(e.target.value); setMsgEnviada(false); }}
                        placeholder="Ex.: fornecedor só libera às 14h / caminhão não entra na rua da obra"
                    />
                    <button
                        className={styles.btnGhost}
                        onClick={enviarMensagem}
                        disabled={enviando === 'mensagem'}
                    >
                        <i className="ti ti-send" /> {enviando === 'mensagem' ? 'Enviando…' : 'Enviar mensagem'}
                    </button>
                    {msgEnviada && (
                        <div className={styles.hintOk}><i className="ti ti-check" /> Mensagem enviada — o comprador foi avisado.</div>
                    )}
                </section>

                {erroAcao && <div className={styles.erro}>{erroAcao}</div>}

                <footer className={styles.rodape}>
                    <i className="ti ti-lock" /> Link seguro do Obraly — sem login e sem valores.
                </footer>
            </main>
        </div>
    );
}
