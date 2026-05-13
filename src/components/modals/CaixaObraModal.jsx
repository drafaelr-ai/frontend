import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';
import ModalNovaMovimentacaoCaixa from './ModalNovaMovimentacaoCaixa';

const CaixaObraModal = ({ obraId, obraNome, onClose }) => {
    const [caixa, setCaixa] = useState(null);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [mesAno, setMesAno] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    const [filtroTipo, setFiltroTipo] = useState('');
    const [reanexandoId, setReanexandoId] = useState(null);
    const [deletandoId, setDeletandoId] = useState(null);

    const handleDeletarMovimentacao = async (movId, descricao) => {
        if (!await confirmDialog(`Tem certeza que deseja apagar a movimentação "${descricao}"? Essa ação não pode ser desfeita e o saldo será ajustado automaticamente.`, { danger: true, confirmText: 'Apagar' })) {
            return;
        }

        try {
            setDeletandoId(movId);

            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes/${movId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.erro || 'Erro ao deletar movimentação');
            }

            notify.success('Movimentação apagada com sucesso!');
            carregarDados();
        } catch (err) {
            logger.error('Erro ao deletar movimentação:', err);
            notify.error('Erro ao apagar movimentação: ' + err.message);
        } finally {
            setDeletandoId(null);
        }
    };

    const handleReanexarComprovante = async (movId, file) => {
        if (!file) return;

        try {
            // Inline image compression — candidate for utils/imageCompression.js in fase-6
            const compressImage = (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 1200;
                            const MAX_HEIGHT = 1200;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            };

            const base64 = await compressImage(file);

            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes/${movId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ comprovante_url: base64 })
                }
            );

            if (!response.ok) throw new Error('Erro ao atualizar comprovante');

            notify.success('Comprovante atualizado com sucesso!');
            carregarDados();
        } catch (err) {
            logger.error('Erro ao reanexar comprovante:', err);
            notify.error('Erro ao atualizar comprovante');
        } finally {
            setReanexandoId(null);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [obraId, mesAno]);

    const carregarDados = async () => {
        try {
            setIsLoading(true);

            const resCaixa = await fetchWithAuth(`${API_URL}/obras/${obraId}/caixa`);
            if (!resCaixa.ok) throw new Error('Erro ao carregar caixa');
            const dataCaixa = await resCaixa.json();
            setCaixa(dataCaixa);

            const resMovs = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes?mes=${mesAno.mes}&ano=${mesAno.ano}`
            );
            if (!resMovs.ok) throw new Error('Erro ao carregar movimentações');
            const dataMovs = await resMovs.json();
            setMovimentacoes(dataMovs);
        } catch (err) {
            logger.error('Erro ao carregar dados do caixa:', err);
            notify.error('Erro ao carregar dados do caixa');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNovaMovimentacao = () => {
        setModalAberto(true);
    };

    const handleGerarRelatorio = async () => {
        try {
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/relatorio-pdf`,
                {
                    method: 'POST',
                    body: JSON.stringify({ mes: mesAno.mes, ano: mesAno.ano })
                }
            );

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    logger.error('Erro do servidor:', errorData);
                    throw new Error(errorData.mensagem || errorData.erro || 'Erro ao gerar relatório');
                } catch (jsonErr) {
                    throw new Error('Erro ao gerar relatório');
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Caixa_${obraNome}_${mesAno.mes}_${mesAno.ano}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            logger.error('Erro ao gerar relatório:', err);
            notify.error('Erro ao gerar relatório PDF: ' + err.message);
        }
    };

    const movimentacoesFiltradas = filtroTipo
        ? movimentacoes.filter(m => m.tipo === filtroTipo)
        : movimentacoes;

    if (isLoading) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Caixa de Obra" subtitle={obraNome} width="xlarge">
                <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Carregando...
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Caixa de Obra"
            subtitle={obraNome}
            width="xlarge"
            scrollBody={true}
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
            }
        >
            {/* Dashboard do Caixa */}
            {caixa && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-5)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--status-success)',
                        color: 'white',
                        padding: 'var(--space-5)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>Saldo Atual</div>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
                            {formatCurrency(caixa.saldo_atual)}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'var(--status-info)',
                        color: 'white',
                        padding: 'var(--space-5)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>Entradas (mês)</div>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
                            {formatCurrency(caixa.total_entradas_mes || 0)}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'var(--status-danger)',
                        color: 'white',
                        padding: 'var(--space-5)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>Saídas (mês)</div>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
                            {formatCurrency(caixa.total_saidas_mes || 0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-5)',
                flexWrap: 'wrap',
                gap: 'var(--space-3)'
            }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <label style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>Período:</label>
                    <select
                        value={mesAno.mes}
                        onChange={e => setMesAno({ ...mesAno, mes: parseInt(e.target.value) })}
                        style={{ padding: 'var(--space-2)', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-default)' }}
                    >
                        <option value={1}>Janeiro</option>
                        <option value={2}>Fevereiro</option>
                        <option value={3}>Março</option>
                        <option value={4}>Abril</option>
                        <option value={5}>Maio</option>
                        <option value={6}>Junho</option>
                        <option value={7}>Julho</option>
                        <option value={8}>Agosto</option>
                        <option value={9}>Setembro</option>
                        <option value={10}>Outubro</option>
                        <option value={11}>Novembro</option>
                        <option value={12}>Dezembro</option>
                    </select>
                    <input
                        type="number"
                        value={mesAno.ano}
                        onChange={e => setMesAno({ ...mesAno, ano: parseInt(e.target.value) })}
                        min="2020"
                        max="2100"
                        style={{ padding: 'var(--space-2)', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-default)', width: '100px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button onClick={handleNovaMovimentacao} className="m-btn-primary">
                        <i className="ti ti-plus" aria-hidden="true"></i>
                        Nova Movimentação
                    </button>
                    <button onClick={handleGerarRelatorio} className="m-btn-primary">
                        <i className="ti ti-file-type-pdf" aria-hidden="true"></i>
                        Gerar Relatório PDF
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                <button
                    onClick={() => setFiltroTipo('')}
                    style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-full)',
                        border: filtroTipo === '' ? `2px solid var(--status-success)` : `0.5px solid var(--border-default)`,
                        backgroundColor: filtroTipo === '' ? 'var(--status-success-bg)' : 'var(--surface-card)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)'
                    }}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFiltroTipo('Entrada')}
                    style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-full)',
                        border: filtroTipo === 'Entrada' ? `2px solid var(--status-info)` : `0.5px solid var(--border-default)`,
                        backgroundColor: filtroTipo === 'Entrada' ? 'var(--status-info-bg)' : 'var(--surface-card)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)'
                    }}
                >
                    Entradas
                </button>
                <button
                    onClick={() => setFiltroTipo('Saída')}
                    style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-full)',
                        border: filtroTipo === 'Saída' ? `2px solid var(--status-danger)` : `0.5px solid var(--border-default)`,
                        backgroundColor: filtroTipo === 'Saída' ? 'var(--status-danger-bg)' : 'var(--surface-card)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)'
                    }}
                >
                    Saídas
                </button>
            </div>

            {/* Lista de Movimentações */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
                <p className="m-section">Movimentações</p>
                {movimentacoesFiltradas.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                        Nenhuma movimentação registrada neste período
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {movimentacoesFiltradas.map(mov => (
                            <div
                                key={mov.id}
                                style={{
                                    border: '0.5px solid var(--border-default)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-3)',
                                    backgroundColor: mov.tipo === 'Entrada' ? 'var(--status-info-bg)' : 'var(--status-danger-bg)'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 'var(--space-2)',
                                    flexWrap: 'wrap',
                                    gap: 'var(--space-1)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <i className={`ti ${mov.tipo === 'Entrada' ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'}`} aria-hidden="true" style={{ fontSize: 'var(--text-xl)', color: mov.tipo === 'Entrada' ? 'var(--status-info)' : 'var(--status-danger)' }}></i>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                            {new Date(mov.data).toLocaleString('pt-BR')}
                                        </span>
                                        {mov.comprovante_url && (
                                            <i className="ti ti-paperclip" aria-hidden="true" style={{ color: 'var(--text-muted)' }}></i>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--text-lg)',
                                        fontWeight: 'var(--weight-bold)',
                                        color: mov.tipo === 'Entrada' ? 'var(--status-info)' : 'var(--status-danger)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {mov.tipo === 'Entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                                    </div>
                                </div>

                                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                                    {mov.descricao}
                                </div>

                                {mov.observacoes && (
                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 'var(--space-1)' }}>
                                        Obs: {mov.observacoes}
                                    </div>
                                )}

                                <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <label
                                            style={{
                                                cursor: 'pointer',
                                                padding: 'var(--space-1) var(--space-2)',
                                                backgroundColor: mov.comprovante_url?.startsWith('data:image') ? 'var(--status-success)' : 'var(--brand-primary)',
                                                color: 'white',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--text-xs)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-1)'
                                            }}
                                        >
                                            {mov.comprovante_url?.startsWith('data:image') ? 'Comprovante OK' : 'Anexar/Reanexar'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files[0]) {
                                                        handleReanexarComprovante(mov.id, e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {mov.comprovante_url && !mov.comprovante_url.startsWith('data:image') && (
                                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                ⚠️ Precisa reanexar
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleDeletarMovimentacao(mov.id, mov.descricao)}
                                        disabled={deletandoId === mov.id}
                                        style={{
                                            padding: 'var(--space-1) var(--space-3)',
                                            backgroundColor: deletandoId === mov.id ? 'var(--border-strong)' : 'var(--status-danger)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--text-xs)',
                                            cursor: deletandoId === mov.id ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)'
                                        }}
                                    >
                                        {deletandoId === mov.id ? 'Apagando...' : 'Apagar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modalAberto && (
                <ModalNovaMovimentacaoCaixa
                    obraId={obraId}
                    onClose={() => setModalAberto(false)}
                    onSave={() => {
                        setModalAberto(false);
                        carregarDados();
                    }}
                />
            )}
        </Modal>
    );
};

export default CaixaObraModal;
