import React, { useState } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';

const UploadNotaFiscalModal = ({ item, obraId, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Validar tipo de arquivo (PDF, imagens)
            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Tipo de arquivo inválido. Apenas PDF e imagens são permitidos.');
                return;
            }
            // Validar tamanho (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('Arquivo muito grande. Tamanho máximo: 10MB');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, selecione um arquivo');
            return;
        }

        setIsUploading(true);
        setError(null);

        // <-- CORREÇÃO: Pegar o ID correto baseado no tipo de registro
        const realItemId = item.tipo_registro === 'lancamento'
            ? item.lancamento_id
            : item.pagamento_id;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', realItemId);
        formData.append('item_type', item.tipo_registro);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`, {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.erro || 'Erro ao fazer upload'); });
            }
            return res.json();
        })
        .then(() => {
            onSuccess();
            onClose();
        })
        .catch(err => {
            logger.error("Erro ao fazer upload:", err);
            setError(err.message);
        })
        .finally(() => {
            setIsUploading(false);
        });
    };

    return (
        <Modal onClose={onClose}>
            <h2>Anexar Nota Fiscal</h2>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                <strong>Item:</strong> {item.descricao}<br />
                <strong>Fornecedor:</strong> {item.fornecedor || 'N/A'}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Selecione o arquivo (PDF ou Imagem)</label>
                    <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    {file && (
                        <p style={{ marginTop: '5px', color: 'var(--cor-acento)', fontSize: '0.9em' }}>
                            ✓ Arquivo selecionado: {file.name}
                        </p>
                    )}
                </div>

                {error && <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center' }}>{error}</p>}

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isUploading}>
                        Cancelar
                    </button>
                    <button type="submit" className="submit-btn" disabled={isUploading}>
                        {isUploading ? 'Enviando...' : 'Anexar Nota Fiscal'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UploadNotaFiscalModal;
