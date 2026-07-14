import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import CadastrarBoletoModal from '../modals/CadastrarBoletoModal';
import GerarSuperlinkModal from '../modals/GerarSuperlinkModal';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';

const GestaoBoletos = ({ obraId, obraNome, onUpdate }) => {
    const [boletos, setBoletos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos'); // todos, Pendente, Pago, Vencido
    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalPreview, setModalPreview] = useState(null);
    const [resumo, setResumo] = useState(null);
    const [showSuperlink, setShowSuperlink] = useState(false);

    // Buscar boletos
    const fetchBoletos = async () => {
        try {
            setLoading(true);
            const url = filtroStatus === 'todos'
                ? `${API_URL}/obras/${obraId}/boletos`
                : `${API_URL}/obras/${obraId}/boletos?status=${filtroStatus}`;

            const response = await fetchWithAuth(url);

            if (response.ok) {
                const data = await response.json();
                setBoletos(data);
            }
        } catch (error) {
            logger.error('Erro ao buscar boletos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Buscar resumo
    const fetchResumo = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos/resumo`);

            if (response.ok) {
                const data = await response.json();
                setResumo(data);
            }
        } catch (error) {
            logger.error('Erro ao buscar resumo:', error);
        }
    };

    // Verificar alertas
    const verificarAlertas = async () => {
        try {
            await fetchWithAuth(`${API_URL}/boletos/verificar-alertas`, { method: 'POST' });
        } catch (error) {
            logger.error('Erro ao verificar alertas:', error);
        }
    };

    useEffect(() => {
        fetchBoletos();
        fetchResumo();
        verificarAlertas();
    }, [obraId, filtroStatus]);

    // Marcar como pago
    const marcarPago = async (boletoId) => {
        if (!await confirmDialog('Confirma que este boleto foi pago?', { confirmText: 'Confirmar pagamento' })) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos/${boletoId}/pagar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_pagamento: new Date().toISOString().split('T')[0] })
            });

            if (response.ok) {
                fetchBoletos();
                fetchResumo();
                if (onUpdate) onUpdate(); // Atualizar tela principal
                notify.success('Boleto marcado como pago!');
            }
        } catch (error) {
            logger.error('Erro ao marcar como pago:', error);
            notify.error('Erro ao marcar como pago');
        }
    };

    // Deletar boleto
    const deletarBoleto = async (boletoId) => {
        if (!await confirmDialog('Tem certeza que deseja excluir este boleto?', { danger: true, confirmText: 'Excluir' })) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos/${boletoId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchBoletos();
                fetchResumo();
            }
        } catch (error) {
            logger.error('Erro ao deletar:', error);
            notify.error('Erro ao excluir boleto');
        }
    };

    // Copiar código de barras
    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        notify.success('Código de barras copiado!');
    };

    // Ver preview do PDF
    const verPreview = async (boletoId) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos/${boletoId}/arquivo`);

            if (response.ok) {
                const data = await response.json();
                setModalPreview(data);
            } else {
                notify.info('Boleto não possui arquivo anexado');
            }
        } catch (error) {
            logger.error('Erro ao buscar arquivo:', error);
        }
    };

    // Agrupar boletos por urgência
    const boletosVencidos = boletos.filter(b => b.status === 'Vencido' || (b.status === 'Pendente' && b.dias_para_vencer < 0));
    const boletosUrgentes = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer >= 0 && b.dias_para_vencer <= 3);
    const boletosProximos = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer > 3 && b.dias_para_vencer <= 7);
    const boletosNormais = boletos.filter(b => b.status === 'Pendente' && b.dias_para_vencer > 7);
    const boletosPagos = boletos.filter(b => b.status === 'Pago');

    // Renderizar card de boleto
    const renderBoletoCard = (boleto, urgencia = 'normal') => {
        const cores = {
            vencido: { bg: 'var(--status-danger-bg)', border: 'var(--status-danger)', badge: 'var(--status-danger-text)' },
            urgente: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning)', badge: 'var(--status-warning-text)' },
            proximo: { bg: 'var(--brand-accent-soft)', border: 'var(--brand-accent)', badge: 'var(--brand-accent)' },
            normal: { bg: 'var(--surface-muted)', border: 'var(--border-subtle)', badge: 'var(--text-muted)' },
            pago: { bg: 'var(--status-success-bg)', border: 'var(--status-success)', badge: 'var(--status-success-text)' }
        };
        const cor = cores[urgencia];

        return (
            <div key={boleto.id} style={{
                background: cor.bg,
                border: `2px solid ${cor.border}`,
                borderRadius: '16px',
                padding: '15px',
                marginBottom: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="ti ti-file-text" aria-hidden="true" /> {boleto.descricao}
                        </h4>
                        {boleto.beneficiario && (
                            <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                Beneficiário: {boleto.beneficiario}
                            </span>
                        )}
                        {boleto.servico_nome && (
                            <div style={{
                                fontSize: '0.8em',
                                color: 'var(--status-info)',
                                marginTop: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <i className="ti ti-link" aria-hidden="true" /> Vinculado: <strong>{boleto.servico_nome}</strong>
                            </div>
                        )}
                    </div>
                    <span style={{
                        background: cor.badge,
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                    }}>
                        {boleto.status === 'Pago' ? <><i className="ti ti-circle-check" aria-hidden="true" /> Pago</> :
                         boleto.dias_para_vencer < 0 ? `Vencido há ${Math.abs(boleto.dias_para_vencer)}d` :
                         boleto.dias_para_vencer === 0 ? <><i className="ti ti-alert-triangle" aria-hidden="true" /> Vence HOJE</> :
                         `${boleto.dias_para_vencer}d para vencer`}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>Vencimento</span>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {new Date(boleto.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Valor</span>
                        <div style={{ fontWeight: 'bold', color: 'var(--module-obras)', fontSize: '1.1em' }}>
                            {formatCurrency(boleto.valor)}
                        </div>
                    </div>
                    {boleto.data_pagamento && (
                        <div>
                            <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Pago em</span>
                            <div style={{ fontWeight: 'bold', color: 'var(--status-success-text)' }}>
                                {new Date(boleto.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    )}
                </div>

                {boleto.codigo_barras && (
                    <div style={{
                        background: 'var(--surface-card)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.9em',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)'
                    }}>
                        <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                            Código de Barras:
                        </span>
                        {boleto.codigo_barras}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {boleto.codigo_barras && (
                        <button
                            onClick={() => copiarCodigo(boleto.codigo_barras)}
                            style={{
                                padding: '8px 15px',
                                background: 'var(--status-success)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="ti ti-copy" aria-hidden="true" /> Copiar Código
                        </button>
                    )}

                    {boleto.tem_pdf && (
                        <button
                            onClick={() => verPreview(boleto.id)}
                            style={{
                                padding: '8px 15px',
                                background: 'var(--status-info)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="ti ti-file-text" aria-hidden="true" /> Ver PDF
                        </button>
                    )}

                    {boleto.status !== 'Pago' && (
                        <button
                            onClick={() => marcarPago(boleto.id)}
                            style={{
                                padding: '8px 15px',
                                background: 'var(--status-warning)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="ti ti-circle-check" aria-hidden="true" /> Marcar Pago
                        </button>
                    )}

                    <button
                        onClick={() => deletarBoleto(boleto.id)}
                        style={{
                            padding: '8px 15px',
                            background: 'var(--status-danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.85em',
                            display: 'inline-flex',
                            alignItems: 'center'
                        }}
                    >
                        <i className="ti ti-trash" aria-hidden="true" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="m-section-card">
            {/* Header */}
            <div className="m-section-card-header">
                <h2 className="m-section-card-title">
                    <i className="ti ti-receipt" aria-hidden="true" />
                    Gestão de Boletos
                </h2>
                <div className="m-section-card-actions">
                    <button
                        className="m-btn-secondary"
                        onClick={() => setShowSuperlink(true)}
                        disabled={boletos.filter(b => (b.status === 'Pendente' || b.status === 'Vencido') && b.codigo_barras).length === 0}
                        title="Gerar link de pagamento com os boletos"
                    >
                        <i className="ti ti-share-2" aria-hidden="true" /> Superlink
                    </button>
                    <button className="m-btn-primary" onClick={() => setModalCadastro(true)}>
                        <i className="ti ti-plus" aria-hidden="true" /> Novo Boleto
                    </button>
                </div>
            </div>

            {/* Resumo */}
            {resumo && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <div style={{ background: 'var(--status-danger-bg)', padding: '15px', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--status-danger-text)' }}>Vencidos</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--status-danger)' }}>
                            {formatCurrency(resumo.total_vencido)}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{resumo.quantidade_vencido} boletos</div>
                    </div>

                    <div style={{ background: 'var(--status-warning-bg)', padding: '15px', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--status-warning-text)' }}>Pendentes</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--status-warning)' }}>
                            {formatCurrency(resumo.total_pendente)}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{resumo.quantidade_pendente} boletos</div>
                    </div>

                    <div style={{ background: 'var(--status-success-bg)', padding: '15px', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--status-success)' }}>Pagos</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--status-success)' }}>
                            {formatCurrency(resumo.total_pago)}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{resumo.quantidade_pago} boletos</div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div style={{ marginBottom: '20px' }}>
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        fontSize: 'var(--text-base)',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-card)'
                    }}
                >
                    <option value="todos">Todos os boletos</option>
                    <option value="Pendente">Pendentes</option>
                    <option value="Vencido">Vencidos</option>
                    <option value="Pago">Pagos</option>
                </select>
            </div>

            {/* Lista de Boletos */}
            {loading ? (
                <p>Carregando boletos...</p>
            ) : boletos.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'var(--surface-subtle)',
                    borderRadius: 'var(--radius-xl)'
                }}>
                    <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-muted)' }}>
                        Nenhum boleto cadastrado
                    </p>
                    <button
                        className="m-btn-primary"
                        onClick={() => setModalCadastro(true)}
                        style={{ marginTop: '10px' }}
                    >
                        <i className="ti ti-plus" aria-hidden="true" /> Cadastrar primeiro boleto
                    </button>
                </div>
            ) : (
                <>
                    {/* Vencidos */}
                    {boletosVencidos.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--status-danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-alert-circle" aria-hidden="true" /> VENCIDOS ({boletosVencidos.length})
                            </h3>
                            {boletosVencidos.map(b => renderBoletoCard(b, 'vencido'))}
                        </div>
                    )}

                    {/* Urgentes (<=3 dias) */}
                    {boletosUrgentes.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--status-warning)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-flame" aria-hidden="true" /> URGENTE - Vence em até 3 dias ({boletosUrgentes.length})
                            </h3>
                            {boletosUrgentes.map(b => renderBoletoCard(b, 'urgente'))}
                        </div>
                    )}

                    {/* Próximos (4-7 dias) */}
                    {boletosProximos.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--status-warning)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-calendar-week" aria-hidden="true" /> Vence em até 7 dias ({boletosProximos.length})
                            </h3>
                            {boletosProximos.map(b => renderBoletoCard(b, 'proximo'))}
                        </div>
                    )}

                    {/* Normais (>7 dias) */}
                    {boletosNormais.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-calendar" aria-hidden="true" /> Próximos vencimentos ({boletosNormais.length})
                            </h3>
                            {boletosNormais.map(b => renderBoletoCard(b, 'normal'))}
                        </div>
                    )}

                    {/* Pagos */}
                    {boletosPagos.length > 0 && filtroStatus === 'todos' && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ color: 'var(--status-success)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-circle-check" aria-hidden="true" /> Pagos ({boletosPagos.length})
                            </h3>
                            {boletosPagos.map(b => renderBoletoCard(b, 'pago'))}
                        </div>
                    )}
                </>
            )}

            {/* Superlink — somente boletos */}
            {showSuperlink && (
                <GerarSuperlinkModal
                    pagamentos={boletos
                        .filter(b => (b.status === 'Pendente' || b.status === 'Vencido') && b.codigo_barras)
                        .map(b => ({
                            id: `boleto-${b.id}`,
                            descricao: b.descricao || b.beneficiario || 'Boleto',
                            valor: b.valor || 0,
                            tipo: 'boleto',
                            contexto: obraNome || '',
                            pix_chave: '',
                            codigo_barras: b.codigo_barras,
                            diasParaVencer: b.dias_para_vencer,
                            dataVencimento: b.data_vencimento,
                            preSelecionar: b.dias_para_vencer == null || (b.dias_para_vencer >= 0 && b.dias_para_vencer <= 5),
                        }))}
                    obraId={obraId}
                    onClose={() => setShowSuperlink(false)}
                />
            )}

            {/* Modal de Cadastro */}
            {modalCadastro && (
                <CadastrarBoletoModal
                    obraId={obraId}
                    onClose={() => setModalCadastro(false)}
                    onSave={() => {
                        setModalCadastro(false);
                        fetchBoletos();
                        fetchResumo();
                        if (onUpdate) onUpdate(); // Atualizar tela principal
                    }}
                />
            )}

            {/* Modal de Preview do PDF */}
            {modalPreview && (
                <Modal onClose={() => setModalPreview(null)}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="ti ti-file-text" aria-hidden="true" /> {modalPreview.arquivo_nome || 'Boleto'}
                    </h2>
                    <div style={{ height: '70vh', marginTop: '15px', position: 'relative' }}>
                        {/* Usar object em vez de iframe para evitar disparo de impressão */}
                        <object
                            data={`data:application/pdf;base64,${modalPreview.arquivo_base64}#toolbar=1&navpanes=0&scrollbar=1`}
                            type="application/pdf"
                            style={{ width: '100%', height: '100%', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                        >
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                background: 'var(--surface-muted)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <p>Seu navegador não suporta visualização de PDF.</p>
                                <a
                                    href={`data:application/pdf;base64,${modalPreview.arquivo_base64}`}
                                    download={modalPreview.arquivo_nome || 'boleto.pdf'}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'var(--module-obras)',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        marginTop: '10px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <i className="ti ti-download" aria-hidden="true" /> Baixar PDF
                                </a>
                            </div>
                        </object>
                    </div>
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <a
                            href={`data:application/pdf;base64,${modalPreview.arquivo_base64}`}
                            download={modalPreview.arquivo_nome || 'boleto.pdf'}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--status-success)',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <i className="ti ti-download" aria-hidden="true" /> Baixar PDF
                        </a>
                        <button
                            onClick={() => setModalPreview(null)}
                            style={{
                                padding: '10px 20px',
                                background: 'var(--status-neutral)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GestaoBoletos;
