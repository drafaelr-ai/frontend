import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { formatCurrency, getTodayString } from '../../utils/format';

const InserirPagamentoModal = ({ onClose, onSave, itensOrcamento, obraId }) => {
    const [data, setData] = useState(getTodayString());
    const [dataVencimento, setDataVencimento] = useState(getTodayString());
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [pix, setPix] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('Material');
    const [status, setStatus] = useState('A Pagar');
    const [orcamentoItemId, setOrcamentoItemId] = useState('');

    const [tipoFormaPagamento, setTipoFormaPagamento] = useState('avista');
    const [meioPagamento, setMeioPagamento] = useState('PIX');
    const [numeroParcelas, setNumeroParcelas] = useState('');
    const [periodicidade, setPeriodicidade] = useState('Mensal');
    const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(getTodayString());

    const [temEntrada, setTemEntrada] = useState(false);
    const [percentualEntrada, setPercentualEntrada] = useState(30);
    const [dataEntrada, setDataEntrada] = useState(getTodayString());

    const [valoresIguais, setValoresIguais] = useState(true);
    const [boletosConfig, setBoletosConfig] = useState([]);

    const [contadorInseridos, setContadorInseridos] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Valores derivados — candidatos a useMemo na fase 5
    const valorTotal = parseFloat(valor) || 0;
    const valorEntrada = temEntrada ? (valorTotal * percentualEntrada / 100) : 0;
    const valorRestante = valorTotal - valorEntrada;
    const numParcelas = parseInt(numeroParcelas) || 1;
    const valorParcela = numParcelas > 0 ? valorRestante / numParcelas : 0;

    useEffect(() => {
        if (tipoFormaPagamento === 'parcelado' && meioPagamento === 'Boleto' && numeroParcelas) {
            const dataInicial = dataPrimeiraParcela ? new Date(dataPrimeiraParcela + 'T12:00:00') : new Date();

            const novosBoletos = [];
            for (let i = 0; i < numParcelas; i++) {
                const dataVenc = new Date(dataInicial);
                if (periodicidade === 'Semanal') {
                    dataVenc.setDate(dataVenc.getDate() + (i * 7));
                } else if (periodicidade === 'Quinzenal') {
                    dataVenc.setDate(dataVenc.getDate() + (i * 15));
                } else {
                    dataVenc.setMonth(dataVenc.getMonth() + i);
                }

                novosBoletos.push({
                    numero: i + 1,
                    valor: valoresIguais ? valorParcela.toFixed(2) : (boletosConfig[i]?.valor || valorParcela.toFixed(2)),
                    data_vencimento: dataVenc.toISOString().split('T')[0],
                    codigo_barras: boletosConfig[i]?.codigo_barras || ''
                });
            }
            setBoletosConfig(novosBoletos);
        }
    }, [numeroParcelas, valor, dataPrimeiraParcela, periodicidade, meioPagamento, tipoFormaPagamento, valoresIguais, temEntrada, percentualEntrada]);

    const limparCamposParaNovo = () => {
        setDescricao('');
        setValor('');
        setCodigoBarras('');
        setDataVencimento(getTodayString());
        setNumeroParcelas('');
        setTemEntrada(false);
        setBoletosConfig([]);
        // Mantém: fornecedor, pix, tipo, orcamentoItemId, meioPagamento, tipoFormaPagamento, periodicidade
    };

    const mostrarToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    const handleBoletoChange = (index, field, value) => {
        const novosBoletos = [...boletosConfig];
        novosBoletos[index] = { ...novosBoletos[index], [field]: value };
        setBoletosConfig(novosBoletos);
    };

    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        notify.success('Código copiado!');
    };

    const handleSubmit = async (e, salvarENovo = false) => {
        e.preventDefault();
        setIsSubmitting(true);

        const dadosPagamento = {
            data,
            data_vencimento: dataVencimento,
            descricao,
            fornecedor: fornecedor || null,
            pix: meioPagamento === 'PIX' ? pix : null,
            codigo_barras: meioPagamento === 'Boleto' && tipoFormaPagamento === 'avista' ? codigoBarras : null,
            valor: parseFloat(valor) || 0,
            tipo,
            status,
            orcamento_item_id: orcamentoItemId ? parseInt(orcamentoItemId, 10) : null,
            tipo_forma_pagamento: tipoFormaPagamento,
            meio_pagamento: meioPagamento
        };

        if (tipoFormaPagamento === 'parcelado') {
            dadosPagamento.numero_parcelas = parseInt(numeroParcelas);
            dadosPagamento.periodicidade = periodicidade;
            dadosPagamento.data_primeira_parcela = dataPrimeiraParcela;

            if (temEntrada) {
                dadosPagamento.tem_entrada = true;
                dadosPagamento.percentual_entrada = percentualEntrada;
                dadosPagamento.valor_entrada = valorEntrada;
                dadosPagamento.data_entrada = dataEntrada;
                dadosPagamento.valor_parcela = valorParcela;
                logger.debug("🔍 DEBUG ENTRADA (frontend):", {
                    temEntrada,
                    percentualEntrada,
                    valorEntrada,
                    dataEntrada,
                    valorParcela
                });
            }

            logger.debug("📤 Dados de parcelamento a enviar:", dadosPagamento);

            if (meioPagamento === 'Boleto') {
                dadosPagamento.parcelas_customizadas = boletosConfig;
            }
        }

        try {
            await onSave(dadosPagamento, salvarENovo);

            if (salvarENovo) {
                setContadorInseridos(prev => prev + 1);
                mostrarToast(`✅ Pagamento "${descricao}" inserido com sucesso!`);
                limparCamposParaNovo();
            }
        } catch (error) {
            logger.error('Erro ao salvar:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Inserir Pagamento"
            subtitle="Insira um novo pagamento. Você pode criar pagamentos à vista ou parcelados, e vincular a um serviço."
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                        {contadorInseridos > 0 ? `Fechar (${contadorInseridos} inserido${contadorInseridos > 1 ? 's' : ''})` : 'Cancelar'}
                    </button>
                    <button type="button" className="m-btn-cancel" onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting}>
                        <i className="ti ti-plus" aria-hidden="true"></i>
                        {isSubmitting ? '...' : 'Salvar e Novo'}
                    </button>
                    <button type="submit" form="form-inserir-pagamento" className="m-btn-primary" disabled={isSubmitting}>
                        <i className="ti ti-device-floppy" aria-hidden="true"></i>
                        {isSubmitting ? '...' : 'Salvar e Fechar'}
                    </button>
                </>
            }
        >
            <form id="form-inserir-pagamento" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Descrição</label>
                    <input className="m-input" type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                </div>

                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input className="m-input" type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>

                <div className="m-field">
                    <label className="m-label">Valor Total (R$)</label>
                    <input className="m-input" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>

                {/* TIPO DE FORMA DE PAGAMENTO */}
                <div className="m-field">
                    <label className="m-label">Forma de Pagamento</label>
                    <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-1)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            <input
                                type="radio"
                                value="avista"
                                checked={tipoFormaPagamento === 'avista'}
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{ marginRight: 'var(--space-2)' }}
                            />
                            À vista
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            <input
                                type="radio"
                                value="parcelado"
                                checked={tipoFormaPagamento === 'parcelado'}
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{ marginRight: 'var(--space-2)' }}
                            />
                            Parcelado
                        </label>
                    </div>
                </div>

                {/* MEIO DE PAGAMENTO */}
                <div className="m-field">
                    <label className="m-label">Meio de Pagamento</label>
                    <select className="m-select" value={meioPagamento} onChange={(e) => setMeioPagamento(e.target.value)} required>
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Dinheiro">Dinheiro</option>
                    </select>
                </div>

                {/* CAMPOS CONDICIONAIS PARA PARCELAMENTO */}
                {tipoFormaPagamento === 'parcelado' && (
                    <>
                        {/* SEÇÃO DE ENTRADA */}
                        <div style={{
                            background: 'var(--status-success-bg)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-3)',
                            border: '0.5px solid var(--status-success)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontWeight: 'var(--weight-medium)', color: 'var(--status-success-text)', fontSize: 'var(--text-sm)' }}>
                                    <input
                                        type="checkbox"
                                        checked={temEntrada}
                                        onChange={(e) => setTemEntrada(e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    Tem entrada?
                                </label>
                            </div>

                            {temEntrada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div className="m-field" style={{ margin: 0 }}>
                                        <label className="m-label" style={{ fontSize: 'var(--text-sm)' }}>Percentual de Entrada (%)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <input
                                                className="m-input"
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={percentualEntrada}
                                                onChange={(e) => setPercentualEntrada(parseFloat(e.target.value) || 0)}
                                                style={{ width: '80px' }}
                                            />
                                            <span style={{ color: 'var(--status-success-text)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
                                                = {formatCurrency(valorEntrada)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="m-field" style={{ margin: 0 }}>
                                        <label className="m-label" style={{ fontSize: 'var(--text-sm)' }}>Data da Entrada</label>
                                        <input
                                            className="m-input"
                                            type="date"
                                            value={dataEntrada}
                                            onChange={(e) => setDataEntrada(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {temEntrada && valor && (
                                <div style={{
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-2)',
                                    background: 'var(--surface-card)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--text-muted)'
                                }}>
                                    Valor restante para parcelar: <strong style={{ color: 'var(--status-info)' }}>{formatCurrency(valorRestante)}</strong>
                                </div>
                            )}
                        </div>

                        {/* CONFIGURAÇÃO DAS PARCELAS */}
                        <div style={{
                            background: 'var(--status-info-bg)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-3)',
                            border: '0.5px solid var(--status-info)'
                        }}>
                            <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--status-info)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Configuração das Parcelas</h4>

                            <div className="m-field">
                                <label className="m-label">Número de Parcelas {temEntrada ? '(após entrada)' : ''}</label>
                                <input
                                    className="m-input"
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={numeroParcelas}
                                    onChange={(e) => setNumeroParcelas(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="m-field">
                                <label className="m-label">Periodicidade</label>
                                <select className="m-select" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} required>
                                    <option value="Semanal">Semanal (7 dias)</option>
                                    <option value="Quinzenal">Quinzenal (15 dias)</option>
                                    <option value="Mensal">Mensal (30 dias)</option>
                                </select>
                            </div>

                            <div className="m-field">
                                <label className="m-label">Data da 1ª Parcela</label>
                                <input
                                    className="m-input"
                                    type="date"
                                    value={dataPrimeiraParcela}
                                    onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                                    required
                                />
                            </div>

                            {numeroParcelas && valor && (
                                <div style={{
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-2)',
                                    background: 'var(--surface-card)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--text-sm)'
                                }}>
                                    <strong>Valor por parcela:</strong> {formatCurrency(valorParcela)}
                                </div>
                            )}
                        </div>

                        {/* RESUMO DO PARCELAMENTO */}
                        {numeroParcelas && valor && (
                            <div style={{
                                background: 'var(--status-warning-bg)',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-3)',
                                border: '0.5px solid var(--status-warning)'
                            }}>
                                <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--status-warning-text)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Resumo do Parcelamento</h4>

                                <div style={{ fontSize: 'var(--text-sm)' }}>
                                    {temEntrada && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: 'var(--space-2) 0',
                                            borderBottom: '2px solid var(--status-warning)',
                                            marginBottom: 'var(--space-2)',
                                            color: 'var(--status-success-text)',
                                            fontWeight: 'var(--weight-medium)'
                                        }}>
                                            <span>ENTRADA ({percentualEntrada}%)</span>
                                            <span>{formatCurrency(valorEntrada)} - {new Date(dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    )}

                                    {Array.from({ length: Math.min(numParcelas, 5) }, (_, i) => {
                                        const dataBase = new Date(dataPrimeiraParcela + 'T12:00:00');
                                        if (periodicidade === 'Semanal') {
                                            dataBase.setDate(dataBase.getDate() + (i * 7));
                                        } else if (periodicidade === 'Quinzenal') {
                                            dataBase.setDate(dataBase.getDate() + (i * 15));
                                        } else {
                                            dataBase.setMonth(dataBase.getMonth() + i);
                                        }
                                        return (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: 'var(--space-1) 0',
                                                borderBottom: '0.5px solid var(--border-subtle)'
                                            }}>
                                                <span>Parcela {i + 1}/{numParcelas}</span>
                                                <span>{formatCurrency(valorParcela)} - {dataBase.toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        );
                                    })}

                                    {numParcelas > 5 && (
                                        <div style={{ padding: 'var(--space-1) 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            ... e mais {numParcelas - 5} parcela(s)
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-2) 0 0 0',
                                        marginTop: 'var(--space-2)',
                                        borderTop: '2px solid var(--status-warning)',
                                        fontWeight: 'var(--weight-medium)',
                                        color: 'var(--status-warning-text)'
                                    }}>
                                        <span>TOTAL ({temEntrada ? numParcelas + 1 : numParcelas} pagamentos)</span>
                                        <span>{formatCurrency(valorTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* CONFIGURAÇÃO DE BOLETOS PARCELADOS */}
                {tipoFormaPagamento === 'parcelado' && meioPagamento === 'Boleto' && numeroParcelas && (
                    <div style={{
                        background: 'var(--status-warning-bg)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-3)',
                        border: '0.5px solid var(--status-warning)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--status-warning-text)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Códigos de Barras dos Boletos</h4>

                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                <input
                                    type="checkbox"
                                    checked={valoresIguais}
                                    onChange={(e) => setValoresIguais(e.target.checked)}
                                />
                                Valores iguais
                            </label>
                        </div>

                        {boletosConfig.map((boleto, index) => (
                            <div key={index} style={{
                                background: 'var(--surface-card)',
                                border: '0.5px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--space-2)',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 'var(--space-2)',
                                    fontWeight: 'var(--weight-medium)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>Boleto {boleto.numero}/{numeroParcelas}</span>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                        Venc: {new Date(boleto.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                    {!valoresIguais && (
                                        <div style={{ flex: '1', minWidth: '100px' }}>
                                            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Valor:</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={boleto.valor}
                                                onChange={(e) => handleBoletoChange(index, 'valor', e.target.value)}
                                                style={{ width: '100%', padding: 'var(--space-1)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ flex: '3', minWidth: '200px' }}>
                                        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Código de Barras:</label>
                                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                            <input
                                                type="text"
                                                value={boleto.codigo_barras}
                                                onChange={(e) => handleBoletoChange(index, 'codigo_barras', e.target.value)}
                                                placeholder="Cole a linha digitável"
                                                style={{ flex: '1', padding: 'var(--space-1)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}
                                            />
                                            {boleto.codigo_barras && (
                                                <button
                                                    type="button"
                                                    onClick={() => copiarCodigo(boleto.codigo_barras)}
                                                    style={{
                                                        padding: 'var(--space-1) var(--space-2)',
                                                        background: 'var(--brand-primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Copiar código"
                                                >
                                                    <i className="ti ti-copy" aria-hidden="true"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CAMPOS ORIGINAIS */}
                {tipoFormaPagamento === 'avista' && (
                    <div className="m-field">
                        <label className="m-label">Data de Vencimento</label>
                        <input className="m-input" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                )}

                {meioPagamento === 'PIX' && (
                    <div className="m-field">
                        <label className="m-label">Chave PIX <span className="m-label-opt">(opcional)</span></label>
                        <input
                            className="m-input"
                            type="text"
                            value={pix}
                            onChange={(e) => setPix(e.target.value)}
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </div>
                )}

                {meioPagamento === 'Boleto' && tipoFormaPagamento === 'avista' && (
                    <div className="m-field">
                        <label className="m-label">Código de Barras do Boleto <span className="m-label-opt">(opcional)</span></label>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <input
                                className="m-input"
                                type="text"
                                value={codigoBarras}
                                onChange={(e) => setCodigoBarras(e.target.value)}
                                placeholder="Cole a linha digitável do boleto"
                                style={{ flex: 1 }}
                            />
                            {codigoBarras && (
                                <button
                                    type="button"
                                    onClick={() => copiarCodigo(codigoBarras)}
                                    style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'var(--brand-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: 'var(--text-sm)',
                                        flexShrink: 0
                                    }}
                                    title="Copiar código"
                                >
                                    <i className="ti ti-copy" aria-hidden="true"></i>
                                    Copiar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="m-field">
                    <label className="m-label">Tipo</label>
                    <select className="m-select" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Serviço">Serviço</option>
                        <option value="Equipamentos">Equipamentos</option>
                    </select>
                </div>

                <div className="m-field">
                    <label className="m-label">Status</label>
                    <select className="m-select" value={status} onChange={(e) => setStatus(e.target.value)} required>
                        <option value="Pago">Pago</option>
                        <option value="A Pagar">A Pagar</option>
                    </select>
                </div>

                <div className="m-field">
                    <label className="m-label">Vincular ao Item do Orçamento <span className="m-label-opt">(opcional)</span></label>
                    <select className="m-select" value={orcamentoItemId} onChange={(e) => setOrcamentoItemId(e.target.value)}>
                        <option value="">Nenhum</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                </div>
            </form>

            {/* Toast de sucesso — padrão useState catalogado em NOTAS_REFACTOR.md, não migrado em D2 */}
            {toastMsg && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--status-success)',
                    color: 'white',
                    padding: 'var(--space-3) var(--space-6)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10000,
                    fontWeight: 'var(--weight-medium)'
                }}>
                    {toastMsg}
                </div>
            )}
        </Modal>
    );
};

export default React.memo(InserirPagamentoModal);
