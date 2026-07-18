import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';

const VisualizarNotaFiscalModal = ({ onClose, nota, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [fileUrl, setFileUrl] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        let objectUrl = null;
        let cancelado = false;

        fetchWithAuth(`${API_URL}/notas-fiscais/${nota.id}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar nota fiscal');
                return res.blob();
            })
            .then(blob => {
                objectUrl = URL.createObjectURL(blob);
                if (!cancelado) setFileUrl(objectUrl);
            })
            .catch(err => {
                logger.error('Erro ao carregar arquivo da nota fiscal:', err);
                notify.error('Erro ao carregar o arquivo da nota fiscal');
            });

        return () => {
            cancelado = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [nota.id]);

    const handleDelete = async () => {
        if (!await confirmDialog('Tem certeza que deseja excluir esta nota fiscal?', { danger: true, confirmText: 'Excluir' })) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetchWithAuth(`${API_URL}/notas-fiscais/${nota.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir nota fiscal');
            }

            onDelete();
            onClose();
        } catch (error) {
            logger.error('Erro ao excluir nota fiscal:', error);
            notify.error('Erro ao excluir nota fiscal');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = () => {
        if (!fileUrl) return;
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = nota.filename || 'nota-fiscal';
        a.click();
    };

    const isPDF = nota.mimetype === 'application/pdf';
    const isImage = nota.mimetype?.startsWith('image/');
    const canDelete = user.role === 'administrador' || user.role === 'master';

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Nota Fiscal"
            subtitle={nota.filename}
            width="xlarge"
            scrollBody={true}
            footer={
                <>
                    {canDelete && (
                        <button
                            type="button"
                            className="m-btn-primary m-btn-primary--danger"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <i className="ti ti-trash" aria-hidden="true"></i>
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </button>
                    )}
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
                    <button type="button" className="m-btn-primary" onClick={handleDownload} disabled={!fileUrl} style={{ background: 'var(--module-obras)' }}>
                        <i className="ti ti-download" aria-hidden="true"></i>
                        Baixar
                    </button>
                </>
            }
        >
            <dl className="m-view-dl" style={{ marginBottom: 'var(--space-4)' }}>
                <dt className="m-view-dt">Arquivo</dt>
                <dd className="m-view-dd">{nota.filename}</dd>
                <dt className="m-view-dt">Tipo</dt>
                <dd className="m-view-dd">{nota.mimetype}</dd>
            </dl>

            <div style={{
                border: '0.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
            }}>
                {(isPDF || isImage) && !fileUrl && (
                    <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Carregando arquivo...</p>
                    </div>
                )}
                {isPDF && fileUrl && (
                    <iframe
                        src={fileUrl}
                        style={{ width: '100%', height: '500px', border: 'none' }}
                        title="Nota Fiscal PDF"
                    />
                )}
                {isImage && fileUrl && (
                    <img
                        src={fileUrl}
                        alt="Nota Fiscal"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                )}
                {!isPDF && !isImage && (
                    <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Pré-visualização não disponível para este tipo de arquivo.</p>
                        <p>Clique em "Baixar" para visualizar o arquivo.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default React.memo(VisualizarNotaFiscalModal);
