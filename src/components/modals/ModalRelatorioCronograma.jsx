import React, { useState } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const ModalRelatorioCronograma = ({ onClose, obras }) => {
    const [obraSelecionada, setObraSelecionada] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGerarRelatorio = async () => {
        if (!obraSelecionada) {
            notify.warning('Por favor, selecione uma obra primeiro.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraSelecionada.id}/relatorio-cronograma-pdf`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Erro ao gerar relatório do cronograma.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Cronograma_${obraSelecionada.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notify.success('Relatório gerado com sucesso!');
            onClose();
        } catch (err) {
            logger.error("Erro ao gerar relatório:", err);
            setError(err.message || "Não foi possível gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <h2>📊 Relatório do Cronograma Financeiro</h2>

                {error && (
                    <div style={{
                        padding: '10px',
                        marginBottom: '15px',
                        backgroundColor: '#ffebee',
                        border: '1px solid #ef5350',
                        borderRadius: '5px',
                        color: '#c62828'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <p style={{ marginBottom: '10px', color: '#666' }}>
                        Selecione a obra para gerar o relatório do cronograma financeiro:
                    </p>

                    <div style={{
                        display: 'grid',
                        gap: '10px',
                        maxHeight: '400px',
                        overflowY: 'scroll',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                    }}
                    className="hide-scrollbar modal-lista-obras">
                        {obras.map(obra => (
                            <div
                                key={obra.id}
                                onClick={() => setObraSelecionada(obra)}
                                style={{
                                    padding: '15px',
                                    border: obraSelecionada?.id === obra.id
                                        ? '2px solid var(--cor-primaria)'
                                        : '1px solid #ddd',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: obraSelecionada?.id === obra.id
                                        ? '#e3f2fd'
                                        : 'white',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (obraSelecionada?.id !== obra.id) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0' }}>{obra.nome}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                                            Cliente: {obra.cliente || 'N/A'}
                                        </p>
                                    </div>
                                    {obraSelecionada?.id === obra.id && (
                                        <span style={{
                                            fontSize: '1.5em',
                                            color: 'var(--cor-primaria)'
                                        }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="voltar-btn"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGerarRelatorio}
                        className="submit-btn"
                        disabled={isLoading || !obraSelecionada}
                        style={{
                            opacity: (!obraSelecionada || isLoading) ? 0.6 : 1
                        }}
                    >
                        {isLoading ? '⏳ Gerando...' : '📄 Gerar Relatório PDF'}
                    </button>
                </div>

                {obraSelecionada && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '5px',
                        fontSize: '0.9em',
                        color: '#2e7d32'
                    }}>
                        ✓ Obra selecionada: <strong>{obraSelecionada.nome}</strong>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ModalRelatorioCronograma;
