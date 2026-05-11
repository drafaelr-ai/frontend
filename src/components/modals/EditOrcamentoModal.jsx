import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';

const EditOrcamentoModal = ({ orcamento, onClose, onSave, servicos }) => {
    const [formData, setFormData] = useState({});
    const [existingAnexos, setExistingAnexos] = useState([]);
    const [newAnexos, setNewAnexos] = useState([]);
    const [isLoadingAnexos, setIsLoadingAnexos] = useState(false);

    useEffect(() => {
        if (orcamento) {
            setFormData({
                ...orcamento,
                servico_id: orcamento.servico_id ? parseInt(orcamento.servico_id, 10) : '',
                observacoes: orcamento.observacoes || ''
            });

            setIsLoadingAnexos(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setExistingAnexos(Array.isArray(data) ? data : []);
                    setIsLoadingAnexos(false);
                })
                .catch(err => {
                    logger.error("Erro ao buscar anexos:", err);
                    setIsLoadingAnexos(false);
                });
        }
    }, [orcamento]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'valor') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'servico_id') {
            finalValue = value ? parseInt(value, 10) : '';
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleFileChange = (e) => {
        setNewAnexos(Array.from(e.target.files));
    };

    const handleOpenAnexo = (anexoId) => {
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => notify.error(`Erro ao abrir anexo: ${err.message}`));
    };

    const handleDeleteAnexo = async (anexoId, e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!await confirmDialog('Tem certeza que deseja excluir este anexo?', { danger: true, confirmText: 'Excluir' })) return;

        fetchWithAuth(`${API_URL}/anexos/${anexoId}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Falha ao deletar');
                setExistingAnexos(prev => prev.filter(a => a.id !== anexoId));
            })
            .catch(err => notify.error(`Erro ao deletar anexo: ${err.message}`));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const data = new FormData();
        data.append('descricao', formData.descricao || '');
        data.append('fornecedor', formData.fornecedor || '');
        data.append('valor', parseFloat(formData.valor) || 0);
        data.append('dados_pagamento', formData.dados_pagamento || '');
        data.append('tipo', formData.tipo || 'Material');
        data.append('servico_id', formData.servico_id || '');
        data.append('observacoes', formData.observacoes || '');

        onSave(formData.id, data, newAnexos);
    };

    if (!orcamento) return null;

    return (
        <Modal onClose={onClose}>
            <h2>Editar Solicitação</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Fornecedor (Opcional)</label>
                    <input type="text" name="fornecedor" value={formData.fornecedor || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" name="valor" value={formData.valor || 0} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Dados de Pagamento (Opcional)</label>
                    <input type="text" name="dados_pagamento" value={formData.dados_pagamento || ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Observações (Opcional)</label>
                    <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows="3"></textarea>
                </div>

                <hr style={{margin: '20px 0'}} />

                <div className="form-group">
                    <label>Anexos Atuais</label>
                    {isLoadingAnexos ? <p>Carregando anexos...</p> : (
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                            {existingAnexos.length > 0 ? existingAnexos.map(anexo => (
                                <li key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                        title={`Abrir ${anexo.filename}`}
                                        style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        {anexo.filename}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteAnexo(anexo.id, e)}
                                        title="Excluir Anexo"
                                        style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.2em' }}
                                    >
                                        &times;
                                    </button>
                                </li>
                            )) : <p>Nenhum anexo.</p>}
                        </ul>
                    )}
                </div>

                <div className="form-group">
                    <label>Adicionar Novos Anexos</label>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                    />
                </div>

                <hr style={{margin: '20px 0'}} />

                <div className="form-group"><label>Vincular ao Serviço (Opcional)</label>
                    <select name="servico_id" value={formData.servico_id || ''} onChange={handleChange}>
                        <option value="">Nenhum (Gasto Geral)</option>
                        {(servicos || []).map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group"><label>Tipo/Segmento</label>
                    <select name="tipo" value={formData.tipo || 'Material'} onChange={handleChange} required>
                        <option>Material</option>
                        <option>Mão de Obra</option>
                        <option>Serviço</option>
                        <option>Equipamentos</option>
                    </select>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">Salvar Alterações</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditOrcamentoModal;
