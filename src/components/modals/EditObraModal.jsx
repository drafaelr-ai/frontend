import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { notify } from '../../utils/notify';
import { API_URL } from '../../config';

function EditObraModal({ isOpen, onClose, obraId, obraName, obraCliente, onSaved }) {
    const [nome, setNome] = useState('');
    const [cliente, setCliente] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setNome(obraName ?? '');
        setCliente(obraCliente ?? '');
    }, [isOpen, obraName, obraCliente]);

    const handleSalvar = async () => {
        const nomeTrimmed = nome.trim();
        if (!nomeTrimmed) {
            notify.warning('Nome não pode ficar vazio');
            return;
        }
        if (nomeTrimmed === obraName && cliente.trim() === (obraCliente ?? '')) {
            notify.info('Nenhuma mudança detectada');
            return;
        }
        setSalvando(true);
        try {
            const r = await fetchWithAuth(`${API_URL}/obras/${obraId}`, {
                method: 'PATCH',
                body: JSON.stringify({ nome: nomeTrimmed, cliente: cliente.trim() }),
            });
            if (!r.ok) {
                const data = await r.json().catch(() => ({}));
                throw new Error(data.erro || 'Falha ao salvar');
            }
            notify.success('Obra atualizada');
            onSaved?.();
            onClose();
        } catch (e) {
            notify.error(e.message || 'Erro ao atualizar obra');
        } finally {
            setSalvando(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !salvando) handleSalvar();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Obra"
            width="small"
            footer={
                <>
                    <button className="m-btn-cancel" onClick={onClose} disabled={salvando}>
                        Cancelar
                    </button>
                    <button className="m-btn-primary" onClick={handleSalvar} disabled={salvando} style={{ background: 'var(--module-obras)' }}>
                        {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                </>
            }
        >
            <div className="m-field">
                <label className="m-label">Nome</label>
                <input
                    className="m-input"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    disabled={salvando}
                    maxLength={150}
                />
            </div>
            <div className="m-field">
                <label className="m-label">
                    Cliente <span className="m-label-opt">(opcional)</span>
                </label>
                <input
                    className="m-input"
                    value={cliente}
                    onChange={e => setCliente(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={salvando}
                    maxLength={150}
                />
            </div>
        </Modal>
    );
}

export default React.memo(EditObraModal);
