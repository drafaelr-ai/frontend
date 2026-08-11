import React, { useState, useEffect, useRef } from 'react';
import Modal from '../Modal/Modal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { TIPOS_SOLICITACAO } from '../../screens/Solicitacoes/solicitacoesFormat';
import InsumoAutocomplete from '../../screens/Solicitacoes/InsumoAutocomplete';

const itemVazio = () => ({ descricao: '', quantidade: '', unidade: '', observacao: '' });
const vazio = { obra_id: '', tipo: 'Material', data_necessidade: '', observacao: '' };

export default function NovaSolicitacaoModal({ isOpen, obras, onClose, onSaved, solicitacao = null }) {
    const [form, setForm] = useState(vazio);
    const [itens, setItens] = useState([itemVazio()]);
    const [arquivo, setArquivo] = useState(null);
    const [lendoPedido, setLendoPedido] = useState(false);
    const [resumoLeitura, setResumoLeitura] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const pedidoInputRef = useRef(null);
    const editando = Boolean(solicitacao?.id);

    useEffect(() => {
        if (!isOpen) return;
        setForm(editando ? {
            obra_id: String(solicitacao.obra_id || ''),
            tipo: solicitacao.tipo || 'Material',
            data_necessidade: (solicitacao.data_necessidade || '').slice(0, 10),
            observacao: solicitacao.observacao || '',
        } : vazio);
        setItens(editando && solicitacao.itens?.length
            ? solicitacao.itens.map(item => ({
                descricao: item.descricao || '',
                quantidade: item.quantidade ?? '',
                unidade: item.unidade || '',
                observacao: item.observacao || '',
            }))
            : [itemVazio()]);
        setArquivo(null);
        setResumoLeitura(null);
    }, [editando, isOpen, solicitacao]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setItem = (idx, k, v) => setItens(list => list.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
    const addItem = () => setItens(list => [...list, itemVazio()]);
    const delItem = (idx) => setItens(list => (list.length > 1 ? list.filter((_, i) => i !== idx) : list));

    const lerArquivoPedido = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const extensao = file.name.toLowerCase().split('.').pop();
        if (!['xlsx', 'pdf'].includes(extensao)) {
            notify.warning('Envie um arquivo Excel (.xlsx) ou PDF.');
            event.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            notify.warning('O arquivo ultrapassa o limite de 10 MB.');
            event.target.value = '';
            return;
        }

        setLendoPedido(true);
        try {
            const resposta = await solicitacoesApi.lerPedido(file);
            const importados = (resposta.itens || []).map(item => ({
                descricao: item.descricao || '',
                quantidade: item.quantidade ?? '',
                unidade: item.unidade || '',
                observacao: item.observacao || '',
            }));
            if (!importados.length) throw new Error('Nenhum item foi identificado no arquivo.');

            const preenchidos = itens.filter(item => item.descricao.trim());
            const adicionadosAosExistentes = preenchidos.length > 0;
            setItens(adicionadosAosExistentes ? [...preenchidos, ...importados] : importados);
            setResumoLeitura({
                arquivo: resposta.arquivo || file.name,
                quantidade: importados.length,
                avisos: resposta.avisos || [],
            });
            notify.success(`${importados.length} item(ns) lido(s) e ${adicionadosAosExistentes ? 'adicionado(s)' : 'preenchido(s)'} para revisão.`);
        } catch (e) {
            logger.error('ler pedido da solicitação', e);
            notify.error(e.message || 'Não foi possível ler o pedido.');
        } finally {
            setLendoPedido(false);
            event.target.value = '';
        }
    };

    const salvar = async () => {
        if (!form.obra_id) { notify.warning('Selecione a obra.'); return; }
        const itensValidos = itens.filter(i => i.descricao.trim());
        if (!itensValidos.length) { notify.warning('Informe ao menos um item.'); return; }
        if (itensValidos.some(i => !i.quantidade || Number(String(i.quantidade).replace(',', '.')) <= 0)) {
            notify.warning('Todo item precisa de quantidade maior que zero.');
            return;
        }
        setSalvando(true);
        try {
            const payload = {
                obra_id: form.obra_id,
                tipo: form.tipo,
                data_necessidade: form.data_necessidade || null,
                observacao: form.observacao.trim() || null,
                itens: itensValidos.map(i => ({
                    descricao: i.descricao.trim(),
                    quantidade: i.quantidade,
                    unidade: i.unidade.trim() || null,
                    observacao: i.observacao.trim() || null,
                })),
            };
            let resp;
            if (arquivo) {
                const fd = new FormData();
                fd.append('obra_id', payload.obra_id);
                fd.append('tipo', payload.tipo);
                if (payload.data_necessidade) fd.append('data_necessidade', payload.data_necessidade);
                if (payload.observacao) fd.append('observacao', payload.observacao);
                fd.append('itens', JSON.stringify(payload.itens));
                fd.append('arquivo', arquivo);
                resp = editando
                    ? await solicitacoesApi.editar(solicitacao.id, fd, true)
                    : await solicitacoesApi.criar(fd, true);
            } else {
                resp = editando
                    ? await solicitacoesApi.editar(solicitacao.id, payload)
                    : await solicitacoesApi.criar(payload);
            }
            if (resp?.aviso) notify.warning(resp.aviso);
            else notify.success(editando
                ? 'Solicitação atualizada.'
                : 'Solicitação criada — os responsáveis pela pesquisa de preços foram avisados.');
            onSaved?.(resp);
        } catch (e) {
            logger.error(editando ? 'editar solicitação' : 'criar solicitação', e);
            notify.error(e.message || (editando ? 'Erro ao editar solicitação.' : 'Erro ao criar solicitação.'));
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className={`ti ${editando ? 'ti-edit' : 'ti-shopping-cart-plus'}`} style={{ marginRight: 8 }} />{editando ? `Editar solicitação #${solicitacao.id}` : 'Nova solicitação de compra'}</>}
            subtitle={editando
                ? 'A data e a autoria originais serão preservadas.'
                : 'A data e a hora da solicitação são registradas automaticamente.'}
            width="large"
            footer={<>
                <button className="solc-btn solc-btn-text" onClick={onClose}>Cancelar</button>
                <button className="solc-btn solc-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : (editando ? 'Salvar alterações' : 'Criar solicitação')}
                </button>
            </>}
        >
            <div className="solc-row3">
                <div className="solc-field"><label>Obra</label>
                    <select className="solc-inp" value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
                        <option value="">Selecionar obra…</option>
                        {editando && !(obras || []).some(o => String(o.id) === String(solicitacao.obra_id)) && (
                            <option value={solicitacao.obra_id}>{solicitacao.obra_nome}</option>
                        )}
                        {(obras || []).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select></div>
                <div className="solc-field"><label>Tipo</label>
                    <select className="solc-inp" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                        {TIPOS_SOLICITACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                <div className="solc-field"><label>Necessário para (opcional)</label>
                    <input className="solc-inp" type="date" value={form.data_necessidade} onChange={e => set('data_necessidade', e.target.value)} /></div>
            </div>

            <div className="solc-field" style={{ marginBottom: 8 }}>
                <label>Itens da solicitação</label>
            </div>
            <div className="solc-item-row" style={{ marginBottom: 4 }}>
                <span className="solc-cell-sub solc-item-description">Descrição</span>
                <span className="solc-cell-sub solc-item-quantity">Quantidade</span>
                <span className="solc-cell-sub solc-item-unit">Unidade</span>
                <span className="solc-cell-sub solc-item-observation">Observação</span>
                <span />
            </div>
            {itens.map((item, idx) => (
                <div className="solc-item-row" key={idx}>
                    <InsumoAutocomplete
                        className="solc-item-description"
                        placeholder="Ex.: Cimento CP-II 50kg"
                        value={item.descricao}
                        onChange={v => setItem(idx, 'descricao', v)}
                        onSelect={ins => setItens(list => list.map((it, i) =>
                            (i === idx ? { ...it, descricao: ins.descricao, unidade: it.unidade || ins.unidade } : it)))} />
                    <input className="solc-inp solc-item-quantity" placeholder="0"
                        value={item.quantidade} onChange={e => setItem(idx, 'quantidade', e.target.value)} />
                    <input className="solc-inp solc-item-unit" placeholder="un, sc, m³"
                        value={item.unidade} onChange={e => setItem(idx, 'unidade', e.target.value)} />
                    <input className="solc-inp solc-item-observation" placeholder="Observação do item"
                        value={item.observacao} onChange={e => setItem(idx, 'observacao', e.target.value)} />
                    <button type="button" className="solc-item-del" title="Remover item"
                        onClick={() => delItem(idx)} disabled={itens.length === 1}>
                        <i className="ti ti-trash" />
                    </button>
                </div>
            ))}
            <div className="solc-item-tools">
                <button type="button" className="solc-btn solc-btn-secondary solc-btn-sm" onClick={addItem}>
                    <i className="ti ti-plus" /> Adicionar item
                </button>
                <button
                    type="button"
                    className="solc-btn solc-btn-secondary solc-btn-sm"
                    onClick={() => pedidoInputRef.current?.click()}
                    disabled={lendoPedido}
                >
                    <i className={`ti ${lendoPedido ? 'ti-loader-2' : 'ti-file-search'}`} />
                    {lendoPedido ? 'Lendo pedido…' : 'Ler pedido'}
                </button>
                <input
                    ref={pedidoInputRef}
                    type="file"
                    accept=".xlsx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
                    onChange={lerArquivoPedido}
                    hidden
                />
                <span className="solc-item-tools-hint">Excel (.xlsx) ou PDF, até 10 MB</span>
            </div>

            {resumoLeitura && (
                <div className="solc-import-result" role="status">
                    <i className="ti ti-circle-check" />
                    <div>
                        <b>{resumoLeitura.quantidade} item(ns) preenchido(s) de {resumoLeitura.arquivo}</b>
                        <span>Revise descrição, quantidade, unidade e observação antes de salvar.</span>
                        {resumoLeitura.avisos.map((aviso, idx) => <span key={idx}>{aviso}</span>)}
                    </div>
                </div>
            )}

            <div className="solc-field"><label>{editando ? 'Novo anexo (opcional — substitui o atual)' : 'Anexo (opcional — PDF/imagem, ex.: lista de materiais, projeto)'}</label>
                <input className="solc-inp" type="file" accept=".pdf,image/*"
                    onChange={e => setArquivo(e.target.files?.[0] || null)} /></div>

            <div className="solc-field"><label>Observação (opcional)</label>
                <input className="solc-inp" placeholder="Ex.: entregar na portaria da obra"
                    value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
