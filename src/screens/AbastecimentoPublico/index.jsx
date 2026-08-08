import React, { useState, useEffect, useRef } from 'react';
import styles from './index.module.css';
import '../../styles/tokens.css';
import { API_URL } from '../../config';

/** Página do motorista — abre pelo link, sem login. Por isso usa `fetch`
    direto: não há JWT a injetar (mesma exceção do SuperlinkPublico). */

const brl = (v) => (v == null || v === '' ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const placaBR = (p) => {
    if (!p) return '';
    const s = String(p).toUpperCase();
    return s.length === 7 ? `${s.slice(0, 3)}-${s.slice(3)}` : s;
};

const hoje = () => new Date().toISOString().slice(0, 10);

/** '42,5' | '1.234,56' → number. null se não der. Motorista digita com vírgula. */
function numeroBR(v) {
    if (v === null || v === undefined || v === '') return null;
    let s = String(v).replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
}

const fmt = (n, casas = 2) =>
    n == null ? '' : String(Number(n).toFixed(casas)).replace('.', ',');

export default function AbastecimentoPublico({ token }) {
    const [estado, setEstado] = useState('carregando'); // carregando|ok|erro|notfound
    const [dados, setDados] = useState(null);
    const [form, setForm] = useState({
        km: '', litros: '', preco_litro: '', valor_total: '',
        posto: '', data: hoje(), observacao: '',
    });
    const [arquivoNome, setArquivoNome] = useState('');
    const [lendo, setLendo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [erro, setErro] = useState('');
    const [concluido, setConcluido] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const r = await fetch(`${API_URL}/abastecimento/${token}`);
                if (cancelado) return;
                if (!r.ok) { setEstado('notfound'); return; }
                const d = await r.json();
                setDados(d);
                setEstado('ok');
            } catch (_) {
                if (!cancelado) setEstado('erro');
            }
        })();
        return () => { cancelado = true; };
    }, [token]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /** Mantém litros × preço = total conforme o motorista digita, sem
        sobrescrever o campo que ele está editando. */
    const setLitros = (v) => {
        const litros = numeroBR(v);
        const preco = numeroBR(form.preco_litro);
        setForm(f => ({
            ...f, litros: v,
            valor_total: litros && preco ? fmt(litros * preco) : f.valor_total,
        }));
    };
    const setPreco = (v) => {
        const preco = numeroBR(v);
        const litros = numeroBR(form.litros);
        setForm(f => ({
            ...f, preco_litro: v,
            valor_total: litros && preco ? fmt(litros * preco) : f.valor_total,
        }));
    };
    const setTotal = (v) => {
        const total = numeroBR(v);
        const litros = numeroBR(form.litros);
        setForm(f => ({
            ...f, valor_total: v,
            preco_litro: total && litros ? fmt(total / litros, 3) : f.preco_litro,
        }));
    };

    const enviarComprovante = async (arquivo) => {
        if (!arquivo) return;
        setArquivoNome(arquivo.name);
        setLendo(true);
        setAviso('');
        setErro('');
        try {
            const fd = new FormData();
            fd.append('arquivo', arquivo);
            const r = await fetch(`${API_URL}/abastecimento/${token}/comprovante`, {
                method: 'POST', body: fd,
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) { setErro(body.erro || 'Não foi possível enviar o comprovante.'); return; }
            const d = body.dados || {};
            setForm(f => ({
                ...f,
                litros: d.litros != null ? fmt(d.litros) : f.litros,
                preco_litro: d.preco_litro != null ? fmt(d.preco_litro, 3) : f.preco_litro,
                valor_total: d.valor_total != null ? fmt(d.valor_total) : f.valor_total,
                posto: d.posto || f.posto,
                data: d.data || f.data,
                km: d.km != null ? String(d.km) : f.km,
            }));
            setAviso(body.aviso || '');
        } catch (_) {
            setErro('Sem conexão. Tente enviar o comprovante novamente.');
        } finally {
            setLendo(false);
        }
    };

    const enviar = async () => {
        setErro('');
        if (!numeroBR(form.km)) { setErro('Informe o KM do painel.'); return; }
        if (!numeroBR(form.litros)) { setErro('Informe quantos litros você abasteceu.'); return; }
        if (!numeroBR(form.valor_total) && !numeroBR(form.preco_litro)) {
            setErro('Informe o valor total ou o preço por litro.'); return;
        }
        setEnviando(true);
        try {
            const r = await fetch(`${API_URL}/abastecimento/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    km: form.km,
                    litros: form.litros,
                    preco_litro: form.preco_litro || null,
                    valor_total: form.valor_total || null,
                    posto: form.posto || null,
                    data: form.data || null,
                    observacao: form.observacao || null,
                }),
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) { setErro(body.erro || 'Não foi possível registrar o abastecimento.'); return; }
            setConcluido(body.resumo || {});
        } catch (_) {
            setErro('Sem conexão. Tente enviar novamente.');
        } finally {
            setEnviando(false);
        }
    };

    if (estado === 'carregando') {
        return (
            <div className={styles.page}><div className={styles.center}>
                <i className="ti ti-loader" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Carregando…</p>
            </div></div>
        );
    }

    if (estado !== 'ok') {
        return (
            <div className={styles.page}><div className={styles.center}>
                <i className="ti ti-link-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
                <h2 style={{ margin: '16px 0 4px' }}>Link não encontrado</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    {estado === 'erro'
                        ? 'Não foi possível carregar. Verifique sua conexão e tente de novo.'
                        : 'O link pode estar incorreto. Peça um novo ao responsável.'}
                </p>
            </div></div>
        );
    }

    if (concluido) {
        return (
            <div className={styles.page}>
                <div className={styles.header}><div className={styles.headerInner}>
                    <div className={styles.brand}>
                        <img src="/obraly-mark.png" alt="" className={styles.brandMark} /> Obraly
                    </div>
                    <h1 className={styles.title}>Abastecimento registrado</h1>
                </div></div>
                <div className={styles.body}>
                    <div className={styles.card}>
                        <div className={styles.ok}>
                            <i className="ti ti-circle-check" style={{ fontSize: 40 }} />
                            <p>Recebemos os dados. Obrigado!</p>
                        </div>
                        <div className={styles.meta}>
                            <span>Veículo <b>{placaBR(concluido.veiculo_placa)}</b></span>
                            <span>KM <b>{Number(concluido.km).toLocaleString('pt-BR')}</b></span>
                            <span>Litros <b>{fmt(concluido.litros)} L</b></span>
                            <span>Total <b>{brl(concluido.valor_total)}</b></span>
                            {concluido.posto && <span>Posto <b>{concluido.posto}</b></span>}
                            <span>Comprovante{' '}
                                <b>{concluido.comprovante_recebido ? 'anexado' : 'não anexado'}</b></span>
                        </div>
                    </div>
                    <div className={styles.footer}>Gerado pelo Obraly — módulo Frota</div>
                </div>
            </div>
        );
    }

    const bloqueado = dados.status !== 'pendente';
    const bloqueioTexto = {
        concluida: 'Este abastecimento já foi registrado.',
        cancelada: 'Este link foi cancelado pelo responsável.',
        expirada: 'Este link expirou. Peça um novo ao responsável.',
    }[dados.status];

    return (
        <div className={styles.page}>
            <div className={styles.header}><div className={styles.headerInner}>
                <div className={styles.brand}>
                    <img src="/obraly-mark.png" alt="" className={styles.brandMark} /> Obraly
                </div>
                <h1 className={styles.title}>Registrar abastecimento</h1>
                <p className={styles.sub}>
                    <i className="ti ti-truck" /> {placaBR(dados.veiculo_placa)}
                    {dados.veiculo_modelo ? ` · ${dados.veiculo_modelo}` : ''}
                    {dados.combustivel && (
                        <span className={styles.badge}>
                            <i className="ti ti-gas-station" /> {dados.combustivel}
                        </span>
                    )}
                </p>
            </div></div>

            <div className={styles.body}>
                {bloqueado ? (
                    <div className={styles.card}>
                        <div className={styles.bloqueio}>
                            <i className="ti ti-alert-circle" style={{ fontSize: 32 }} />
                            <p>{bloqueioTexto}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {(dados.observacao || dados.limite_valor != null) && (
                            <div className={styles.card}>
                                <div className={styles.meta}>
                                    {dados.observacao && <span><i className="ti ti-note" /> {dados.observacao}</span>}
                                    {dados.limite_valor != null && (
                                        <span>Limite autorizado <b>{brl(dados.limite_valor)}</b></span>
                                    )}
                                    {dados.condutor_nome && <span>Motorista <b>{dados.condutor_nome}</b></span>}
                                </div>
                            </div>
                        )}

                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="ti ti-camera" /> 1. Foto do comprovante
                            </div>
                            <div className={styles.section}>
                                <button type="button" className={styles.upload}
                                    onClick={() => fileRef.current?.click()} disabled={lendo}>
                                    <i className={`ti ${lendo ? 'ti-loader' : 'ti-camera-plus'}`}
                                        style={{ fontSize: 26 }} />
                                    <span>{lendo ? 'Lendo o cupom…'
                                        : arquivoNome || 'Tirar foto ou escolher arquivo'}</span>
                                    <small>Preenchemos preço e valor pra você</small>
                                </button>
                                <input ref={fileRef} type="file" accept="image/*,application/pdf"
                                    capture="environment" style={{ display: 'none' }}
                                    onChange={e => enviarComprovante(e.target.files?.[0])} />
                            </div>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="ti ti-pencil" /> 2. Confira os dados
                            </div>
                            <div className={styles.section}>
                                <div className={styles.field}>
                                    <label htmlFor="km">KM atual do painel</label>
                                    <input id="km" className={styles.input} inputMode="numeric"
                                        placeholder="Ex.: 80500" value={form.km}
                                        onChange={e => set('km', e.target.value)} />
                                    {dados.km_anterior != null && (
                                        <small className={styles.help}>
                                            Último registrado: {Number(dados.km_anterior).toLocaleString('pt-BR')} km
                                        </small>
                                    )}
                                </div>
                                <div className={styles.row2}>
                                    <div className={styles.field}>
                                        <label htmlFor="litros">Litros</label>
                                        <input id="litros" className={styles.input} inputMode="decimal"
                                            placeholder="Ex.: 42,5" value={form.litros}
                                            onChange={e => setLitros(e.target.value)} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="preco">Preço por litro</label>
                                        <input id="preco" className={styles.input} inputMode="decimal"
                                            placeholder="Ex.: 5,89" value={form.preco_litro}
                                            onChange={e => setPreco(e.target.value)} />
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="total">Valor total pago</label>
                                    <input id="total" className={`${styles.input} ${styles.total}`}
                                        inputMode="decimal" placeholder="Ex.: 250,33"
                                        value={form.valor_total}
                                        onChange={e => setTotal(e.target.value)} />
                                </div>
                                <div className={styles.row2}>
                                    <div className={styles.field}>
                                        <label htmlFor="data">Data</label>
                                        <input id="data" className={styles.input} type="date"
                                            max={hoje()} value={form.data}
                                            onChange={e => set('data', e.target.value)} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="posto">Posto</label>
                                        <input id="posto" className={styles.input}
                                            placeholder="Nome do posto" value={form.posto}
                                            onChange={e => set('posto', e.target.value)} />
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="obs">Observação (opcional)</label>
                                    <input id="obs" className={styles.input} maxLength={300}
                                        placeholder="Ex.: tanque cheio" value={form.observacao}
                                        onChange={e => set('observacao', e.target.value)} />
                                </div>

                                {aviso && <div className={styles.aviso}>
                                    <i className="ti ti-alert-triangle" /> {aviso}
                                </div>}
                                {erro && <div className={styles.erro}>
                                    <i className="ti ti-alert-circle" /> {erro}
                                </div>}

                                <button type="button" className={styles.enviar}
                                    onClick={enviar} disabled={enviando || lendo}>
                                    <i className="ti ti-send" />{' '}
                                    {enviando ? 'Enviando…' : 'Enviar abastecimento'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
                <div className={styles.footer}>Gerado pelo Obraly — módulo Frota</div>
            </div>
        </div>
    );
}
