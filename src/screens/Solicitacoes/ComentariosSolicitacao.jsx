import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';
import { dataHoraBR } from './solicitacoesFormat';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Conversa da solicitação (solicitante ↔ comprador) com menção @usuario.
 * Digitar @ abre o autocomplete; cada usuário mencionado recebe notificação
 * no sino. O backend também resolve menções digitadas à mão — a lista de
 * ids enviada aqui é só o caminho feliz do autocomplete.
 */
export default function ComentariosSolicitacao({ solicitacaoId, user }) {
    const [comentarios, setComentarios] = useState(null);   // null = carregando
    const [usuarios, setUsuarios] = useState([]);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [mencao, setMencao] = useState(null);             // { inicio, query } | null
    const [ativo, setAtivo] = useState(-1);
    const areaRef = useRef(null);
    const blurTimer = useRef(null);

    const carregar = useCallback(async () => {
        try {
            setComentarios(await solicitacoesApi.comentarios(solicitacaoId));
        } catch (e) {
            logger.error('comentários da solicitação', e);
            setComentarios([]);
        }
    }, [solicitacaoId]);

    useEffect(() => { carregar(); }, [carregar]);

    useEffect(() => {
        let vivo = true;
        solicitacoesApi.usuariosMencao()
            .then(lista => { if (vivo) setUsuarios(Array.isArray(lista) ? lista : []); })
            .catch(e => logger.error('usuários mencionáveis', e));
        return () => { vivo = false; };
    }, []);

    // Menções conhecidas viram destaque no texto (nomes longos primeiro,
    // senão "Diego" engoliria "Diego Silva").
    const regexMencao = useMemo(() => {
        const nomes = usuarios.map(u => u.username).filter(Boolean)
            .sort((a, b) => b.length - a.length).map(escapeRegExp);
        return nomes.length ? new RegExp(`@(${nomes.join('|')})`, 'gi') : null;
    }, [usuarios]);

    const renderTexto = (t) => {
        if (!regexMencao) return t;
        return t.split(regexMencao).map((parte, i) => (
            i % 2 === 1 ? <span key={i} className="solc-mention">@{parte}</span> : parte
        ));
    };

    const sugestoes = useMemo(() => {
        if (!mencao) return [];
        const q = norm(mencao.query);
        return usuarios
            .filter(u => u.id !== user?.id)
            .filter(u => !q || norm(u.username).includes(q))
            .slice(0, 8);
    }, [mencao, usuarios, user]);

    const detectarMencao = (valor, caret) => {
        const antes = valor.slice(0, caret == null ? valor.length : caret);
        const m = antes.match(/@([^\s@]{0,30})$/);
        setMencao(m ? { inicio: antes.length - m[0].length, query: m[1] } : null);
        setAtivo(-1);
    };

    const aoDigitar = (e) => {
        setTexto(e.target.value);
        detectarMencao(e.target.value, e.target.selectionStart);
    };

    const escolher = (u) => {
        if (!mencao) return;
        const caret = areaRef.current?.selectionStart ?? texto.length;
        const novo = `${texto.slice(0, mencao.inicio)}@${u.username} ${texto.slice(caret)}`;
        setTexto(novo);
        setMencao(null);
        setAtivo(-1);
        const pos = mencao.inicio + u.username.length + 2;
        requestAnimationFrame(() => {
            areaRef.current?.focus();
            areaRef.current?.setSelectionRange(pos, pos);
        });
    };

    const aoTeclar = (e) => {
        if (!mencao || sugestoes.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAtivo(i => (i + 1) % sugestoes.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAtivo(i => (i <= 0 ? sugestoes.length - 1 : i - 1));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            escolher(sugestoes[ativo >= 0 ? ativo : 0]);
        } else if (e.key === 'Escape') {
            setMencao(null);
            setAtivo(-1);
        }
    };

    const enviar = async () => {
        const corpo = texto.trim();
        if (!corpo) { notify.warning('Escreva o comentário antes de enviar.'); return; }
        const mencionados = usuarios
            .filter(u => corpo.toLowerCase().includes(`@${u.username}`.toLowerCase()))
            .map(u => u.id);
        setEnviando(true);
        try {
            await solicitacoesApi.comentar(solicitacaoId, corpo, mencionados);
            setTexto('');
            setMencao(null);
            await carregar();
            notify.success(mencionados.length
                ? 'Comentário enviado — os mencionados foram notificados.'
                : 'Comentário enviado.');
        } catch (e) {
            notify.error(e.message || 'Erro ao enviar o comentário.');
        } finally { setEnviando(false); }
    };

    const remover = async (c) => {
        const ok = await confirmDialog('Remover este comentário?', { danger: true });
        if (!ok) return;
        try {
            await solicitacoesApi.removerComentario(solicitacaoId, c.id);
            await carregar();
        } catch (e) {
            notify.error(e.message || 'Erro ao remover o comentário.');
        }
    };

    return (
        <div className="solc-card">
            <div className="solc-card-head">
                <div className="solc-card-title">
                    <i className="ti ti-messages" /> Conversa
                    <span className="solc-tab-cnt">{(comentarios || []).length}</span>
                </div>
            </div>

            {comentarios == null ? (
                <div className="solc-loading">Carregando…</div>
            ) : comentarios.length === 0 ? (
                <div className="solc-empty">
                    Nenhum comentário ainda. Use <b>@usuario</b> para tirar uma dúvida
                    com o solicitante ou com o comprador — quem for mencionado recebe
                    uma notificação.
                </div>
            ) : (
                <div className="solc-coment-list">
                    {comentarios.map(c => (
                        <div key={c.id} className="solc-coment">
                            <div className="solc-coment-av">{(c.autor_nome || '?').charAt(0)}</div>
                            <div className="solc-coment-body">
                                <div className="solc-coment-head">
                                    <span className="solc-coment-autor">{c.autor_nome}</span>
                                    <span className="solc-coment-data">{dataHoraBR(c.data_criacao)}</span>
                                    {(user?.role === 'master' || c.autor_id === user?.id) && (
                                        <button
                                            className="solc-coment-del" title="Remover comentário"
                                            onClick={() => remover(c)}
                                        >
                                            <i className="ti ti-trash" />
                                        </button>
                                    )}
                                </div>
                                <div className="solc-coment-texto">{renderTexto(c.texto)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="solc-coment-form">
                <div className="solc-coment-av">{(user?.username || '?').charAt(0)}</div>
                <div className="solc-ac">
                    <textarea
                        ref={areaRef}
                        className="solc-inp"
                        rows={2}
                        maxLength={1000}
                        value={texto}
                        placeholder="Escreva um comentário… use @ para mencionar e notificar alguém"
                        onChange={aoDigitar}
                        onKeyDown={aoTeclar}
                        onClick={e => detectarMencao(e.target.value, e.target.selectionStart)}
                        onBlur={() => { blurTimer.current = setTimeout(() => setMencao(null), 150); }}
                    />
                    {mencao && sugestoes.length > 0 && (
                        <div className="solc-ac-list" onMouseDown={() => clearTimeout(blurTimer.current)}>
                            {sugestoes.map((u, i) => (
                                <button
                                    type="button"
                                    key={u.id}
                                    className={`solc-ac-item${i === ativo ? ' ativo' : ''}`}
                                    onMouseEnter={() => setAtivo(i)}
                                    onClick={() => escolher(u)}
                                >
                                    <span className="solc-ac-desc">@{u.username}</span>
                                    <span className="solc-ac-meta">{u.role}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="solc-hint" style={{ marginTop: 'var(--space-2)' }}>
                        <i className="ti ti-at" />
                        Quem for mencionado com @ recebe a notificação na hora.
                    </div>
                </div>
                <button className="solc-btn solc-btn-primary" onClick={enviar} disabled={enviando}>
                    <i className="ti ti-send" /> {enviando ? 'Enviando…' : 'Comentar'}
                </button>
            </div>
        </div>
    );
}
