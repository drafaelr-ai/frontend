import React, { useState } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';

const VisualizarNotaFiscalModal = ({ onClose, nota, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useAuth();

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
        window.open(`${API_URL}/notas-fiscais/${nota.id}`, '_blank');
    };

    const isPDF = nota.mimetype === 'application/pdf';
    const isImage = nota.mimetype?.startsWith('image/');

    return (
        <Modal onClose={onClose} customWidth="800px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>📄 Nota Fiscal</h2>
                {(user.role === 'administrador' || user.role === 'master') && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                            background: 'var(--cor-vermelho)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                        }}
                    >
                        {isDeleting ? 'Excluindo...' : '🗑️ Excluir'}
                    </button>
                )}
            </div>

            <div style={{
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <p style={{ margin: '5px 0' }}>
                    <strong>Arquivo:</strong> {nota.filename}
                </p>
                <p style={{ margin: '5px 0' }}>
                    <strong>Tipo:</strong> {nota.mimetype}
                </p>
            </div>

            <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '20px',
                maxHeight: '500px',
                overflowY: 'auto'
            }}>
                {isPDF && (
                    <iframe
                        src={`${API_URL}/notas-fiscais/${nota.id}`}
                        style={{
                            width: '100%',
                            height: '500px',
                            border: 'none'
                        }}
                        title="Nota Fiscal PDF"
                    />
                )}

                {isImage && (
                    <img
                        src={`${API_URL}/notas-fiscais/${nota.id}`}
                        alt="Nota Fiscal"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block'
                        }}
                    />
                )}

                {!isPDF && !isImage && (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#666'
                    }}>
                        <p>Pré-visualização não disponível para este tipo de arquivo.</p>
                        <p>Clique em "Baixar" para visualizar o arquivo.</p>
                    </div>
                )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="cancel-btn">
                    Fechar
                </button>
                <button
                    onClick={handleDownload}
                    className="submit-btn"
                    style={{ background: 'var(--cor-acento)' }}
                >
                    📥 Baixar
                </button>
            </div>
        </Modal>
    );
};

export default VisualizarNotaFiscalModal;
