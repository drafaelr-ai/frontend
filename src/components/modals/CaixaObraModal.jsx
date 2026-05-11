import React, { useState, useEffect } from 'react';
import Modal from './Modal';
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

            notify.success('✅ Movimentação apagada com sucesso!');
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

            notify.success('✅ Comprovante atualizado com sucesso!');
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
            <Modal customWidth="1200px">
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    Carregando...
                </div>
            </Modal>
        );
    }

    return (
        <Modal customWidth="1200px">
            <div style={{ padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Cabeçalho */}
                <h2 style={{ fontSize: '2em', marginBottom: '10px' }}>💰 Caixa de Obra</h2>
                <p style={{ color: '#666', marginBottom: '30px', fontSize: '1.1em' }}>
                    <strong>{obraNome}</strong>
                </p>

                {/* Dashboard do Caixa */}
                {caixa && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Saldo Atual</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {formatCurrency(caixa.saldo_atual)}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Entradas (mês)</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                {formatCurrency(caixa.total_entradas_mes || 0)}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            padding: '25px',
                            borderRadius: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.9em', marginBottom: '10px' }}>Saídas (mês)</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
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
                    marginBottom: '25px',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '1.1em' }}>Período:</label>
                        <select
                            value={mesAno.mes}
                            onChange={e => setMesAno({ ...mesAno, mes: parseInt(e.target.value) })}
                            style={{ padding: '10px', fontSize: '1em', borderRadius: '5px' }}
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
                            style={{ padding: '10px', fontSize: '1em', borderRadius: '5px', width: '100px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleNovaMovimentacao}
                            className="submit-btn"
                            style={{ padding: '12px 24px', fontSize: '1.1em' }}
                        >
                            + Nova Movimentação
                        </button>
                        <button
                            onClick={handleGerarRelatorio}
                            className="submit-btn"
                            style={{ padding: '12px 24px', fontSize: '1.1em', backgroundColor: '#ff9800' }}
                        >
                            📊 Gerar Relatório PDF
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setFiltroTipo('')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === '' ? '2px solid #4CAF50' : '1px solid #ccc',
                            backgroundColor: filtroTipo === '' ? '#e8f5e9' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFiltroTipo('Entrada')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === 'Entrada' ? '2px solid #2196F3' : '1px solid #ccc',
                            backgroundColor: filtroTipo === 'Entrada' ? '#e3f2fd' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        📥 Entradas
                    </button>
                    <button
                        onClick={() => setFiltroTipo('Saída')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: filtroTipo === 'Saída' ? '2px solid #f44336' : '1px solid #ccc',
                            backgroundColor: filtroTipo === 'Saída' ? '#ffebee' : 'white',
                            cursor: 'pointer'
                        }}
                    >
                        📤 Saídas
                    </button>
                </div>

                {/* Lista de Movimentações */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '1.3em' }}>Movimentações</h3>
                    {movimentacoesFiltradas.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            Nenhuma movimentação registrada neste período
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {movimentacoesFiltradas.map(mov => (
                                <div
                                    key={mov.id}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        backgroundColor: mov.tipo === 'Entrada' ? '#e3f2fd' : '#ffebee'
                                    }}
                                >
                                    {/* Header: Ícone, Data, Anexo e Valor */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '10px',
                                        flexWrap: 'wrap',
                                        gap: '5px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.3em' }}>
                                                {mov.tipo === 'Entrada' ? '📥' : '📤'}
                                            </span>
                                            <span style={{ fontSize: '0.85em', color: '#666' }}>
                                                {new Date(mov.data).toLocaleString('pt-BR')}
                                            </span>
                                            {mov.comprovante_url && (
                                                <span style={{ fontSize: '1em' }}>📎</span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '1.4em',
                                            fontWeight: 'bold',
                                            color: mov.tipo === 'Entrada' ? '#2196F3' : '#f44336',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {mov.tipo === 'Entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                                        </div>
                                    </div>

                                    {/* Descrição */}
                                    <div style={{
                                        fontSize: '1.05em',
                                        fontWeight: '600',
                                        color: '#333'
                                    }}>
                                        {mov.descricao}
                                    </div>

                                    {/* Observações */}
                                    {mov.observacoes && (
                                        <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic', marginTop: '5px' }}>
                                            Obs: {mov.observacoes}
                                        </div>
                                    )}

                                    {/* Botão para reanexar comprovante e Apagar */}
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <label
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '5px 10px',
                                                    backgroundColor: mov.comprovante_url?.startsWith('data:image') ? '#4CAF50' : '#ff9800',
                                                    color: 'white',
                                                    borderRadius: '5px',
                                                    fontSize: '0.85em',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                {mov.comprovante_url?.startsWith('data:image') ? '✅ Comprovante OK' : '📎 Anexar/Reanexar'}
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
                                                <span style={{ fontSize: '0.75em', color: '#999' }}>
                                                    ⚠️ Precisa reanexar
                                                </span>
                                            )}
                                        </div>

                                        {/* Botão Apagar */}
                                        <button
                                            onClick={() => handleDeletarMovimentacao(mov.id, mov.descricao)}
                                            disabled={deletandoId === mov.id}
                                            style={{
                                                padding: '5px 12px',
                                                backgroundColor: deletandoId === mov.id ? '#ccc' : '#dc2626',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                fontSize: '0.85em',
                                                cursor: deletandoId === mov.id ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            {deletandoId === mov.id ? '⏳ Apagando...' : '🗑️ Apagar'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <button onClick={onClose} className="voltar-btn" style={{ padding: '12px 24px', fontSize: '1.1em' }}>
                        Fechar
                    </button>
                </div>
            </div>

            {/* Modal de Nova Movimentação */}
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
