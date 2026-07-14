import React, { useState } from 'react';
import Modal from '../Modal/Modal';
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Anexar Nota Fiscal"
            subtitle={`${item.descricao}${item.fornecedor ? ` · ${item.fornecedor}` : ''}`}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isUploading}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-upload-nota-fiscal" className="m-btn-primary" disabled={isUploading} style={{ background: 'var(--module-obras)' }}>
                        <i className="ti ti-upload" aria-hidden="true"></i>
                        {isUploading ? 'Enviando...' : 'Anexar Nota Fiscal'}
                    </button>
                </>
            }
        >
            <form id="form-upload-nota-fiscal" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Selecione o arquivo <span className="m-label-opt">(PDF ou Imagem, máx. 10 MB)</span></label>
                    <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
                    />
                    {file && (
                        <p style={{ marginTop: 'var(--space-1)', color: 'var(--status-success-text)', fontSize: 'var(--text-sm)' }}>
                            <i className="ti ti-check" aria-hidden="true"></i>
                            {' '}Arquivo selecionado: {file.name}
                        </p>
                    )}
                </div>
                {error && (
                    <p style={{ color: 'var(--status-danger-text)', textAlign: 'center', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
};

export default React.memo(UploadNotaFiscalModal);
