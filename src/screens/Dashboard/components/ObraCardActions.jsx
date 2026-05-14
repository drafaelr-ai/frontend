import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../../../auth/fetchWithAuth';
import { API_URL } from '../../../config';
import { confirmDialog, notify } from '../../../utils/notify';
import EditObraModal from '../../../components/modals/EditObraModal';

export default function ObraCardActions({ obraId, obraName, obraCliente, obraArquivada, onNavigate, onDeleted, onArchived, onUnarchived, onEdited }) {
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    async function handleUnarchive(e) {
        e.stopPropagation();
        setOpen(false);
        const ok = await confirmDialog(
            'A obra voltará para a lista de obras ativas.',
            { title: `Desarquivar "${obraName}"?`, confirmText: 'Desarquivar', danger: false }
        );
        if (!ok) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/obras/${obraId}/desarquivar`, { method: 'PATCH' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.erro || 'Falha ao desarquivar obra');
            }
            notify.success(`"${obraName}" desarquivada`);
            onUnarchived?.();
        } catch (err) {
            notify.error(err.message);
        }
    }

    async function handleArchive(e) {
        e.stopPropagation();
        setOpen(false);
        const ok = await confirmDialog(
            'A obra será movida para arquivadas. Você pode desarquivá-la depois.',
            { title: `Arquivar "${obraName}"?`, confirmText: 'Arquivar', danger: false }
        );
        if (!ok) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/obras/${obraId}/arquivar`, { method: 'PATCH' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.erro || 'Falha ao arquivar obra');
            }
            notify.success(`"${obraName}" arquivada`);
            onArchived?.();
        } catch (err) {
            notify.error(err.message);
        }
    }

    async function handleDelete(e) {
        e.stopPropagation();
        setOpen(false);
        const ok = await confirmDialog(
            'Esta ação é irreversível. Todos os dados da obra serão removidos.',
            { title: `Apagar "${obraName}"?`, confirmText: 'Apagar', danger: true }
        );
        if (!ok) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/obras/${obraId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao apagar obra');
            notify.success('Obra apagada com sucesso');
            onDeleted();
        } catch (err) {
            notify.error(err.message);
        }
    }

    return (
        <>
        <div ref={ref} className="db-obra-menu" onClick={e => e.stopPropagation()}>
            <button
                className="db-obra-menu-btn"
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                aria-label="Ações da obra"
                title="Ações"
            >
                <i className="ti ti-dots-vertical" aria-hidden="true" />
            </button>
            {open && (
                <div className="db-obra-menu-dropdown">
                    <button
                        className="db-obra-menu-item"
                        onClick={e => { e.stopPropagation(); setOpen(false); onNavigate(); }}
                    >
                        <i className="ti ti-external-link" aria-hidden="true" />
                        Ver detalhes
                    </button>
                    <button
                        className="db-obra-menu-item"
                        onClick={e => { e.stopPropagation(); setOpen(false); setEditOpen(true); }}
                    >
                        <i className="ti ti-edit" aria-hidden="true" />
                        Editar
                    </button>
                    {obraArquivada ? (
                        <button className="db-obra-menu-item" onClick={handleUnarchive}>
                            <i className="ti ti-archive-off" aria-hidden="true" />
                            Desarquivar
                        </button>
                    ) : (
                        <button className="db-obra-menu-item" onClick={handleArchive}>
                            <i className="ti ti-archive" aria-hidden="true" />
                            Arquivar
                        </button>
                    )}
                    <div className="db-obra-menu-divider" />
                    <button className="db-obra-menu-item db-obra-menu-item-danger" onClick={handleDelete}>
                        <i className="ti ti-trash" aria-hidden="true" />
                        Apagar
                    </button>
                </div>
            )}
        </div>
        <EditObraModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            obraId={obraId}
            obraName={obraName}
            obraCliente={obraCliente}
            onSaved={() => onEdited?.()}
        />
        </>
    );
}
