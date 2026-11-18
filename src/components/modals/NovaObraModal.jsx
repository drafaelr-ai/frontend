import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { notify } from '../../utils/notify';
import { API_URL } from '../../config';

export default function NovaObraModal({ isOpen, onClose, onSaved }) {
    const [nome, setNome] = useState('');
    const [cliente, setCliente] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setNome('');
        setCliente('');
    }, [isOpen]);

    const salvar = async (event) => {
        event?.preventDefault();
        const nomeNormalizado = nome.trim();
        if (!nomeNormalizado) {
            notify.warning('Informe o nome da obra.');
            return;
        }

        setSalvando(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/obras`, {
                method: 'POST',
                body: JSON.stringify({
                    nome: nomeNormalizado,
                    cliente: cliente.trim() || null,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.erro || 'Não foi possível cadastrar a obra.');

            notify.success('Obra cadastrada com sucesso.');
            onSaved?.(data);
            onClose();
        } catch (error) {
            notify.error(error.message || 'Não foi possível cadastrar a obra.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            id="nova-obra"
            isOpen={isOpen}
            onClose={onClose}
            title="Nova obra"
            subtitle="Cadastre a obra para começar a lançar orçamento, compras e serviços."
            width="small"
            footer={<>
                <button type="button" className="m-btn-cancel" onClick={onClose} disabled={salvando}>Cancelar</button>
                <button type="submit" form="nova-obra-form" className="m-btn-primary" disabled={salvando} style={{ background: 'var(--module-obras)' }}>
                    <i className="ti ti-plus" aria-hidden="true" /> {salvando ? 'Cadastrando...' : 'Cadastrar obra'}
                </button>
            </>}
        >
            <form id="nova-obra-form" onSubmit={salvar}>
                <div className="m-field">
                    <label className="m-label" htmlFor="nova-obra-nome">Nome da obra *</label>
                    <input
                        id="nova-obra-nome"
                        className="m-input"
                        value={nome}
                        onChange={event => setNome(event.target.value)}
                        disabled={salvando}
                        maxLength={150}
                        required
                    />
                </div>
                <div className="m-field">
                    <label className="m-label" htmlFor="nova-obra-cliente">
                        Cliente <span className="m-label-opt">(opcional)</span>
                    </label>
                    <input
                        id="nova-obra-cliente"
                        className="m-input"
                        value={cliente}
                        onChange={event => setCliente(event.target.value)}
                        disabled={salvando}
                        maxLength={150}
                    />
                </div>
            </form>
        </Modal>
    );
}
