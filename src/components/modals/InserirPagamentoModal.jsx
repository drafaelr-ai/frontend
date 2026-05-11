import React, { useState, useEffect } from 'react';
import Modal from './Modal';
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
        <Modal onClose={onClose}>
            <h2>💳 Inserir Pagamento</h2>
            <p style={{fontSize: '0.9em', color: '#666', marginBottom: '15px'}}>
                Insira um novo pagamento. Você pode criar pagamentos à vista ou parcelados, e vincular a um serviço.
            </p>
            <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
                </div>

                <div className="form-group">
                    <label>Valor Total (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                </div>

                {/* TIPO DE FORMA DE PAGAMENTO */}
                <div className="form-group">
                    <label>Forma de Pagamento</label>
                    <div style={{display: 'flex', gap: '20px', marginTop: '8px'}}>
                        <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <input
                                type="radio"
                                value="avista"
                                checked={tipoFormaPagamento === 'avista'}
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{marginRight: '8px'}}
                            />
                            À vista
                        </label>
                        <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <input
                                type="radio"
                                value="parcelado"
                                checked={tipoFormaPagamento === 'parcelado'}
                                onChange={(e) => setTipoFormaPagamento(e.target.value)}
                                style={{marginRight: '8px'}}
                            />
                            Parcelado
                        </label>
                    </div>
                </div>

                {/* MEIO DE PAGAMENTO */}
                <div className="form-group">
                    <label>Meio de Pagamento</label>
                    <select value={meioPagamento} onChange={(e) => setMeioPagamento(e.target.value)} required>
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
                            background: '#e8f5e9',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid #a5d6a7'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#2e7d32' }}>
                                    <input
                                        type="checkbox"
                                        checked={temEntrada}
                                        onChange={(e) => setTemEntrada(e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    💰 Tem entrada?
                                </label>
                            </div>

                            {temEntrada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.9em' }}>Percentual de Entrada (%)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={percentualEntrada}
                                                onChange={(e) => setPercentualEntrada(parseFloat(e.target.value) || 0)}
                                                style={{ width: '80px' }}
                                            />
                                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                = {formatCurrency(valorEntrada)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.9em' }}>Data da Entrada</label>
                                        <input
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
                                    marginTop: '12px',
                                    padding: '10px',
                                    background: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '0.9em',
                                    color: '#666'
                                }}>
                                    Valor restante para parcelar: <strong style={{ color: '#1976d2' }}>{formatCurrency(valorRestante)}</strong>
                                </div>
                            )}
                        </div>

                        {/* CONFIGURAÇÃO DAS PARCELAS */}
                        <div style={{
                            background: '#f0f8ff',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid #b3d9ff'
                        }}>
                            <h4 style={{margin: '0 0 12px 0', color: '#0066cc'}}>📦 Configuração das Parcelas</h4>

                            <div className="form-group">
                                <label>Número de Parcelas {temEntrada ? '(após entrada)' : ''}</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={numeroParcelas}
                                    onChange={(e) => setNumeroParcelas(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Periodicidade</label>
                                <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} required>
                                    <option value="Semanal">Semanal (7 dias)</option>
                                    <option value="Quinzenal">Quinzenal (15 dias)</option>
                                    <option value="Mensal">Mensal (30 dias)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Data da 1ª Parcela</label>
                                <input
                                    type="date"
                                    value={dataPrimeiraParcela}
                                    onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                                    required
                                />
                            </div>

                            {numeroParcelas && valor && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px',
                                    background: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '0.9em'
                                }}>
                                    <strong>Valor por parcela:</strong> {formatCurrency(valorParcela)}
                                </div>
                            )}
                        </div>

                        {/* RESUMO DO PARCELAMENTO */}
                        {numeroParcelas && valor && (
                            <div style={{
                                background: '#fff3e0',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                border: '1px solid #ffcc80'
                            }}>
                                <h4 style={{margin: '0 0 12px 0', color: '#e65100'}}>📋 Resumo do Parcelamento</h4>

                                <div style={{ fontSize: '0.95em' }}>
                                    {temEntrada && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '8px 0',
                                            borderBottom: '2px solid #ffcc80',
                                            marginBottom: '8px',
                                            color: '#2e7d32',
                                            fontWeight: 'bold'
                                        }}>
                                            <span>🟢 ENTRADA ({percentualEntrada}%)</span>
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
                                                padding: '6px 0',
                                                borderBottom: '1px solid #ffe0b2'
                                            }}>
                                                <span>Parcela {i + 1}/{numParcelas}</span>
                                                <span>{formatCurrency(valorParcela)} - {dataBase.toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        );
                                    })}

                                    {numParcelas > 5 && (
                                        <div style={{ padding: '6px 0', color: '#999', fontStyle: 'italic' }}>
                                            ... e mais {numParcelas - 5} parcela(s)
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '10px 0 0 0',
                                        marginTop: '8px',
                                        borderTop: '2px solid #e65100',
                                        fontWeight: 'bold',
                                        color: '#e65100'
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
                        background: '#fff8e1',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid #ffcc80',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <h4 style={{margin: '0 0 12px 0', color: '#f57c00'}}>🎫 Códigos de Barras dos Boletos</h4>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                background: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '5px',
                                padding: '10px',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#555'
                                }}>
                                    <span>Boleto {boleto.numero}/{numeroParcelas}</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                        Venc: {new Date(boleto.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {!valoresIguais && (
                                        <div style={{ flex: '1', minWidth: '100px' }}>
                                            <label style={{ fontSize: '11px', color: '#666' }}>Valor:</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={boleto.valor}
                                                onChange={(e) => handleBoletoChange(index, 'valor', e.target.value)}
                                                style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ flex: '3', minWidth: '200px' }}>
                                        <label style={{ fontSize: '11px', color: '#666' }}>Código de Barras:</label>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="text"
                                                value={boleto.codigo_barras}
                                                onChange={(e) => handleBoletoChange(index, 'codigo_barras', e.target.value)}
                                                placeholder="Cole a linha digitável"
                                                style={{ flex: '1', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                                            />
                                            {boleto.codigo_barras && (
                                                <button
                                                    type="button"
                                                    onClick={() => copiarCodigo(boleto.codigo_barras)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        background: '#4CAF50',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Copiar código"
                                                >
                                                    📋
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
                    <div className="form-group">
                        <label>Data de Vencimento</label>
                        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                )}

                {meioPagamento === 'PIX' && (
                    <div className="form-group">
                        <label>Chave PIX (Opcional)</label>
                        <input
                            type="text"
                            value={pix}
                            onChange={(e) => setPix(e.target.value)}
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </div>
                )}

                {meioPagamento === 'Boleto' && tipoFormaPagamento === 'avista' && (
                    <div className="form-group">
                        <label>Código de Barras do Boleto</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
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
                                        padding: '8px 15px',
                                        background: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                    title="Copiar código"
                                >
                                    📋 Copiar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label>Tipo</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                        <option value="Serviço">Serviço</option>
                        <option value="Equipamentos">Equipamentos</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                        <option value="Pago">Pago</option>
                        <option value="A Pagar">A Pagar</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Vincular ao Item do Orçamento (Opcional)</label>
                    <select value={orcamentoItemId} onChange={(e) => setOrcamentoItemId(e.target.value)}>
                        <option value="">Nenhum</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={onClose} className="cancel-btn" disabled={isSubmitting}>
                        {contadorInseridos > 0 ? `Fechar (${contadorInseridos} inserido${contadorInseridos > 1 ? 's' : ''})` : 'Cancelar'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        className="submit-btn"
                        style={{ backgroundColor: '#17a2b8', flex: 1 }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳...' : '➕ Salvar e Novo'}
                    </button>
                    <button
                        type="submit"
                        className="submit-btn"
                        style={{ flex: 1 }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '⏳...' : (tipoFormaPagamento === 'parcelado' ? '📦 Salvar e Fechar' : '💾 Salvar e Fechar')}
                    </button>
                </div>

                {/* Toast de sucesso inline */}
                {toastMsg && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        zIndex: 10000,
                        animation: 'fadeIn 0.3s ease',
                        fontWeight: 'bold'
                    }}>
                        {toastMsg}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default InserirPagamentoModal;
