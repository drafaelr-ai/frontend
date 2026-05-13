import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';

const ExportReportModal = ({ onClose }) => {
    const [selectedPriority, setSelectedPriority] = useState('todas');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = () => {
        setIsLoading(true);
        setError(null);

        const url = `${API_URL}/export/pdf_pendentes_todas_obras?prioridade=${selectedPriority}`;

        fetchWithAuth(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Falha ao gerar o relatório.');
                }
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL);
                setIsLoading(false);
                onClose();
            })
            .catch(err => {
                logger.error("Erro ao gerar PDF:", err);
                setError(err.message || "Não foi possível gerar o PDF.");
                setIsLoading(false);
            });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Exportar Relatório Geral de Pendências"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" form="form-export-report" className="m-btn-primary" disabled={isLoading}>
                        <i className="ti ti-file-type-pdf" aria-hidden="true"></i>
                        {isLoading ? 'Gerando...' : 'Gerar PDF'}
                    </button>
                </>
            }
        >
            <form id="form-export-report" onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
                <div className="m-field">
                    <label className="m-label">Filtrar por Prioridade</label>
                    <select
                        className="m-select"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        required
                    >
                        <option value="todas">Todas as Pendências</option>
                        <option value="5">Prioridade 5 (Urgente)</option>
                        <option value="4">Prioridade 4</option>
                        <option value="3">Prioridade 3 (Média)</option>
                        <option value="2">Prioridade 2</option>
                        <option value="1">Prioridade 1</option>
                        <option value="0">Prioridade 0 (Nenhuma)</option>
                    </select>
                </div>
                {error && (
                    <p style={{ color: 'var(--status-danger-text)', textAlign: 'center', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
};

export default ExportReportModal;
