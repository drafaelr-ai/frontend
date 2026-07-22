import React, { useContext, useEffect, useMemo, useState } from 'react';
import '../../styles/tokens.css';
import '../../styles/components.css';
import './almoxarifado.css';

import { AuthContext } from '../../auth/AuthContext';
import { confirmDialog, notify } from '../../utils/notify';
import { logger } from '../../utils/logger';
import { almoxarifadoApi } from './almoxarifadoApi';

const TABS = [
    { id: 'visao', icon: 'ti-layout-dashboard', label: 'Visao geral' },
    { id: 'itens', icon: 'ti-package', label: 'Itens' },
    { id: 'mov', icon: 'ti-arrows-exchange', label: 'Movimentacoes' },
];

const CATEGORIAS = [
    ['fardamento', 'Fardamento'], ['epi', 'EPI'], ['equipamento', 'Equipamento'],
    ['ferramenta', 'Ferramenta'], ['material', 'Material'], ['outro', 'Outro'],
];

const MOVEMENT_LABELS = {
    entrada: 'Entrada no estoque',
    saida: 'Saida definitiva',
    ajuste: 'Ajuste',
    locacao_entrada: 'Entrada por locacao',
    locacao_saida: 'Devolucao ao fornecedor',
    alocacao_obra: 'Alocacao na obra',
    devolucao_obra: 'Devolucao da obra',
};

const MOVEMENT_OUT_TYPES = new Set(['saida', 'locacao_saida', 'alocacao_obra']);

