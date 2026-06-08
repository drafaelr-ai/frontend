import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { getTodayString, formatCurrency } from '../../utils/format';

const CadastrarBoletoModal = ({ obraId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        beneficiario: '',
        valor: '',
        data_vencimento: getTodayString(),
        codigo_barras: '',
        vinculado_servico_id: '',
        orcamento_item_id: ''
    });
    const [arquivo, setArquivo] = useState(null);
    const [arquivoBase64, setArquivoBase64] = useState(null);
    const [extraindo, setExtraindo] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [multiplosboletos, setMultiplosBoletos] = useState(null);
    const [salvandoTodos, setSalvandoTodos] = useState(false);
    const [servicos, setServicos] = useState([]);
    const [itensOrcamento, setItensOrcamento] = useState([]);

    useEffect(() => {
        const fetchServicos = async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`);
                if (response.ok) {
                    const data = await response.json();
                    setServicos(data || []);
                }
            } catch (error) {
                logger.error('Erro ao carregar serviços:', error);
            }
        };
        const fetchItens = async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`);
                if (response.ok) {
                    const data = await response.json();
                    setItensOrcamento(data || []);
                }
            } catch (error) {
                logger.error('Erro ao carregar itens de orçamento:', error);
            }
        };
        fetchServicos();
        fetchItens();
    }, [obraId]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            notify.warning('Por favor, selecione um arquivo PDF');
            return;
        }

        setArquivo(file);
        setMultiplosBoletos(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result.split(',')[1];
            setArquivoBase64(base64);
            await extrairDadosPDF(base64);
        };
        reader.readAsDataURL(file);
    };

    const extrairDadosPDF = async (base64) => {
        try {
            setExtraindo(true);
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos/extrair-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arquivo_base64: base64 })
            });

            if (response.ok) {
                const dados = await response.json();
                logger.debug('Dados extraídos:', dados);

                if (dados.sucesso) {
                    if (dados.multiplos && dados.quantidade > 1) {
                        setMultiplosBoletos(dados.boletos);
                        notify.info(`📄 Encontrados ${dados.quantidade} boletos neste PDF!\n\nVocê pode cadastrar todos de uma vez ou selecionar um específico.`);
                    } else {
                        const dadosExtraidos = [];

                        if (dados.codigo_barras) {
                            setFormData(prev => ({ ...prev, codigo_barras: dados.codigo_barras }));
                            dadosExtraidos.push('Código de barras');
                        }
                        if (dados.valor) {
                            setFormData(prev => ({ ...prev, valor: dados.valor.toString() }));
                            dadosExtraidos.push('Valor');
                        }
                        if (dados.data_vencimento) {
                            setFormData(prev => ({ ...prev, data_vencimento: dados.data_vencimento }));
                            dadosExtraidos.push('Data de vencimento');
                        }
                        if (dados.beneficiario) {
                            setFormData(prev => ({ ...prev, beneficiario: dados.beneficiario }));
                            dadosExtraidos.push('Beneficiário');
                        }

                        notify.success(`✅ Dados extraídos: ${dadosExtraidos.join(', ')}.\n\nConfira e complete as informações restantes.`);
                    }
                } else {
                    notify.error('⚠️ Não foi possível extrair dados automaticamente.\n\nPreencha os campos manualmente.');
                }
            } else {
                const erro = await response.json();
                logger.error('Erro na API:', erro);
                notify.error('⚠️ Erro ao processar PDF. Preencha manualmente.');
            }
        } catch (error) {
            logger.error('Erro ao extrair dados:', error);
            notify.error('⚠️ Erro de conexão. Preencha manualmente.');
        } finally {
            setExtraindo(false);
        }
    };

    const cadastrarTodosBoletos = async () => {
        if (salvandoTodos) return;
        if (!multiplosboletos || multiplosboletos.length === 0) return;

        const descricaoBase = prompt('Digite uma descrição base para os boletos:', 'Boleto');
        if (!descricaoBase) return;

        setSalvandoTodos(true);

        try {
            let sucessos = 0;
            let erros = 0;

            for (let i = 0; i < multiplosboletos.length; i++) {
                const boleto = multiplosboletos[i];

                const payload = {
                    descricao: `${descricaoBase} - Parcela ${i + 1}/${multiplosboletos.length}`,
                    beneficiario: boleto.beneficiario || '',
                    codigo_barras: boleto.codigo_barras || '',
                    valor: boleto.valor || 0,
                    data_vencimento: boleto.data_vencimento,
                    vinculado_servico_id: formData.vinculado_servico_id ? parseInt(formData.vinculado_servico_id) : null,
                    arquivo_nome: arquivo?.name,
                    arquivo_base64: arquivoBase64
                };

                try {
                    const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        sucessos++;
                    } else if (response.status === 409) {
                        logger.debug(`Boleto ${i + 1} já existe, ignorando...`);
                    } else {
                        erros++;
                    }
                } catch {
                    erros++;
                }
            }

            // BUG: notify.error used for success message — catalogado em NOTAS_REFACTOR.md, não corrigido em D2
            notify.error(`✅ ${sucessos} boletos cadastrados com sucesso!${erros > 0 ? `\n⚠️ ${erros} falharam.` : ''}`);
            setMultiplosBoletos(null);
            onSave();
            onClose();

        } catch (error) {
            logger.error('Erro ao cadastrar boletos:', error);
            notify.error('Erro ao cadastrar boletos');
        } finally {
            setSalvandoTodos(false);
        }
    };

    const selecionarBoleto = (boleto) => {
        setFormData({
            descricao: '',
            beneficiario: boleto.beneficiario || '',
            valor: boleto.valor ? boleto.valor.toString() : '',
            data_vencimento: boleto.data_vencimento || '',
            codigo_barras: boleto.codigo_barras || ''
        });
        setMultiplosBoletos(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
            notify.warning('Preencha os campos obrigatórios');
            return;
        }

        try {
            setSalvando(true);
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/boletos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    valor: parseFloat(formData.valor),
                    vinculado_servico_id: formData.vinculado_servico_id ? parseInt(formData.vinculado_servico_id) : null,
                    orcamento_item_id: formData.orcamento_item_id ? parseInt(formData.orcamento_item_id) : null,
                    arquivo_nome: arquivo?.name || null,
                    arquivo_base64: arquivoBase64
                })
            });

            if (response.ok) {
                notify.success('✅ Boleto cadastrado com sucesso!');
                onSave();
            } else {
                const error = await response.json();
                notify.error(`Erro: ${error.erro}`);
            }
        } catch (error) {
            logger.error('Erro ao salvar:', error);
            notify.error('Erro ao salvar boleto');
        } finally {
            setSalvando(false);
        }
    };

    const copiarCodigo = () => {
        if (formData.codigo_barras) {
            navigator.clipboard.writeText(formData.codigo_barras);
            notify.success('Código copiado!');
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Cadastrar Novo Boleto"
            subtitle="Upload do PDF para extração automática dos dados"
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    {!multiplosboletos && (
                        <button type="submit" form="form-cadastrar-boleto" className="m-btn-primary" disabled={salvando}>
                            <i className="ti ti-device-floppy" aria-hidden="true"></i>
                            {salvando ? 'Salvando...' : 'Salvar Boleto'}
                        </button>
                    )}
                </>
            }
        >
            <form id="form-cadastrar-boleto" onSubmit={handleSubmit}>
                {/* Upload de PDF */}
                <div style={{
                    border: '2px dashed var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-5)',
                    textAlign: 'center',
                    marginBottom: 'var(--space-4)',
                    background: arquivo ? 'var(--status-info-bg)' : 'var(--surface-muted)'
                }}>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {extraindo ? (
                            <span>Extraindo dados do PDF...</span>
                        ) : arquivo ? (
                            <span style={{ color: 'var(--status-info)' }}>✅ {arquivo.name}</span>
                        ) : (
                            <span>Clique para selecionar o PDF do boleto</span>
                        )}
                    </label>
                </div>

                {/* Confirmação de PDF carregado */}
                {arquivoBase64 && !multiplosboletos && (
                    <div style={{
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--status-info-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '0.5px solid var(--status-info)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)'
                    }}>
                        <i className="ti ti-check" aria-hidden="true" style={{ fontSize: '24px', color: 'var(--status-info)' }}></i>
                        <div>
                            <strong style={{ color: 'var(--status-info)' }}>PDF carregado com sucesso!</strong>
                            <br />
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{arquivo?.name}</span>
                        </div>
                    </div>
                )}

                {/* MÚLTIPLOS BOLETOS ENCONTRADOS */}
                {multiplosboletos && multiplosboletos.length > 1 && (
                    <div style={{
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--status-warning-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '0.5px solid var(--status-warning)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-3)'
                        }}>
                            <h3 style={{ margin: 0, color: 'var(--status-warning-text)', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)' }}>
                                {multiplosboletos.length} Boletos Encontrados
                            </h3>
                        </div>

                        {/* Dropdown de Serviço para múltiplos boletos */}
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                Vincular todos a um Serviço:
                            </label>
                            <select
                                className="m-select"
                                value={formData.vinculado_servico_id}
                                onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                            >
                                <option value="">-- Nenhum (Despesa Extra) --</option>
                                {servicos.map(servico => (
                                    <option key={servico.id} value={servico.id}>
                                        {servico.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <button
                                type="button"
                                onClick={cadastrarTodosBoletos}
                                disabled={salvandoTodos}
                                className="m-btn-primary"
                                style={{ width: '100%' }}
                            >
                                <i className="ti ti-check" aria-hidden="true"></i>
                                {salvandoTodos ? 'Cadastrando...' : `Cadastrar Todos os ${multiplosboletos.length} Boletos`}
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                            Ou clique em um boleto específico para cadastrá-lo individualmente:
                        </p>

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {multiplosboletos.map((boleto, index) => (
                                <div
                                    key={index}
                                    onClick={() => selecionarBoleto(boleto)}
                                    style={{
                                        padding: 'var(--space-2)',
                                        marginBottom: 'var(--space-2)',
                                        background: 'var(--surface-card)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '0.5px solid var(--border-default)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--status-info-bg)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface-card)'}
                                >
                                    <div>
                                        <strong style={{ color: 'var(--status-info)', fontSize: 'var(--text-sm)' }}>
                                            Parcela {index + 1}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                            Venc: {boleto.data_vencimento ? new Date(boleto.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ color: 'var(--status-success-text)', fontSize: 'var(--text-base)' }}>
                                            {boleto.valor ? formatCurrency(boleto.valor) : '-'}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                            Clique para selecionar
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: 'var(--space-2)',
                            padding: 'var(--space-2)',
                            background: 'var(--status-success-bg)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--status-success-text)'
                        }}>
                            💡 <strong>Total:</strong> {formatCurrency(multiplosboletos.reduce((sum, b) => sum + (b.valor || 0), 0))}
                            {multiplosboletos[0]?.beneficiario && (
                                <span> | <strong>Beneficiário:</strong> {multiplosboletos[0].beneficiario}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Formulário normal (quando não há múltiplos boletos) */}
                {!multiplosboletos && (
                    <>
                        <div className="m-field">
                            <label className="m-label">Descrição *</label>
                            <input
                                className="m-input"
                                type="text"
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Ex: Conta de Energia - CEMIG"
                                required
                            />
                        </div>

                        <div className="m-field">
                            <label className="m-label">Beneficiário <span className="m-label-opt">(opcional)</span></label>
                            <input
                                className="m-input"
                                type="text"
                                value={formData.beneficiario}
                                onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                                placeholder="Nome do beneficiário"
                            />
                        </div>

                        <div className="m-row">
                            <div className="m-field">
                                <label className="m-label">Valor (R$) *</label>
                                <input
                                    className="m-input"
                                    type="number"
                                    step="0.01"
                                    value={formData.valor}
                                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="m-field">
                                <label className="m-label">Data de Vencimento *</label>
                                <input
                                    className="m-input"
                                    type="date"
                                    value={formData.data_vencimento}
                                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="m-field">
                            <label className="m-label">Código de Barras (Linha Digitável) <span className="m-label-opt">(opcional)</span></label>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <input
                                    className="m-input"
                                    type="text"
                                    value={formData.codigo_barras}
                                    onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                                    placeholder="Cole a linha digitável do boleto"
                                    style={{ flex: 1 }}
                                />
                                {formData.codigo_barras && (
                                    <button
                                        type="button"
                                        onClick={copiarCodigo}
                                        style={{
                                            padding: 'var(--space-2) var(--space-3)',
                                            background: 'var(--brand-primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                        title="Copiar código"
                                    >
                                        <i className="ti ti-copy" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="m-field">
                            <label className="m-label">Vincular a Serviço <span className="m-label-opt">(opcional)</span></label>
                            <select
                                className="m-select"
                                value={formData.vinculado_servico_id}
                                onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                            >
                                <option value="">-- Nenhum (Despesa Extra) --</option>
                                {servicos.map(servico => (
                                    <option key={servico.id} value={servico.id}>
                                        {servico.nome}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)', display: 'block' }}>
                                Boletos vinculados a serviços são somados ao orçamento. Boletos sem serviço vão para "Despesas Extras".
                            </small>
                        </div>

                        {itensOrcamento.length > 0 && (
                            <div className="m-field">
                                <label className="m-label">Vincular ao Orçamento de Engenharia <span className="m-label-opt">(opcional)</span></label>
                                <select
                                    className="m-select"
                                    value={formData.orcamento_item_id}
                                    onChange={(e) => setFormData({ ...formData, orcamento_item_id: e.target.value || '' })}
                                >
                                    <option value="">-- Nenhum item --</option>
                                    {itensOrcamento.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.nome_completo}
                                        </option>
                                    ))}
                                </select>
                                <small style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)', display: 'block' }}>
                                    Vincula o boleto a um item do orçamento de engenharia para conciliação automática.
                                </small>
                            </div>
                        )}
                    </>
                )}
            </form>
        </Modal>
    );
};

export default React.memo(CadastrarBoletoModal);
