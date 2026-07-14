import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

export default function TrocarSenhaModal({ onClose }) {
    const [senhaAtual, setSenhaAtual] = useState('');
    const [senhaNova, setSenhaNova] = useState('');
    const [senhaConfirma, setSenhaConfirma] = useState('');
    const [salvando, setSalvando] = useState(false);

    const salvar = async (e) => {
        e.preventDefault();
        if (!senhaAtual || !senhaNova) {
            notify.warning('Preencha a senha atual e a nova senha.');
            return;
        }
        if (senhaNova.length < 6) {
            notify.warning('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (senhaNova !== senhaConfirma) {
            notify.warning('A confirmação não bate com a nova senha.');
            return;
        }
        setSalvando(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/me/senha`, {
                method: 'PUT',
                body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.erro || 'Erro ao alterar senha.');
            notify.success('Senha alterada com sucesso.');
            onClose();
        } catch (err) {
            logger.error('trocar senha', err);
            notify.error(err.message || 'Erro ao alterar senha.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Alterar senha"
            width="default"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-trocar-senha" className="m-btn-primary" disabled={salvando}>
                        <i className="ti ti-check" aria-hidden="true" /> {salvando ? 'Salvando…' : 'Salvar senha'}
                    </button>
                </>
            }
        >
            <form id="form-trocar-senha" onSubmit={salvar}>
                <div className="m-field">
                    <label className="m-label">Senha atual</label>
                    <input
                        type="password"
                        className="m-input"
                        value={senhaAtual}
                        onChange={e => setSenhaAtual(e.target.value)}
                        autoFocus
                        autoComplete="current-password"
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Nova senha</label>
                    <input
                        type="password"
                        className="m-input"
                        value={senhaNova}
                        onChange={e => setSenhaNova(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                    />
                </div>
                <div className="m-field">
                    <label className="m-label">Confirmar nova senha</label>
                    <input
                        type="password"
                        className="m-input"
                        value={senhaConfirma}
                        onChange={e => setSenhaConfirma(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>
            </form>
        </Modal>
    );
}
