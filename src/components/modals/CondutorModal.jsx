import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { placaBR } from '../../screens/Frota/frotaFormat';

const vazio = { nome: '', cpf: '', telefone: '', cnh_numero: '', cnh_categoria: '', cnh_validade: '', funcionario_id: '', usuario_id: '', veiculo_id: '', status: 'ativo', observacao: '' };

export default function CondutorModal({ isOpen, condutor, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [funcionarios, setFuncionarios] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [salvando, setSalvando] = useState(false);
    const editando = !!condutor;

    useEffect(() => {
        if (!isOpen) return;
        if (condutor) {
            setForm({
                nome: condutor.nome || '',
                cpf: condutor.cpf || '',
                telefone: condutor.telefone || '',
                cnh_numero: condutor.cnh_numero || '',
                cnh_categoria: condutor.cnh_categoria || '',
                cnh_validade: condutor.cnh_validade || '',
                funcionario_id: condutor.funcionario_id ?? '',
                usuario_id: condutor.usuario_id ?? '',
                veiculo_id: condutor.veiculo_atual_id ?? '',
                status: condutor.status || 'ativo',
                observacao: condutor.observacao || '',
            });
        } else {
            setForm(vazio);
        }
        // Vínculo opcional ao RH: se a lista falhar (ex.: sem acesso), segue sem ela.
        frotaApi.funcionarios()
            .then(data => setFuncionarios(Array.isArray(data) ? data : []))
            .catch(e => { logger.warn('funcionarios RH p/ condutor', e); setFuncionarios([]); });
        // Só gestores recebem esta lista; para os demais a API devolve 403 e
        // o vínculo continua simplesmente indisponível, sem bloquear o cadastro.
        frotaApi.usuariosNotificaveis()
            .then(data => setUsuarios(Array.isArray(data) ? data : []))
            .catch(() => setUsuarios([]));
        frotaApi.veiculos()
            .then(data => {
                const lista = Array.isArray(data) ? data.filter(v => v.status !== 'inativo') : [];
                setVeiculos(lista);
                const veiculoAtual = lista.find(v => v.condutor_atual_id === condutor?.id);
                if (veiculoAtual) setForm(f => ({ ...f, veiculo_id: f.veiculo_id || veiculoAtual.id }));
            })
            .catch(e => { logger.warn('veiculos p/ condutor', e); setVeiculos([]); });
    }, [isOpen, condutor]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        if (!form.nome.trim()) { notify.warning('Informe o nome.'); return; }
        setSalvando(true);
        try {
            const veiculoSelecionado = veiculos.find(v => String(v.id) === String(form.veiculo_id));
            let transferirVeiculo = false;
            if (veiculoSelecionado?.condutor_atual_id && veiculoSelecionado.condutor_atual_id !== condutor?.id) {
                const ok = await confirmDialog(
                    `${placaBR(veiculoSelecionado.placa)} está atribuído a ${veiculoSelecionado.condutor_atual_nome || 'outro condutor'}. Transferir para este condutor?`
                );
                if (!ok) return;
                transferirVeiculo = true;
            }
            const body = {
                nome: form.nome.trim(),
                cpf: form.cpf.trim() || null,
                telefone: form.telefone.trim() || null,
                cnh_numero: form.cnh_numero.trim() || null,
                cnh_categoria: form.cnh_categoria || null,
                cnh_validade: form.cnh_validade || null,
                funcionario_id: form.funcionario_id || null,
                usuario_id: form.usuario_id || null,
                veiculo_id: form.veiculo_id || null,
                transferir_veiculo: transferirVeiculo,
                observacao: form.observacao.trim() || null,
            };
            if (editando) {
                body.status = form.status;
                await frotaApi.editarCondutor(condutor.id, body);
            } else {
                await frotaApi.criarCondutor(body);
            }
            notify.success(editando ? 'Condutor atualizado.' : 'Condutor criado.');
            onSaved?.();
        } catch (e) {
            logger.error('salvar condutor', e);
            notify.error(e.message || 'Erro ao salvar condutor.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-steering-wheel" style={{ marginRight: 8 }} />{editando ? 'Editar condutor' : 'Novo condutor'}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar condutor'}
                </button>
            </>}
        >
            <div className="frota-field">
                <label>Nome completo</label>
                <input className="frota-inp" placeholder="Ex.: José Motorista" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div className="frota-field">
                <label>Veículo atribuído (opcional)</label>
                <select className="frota-inp" value={form.veiculo_id} onChange={e => set('veiculo_id', e.target.value)}>
                    <option value="">— Sem veículo atribuído —</option>
                    {veiculos.map(v => (
                        <option key={v.id} value={v.id}>
                            {placaBR(v.placa)} — {v.modelo}{v.condutor_atual_nome && v.condutor_atual_id !== condutor?.id ? ` (atual: ${v.condutor_atual_nome})` : ''}
                        </option>
                    ))}
                </select>
                <small className="frota-muted">A troca é salva junto com o condutor. Se o veículo estiver com outra pessoa, a transferência pede confirmação.</small>
            </div>
            {usuarios.length > 0 && (
                <div className="frota-field">
                    <label>Conta para receber alertas de multa</label>
                    <select className="frota-inp" value={form.usuario_id} onChange={e => set('usuario_id', e.target.value)}>
                        <option value="">— Sem alerta direto ao condutor —</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                    </select>
                    <small className="frota-muted">O condutor recebe no sino e no Telegram, se estiver vinculado.</small>
                </div>
            )}
            <div className="frota-row2">
                <div className="frota-field"><label>CPF (opcional)</label>
                    <input className="frota-inp" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', e.target.value)} /></div>
                <div className="frota-field"><label>Telefone (opcional)</label>
                    <input className="frota-inp" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
            </div>
            <div className="frota-row3">
                <div className="frota-field"><label>CNH nº</label>
                    <input className="frota-inp" value={form.cnh_numero} onChange={e => set('cnh_numero', e.target.value)} /></div>
                <div className="frota-field"><label>Categoria</label>
                    <select className="frota-inp" value={form.cnh_categoria} onChange={e => set('cnh_categoria', e.target.value)}>
                        <option value="">—</option>
                        {['A', 'B', 'AB', 'C', 'D', 'E'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                <div className="frota-field"><label>Validade da CNH</label>
                    <input className="frota-inp" type="date" value={form.cnh_validade} onChange={e => set('cnh_validade', e.target.value)} /></div>
            </div>
            <div className="frota-field">
                <label>Funcionário do RH (opcional)</label>
                <select className="frota-inp" value={form.funcionario_id} onChange={e => set('funcionario_id', e.target.value)}>
                    <option value="">— Sem vínculo —</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}{f.obra_nome ? ` (${f.obra_nome})` : ''}</option>)}
                </select>
            </div>
            {editando && (
                <div className="frota-field"><label>Status</label>
                    <select className="frota-inp" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                    </select></div>
            )}
            <div className="frota-field"><label>Observação (opcional)</label>
                <input className="frota-inp" value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
        </Modal>
    );
}