const EMPTY_ITEM = {
    codigo: '', nome: '', categoria: 'fardamento', unidade: 'un', tamanho: '', estoque_minimo: '', descricao: '',
    modalidade: 'proprio', valor_unitario: '', valor_locacao_mensal: '',
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

function emptyMove() {
    return {
        item_id: '', tipo: 'entrada', quantidade: '', data_movimentacao: today(),
        funcionario_id: '', obra_id: '', fornecedor: '', observacao: '',
    };
}

function initials(name) {
    return String(name || 'U').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return '-';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return year ? `${day}/${month}/${year}` : '-';
}

function stockTone(item) {
    if (Number(item.estoque_minimo || 0) > 0 && Number(item.estoque_atual || 0) <= Number(item.estoque_minimo)) return 'low';
    return 'ok';
}

function movementOptions(item) {
    if (!item) return [['entrada', MOVEMENT_LABELS.entrada], ['saida', MOVEMENT_LABELS.saida], ['ajuste', 'Ajuste (+ ou -)']];
    if (item.categoria === 'fardamento') {
        return [['saida', 'Entrega definitiva ao colaborador'], ['entrada', 'Reposicao de estoque']];
    }
    if (item.categoria === 'equipamento' && item.modalidade === 'locacao') {
        return [
            ['locacao_entrada', MOVEMENT_LABELS.locacao_entrada],
            ['alocacao_obra', MOVEMENT_LABELS.alocacao_obra],
            ['devolucao_obra', MOVEMENT_LABELS.devolucao_obra],
            ['locacao_saida', MOVEMENT_LABELS.locacao_saida],
            ['ajuste', 'Ajuste (+ ou -)'],
        ];
    }
    if (item.categoria === 'equipamento') {
        return [
            ['entrada', MOVEMENT_LABELS.entrada],
            ['alocacao_obra', MOVEMENT_LABELS.alocacao_obra],
            ['devolucao_obra', MOVEMENT_LABELS.devolucao_obra],
            ['saida', MOVEMENT_LABELS.saida],
            ['ajuste', 'Ajuste (+ ou -)'],
        ];
    }
    return [['entrada', MOVEMENT_LABELS.entrada], ['saida', MOVEMENT_LABELS.saida], ['ajuste', 'Ajuste (+ ou -)']];
}

function defaultMovementType(item) {
    if (item?.categoria === 'fardamento') return 'saida';
    if (item?.categoria === 'equipamento' && item.modalidade === 'locacao') return 'locacao_entrada';
    return 'entrada';
}

function movementHint(item, type) {
    if (!item) return 'Selecione um item para ver as movimentacoes permitidas.';
    if (item.categoria === 'fardamento') return 'Fardamento entregue ao colaborador e uma saida definitiva: nao volta para o estoque.';
    if (item.categoria === 'equipamento' && item.modalidade === 'locacao') {
        return type === 'locacao_entrada'
            ? 'Informe o fornecedor para registrar o equipamento locado no almoxarifado.'
            : 'A alocacao tira o equipamento do estoque; a devolucao da obra o disponibiliza novamente.';
    }
    return 'Equipamentos podem ser alocados em uma obra e devolvidos depois ao almoxarifado.';
}

export default function AlmoxarifadoModule() {
    const { user, onBackToSelector, onGoToDashboard } = useContext(AuthContext);
    const [tab, setTab] = useState('visao');
    const [dashboard, setDashboard] = useState(null);
    const [itens, setItens] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [referencias, setReferencias] = useState({ obras: [], funcionarios: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [itemForm, setItemForm] = useState(EMPTY_ITEM);
    const [itemEditId, setItemEditId] = useState(null);
    const [moveForm, setMoveForm] = useState(emptyMove);
    const [busca, setBusca] = useState('');

    const load = async () => {
        setLoading(true);
        const [dash, itemRes, mov, refs] = await Promise.allSettled([
            almoxarifadoApi.dashboard(), almoxarifadoApi.itens(), almoxarifadoApi.movimentacoes(), almoxarifadoApi.referencias(),
        ]);
        const failures = [dash, itemRes, mov, refs].filter(result => result.status === 'rejected');
        failures.forEach(result => logger.error('Almoxarifado load', result.reason));
        if (failures.length) notify.error('Nao foi possivel carregar todos os dados do almoxarifado.');
        if (dash.status === 'fulfilled') setDashboard(dash.value);
        if (itemRes.status === 'fulfilled') setItens(Array.isArray(itemRes.value) ? itemRes.value : []);
        if (mov.status === 'fulfilled') setMovimentacoes(Array.isArray(mov.value) ? mov.value : []);
        if (refs.status === 'fulfilled') setReferencias(refs.value || { obras: [], funcionarios: [] });
        setLoading(false);
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredItems = useMemo(() => {
        const term = busca.trim().toLowerCase();
        if (!term) return itens;
        return itens.filter(item => `${item.nome} ${item.codigo || ''} ${item.categoria}`.toLowerCase().includes(term));
    }, [itens, busca]);

    const selectedMoveItem = useMemo(
        () => itens.find(item => String(item.id) === String(moveForm.item_id)),
        [itens, moveForm.item_id],
    );
    const availableMovementTypes = movementOptions(selectedMoveItem);
    const moveNeedsEmployee = selectedMoveItem?.categoria === 'fardamento' && moveForm.tipo === 'saida';
    const moveNeedsObra = ['alocacao_obra', 'devolucao_obra'].includes(moveForm.tipo);
    const moveNeedsSupplier = moveForm.tipo === 'locacao_entrada';

    const resetItemForm = () => {
        setItemForm(EMPTY_ITEM);
        setItemEditId(null);
    };

    const submitItem = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (itemEditId) {
                await almoxarifadoApi.editarItem(itemEditId, itemForm);
                notify.success('Item atualizado.');
            } else {
                await almoxarifadoApi.criarItem(itemForm);
                notify.success('Item cadastrado.');
            }
            resetItemForm();
            await load();
        } catch (error) {
            logger.error('Salvar item do almoxarifado', error);
            notify.error(error.message || 'Nao foi possivel salvar o item.');
        } finally {
            setSaving(false);
        }
    };

    const editItem = (item) => {
        setItemEditId(item.id);
        setItemForm({
            codigo: item.codigo || '', nome: item.nome || '', categoria: item.categoria || 'outro',
            unidade: item.unidade || 'un', tamanho: item.tamanho || '',
            estoque_minimo: item.estoque_minimo ?? '', descricao: item.descricao || '',
            modalidade: item.modalidade || 'proprio', valor_unitario: item.valor_unitario ?? '',
            valor_locacao_mensal: item.valor_locacao_mensal ?? '',
        });
        setTab('itens');
    };

    const inactivateItem = async (item) => {
        if (!await confirmDialog(`Inativar "${item.nome}"? O historico sera preservado.`, { danger: true, confirmText: 'Inativar' })) return;
        try {
            await almoxarifadoApi.inativarItem(item.id);
            notify.success('Item inativado.');
            await load();
        } catch (error) {
            logger.error('Inativar item', error);
            notify.error(error.message || 'Nao foi possivel inativar o item.');
        }
    };

    const submitMove = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await almoxarifadoApi.criarMovimentacao(moveForm);
            notify.success('Movimentacao registrada.');
            setMoveForm(emptyMove());
            await load();
        } catch (error) {
            logger.error('Movimentar estoque', error);
            notify.error(error.message || 'Nao foi possivel registrar a movimentacao.');
        } finally {
            setSaving(false);
        }
    };

    const nomeUser = user?.username || 'Usuario';
    const lowItems = dashboard?.abaixo_minimo || [];
    const stockSummary = dashboard?.resumo || {};

    return (
        <div className="almox-shell">
            <header className="almox-navbar">
                <button type="button" className="almox-logo" onClick={onGoToDashboard} title="Ir para o dashboard principal">
                    <img src="/obraly-mark.png" alt="" className="almox-logo-dot" /> Obraly
                </button>
                <div className="almox-crumbs"><i className="ti ti-chevron-right" /> <b>Almoxarifado</b></div>
                <div className="almox-spacer" />
                <button className="almox-back" onClick={onBackToSelector}><i className="ti ti-arrow-left" /> Modulos</button>
                <div className="almox-user"><span>{nomeUser}</span><span className="almox-user-av">{initials(nomeUser)}</span></div>
            </header>

            <main className="almox-container">
                <div className="almox-pagehead">
                    <div>
                        <h1><i className="ti ti-box-seam" /> Almoxarifado</h1>
                        <p>Controle de fardamentos, EPIs, ferramentas, equipamentos proprios e locados.</p>
                    </div>
                    <button className="almox-btn almox-btn-primary" onClick={() => { resetItemForm(); setTab('itens'); }}>
                        <i className="ti ti-package-import" /> Novo item
                    </button>
                </div>

                <nav className="almox-tabs" aria-label="Navegacao do almoxarifado">
                    {TABS.map(item => (
                        <button key={item.id} className={`almox-tab${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
                            <i className={`ti ${item.icon}`} /> {item.label}
                            {item.id === 'itens' && <span className="almox-tab-count">{itens.length}</span>}
                            {item.id === 'visao' && lowItems.length > 0 && <span className="almox-tab-alert">{lowItems.length}</span>}
                        </button>
                    ))}
                </nav>

                {loading ? <div className="almox-loading">Carregando almoxarifado...</div> : <>
                    {tab === 'visao' && <section>
                        <div className="almox-kpis">
                            <article className="almox-kpi"><span>Itens ativos</span><strong>{dashboard?.total_itens || 0}</strong><i className="ti ti-package" /></article>
                            <article className="almox-kpi"><span>Valor em estoque</span><strong>{formatCurrency(stockSummary.valor_estoque)}</strong><i className="ti ti-currency-real" /></article>
                            <article className="almox-kpi"><span>Equipamentos disponiveis</span><strong>{formatNumber(stockSummary.equipamentos_estoque)}</strong><i className="ti ti-forklift" /></article>
                            <article className="almox-kpi"><span>Locacoes mensais</span><strong>{formatCurrency(stockSummary.valor_locacao_mensal)}</strong><small>{formatNumber(stockSummary.locacoes_ativas)} equipamento(s) locado(s)</small><i className="ti ti-building-warehouse" /></article>
                            <article className="almox-kpi alert"><span>Estoque baixo</span><strong>{dashboard?.itens_abaixo_minimo || 0}</strong><i className="ti ti-alert-triangle" /></article>
                        </div>
                        <div className="almox-grid">
                            <section className="almox-card">
                                <div className="almox-card-head"><h2><i className="ti ti-alert-triangle" /> Reposicao necessaria</h2><button className="almox-link" onClick={() => setTab('itens')}>Ver itens</button></div>
                                {lowItems.length ? <div className="almox-low-list">{lowItems.map(item => <div key={item.id} className="almox-low-row"><div><b>{item.nome}</b><small>{item.categoria} - minimo {formatNumber(item.estoque_minimo)} {item.unidade}</small></div><strong>{formatNumber(item.estoque_atual)} {item.unidade}</strong></div>)}</div> : <p className="almox-empty"><i className="ti ti-circle-check" /> Nenhum item abaixo do estoque minimo.</p>}
                            </section>
                            <section className="almox-card">
                                <div className="almox-card-head"><h2><i className="ti ti-history" /> Ultimas movimentacoes</h2><button className="almox-link" onClick={() => setTab('mov')}>Ver historico</button></div>
                                {(dashboard?.recentes || []).length ? <div className="almox-recent-list">{dashboard.recentes.map(mov => <div key={mov.id} className="almox-recent-row"><span className={`almox-move-icon ${mov.tipo}`}><i className={`ti ${MOVEMENT_OUT_TYPES.has(mov.tipo) ? 'ti-arrow-up-right' : 'ti-arrow-down-left'}`} /></span><div><b>{mov.item_nome}</b><small>{formatDate(mov.data_movimentacao)} - {MOVEMENT_LABELS[mov.tipo] || mov.tipo}{mov.funcionario_nome ? ` - ${mov.funcionario_nome}` : ''}</small></div><strong className={mov.variacao < 0 ? 'negative' : 'positive'}>{mov.variacao > 0 ? '+' : ''}{formatNumber(mov.variacao)} {mov.unidade}</strong></div>)}</div> : <p className="almox-empty">Ainda nao ha movimentacoes registradas.</p>}
                            </section>
                        </div>
                    </section>}

                    {tab === 'itens' && <section className="almox-two-cols">
                        <form className="almox-card almox-form-card" onSubmit={submitItem}>
                            <div className="almox-card-head"><h2><i className="ti ti-package-import" /> {itemEditId ? 'Editar item' : 'Cadastrar item'}</h2>{itemEditId && <button type="button" className="almox-link" onClick={resetItemForm}>Cancelar edicao</button>}</div>
                            <div className="almox-form-grid">
                                <label className="almox-field"><span>Nome *</span><input value={itemForm.nome} onChange={e => setItemForm({ ...itemForm, nome: e.target.value })} required /></label>
                                <label className="almox-field"><span>Codigo</span><input value={itemForm.codigo} onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })} placeholder="Ex.: UNI-001" /></label>
                                <label className="almox-field"><span>Categoria *</span><select value={itemForm.categoria} onChange={e => setItemForm({ ...itemForm, categoria: e.target.value, modalidade: e.target.value === 'equipamento' ? itemForm.modalidade : 'proprio', valor_locacao_mensal: e.target.value === 'equipamento' ? itemForm.valor_locacao_mensal : '' })}>{CATEGORIAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                                <label className="almox-field"><span>Unidade *</span><input value={itemForm.unidade} onChange={e => setItemForm({ ...itemForm, unidade: e.target.value })} placeholder="un, par, kg..." required /></label>
                                <label className="almox-field"><span>Tamanho / grade</span><input value={itemForm.tamanho} onChange={e => setItemForm({ ...itemForm, tamanho: e.target.value })} placeholder="Ex.: M, 42, GG" /></label>
                                <label className="almox-field"><span>Estoque minimo</span><input type="number" min="0" step="0.01" value={itemForm.estoque_minimo} onChange={e => setItemForm({ ...itemForm, estoque_minimo: e.target.value })} /></label>
                                <label className="almox-field"><span>Valor unitario (R$)</span><input type="number" min="0" step="0.01" value={itemForm.valor_unitario} onChange={e => setItemForm({ ...itemForm, valor_unitario: e.target.value })} placeholder="0,00" /></label>
                                {itemForm.categoria === 'equipamento' && <label className="almox-field"><span>Modalidade *</span><select value={itemForm.modalidade} onChange={e => setItemForm({ ...itemForm, modalidade: e.target.value, valor_locacao_mensal: e.target.value === 'locacao' ? itemForm.valor_locacao_mensal : '' })}><option value="proprio">Proprio</option><option value="locacao">Locacao</option></select></label>}
                                {itemForm.categoria === 'equipamento' && itemForm.modalidade === 'locacao' && <label className="almox-field"><span>Locacao mensal por unidade (R$) *</span><input type="number" min="0.01" step="0.01" value={itemForm.valor_locacao_mensal} onChange={e => setItemForm({ ...itemForm, valor_locacao_mensal: e.target.value })} placeholder="0,00" required /></label>}
                                <label className="almox-field full"><span>Descricao</span><textarea rows="3" value={itemForm.descricao} onChange={e => setItemForm({ ...itemForm, descricao: e.target.value })} /></label>
                            </div>
                            <div className="almox-form-actions"><button className="almox-btn almox-btn-primary" disabled={saving}><i className="ti ti-device-floppy" /> {saving ? 'Salvando...' : itemEditId ? 'Salvar alteracoes' : 'Cadastrar item'}</button></div>
                        </form>

                        <section className="almox-card almox-list-card">
                            <div className="almox-card-head"><h2><i className="ti ti-packages" /> Itens em estoque</h2><label className="almox-search"><i className="ti ti-search" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item" /></label></div>
                            <div className="almox-table-wrap"><table className="almox-table"><thead><tr><th>Item</th><th>Categoria</th><th>Disponivel</th><th>Minimo</th><th aria-label="Acoes" /></tr></thead><tbody>{filteredItems.length ? filteredItems.map(item => <tr key={item.id}><td><b>{item.nome}</b><small>{[item.codigo, item.tamanho].filter(Boolean).join(' - ') || 'Sem codigo'}</small></td><td><span className="almox-tag">{CATEGORIAS.find(c => c[0] === item.categoria)?.[1] || item.categoria}</span>{item.modalidade === 'locacao' && <small className="almox-item-mode">Locacao</small>}</td><td><strong className={`almox-stock ${stockTone(item)}`}>{formatNumber(item.estoque_atual)} {item.unidade}</strong></td><td>{formatNumber(item.estoque_minimo)} {item.unidade}</td><td className="almox-actions"><button type="button" title="Editar" onClick={() => editItem(item)}><i className="ti ti-pencil" /></button><button type="button" title="Inativar" onClick={() => inactivateItem(item)}><i className="ti ti-archive" /></button></td></tr>) : <tr><td colSpan="5" className="almox-empty">Nenhum item encontrado.</td></tr>}</tbody></table></div>
                        </section>
                    </section>}

                    {tab === 'mov' && <section className="almox-two-cols">
                        <form className="almox-card almox-form-card" onSubmit={submitMove}>
                            <div className="almox-card-head"><h2><i className="ti ti-arrows-exchange" /> Movimentar estoque</h2></div>
                            <p className="almox-hint">{movementHint(selectedMoveItem, moveForm.tipo)}</p>
                            <div className="almox-form-grid">
                                <label className="almox-field full"><span>Item *</span><select value={moveForm.item_id} onChange={e => { const item = itens.find(candidate => String(candidate.id) === e.target.value); setMoveForm({ ...emptyMove(), item_id: e.target.value, tipo: defaultMovementType(item) }); }} required><option value="">Selecione</option>{itens.map(item => <option key={item.id} value={item.id}>{item.nome} - {formatNumber(item.estoque_atual)} {item.unidade}</option>)}</select></label>
                                <label className="almox-field"><span>Tipo *</span><select value={moveForm.tipo} onChange={e => setMoveForm({ ...moveForm, tipo: e.target.value, funcionario_id: e.target.value === 'saida' ? moveForm.funcionario_id : '', obra_id: ['alocacao_obra', 'devolucao_obra'].includes(e.target.value) ? moveForm.obra_id : '', fornecedor: e.target.value === 'locacao_entrada' ? moveForm.fornecedor : '' })} disabled={!selectedMoveItem}>{availableMovementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                                <label className="almox-field"><span>Quantidade *</span><input type="number" step="0.01" min={moveForm.tipo === 'ajuste' ? undefined : '0.01'} value={moveForm.quantidade} onChange={e => setMoveForm({ ...moveForm, quantidade: e.target.value })} required /></label>
                                <label className="almox-field"><span>Data *</span><input type="date" value={moveForm.data_movimentacao} onChange={e => setMoveForm({ ...moveForm, data_movimentacao: e.target.value })} required /></label>
                                {(moveNeedsEmployee || (selectedMoveItem && !moveNeedsObra && !moveNeedsSupplier)) && <label className="almox-field"><span>Colaborador{moveNeedsEmployee ? ' *' : ''}</span><select value={moveForm.funcionario_id} onChange={e => setMoveForm({ ...moveForm, funcionario_id: e.target.value })} required={moveNeedsEmployee}><option value="">{moveNeedsEmployee ? 'Selecione quem recebeu' : 'Nao vincular'}</option>{referencias.funcionarios.map(func => <option key={func.id} value={func.id}>{func.nome}</option>)}</select></label>}
                                {moveNeedsObra && <label className="almox-field"><span>Obra *</span><select value={moveForm.obra_id} onChange={e => setMoveForm({ ...moveForm, obra_id: e.target.value })} required><option value="">Selecione a obra</option>{referencias.obras.map(obra => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>}
                                {moveNeedsSupplier && <label className="almox-field"><span>Fornecedor *</span><input value={moveForm.fornecedor} onChange={e => setMoveForm({ ...moveForm, fornecedor: e.target.value })} placeholder="Nome do fornecedor" required /></label>}
                                <label className="almox-field full"><span>Observacao</span><textarea rows="3" value={moveForm.observacao} onChange={e => setMoveForm({ ...moveForm, observacao: e.target.value })} placeholder="Ex.: entrega de 2 camisas tamanho M" /></label>
                            </div>
                            <div className="almox-form-actions"><button className="almox-btn almox-btn-primary" disabled={saving}><i className="ti ti-check" /> {saving ? 'Registrando...' : 'Registrar movimentacao'}</button></div>
                        </form>
                        <section className="almox-card almox-list-card"><div className="almox-card-head"><h2><i className="ti ti-history" /> Historico</h2><span className="almox-muted">Ultimas 300</span></div><div className="almox-table-wrap"><table className="almox-table"><thead><tr><th>Data</th><th>Item</th><th>Movimentacao</th><th>Destino</th></tr></thead><tbody>{movimentacoes.length ? movimentacoes.map(mov => <tr key={mov.id}><td>{formatDate(mov.data_movimentacao)}</td><td><b>{mov.item_nome}</b><small>{mov.observacao || 'Sem observacao'}</small></td><td><span className={`almox-movement ${mov.variacao < 0 ? 'out' : 'in'}`}>{MOVEMENT_LABELS[mov.tipo] || mov.tipo} - {mov.variacao > 0 ? '+' : ''}{formatNumber(mov.variacao)} {mov.unidade}</span></td><td>{mov.funcionario_nome || mov.obra_nome || mov.fornecedor || '-'}<small>{[mov.funcionario_nome && mov.obra_nome ? mov.obra_nome : '', mov.fornecedor].filter(Boolean).join(' - ')}</small></td></tr>) : <tr><td colSpan="4" className="almox-empty">Ainda nao ha movimentacoes.</td></tr>}</tbody></table></div></section>
                    </section>}
                </>}
            </main>
        </div>
    );
}
