import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';

const RelatoriosModal = ({ onClose, obraId, obraNome, sumarios }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadType, setDownloadType] = useState(null);
    const [error, setError] = useState(null);
    const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);

    const handleCompartilharWhatsApp = async () => {
        if (isSharingWhatsApp) return;
        setIsSharingWhatsApp(true);
        try {
            const resCaixa = await fetchWithAuth(`${API_URL}/obras/${obraId}/caixa`);
            const caixa = resCaixa.ok ? await resCaixa.json() : null;

            const linhas = [];
            linhas.push(`📋 *RELATÓRIO DE OBRA - OBRALY*`);
            linhas.push(`🏗️ Obra: *${obraNome}*`);
            linhas.push(`📅 Data: ${new Date().toLocaleDateString('pt-BR')}`);
            linhas.push(`─────────────────────────`);
            linhas.push(`\n💰 *FINANCEIRO*`);
            linhas.push(`📊 Orçamento Total: ${formatCurrency(sumarios?.orcamento_total || 0)}`);
            linhas.push(`✅ Valores Pagos: ${formatCurrency(sumarios?.valores_pagos || 0)}`);
            if (caixa) {
                linhas.push(`📈 Entradas (mês): ${formatCurrency(caixa.total_entradas_mes || 0)}`);
                linhas.push(`📉 Saídas (mês): ${formatCurrency(caixa.total_saidas_mes || 0)}`);
                linhas.push(`💵 Saldo Atual: ${formatCurrency(caixa.saldo_atual || 0)}`);
            }
            linhas.push(`\n_Gerado pelo Obraly_`);

            const url = `https://wa.me/?text=${encodeURIComponent(linhas.join('\n'))}`;
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            logger.error('Erro ao gerar mensagem WhatsApp:', err);
            notify.error('Erro ao gerar mensagem do WhatsApp. Tente novamente.');
        } finally {
            setIsSharingWhatsApp(false);
        }
    };

    const handleDownloadRelatorioFinanceiro = () => {
        setIsDownloading(true);
        setDownloadType('financeiro');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/relatorio-cronograma-pdf`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao gerar relatório financeiro'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Cronograma_Financeiro_${obraNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                logger.error("Erro ao baixar relatório financeiro:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    const handleDownloadNotasFiscais = () => {
        setIsDownloading(true);
        setDownloadType('notas');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais/export/zip`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao baixar notas fiscais'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notas_fiscais_${obraNome}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => {
                logger.error("Erro ao baixar notas fiscais:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    const handleDownloadResumoObra = () => {
        setIsDownloading(true);
        setDownloadType('resumo');
        setError(null);

        fetchWithAuth(`${API_URL}/obras/${obraId}/relatorio/resumo-completo`)
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.erro || 'Erro ao gerar relatório'); });
                }
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');

                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 1000);
            })
            .catch(err => {
                logger.error("Erro ao gerar relatório:", err);
                setError(err.message);
            })
            .finally(() => {
                setIsDownloading(false);
                setDownloadType(null);
            });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Relatórios da Obra"
            subtitle={obraNome}
            width="default"
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isDownloading}>Fechar</button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <button
                    onClick={handleDownloadRelatorioFinanceiro}
                    disabled={isDownloading}
                    style={{
                        padding: 'var(--space-4)',
                        border: `2px solid var(--status-danger)`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        opacity: isDownloading && downloadType !== 'financeiro' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--status-danger-bg)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-card)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <i className="ti ti-chart-bar" aria-hidden="true" style={{ fontSize: 'var(--text-2xl)', color: 'var(--status-danger)' }}></i>
                        <div>
                            <strong style={{ fontSize: 'var(--text-base)', color: 'var(--status-danger)' }}>
                                {isDownloading && downloadType === 'financeiro' ? 'Gerando...' : 'Relatório Financeiro'}
                            </strong>
                            <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                Cronograma com pagamentos futuros, parcelados e previsões
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleDownloadNotasFiscais}
                    disabled={isDownloading}
                    style={{
                        padding: 'var(--space-4)',
                        border: `2px solid var(--brand-primary)`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        opacity: isDownloading && downloadType !== 'notas' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--surface-muted)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-card)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <i className="ti ti-paperclip" aria-hidden="true" style={{ fontSize: 'var(--text-2xl)', color: 'var(--brand-primary)' }}></i>
                        <div>
                            <strong style={{ fontSize: 'var(--text-base)', color: 'var(--brand-primary)' }}>
                                {isDownloading && downloadType === 'notas' ? 'Preparando...' : 'Baixar Notas Fiscais'}
                            </strong>
                            <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                Exporta todas as notas fiscais em um arquivo ZIP
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleDownloadResumoObra}
                    disabled={isDownloading}
                    style={{
                        padding: 'var(--space-4)',
                        border: `2px solid var(--status-success)`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        opacity: isDownloading && downloadType !== 'resumo' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--surface-muted)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-card)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <i className="ti ti-file-description" aria-hidden="true" style={{ fontSize: 'var(--text-2xl)', color: 'var(--status-success-text)' }}></i>
                        <div>
                            <strong style={{ fontSize: 'var(--text-base)', color: 'var(--status-success-text)' }}>
                                {isDownloading && downloadType === 'resumo' ? 'Gerando...' : 'Resumo Completo da Obra'}
                            </strong>
                            <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                PDF com serviços, valores, pendências, orçamentos e gráficos
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => {
                        onClose();
                        if (window.abrirModalOrcamentos) {
                            window.abrirModalOrcamentos();
                        }
                    }}
                    disabled={isDownloading}
                    style={{
                        padding: 'var(--space-4)',
                        border: `2px solid var(--status-info)`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                        opacity: isDownloading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--surface-muted)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-card)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <i className="ti ti-cash" aria-hidden="true" style={{ fontSize: 'var(--text-2xl)', color: 'var(--status-info)' }}></i>
                        <div>
                            <strong style={{ fontSize: 'var(--text-base)', color: 'var(--status-info)' }}>
                                Orçamentos
                            </strong>
                            <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                Visualize todos os orçamentos com status e anexos
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {error && (
                <p style={{ color: 'var(--status-danger)', textAlign: 'center', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                    {error}
                </p>
            )}

            <div style={{ marginTop: 'var(--space-4)' }}>
                <button
                    type="button"
                    onClick={handleCompartilharWhatsApp}
                    disabled={isSharingWhatsApp}
                    className="m-btn-primary"
                    style={{ width: '100%' }}
                >
                    <i className="ti ti-brand-whatsapp" aria-hidden="true"></i>
                    {isSharingWhatsApp ? 'Gerando...' : 'Compartilhar via WhatsApp'}
                </button>
            </div>
        </Modal>
    );
};

export default React.memo(RelatoriosModal);
