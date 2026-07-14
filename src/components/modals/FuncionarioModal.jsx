import React, { useState, useEffect, useRef } from 'react';
import Modal from '../Modal/Modal';
import { rhApi } from '../../screens/RH/rhApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { moedaParaNumero } from '../../screens/RH/rhFormat';

const vazio = { nome: '', cpf: '', data_admissao: '', obra_id: '', categoria_id: '', salario: '', status: 'ativo' };

export default function FuncionarioModal({ isOpen, funcionario, obras, categorias, onClose, onSaved, onCategoriasChanged }) {
    const [form, setForm] = useState(vazio);
    const [salarioTocado, setSalarioTocado] = useState(false);
    const [pisoNota, setPisoNota] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [novaCatAberta, setNovaCatAberta] = useState(false);
    const [novaCatNome, setNovaCatNome] = useState('');
    const [catsExtras, setCatsExtras] = useState([]);
    // Categorias criadas inline aparecem imediatamente, mesmo antes do reload das refs.
    const todasCategorias = [
        ...categorias,
        ...catsExtras.filter(c => !categorias.some(k => k.id === c.id)),
    ];

    const criarCategoria = async () => {
        const nome = novaCatNome.trim();
        if (!nome) { notify.warning('Informe o nome da categoria.'); return; }
        try {
            const cat = await rhApi.criarCategoria({ nome });
            setCatsExtras(prev => [...prev, cat]);
            setForm(f => ({ ...f, categoria_id: cat.id }));
            setNovaCatAberta(false);
            setNovaCatNome('');
            notify.success(`Categoria "${cat.nome}" criada.`);
            onCategoriasChanged?.();
        } catch (e) {
            logger.error('criar categoria', e);
            notify.error(e.message || 'Erro ao criar categoria.');
        }
    };
    const editando = !!funcionario;
    // Evita que a sugestão de piso sobrescreva o salário já cadastrado logo após
    // abrir o modal de edição (a hidratação popula categoria_id, o que dispararia
    // o efeito de piso sugerido antes de qualquer interação do usuário).
    const skipPisoAutoFillRef = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        setSalarioTocado(false);
        setPisoNota('');
        if (funcionario) {
            skipPisoAutoFillRef.current = true;
            setForm({
                nome: funcionario.nome || '',
                cpf: funcionario.cpf || '',
                data_admissao: funcionario.data_admissao || '',
                obra_id: funcionario.obra_id ?? '',
                categoria_id: funcionario.categoria_id ?? '',
                salario: funcionario.salario != null ? String(funcionario.salario).replace('.', ',') : '',
                status: funcionario.status || 'ativo',
            });
        } else {
            skipPisoAutoFillRef.current = false;
            setForm(vazio);
        }
    }, [isOpen, funcionario]);

    // Piso sugerido ao escolher categoria/obra (só se salário não foi tocado)
    useEffect(() => {
        if (!isOpen || salarioTocado || !form.categoria_id) return;
        if (skipPisoAutoFillRef.current) {
            // Pula apenas a passagem de hidratação inicial do funcionário em edição;
            // qualquer troca manual de categoria/obra depois disso segue normalmente.
            skipPisoAutoFillRef.current = false;
            return;
        }
        let vivo = true;
        rhApi.pisoSugerido(form.categoria_id, form.obra_id || '')
            .then(r => {
                if (!vivo) return;
                if (r.piso_sugerido != null) {
                    setForm(f => ({ ...f, salario: String(r.piso_sugerido).replace('.', ',') }));
                    const cat = categorias.find(c => String(c.id) === String(form.categoria_id));
                    setPisoNota(`Piso da convenção${r.uf ? ` ${r.uf}` : ''} para ${cat?.nome || 'categoria'} — editável`);
                } else {
                    setPisoNota('');
                }
            })
            .catch(e => logger.warn('piso sugerido', e));
        return () => { vivo = false; };
    }, [isOpen, form.categoria_id, form.obra_id, salarioTocado, categorias]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.nome.trim()) { notify.warning('Informe o nome.'); return; }
        if (!form.categoria_id) { notify.warning('Selecione a categoria.'); return; }
        const salarioNum = moedaParaNumero(form.salario);
        setSalvando(true);
        try {
            const body = {
                nome: form.nome.trim(),
                cpf: form.cpf.trim() || null,
                data_admissao: form.data_admissao || null,
                obra_id: form.obra_id || null,
                categoria_id: form.categoria_id,
                salario: salarioNum,
                status: form.status,
            };
            if (editando) await rhApi.editarFuncionario(funcionario.id, body);
            else await rhApi.criarFuncionario(body);
            notify.success(editando ? 'Funcionário atualizado.' : 'Funcionário criado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar funcionario', e);
            notify.error(e.message || 'Erro ao salvar funcionário.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-user-plus" style={{ marginRight: 8 }} />{editando ? 'Editar funcionário' : 'Novo funcionário'}</>}
            footer={<>
                <button className="rh-btn rh-btn-text" onClick={onClose}>Cancelar</button>
                <button className="rh-btn rh-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar funcionário'}
                </button>
            </>}
        >
            <div className="rh-field">
                <label>Nome completo</label>
                <input className="rh-inp" placeholder="Ex.: João da Silva" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div className="rh-row2">
                <div className="rh-field"><label>CPF</label>
                    <input className="rh-inp" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', e.target.value)} /></div>
                <div className="rh-field"><label>Admissão</label>
                    <input className="rh-inp" type="date" value={form.data_admissao || ''} onChange={e => set('data_admissao', e.target.value)} /></div>
            </div>
            <div className="rh-row2">
                <div className="rh-field"><label>Obra (opcional)</label>
                    <select className="rh-inp" value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
                        <option value="">— Sem obra (centralizado) —</option>
                        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}{o.uf ? ` (${o.uf})` : ''}</option>)}
                    </select></div>
                <div className="rh-field">
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Categoria
                        <button
                            type="button"
                            className="rh-btn rh-btn-text rh-btn-sm"
                            style={{ padding: '0 4px' }}
                            onClick={() => setNovaCatAberta(v => !v)}
                        >
                            <i className="ti ti-plus" /> Nova
                        </button>
                    </label>
                    {novaCatAberta ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                className="rh-inp"
                                placeholder="Ex.: Pedreiro"
                                value={novaCatNome}
                                autoFocus
                                onChange={e => setNovaCatNome(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); criarCategoria(); } }}
                            />
                            <button type="button" className="rh-btn rh-btn-primary rh-btn-sm" onClick={criarCategoria}>
                                <i className="ti ti-check" />
                            </button>
                        </div>
                    ) : (
                        <select className="rh-inp" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                            <option value="">{todasCategorias.length ? 'Selecione…' : 'Nenhuma — clique em + Nova'}</option>
                            {todasCategorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    )}
                </div>
            </div>
            <div className="rh-field">
                <label>Salário</label>
                <input className="rh-inp money" value={form.salario}
                    onChange={e => { set('salario', e.target.value); setSalarioTocado(true); }} placeholder="0,00" />
                {pisoNota && !salarioTocado && <span className="rh-inherit-note"><i className="ti ti-arrow-down-circle" /> {pisoNota}</span>}
            </div>
            {editando && (
                <div className="rh-field"><label>Status</label>
                    <select className="rh-inp" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="demitido">Demitido</option>
                    </select></div>
            )}
        </Modal>
    );
}
