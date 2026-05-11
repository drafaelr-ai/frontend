import React, { useState } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';

const ExportReportModal = ({ onClose }) => {
    // ... (código inalterado)
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
        <Modal onClose={onClose}>
            <h2>Exportar Relatório Geral de Pendências</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}>
                <div className="form-group">
                    <label>Filtrar por Prioridade</label>
                    <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} required>
                        <option value="todas">Todas as Pendências</option>
                        <option value="5">Prioridade 5 (Urgente)</option>
                        <option value="4">Prioridade 4</option>
                        <option value="3">Prioridade 3 (Média)</option>
                        <option value="2">Prioridade 2</option>
                        <option value="1">Prioridade 1</option>
                        <option value="0">Prioridade 0 (Nenhuma)</option>
                    </select>
                </div>

                <div className="form-actions" style={{ marginTop: '30px' }}>
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>Cancelar</button>
                    <button type="submit" className="submit-btn pdf" disabled={isLoading}>
                        {isLoading ? 'Gerando...' : 'Gerar PDF'}
                    </button>
                </div>
                {error && <p style={{color: 'red', textAlign: 'center', marginTop: '10px'}}>{error}</p>}
            </form>
        </Modal>
    );
};

export default ExportReportModal;
