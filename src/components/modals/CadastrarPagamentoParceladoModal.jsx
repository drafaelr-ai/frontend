import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getTodayString, formatCurrency } from '../../utils/format';
import { notify } from '../../utils/notify';

const CadastrarPagamentoParceladoModal = ({ onClose, onSave, obraId, itensOrcamento = [] }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        fornecedor: '',
        orcamento_item_id: '',
        segmento: 'Material',
        valor_total: '',
        numero_parcelas: '1',
        periodicidade: 'Mensal',
        data_primeira_parcela: getTodayString(),
        observacoes: '',
        pix: '',
        forma_pagamento: 'PIX'
    });

    const [valoresIguais, setValoresIguais] = useState(true);
    const [parcelasCustomizadas, setParcelasCustomizadas] = useState([]);

    useEffect(() => {
        const numParcelas = parseInt(formData.numero_parcelas) || 1;
        const valorTotal = parseFloat(formData.valor_total) || 0;
        const valorParcela = valorTotal / numParcelas;
        const dataInicial = formData.data_primeira_parcela ? new Date(formData.data_primeira_parcela + 'T12:00:00') : new Date();

        const novasParcelas = [];
        for (let i = 0; i < numParcelas; i++) {
            const dataVenc = new Date(dataInicial);
            if (formData.periodicidade === 'Semanal') {
                dataVenc.setDate(dataVenc.getDate() + (i * 7));
            } else if (formData.periodicidade === 'Quinzenal') {
                dataVenc.setDate(dataVenc.getDate() + (i * 15));
            } else {
                dataVenc.setMonth(dataVenc.getMonth() + i);
            }

            novasParcelas.push({
                numero: i + 1,
                valor: valoresIguais ? valorParcela.toFixed(2) : (parcelasCustomizadas[i]?.valor || valorParcela.toFixed(2)),
                data_vencimento: dataVenc.toISOString().split('T')[0],
                codigo_barras: parcelasCustomizadas[i]?.codigo_barras || ''
            });
        }
        setParcelasCustomizadas(novasParcelas);
    }, [formData.numero_parcelas, formData.valor_total, formData.data_primeira_parcela, formData.periodicidade, valoresIguais]);

    const handleParcelaChange = (index, field, value) => {
        const novasParcelas = [...parcelasCustomizadas];
        novasParcelas[index] = { ...novasParcelas[index], [field]: value };
        setParcelasCustomizadas(novasParcelas);

        if (field === 'valor' && !valoresIguais) {
            const novoTotal = novasParcelas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
            setFormData(prev => ({ ...prev, valor_total: novoTotal.toFixed(2) }));
        }
    };

    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        notify.success('Código copiado!');
    };

    const valor_parcela = formData.valor_total && formData.numero_parcelas
        ? (parseFloat(formData.valor_total) / parseInt(formData.numero_parcelas)).toFixed(2)
        : '0.00';

    const somaValoresParcelas = parcelasCustomizadas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
    const diferencaValor = Math.abs(somaValoresParcelas - parseFloat(formData.valor_total || 0));
    const valoresValidos = valoresIguais || diferencaValor < 0.02;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!valoresValidos) {
            notify.warning('A soma dos valores das parcelas deve ser igual ao valor total!');
            return;
        }

        const dadosEnviar = {
            ...formData,
            orcamento_item_id: formData.orcamento_item_id || null,
            parcelas_customizadas: (formData.forma_pagamento === 'Boleto' || !valoresIguais) ? parcelasCustomizadas : []
        };

        await onSave(dadosEnviar);
    };

    return (
        <Modal onClose={onClose}>
            <h2>📊 Cadastrar Pagamento Parcelado</h2>
            <form onSubmit={handleSubmit} className="form-orcamento" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <label>
                    Descrição:
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Fornecedor:
                    <input
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </label>

                <label>
                    📦 Vincular a Item do Orçamento (Opcional):
                    <select
                        value={formData.orcamento_item_id}
                        onChange={(e) => setFormData({...formData, orcamento_item_id: e.target.value})}
                    >
                        <option value="">-- Nenhum (Despesa Geral) --</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                    <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                        💡 Ao pagar, o valor será contabilizado no orçamento do item selecionado
                    </small>
                </label>

                <label>
                    Segmento:
                    <select
                        value={formData.segmento}
                        onChange={(e) => setFormData({...formData, segmento: e.target.value})}
                        required
                    >
                        <option value="Material">Material</option>
                        <option value="Mão de Obra">Mão de Obra</option>
                    </select>
                </label>

                <label>
                    Forma de Pagamento:
                    <select
                        value={formData.forma_pagamento}
                        onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
                        required
                    >
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                    </select>
                </label>

                {formData.forma_pagamento !== 'Boleto' && (
                    <label>
                        Chave PIX:
                        <input
                            type="text"
                            value={formData.pix}
                            onChange={(e) => setFormData({...formData, pix: e.target.value})}
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </label>
                )}

                <label>
                    Valor Total:
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                        required
                        disabled={!valoresIguais && formData.forma_pagamento === 'Boleto'}
                    />
                </label>

                <label>
                    Número de Parcelas:
                    <input
                        type="number"
                        min="1"
                        max="48"
                        value={formData.numero_parcelas}
                        onChange={(e) => setFormData({...formData, numero_parcelas: e.target.value})}
                        required
                    />
                </label>

                <label>
                    Periodicidade:
                    <select
                        value={formData.periodicidade}
                        onChange={(e) => setFormData({...formData, periodicidade: e.target.value})}
                        required
                    >
                        <option value="Semanal">Semanal (a cada 7 dias)</option>
                        <option value="Quinzenal">Quinzenal (a cada 15 dias)</option>
                        <option value="Mensal">Mensal (a cada 30 dias)</option>
                    </select>
                </label>

                <label>
                    Data da 1ª Parcela:
                    <input
                        type="date"
                        value={formData.data_primeira_parcela}
                        onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})}
                        required
                    />
                </label>

                <div style={{
                    padding: '10px',
                    background: '#f5f5f5',
                    borderRadius: '5px',
                    marginBottom: '10px'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <input
                            type="radio"
                            checked={valoresIguais}
                            onChange={() => setValoresIguais(true)}
                        />
                        Valores iguais ({formatCurrency(parseFloat(valor_parcela))} cada)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="radio"
                            checked={!valoresIguais}
                            onChange={() => setValoresIguais(false)}
                        />
                        Valores diferentes
                    </label>
                </div>

                {(formData.forma_pagamento === 'Boleto' || !valoresIguais) && parcelasCustomizadas.length > 0 && (
                    <div style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '10px',
                        background: '#fafafa',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            🎫 {formData.forma_pagamento === 'Boleto' ? 'Configuração dos Boletos' : 'Valores das Parcelas'}
                        </h4>

                        {parcelasCustomizadas.map((parcela, index) => (
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
                                    alignItems: 'center',
                                    marginBottom: '8px',
                                    fontWeight: 'bold',
                                    color: '#555'
                                }}>
                                    <span>Parcela {parcela.numero}/{formData.numero_parcelas}</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>
                                        Venc: {new Date(parcela.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1', minWidth: '100px' }}>
                                        <label style={{ fontSize: '12px', color: '#666' }}>Valor:</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={parcela.valor}
                                            onChange={(e) => handleParcelaChange(index, 'valor', e.target.value)}
                                            disabled={valoresIguais}
                                            style={{
                                                width: '100%',
                                                padding: '5px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>

                                    {formData.forma_pagamento === 'Boleto' && (
                                        <div style={{ flex: '3', minWidth: '200px' }}>
                                            <label style={{ fontSize: '12px', color: '#666' }}>Código de Barras:</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input
                                                    type="text"
                                                    value={parcela.codigo_barras}
                                                    onChange={(e) => handleParcelaChange(index, 'codigo_barras', e.target.value)}
                                                    placeholder="Cole a linha digitável do boleto"
                                                    style={{
                                                        flex: '1',
                                                        padding: '5px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                                {parcela.codigo_barras && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copiarCodigo(parcela.codigo_barras)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            background: '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                        title="Copiar código"
                                                    >
                                                        📋
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {!valoresIguais && (
                            <div style={{
                                marginTop: '10px',
                                padding: '8px',
                                background: valoresValidos ? '#e8f5e9' : '#ffebee',
                                borderRadius: '4px',
                                fontSize: '13px'
                            }}>
                                <strong>Soma das parcelas:</strong> {formatCurrency(somaValoresParcelas)}
                                {!valoresValidos && (
                                    <span style={{ color: '#d32f2f', marginLeft: '10px' }}>
                                        ⚠️ Diferença de {formatCurrency(diferencaValor)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <label>
                    Observações:
                    <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="2"
                    />
                </label>

                <div className="modal-footer">
                    <button type="submit" className="submit-btn" disabled={!valoresValidos}>
                        Cadastrar
                    </button>
                    <button type="button" onClick={onClose} className="voltar-btn">Cancelar</button>
                </div>
            </form>
        </Modal>
    );
};

export default CadastrarPagamentoParceladoModal;
