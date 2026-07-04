import React, { useState, useEffect, useCallback } from 'react';
import { rhApi } from './rhApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { moedaParaNumero, brl } from './rhFormat';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function rangesVigencia() {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map(a => ({ value: `${a}|${a + 1}`, label: `${a} — ${a + 1}` }));
}

const linhaVazia = () => ({ nome: '', piso_salarial: '', beneficios: [], confianca: 'alta' });

export default function ConvencoesRH({ reloadRefs, setCounts }) {
    const [view, setView] = useState('list');           // list | upload | review
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(true);

    const ranges = rangesVigencia();
    const [uf, setUf] = useState('CE');
    const [vigencia, setVigencia] = useState(ranges[0].value);
    const [sindicato, setSindicato] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [processando, setProcessando] = useState(false);

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rhApi.convencoes();
            setLista(Array.isArray(data) ? data : []);
            setCounts?.(c => ({ ...c, cct: Array.isArray(data) ? data.length : c.cct }));
        } catch (e) {
            logger.error('RH convencoes', e);
            notify.error('Erro ao carregar convenções.');
        } finally {
            setLoading(false);
        }
    }, [setCounts]);

    useEffect(() => { if (view === 'list') carregar(); }, [view, carregar]);

    const resetWizard = () => {
        setUf('CE'); setVigencia(ranges[0].value); setSindicato('');
        setArquivo(null); setCategorias([]);
    };

    const abrirUpload = () => { resetWizard(); setView('upload'); };

    const extrair = async () => {
        if (!arquivo) { notify.warning('Selecione o PDF da convenção.'); return; }
        setProcessando(true);
        try {
            const fd = new FormData();
            fd.append('arquivo', arquivo);
            fd.append('uf', uf);
            const r = await rhApi.extrairCct(fd);
            const cats = (r.categorias || []).map(c => ({
                nome: c.nome || '',
                piso_salarial: c.piso_salarial != null ? String(c.piso_salarial).replace('.', ',') : '',
                beneficios: Array.isArray(c.beneficios) ? c.beneficios : [],
                confianca: c.confianca || 'alta',
            }));
            setCategorias(cats.length ? cats : [linhaVazia()]);
            if (r.aviso) notify.warning(r.aviso);
            setView('review');
        } catch (e) {
            // Falha inesperada (rede): ainda abre o review em modo manual.
            logger.error('extrair cct', e);
            notify.warning('Não consegui ler o PDF automaticamente. Adicione as categorias manualmente.');
            setCategorias([linhaVazia()]);
            setView('review');
        } finally {
            setProcessando(false);
        }
    };

    const setCat = (i, k, v) => setCategorias(cs => cs.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
    const removerCat = (i) => setCategorias(cs => cs.filter((_, idx) => idx !== i));
    const removerBenef = (i, bi) => setCategorias(cs => cs.map((c, idx) =>
        idx === i ? { ...c, beneficios: c.beneficios.filter((_, k) => k !== bi) } : c));
    const addCat = () => setCategorias(cs => [...cs, linhaVazia()]);

    const confirmar = async () => {
        const validas = categorias
            .filter(c => c.nome.trim() && moedaParaNumero(c.piso_salarial) != null)
            .map(c => ({ nome: c.nome.trim(), piso_salarial: moedaParaNumero(c.piso_salarial), beneficios: c.beneficios }));
        if (!validas.length) { notify.warning('Adicione ao menos uma categoria com piso.'); return; }
        const [y1, y2] = vigencia.split('|');
        setProcessando(true);
        try {
            const fd = new FormData();
            fd.append('uf', uf);
            fd.append('sindicato', sindicato);
            fd.append('vigencia_inicio', `${y1}-01-01`);
            fd.append('vigencia_fim', `${y2}-12-31`);
            fd.append('categorias', JSON.stringify(validas));
            if (arquivo) fd.append('arquivo', arquivo);
            const r = await rhApi.criarConvencao(fd);
            if (r?.aviso) notify.warning(r.aviso); else notify.success('Convenção salva.');
            reloadRefs?.();
            setView('list');
        } catch (e) {
            logger.error('confirmar cct', e);
            notify.error(e.message || 'Erro ao salvar convenção.');
        } finally {
            setProcessando(false);
        }
    };

    const remover = async (c) => {
        const ok = await confirmDialog(`Remover a convenção ${c.uf} ${c.vigencia_inicio?.slice(0, 4)}?`, { danger: true });
        if (!ok) return;
        try { await rhApi.removerConvencao(c.id); notify.success('Convenção removida.'); carregar(); reloadRefs?.(); }
        catch (e) { logger.error('remover cct', e); notify.error('Erro ao remover.'); }
    };

    const verArquivo = async (c) => {
        try { const { url } = await rhApi.arquivoUrl('convencao', c.id); window.open(url, '_blank', 'noopener'); }
        catch (e) { notify.error(e.message || 'Arquivo indisponível.'); }
    };

    // ---------- STEPS ----------
    const Steps = ({ step }) => (
        <div className="rh-steps">
            <div className={`rh-step ${step > 1 ? 'done' : step === 1 ? 'cur' : ''}`}>
                <span className="rh-step-n">{step > 1 ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : 1}</span> Estado + arquivo
            </div><span className="rh-step-line" />
            <div className={`rh-step ${step === 2 ? 'cur' : step > 2 ? 'done' : ''}`}><span className="rh-step-n">2</span> Revisar extração</div>
            <span className="rh-step-line" />
            <div className="rh-step"><span className="rh-step-n">3</span> Confirmar e salvar</div>
        </div>
    );

    // ---------- LIST ----------
    if (view === 'list') {
        return (
            <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-file-certificate" /> Convenções coletivas (CCT)</div>
                    <div className="rh-card-actions">
                        <button className="rh-btn rh-btn-primary" onClick={abrirUpload}><i className="ti ti-upload" /> Nova convenção</button>
                    </div>
                </div>
                {loading ? <div className="rh-loading">Carregando…</div> : (
                    <table className="rh-table">
                        <thead><tr><th>Estado</th><th>Sindicato</th><th>Vigência</th><th>Categorias</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            {lista.length === 0 && <tr><td colSpan={6} className="rh-empty">Nenhuma convenção cadastrada.</td></tr>}
                            {lista.map(c => (
                                <tr key={c.id}>
                                    <td><div className="rh-cell-main">{c.uf}</div></td>
                                    <td className="rh-cell-sub">{c.sindicato || '—'}</td>
                                    <td className="rh-muted">{(c.vigencia_inicio || '').slice(0, 4)} — {(c.vigencia_fim || '').slice(0, 4)}</td>
                                    <td>{c.categorias_count ?? 0} categorias</td>
                                    <td>
                                        {c.status === 'confirmada'
                                            ? <span className="rh-badge rh-b-success"><i className="ti ti-check" style={{ fontSize: 11 }} /> Confirmada</span>
                                            : <span className="rh-badge rh-b-warning"><i className="ti ti-clock" style={{ fontSize: 11 }} /> Rascunho</span>}
                                    </td>
                                    <td>
                                        {c.arquivo_url && <button className="rh-btn rh-btn-text rh-btn-sm" title="Ver PDF" onClick={() => verArquivo(c)}><i className="ti ti-eye" /></button>}
                                        <button className="rh-btn rh-btn-text rh-btn-sm" title="Remover" onClick={() => remover(c)}><i className="ti ti-trash" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    }

    // ---------- UPLOAD ----------
    if (view === 'upload') {
        return (
            <>
                <Steps step={1} />
                <div className="rh-card" style={{ maxWidth: 680, margin: '0 auto' }}>
                    <div className="rh-card-head"><div className="rh-card-title"><i className="ti ti-upload" /> Nova convenção coletiva</div></div>
                    <div className="rh-row2" style={{ marginBottom: 'var(--space-5)' }}>
                        <div className="rh-field"><label>Estado (UF)</label>
                            <select className="rh-inp" value={uf} onChange={e => setUf(e.target.value)}>
                                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select></div>
                        <div className="rh-field"><label>Vigência</label>
                            <select className="rh-inp" value={vigencia} onChange={e => setVigencia(e.target.value)}>
                                {ranges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select></div>
                    </div>
                    <div className="rh-field"><label>Sindicato (opcional)</label>
                        <input className="rh-inp" placeholder="Ex.: SINTEPAV-CE" value={sindicato} onChange={e => setSindicato(e.target.value)} /></div>
                    <label className="rh-dropzone" style={{ cursor: 'pointer', display: 'block' }}>
                        <i className="ti ti-file-type-pdf" />
                        <b>{arquivo ? arquivo.name : 'Solte o PDF da convenção aqui'}</b>
                        <span>ou clique para selecionar — o sistema lê e preenche as categorias automaticamente</span>
                        <input type="file" hidden accept="application/pdf" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                    </label>
                    <div className="rh-hint"><i className="ti ti-sparkles" /> A leitura é automática (best-effort). Você revisa tudo antes de salvar — nada é gravado sem o seu OK.</div>
                    <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button className="rh-btn rh-btn-text" onClick={() => setView('list')}>Cancelar</button>
                        <button className="rh-btn rh-btn-primary" onClick={extrair} disabled={processando}>
                            <i className="ti ti-arrow-right" /> {processando ? 'Lendo…' : 'Ler e revisar'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ---------- REVIEW ----------
    return (
        <>
            <Steps step={2} />
            <div className="rh-card">
                <div className="rh-card-head">
                    <div className="rh-card-title"><i className="ti ti-file-search" /> Revisar — CCT {uf} {vigencia.replace('|', '/')}</div>
                    {arquivo && <div className="rh-card-actions"><span className="rh-badge rh-b-neutral"><i className="ti ti-file-type-pdf" style={{ fontSize: 11 }} /> {arquivo.name}</span></div>}
                </div>

                <div className="rh-review-banner"><i className="ti ti-robot" />
                    Extraímos <b>{categorias.length} categoria(s)</b>. Confira os pisos e benefícios, ajuste o que precisar e confirme. Campos com confiança baixa estão marcados em amarelo.
                </div>

                <table className="rh-table">
                    <thead><tr><th style={{ width: '24%' }}>Categoria</th><th style={{ width: '18%' }}>Piso mensal</th><th>Benefícios</th><th style={{ width: '14%' }}>Conferência</th></tr></thead>
                    <tbody>
                        {categorias.map((c, i) => (
                            <tr key={i} className={c.confianca === 'baixa' ? 'rh-row-low' : ''}>
                                <td><input className="rh-inp cat" value={c.nome} onChange={e => setCat(i, 'nome', e.target.value)} placeholder="Categoria" /></td>
                                <td><input className="rh-inp money" value={c.piso_salarial} onChange={e => setCat(i, 'piso_salarial', e.target.value)} placeholder="0,00" /></td>
                                <td>
                                    {c.beneficios.map((b, bi) => (
                                        <span className="rh-bene-chip" key={bi}>
                                            <i className="ti ti-gift" /> {b.descricao || b.tipo}{b.valor ? ` R$ ${b.valor}${b.unidade ? '/' + b.unidade : ''}` : ''}
                                            <button className="rh-btn rh-btn-text rh-btn-sm" style={{ padding: 0 }} title="Remover" onClick={() => removerBenef(i, bi)}><i className="ti ti-x" style={{ fontSize: 11 }} /></button>
                                        </span>
                                    ))}
                                    {c.beneficios.length === 0 && <span className="rh-muted" style={{ fontSize: 'var(--text-xs)' }}>—</span>}
                                </td>
                                <td>
                                    {c.confianca === 'baixa'
                                        ? <span className="rh-conf low"><i className="ti ti-alert-triangle-filled" /> Conferir</span>
                                        : <span className="rh-conf"><i className="ti ti-circle-check-filled" /> Alta</span>}
                                    <button className="rh-btn rh-btn-text rh-btn-sm" title="Remover linha" onClick={() => removerCat(i)}><i className="ti ti-trash" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="rh-hint"><i className="ti ti-plus" /> Faltou alguma categoria?
                    <button className="rh-btn rh-btn-text rh-btn-sm" onClick={addCat}>Adicionar manualmente</button>
                </div>

                <div style={{ paddingTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                    <button className="rh-btn rh-btn-text" onClick={() => setView('list')}>Cancelar</button>
                    <button className="rh-btn rh-btn-secondary" onClick={() => setView('upload')}><i className="ti ti-arrow-left" /> Voltar</button>
                    <button className="rh-btn rh-btn-primary" onClick={confirmar} disabled={processando}>
                        <i className="ti ti-check" /> {processando ? 'Salvando…' : 'Confirmar e salvar convenção'}
                    </button>
                </div>
            </div>
        </>
    );
}
