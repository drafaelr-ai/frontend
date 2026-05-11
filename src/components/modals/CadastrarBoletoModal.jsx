import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { getTodayString } from '../../utils/format';

const CadastrarBoletoModal = ({ obraId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        descricao: '',
        beneficiario: '',
        valor: '',
        data_vencimento: getTodayString(),
        codigo_barras: '',
        vinculado_servico_id: ''
    });
    const [arquivo, setArquivo] = useState(null);
    const [arquivoBase64, setArquivoBase64] = useState(null);
    const [extraindo, setExtraindo] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [multiplosboletos, setMultiplosBoletos] = useState(null);
    const [salvandoTodos, setSalvandoTodos] = useState(false);
    const [servicos, setServicos] = useState([]);

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
        fetchServicos();
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
        <Modal onClose={onClose}>
            <h2>📄 Cadastrar Novo Boleto</h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
                Faça upload do PDF do boleto para extração automática dos dados.
            </p>

            <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Upload de PDF */}
                <div style={{
                    border: '2px dashed #1976d2',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    background: arquivo ? '#e3f2fd' : '#f5f5f5'
                }}>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                        {extraindo ? (
                            <span>⏳ Extraindo dados do PDF...</span>
                        ) : arquivo ? (
                            <span>✅ {arquivo.name}</span>
                        ) : (
                            <span>📁 Clique para selecionar o PDF do boleto</span>
                        )}
                    </label>
                </div>

                {/* Confirmação de PDF carregado */}
                {arquivoBase64 && !multiplosboletos && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '15px',
                        background: '#e3f2fd',
                        borderRadius: '8px',
                        border: '1px solid #90caf9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '24px' }}>✅</span>
                        <div>
                            <strong style={{ color: '#1976d2' }}>PDF carregado com sucesso!</strong>
                            <br />
                            <span style={{ fontSize: '12px', color: '#666' }}>{arquivo?.name}</span>
                        </div>
                    </div>
                )}

                {/* MÚLTIPLOS BOLETOS ENCONTRADOS */}
                {multiplosboletos && multiplosboletos.length > 1 && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '15px',
                        background: '#fff3e0',
                        borderRadius: '8px',
                        border: '1px solid #ffb74d'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <h3 style={{ margin: 0, color: '#e65100' }}>
                                📄 {multiplosboletos.length} Boletos Encontrados
                            </h3>
                        </div>

                        {/* Dropdown de Serviço para múltiplos boletos */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>
                                Vincular todos a um Serviço:
                            </label>
                            <select
                                value={formData.vinculado_servico_id}
                                onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginTop: '5px',
                                    borderRadius: '5px',
                                    border: '1px solid #ddd'
                                }}
                            >
                                <option value="">-- Nenhum (Despesa Extra) --</option>
                                {servicos.map(servico => (
                                    <option key={servico.id} value={servico.id}>
                                        {servico.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <button
                                type="button"
                                onClick={cadastrarTodosBoletos}
                                disabled={salvandoTodos}
                                style={{
                                    padding: '10px 20px',
                                    background: salvandoTodos ? '#ccc' : '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: salvandoTodos ? 'default' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    width: '100%'
                                }}
                            >
                                {salvandoTodos ? '⏳ Cadastrando...' : `✅ Cadastrar Todos os ${multiplosboletos.length} Boletos`}
                            </button>
                        </div>

                        <p style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>
                            Ou clique em um boleto específico para cadastrá-lo individualmente:
                        </p>

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {multiplosboletos.map((boleto, index) => (
                                <div
                                    key={index}
                                    onClick={() => selecionarBoleto(boleto)}
                                    style={{
                                        padding: '10px',
                                        marginBottom: '8px',
                                        background: 'white',
                                        borderRadius: '5px',
                                        border: '1px solid #ddd',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#e3f2fd'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div>
                                        <strong style={{ color: '#1976d2' }}>
                                            Parcela {index + 1}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                            Venc: {boleto.data_vencimento ? new Date(boleto.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ color: '#2e7d32', fontSize: '16px' }}>
                                            R$ {boleto.valor ? boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                        </strong>
                                        <br />
                                        <span style={{ fontSize: '11px', color: '#999' }}>
                                            Clique para selecionar
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: '#e8f5e9',
                            borderRadius: '5px',
                            fontSize: '12px',
                            color: '#2e7d32'
                        }}>
                            💡 <strong>Total:</strong> R$ {multiplosboletos.reduce((sum, b) => sum + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {multiplosboletos[0]?.beneficiario && (
                                <span> | <strong>Beneficiário:</strong> {multiplosboletos[0].beneficiario}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Formulário normal (quando não há múltiplos boletos) */}
                {!multiplosboletos && (
                    <>
                <div className="form-group">
                    <label>Descrição *</label>
                    <input
                        type="text"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Ex: Conta de Energia - CEMIG"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Beneficiário</label>
                    <input
                        type="text"
                        value={formData.beneficiario}
                        onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                        placeholder="Nome do beneficiário"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Valor (R$) *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Data de Vencimento *</label>
                        <input
                            type="date"
                            value={formData.data_vencimento}
                            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Código de Barras (Linha Digitável)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
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
                                    padding: '8px 15px',
                                    background: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                📋
                            </button>
                        )}
                    </div>
                </div>

                {/* Vincular a Serviço */}
                <div className="form-group">
                    <label>Vincular a Serviço (Opcional)</label>
                    <select
                        value={formData.vinculado_servico_id}
                        onChange={(e) => setFormData({ ...formData, vinculado_servico_id: e.target.value || null })}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    >
                        <option value="">-- Nenhum (Despesa Extra) --</option>
                        {servicos.map(servico => (
                            <option key={servico.id} value={servico.id}>
                                {servico.nome}
                            </option>
                        ))}
                    </select>
                    <small style={{ color: '#666', fontSize: '11px' }}>
                        💡 Boletos vinculados a serviços são somados ao orçamento. Boletos sem serviço vão para "Despesas Extras".
                    </small>
                </div>

                <div className="form-actions" style={{ marginTop: '20px' }}>
                    <button type="button" onClick={onClose} className="cancel-btn">
                        Cancelar
                    </button>
                    <button type="submit" className="submit-btn" disabled={salvando}>
                        {salvando ? '⏳ Salvando...' : '💾 Salvar Boleto'}
                    </button>
                </div>
                    </>
                )}
            </form>
        </Modal>
    );
};

export default CadastrarBoletoModal;
