import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Cadastrar Pagamento Parcelado"
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-cadastrar-parcelado" className="m-btn-primary" disabled={!valoresValidos} style={{ background: 'var(--module-obras)' }}>
                        <i className="ti ti-check" aria-hidden="true"></i>
                        Cadastrar
                    </button>
                </>
            }
        >
            <form id="form-cadastrar-parcelado" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Descrição</label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                    />
                </div>

                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input
                        className="m-input"
                        type="text"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                    />
                </div>

                <div className="m-field">
                    <label className="m-label">Vincular a Item do Orçamento <span className="m-label-opt">(opcional)</span></label>
                    <select
                        className="m-select"
                        value={formData.orcamento_item_id}
                        onChange={(e) => setFormData({...formData, orcamento_item_id: e.target.value})}
                    >
                        <option value="">-- Nenhum (Despesa Geral) --</option>
                        {(itensOrcamento || []).map(item => (
                            <option key={item.id} value={item.id}>{item.nome_completo}</option>
                        ))}
                    </select>
                    <small style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>
                        <i className="ti ti-bulb" aria-hidden="true" style={{ color: 'var(--module-obras)' }}></i>
                        Ao pagar, o valor será contabilizado no orçamento do item selecionado
                    </small>
                </div>

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Segmento</label>
                        <select
                            className="m-select"
                            value={formData.segmento}
                            onChange={(e) => setFormData({...formData, segmento: e.target.value})}
                            required
                        >
                            <option value="Material">Material</option>
                            <option value="Mão de Obra">Mão de Obra</option>
                        </select>
                    </div>
                    <div className="m-field">
                        <label className="m-label">Forma de Pagamento</label>
                        <select
                            className="m-select"
                            value={formData.forma_pagamento}
                            onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
                            required
                        >
                            <option value="PIX">PIX</option>
                            <option value="Boleto">Boleto</option>
                            <option value="Transferência">Transferência</option>
                        </select>
                    </div>
                </div>

                {formData.forma_pagamento !== 'Boleto' && (
                    <div className="m-field">
                        <label className="m-label">Chave PIX <span className="m-label-opt">(opcional)</span></label>
                        <input
                            className="m-input"
                            type="text"
                            value={formData.pix}
                            onChange={(e) => setFormData({...formData, pix: e.target.value})}
                            placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                    </div>
                )}

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Valor Total</label>
                        <input
                            className="m-input"
                            type="number"
                            step="0.01"
                            value={formData.valor_total}
                            onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                            required
                            disabled={!valoresIguais && formData.forma_pagamento === 'Boleto'}
                        />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Número de Parcelas</label>
                        <input
                            className="m-input"
                            type="number"
                            min="1"
                            max="48"
                            value={formData.numero_parcelas}
                            onChange={(e) => setFormData({...formData, numero_parcelas: e.target.value})}
                            required
                        />
                    </div>
                </div>

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Periodicidade</label>
                        <select
                            className="m-select"
                            value={formData.periodicidade}
                            onChange={(e) => setFormData({...formData, periodicidade: e.target.value})}
                            required
                        >
                            <option value="Semanal">Semanal (a cada 7 dias)</option>
                            <option value="Quinzenal">Quinzenal (a cada 15 dias)</option>
                            <option value="Mensal">Mensal (a cada 30 dias)</option>
                        </select>
                    </div>
                    <div className="m-field">
                        <label className="m-label">Data da 1ª Parcela</label>
                        <input
                            className="m-input"
                            type="date"
                            value={formData.data_primeira_parcela}
                            onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})}
                            required
                        />
                    </div>
                </div>

                <div style={{
                    padding: 'var(--space-2)',
                    background: 'var(--surface-muted)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-2)'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        <input
                            type="radio"
                            checked={valoresIguais}
                            onChange={() => setValoresIguais(true)}
                        />
                        Valores iguais ({formatCurrency(parseFloat(valor_parcela))} cada)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
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
                        border: '0.5px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-2)',
                        marginBottom: 'var(--space-2)',
                        background: 'var(--surface-subtle)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <p className="m-section" style={{ marginTop: 0 }}>
                            {formData.forma_pagamento === 'Boleto' ? 'Configuração dos Boletos' : 'Valores das Parcelas'}
                        </p>

                        {parcelasCustomizadas.map((parcela, index) => (
                            <div key={index} style={{
                                background: 'var(--surface-card)',
                                border: '0.5px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-2)',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 'var(--space-2)',
                                    fontWeight: 'var(--weight-medium)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>Parcela {parcela.numero}/{formData.numero_parcelas}</span>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                        Venc: {new Date(parcela.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1', minWidth: '100px' }}>
                                        <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Valor:</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={parcela.valor}
                                            onChange={(e) => handleParcelaChange(index, 'valor', e.target.value)}
                                            disabled={valoresIguais}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-1)',
                                                border: '0.5px solid var(--border-default)',
                                                borderRadius: 'var(--radius-sm)'
                                            }}
                                        />
                                    </div>

                                    {formData.forma_pagamento === 'Boleto' && (
                                        <div style={{ flex: '3', minWidth: '200px' }}>
                                            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Código de Barras:</label>
                                            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                                <input
                                                    type="text"
                                                    value={parcela.codigo_barras}
                                                    onChange={(e) => handleParcelaChange(index, 'codigo_barras', e.target.value)}
                                                    placeholder="Cole a linha digitável do boleto"
                                                    style={{
                                                        flex: '1',
                                                        padding: 'var(--space-1)',
                                                        border: '0.5px solid var(--border-default)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--text-xs)'
                                                    }}
                                                />
                                                {parcela.codigo_barras && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copiarCodigo(parcela.codigo_barras)}
                                                        style={{
                                                            padding: 'var(--space-1) var(--space-2)',
                                                            background: 'var(--module-obras)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 'var(--radius-sm)',
                                                            cursor: 'pointer',
                                                            fontSize: 'var(--text-xs)'
                                                        }}
                                                        title="Copiar código"
                                                    >
                                                        <i className="ti ti-copy" aria-hidden="true"></i>
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
                                marginTop: 'var(--space-2)',
                                padding: 'var(--space-2)',
                                background: valoresValidos ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--text-sm)'
                            }}>
                                <strong>Soma das parcelas:</strong> {formatCurrency(somaValoresParcelas)}
                                {!valoresValidos && (
                                    <span style={{ color: 'var(--status-danger-text)', marginLeft: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                        <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                                        Diferença de {formatCurrency(diferencaValor)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="m-field">
                    <label className="m-label">Observações <span className="m-label-opt">(opcional)</span></label>
                    <textarea
                        className="m-textarea"
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        rows="2"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default React.memo(CadastrarPagamentoParceladoModal);
