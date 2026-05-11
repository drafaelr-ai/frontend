import React, { useState } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

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

            const formatVal = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const linhas = [];
            linhas.push(`📋 *RELATÓRIO DE OBRA - OBRALY*`);
            linhas.push(`🏗️ Obra: *${obraNome}*`);
            linhas.push(`📅 Data: ${new Date().toLocaleDateString('pt-BR')}`);
            linhas.push(`─────────────────────────`);
            linhas.push(`\n💰 *FINANCEIRO*`);
            linhas.push(`📊 Orçamento Total: ${formatVal(sumarios?.orcamento_total)}`);
            linhas.push(`✅ Valores Pagos: ${formatVal(sumarios?.valores_pagos)}`);
            if (caixa) {
                linhas.push(`📈 Entradas (mês): ${formatVal(caixa.total_entradas_mes)}`);
                linhas.push(`📉 Saídas (mês): ${formatVal(caixa.total_saidas_mes)}`);
                linhas.push(`💵 Saldo Atual: ${formatVal(caixa.saldo_atual)}`);
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
        <Modal onClose={onClose} customWidth="500px">
            <h2>📊 Relatórios da Obra</h2>
            <p style={{ marginBottom: '25px', color: 'var(--cor-texto-secundario)' }}>
                Selecione o tipo de relatório que deseja gerar:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button
                    onClick={handleDownloadRelatorioFinanceiro}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid #e91e63',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'financeiro' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = '#fce4ec';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📊</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: '#e91e63' }}>
                                {isDownloading && downloadType === 'financeiro' ? 'Gerando...' : 'Relatório Financeiro'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Cronograma com pagamentos futuros, parcelados e previsões
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleDownloadNotasFiscais}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-primaria)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'notas' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📎</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-primaria)' }}>
                                {isDownloading && downloadType === 'notas' ? 'Preparando...' : 'Baixar Notas Fiscais'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Exporta todas as notas fiscais em um arquivo ZIP
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={handleDownloadResumoObra}
                    disabled={isDownloading}
                    style={{
                        padding: '20px',
                        border: '2px solid var(--cor-acento)',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading && downloadType !== 'resumo' ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>📄</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: 'var(--cor-acento)' }}>
                                {isDownloading && downloadType === 'resumo' ? 'Gerando...' : 'Resumo Completo da Obra'}
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
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
                        padding: '20px',
                        border: '2px solid #17a2b8',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        opacity: isDownloading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.background = 'var(--cor-fundo)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '2em' }}>💰</span>
                        <div>
                            <strong style={{ fontSize: '1.1em', color: '#17a2b8' }}>
                                Orçamentos
                            </strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--cor-texto-secundario)' }}>
                                Visualize todos os orçamentos com status e anexos
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {error && (
                <p style={{ color: 'var(--cor-vermelho)', textAlign: 'center', marginTop: '15px' }}>
                    {error}
                </p>
            )}

            {/* Botão compartilhar WhatsApp */}
            <div style={{ marginTop: '20px' }}>
                <button
                    type="button"
                    onClick={handleCompartilharWhatsApp}
                    disabled={isSharingWhatsApp}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: '#25D366',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: isSharingWhatsApp ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isSharingWhatsApp ? 0.7 : 1
                    }}
                >
                    {isSharingWhatsApp ? '⏳ Gerando...' : '💬 Compartilhar via WhatsApp'}
                </button>
            </div>

            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button onClick={onClose} className="cancel-btn" disabled={isDownloading}>
                    Fechar
                </button>
            </div>
        </Modal>
    );
};

export default RelatoriosModal;
