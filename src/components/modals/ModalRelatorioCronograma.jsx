import React, { useState } from 'react';
import Modal from '../Modal/Modal';
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Relatório do Cronograma Financeiro"
            width="large"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="m-btn-primary"
                        onClick={handleGerarRelatorio}
                        disabled={isLoading || !obraSelecionada}
                    >
                        <i className="ti ti-file-type-pdf" aria-hidden="true"></i>
                        {isLoading ? 'Gerando...' : 'Gerar Relatório PDF'}
                    </button>
                </>
            }
        >
            {error && (
                <div style={{
                    padding: 'var(--space-2) var(--space-3)',
                    marginBottom: 'var(--space-4)',
                    background: 'var(--status-danger-bg)',
                    border: '0.5px solid var(--status-danger)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--status-danger-text)',
                    fontSize: 'var(--text-sm)',
                }}>
                    {error}
                </div>
            )}

            <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Selecione a obra para gerar o relatório do cronograma financeiro:
            </p>

            <div style={{
                display: 'grid',
                gap: 'var(--space-2)',
                maxHeight: '400px',
                overflowY: 'auto',
                border: '0.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
            }}>
                {obras.map(obra => (
                    <div
                        key={obra.id}
                        onClick={() => setObraSelecionada(obra)}
                        style={{
                            padding: 'var(--space-3)',
                            border: obraSelecionada?.id === obra.id
                                ? `2px solid var(--brand-primary)`
                                : '0.5px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            background: obraSelecionada?.id === obra.id
                                ? 'var(--status-info-bg)'
                                : 'var(--surface-card)',
                            transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                            if (obraSelecionada?.id !== obra.id) {
                                e.currentTarget.style.background = 'var(--surface-muted)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = obraSelecionada?.id === obra.id
                                ? 'var(--status-info-bg)'
                                : 'var(--surface-card)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-base)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                                    {obra.nome}
                                </h4>
                                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                    Cliente: {obra.cliente || 'N/A'}
                                </p>
                            </div>
                            {obraSelecionada?.id === obra.id && (
                                <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--brand-primary)', fontSize: '18px' }}></i>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {obraSelecionada && (
                <div style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--status-success-bg)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--status-success-text)',
                }}>
                    <i className="ti ti-check" aria-hidden="true"></i>
                    {' '}Obra selecionada: <strong>{obraSelecionada.nome}</strong>
                </div>
            )}
        </Modal>
    );
};

export default React.memo(ModalRelatorioCronograma);
