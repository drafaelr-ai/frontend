import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { formatCurrency } from '../../utils/format';
import ModalAprovarOrcamento from './ModalAprovarOrcamento';
import AddOrcamentoModal from './AddOrcamentoModal';
import EditOrcamentoModal from './EditOrcamentoModal';

const OrcamentosModal = ({ obraId, onClose, onSave }) => {
    const [orcamentos, setOrcamentos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [editingOrcamento, setEditingOrcamento] = useState(null);
    const [viewingAnexos, setViewingAnexos] = useState(null);

    const [aprovandoOrcamento, setAprovandoOrcamento] = useState(null);

    const [selecionados, setSelecionados] = useState([]);
    const [aprovandoMultiplos, setAprovandoMultiplos] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [obraId]);

    const carregarDados = async () => {
        try {
            setIsLoading(true);
            const [orcRes, servRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/obras/${obraId}/orcamentos`),
                fetchWithAuth(`${API_URL}/obras/${obraId}/servicos`)
            ]);

            if (!orcRes.ok || !servRes.ok) throw new Error('Erro ao carregar dados');

            const orcData = await orcRes.json();
            const servData = await servRes.json();

            setOrcamentos(Array.isArray(orcData) ? orcData : []);
            setServicos(Array.isArray(servData) ? servData : []);
        } catch (err) {
            logger.error('Erro:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAprovar = (orcamento) => {
        setAprovandoOrcamento(orcamento);
    };

    const toggleSelecionado = (id) => {
        setSelecionados(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const toggleSelecionarTodos = () => {
        const pendentes = orcamentos.filter(orc => orc.status === 'Pendente');
        if (selecionados.length === pendentes.length) {
            setSelecionados([]);
        } else {
            setSelecionados(pendentes.map(orc => orc.id));
        }
    };

    const handleAprovarSelecionados = async () => {
        if (selecionados.length === 0) {
            notify.warning('Selecione pelo menos uma solicitação para aprovar.');
            return;
        }

        if (!await confirmDialog(`Confirma a aprovação de ${selecionados.length} solicitação(ões)?`, { confirmText: 'Aprovar' })) {
            return;
        }

        setAprovandoMultiplos(true);
        let aprovados = 0;
        let erros = [];

        for (const id of selecionados) {
            try {
                const response = await fetchWithAuth(
                    `${API_URL}/orcamentos/${id}/aprovar`,
                    {
                        method: 'POST',
                        body: JSON.stringify({})
                    }
                );

                if (response.ok) {
                    aprovados++;
                } else {
                    const data = await response.json();
                    erros.push(`ID ${id}: ${data.erro || 'Erro desconhecido'}`);
                }
            } catch (err) {
                erros.push(`ID ${id}: ${err.message}`);
            }
        }

        setAprovandoMultiplos(false);
        setSelecionados([]);

        if (erros.length > 0) {
            notify.success(`✅ ${aprovados} aprovado(s)\n❌ ${erros.length} erro(s):\n${erros.join('\n')}`);
        } else {
            notify.success(`✅ ${aprovados} solicitação(ões) aprovada(s) com sucesso!`);
        }

        if (onSave) onSave();
        carregarDados();
    };

    const handleConfirmarAprovacao = async () => {
        try {
            logger.debug('Enviando aprovação para:', aprovandoOrcamento.id);

            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${aprovandoOrcamento.id}/aprovar`,
                {
                    method: 'POST',
                    body: JSON.stringify({})
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || data.error || 'Erro ao aprovar solicitação');
            }

            notify.success(data.sucesso || '✅ Solicitação aprovada com sucesso!');
            setAprovandoOrcamento(null);
            if (onSave) onSave();
        } catch (err) {
            logger.error('Erro ao aprovar:', err);
            notify.error(`Erro ao aprovar solicitação: ${err.message}`);
        }
    };

    const handleRejeitar = async (orcamentoId) => {
        if (!await confirmDialog('Confirma a rejeição deste orçamento?', { danger: true, confirmText: 'Rejeitar' })) return;

        try {
            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${orcamentoId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Erro ao rejeitar solicitação');

            notify.success('✅ Solicitação rejeitada!');
            if (onSave) onSave();
        } catch (err) {
            notify.error(`Erro: ${err.message}`);
        }
    };

    const handleSaveOrcamento = async (formData) => {
        try {
            logger.debug("Salvando novo orçamento...");
            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/orcamentos`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.erro || 'Erro ao salvar orçamento');
            }

            notify.success('✅ Solicitação enviada com sucesso!');
            setAddModalVisible(false);
            carregarDados();
            if (onSave) onSave();
        } catch (err) {
            logger.error("Erro ao salvar orçamento:", err);
            notify.error(`Erro ao salvar orçamento: ${err.message}`);
        }
    };

    const handleEditOrcamento = async (orcamentoId, formData, newFiles) => {
        try {
            logger.debug("Salvando edição do orçamento:", orcamentoId);

            const response = await fetchWithAuth(
                `${API_URL}/orcamentos/${orcamentoId}`,
                {
                    method: 'PUT',
                    body: formData
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.erro || 'Erro ao salvar edição');
            }

            if (newFiles.length > 0) {
                const fileFormData = new FormData();
                newFiles.forEach(file => {
                    fileFormData.append('anexos', file);
                });

                const fileResponse = await fetchWithAuth(
                    `${API_URL}/orcamentos/${orcamentoId}/anexos`,
                    {
                        method: 'POST',
                        body: fileFormData
                    }
                );

                if (!fileResponse.ok) {
                    const error = await fileResponse.json();
                    throw new Error(error.erro || 'Erro ao enviar anexos');
                }
            }

            notify.success('✅ Solicitação atualizada com sucesso!');
            setEditingOrcamento(null);
            carregarDados();
            if (onSave) onSave();
        } catch (err) {
            logger.error("Erro ao salvar edição do orçamento:", err);
            notify.error(`Erro ao salvar edição: ${err.message}`);
        }
    };

    const orcamentosPendentes = orcamentos.filter(orc => orc.status === 'Pendente');
    const totalPendente = orcamentosPendentes.reduce((sum, orc) => sum + (orc.valor || 0), 0);

    if (isLoading) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Solicitações" width="xlarge">
                <p style={{ textAlign: 'center', padding: '40px' }}>Carregando...</p>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Solicitações Pendentes"
            width="xlarge"
            scrollBody={true}
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
            }
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: '8px'
            }}>
                <div>
                    <span style={{ fontSize: '1.1em', color: 'var(--text-secondary)' }}>
                        Total Pendente:
                    </span>
                    <span style={{
                        fontSize: '1.5em',
                        fontWeight: 'bold',
                        color: 'var(--brand-primary)',
                        marginLeft: '10px'
                    }}>
                        {formatCurrency(totalPendente)}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {selecionados.length > 0 && (
                        <button
                            onClick={handleAprovarSelecionados}
                            disabled={aprovandoMultiplos}
                            className="acao-btn"
                            style={{
                                backgroundColor: 'var(--status-success)',
                                color: 'white',
                                opacity: aprovandoMultiplos ? 0.7 : 1
                            }}
                        >
                            {aprovandoMultiplos ? '⏳ Aprovando...' : `✓ Aprovar Selecionados (${selecionados.length})`}
                        </button>
                    )}
                    <button
                        onClick={() => setAddModalVisible(true)}
                        className="acao-btn add-btn"
                        style={{ backgroundColor: 'var(--status-info)' }}
                    >
                        + Nova Solicitação
                    </button>
                </div>
            </div>

            {orcamentosPendentes.length > 0 ? (
                <table className="tabela-pendencias">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selecionados.length === orcamentosPendentes.length && orcamentosPendentes.length > 0}
                                    onChange={toggleSelecionarTodos}
                                    title="Selecionar todos"
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                            </th>
                            <th>Descrição</th>
                            <th>Fornecedor</th>
                            <th>Segmento</th>
                            <th>Serviço</th>
                            <th>Valor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orcamentosPendentes.map(orc => (
                            <tr key={orc.id} style={{
                                backgroundColor: selecionados.includes(orc.id) ? 'var(--status-success-bg)' : 'transparent'
                            }}>
                                <td style={{ textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selecionados.includes(orc.id)}
                                        onChange={() => toggleSelecionado(orc.id)}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    />
                                </td>
                                <td
                                    onClick={() => setEditingOrcamento(orc)}
                                    style={{
                                        cursor: 'pointer',
                                        color: 'var(--brand-primary)',
                                        fontWeight: '500',
                                        textDecoration: 'underline'
                                    }}
                                    title="Clique para editar"
                                >
                                    {orc.descricao}
                                </td>
                                <td>{orc.fornecedor || 'N/A'}</td>
                                <td>{orc.tipo}</td>
                                <td>{orc.servico_nome || 'Geral'}</td>
                                <td><strong>{formatCurrency(orc.valor)}</strong></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {orc.anexos_count > 0 && (
                                            <button
                                                onClick={() => setViewingAnexos(orc)}
                                                className="acao-icon-btn"
                                                title={`${orc.anexos_count} anexo(s)`}
                                                style={{ fontSize: '1.3em', color: 'var(--status-info)' }}
                                            >
                                                📎
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRejeitar(orc.id)}
                                            className="acao-btn"
                                            style={{ backgroundColor: 'var(--status-danger)', color: 'white', padding: '5px 12px' }}
                                        >
                                            Rejeitar
                                        </button>
                                        <button
                                            onClick={() => handleAprovar(orc)}
                                            className="acao-btn"
                                            style={{ backgroundColor: 'var(--status-success)', color: 'white', padding: '5px 12px' }}
                                        >
                                            Aprovar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Nenhuma solicitação pendente.
                </p>
            )}

            {aprovandoOrcamento && (
                <ModalAprovarOrcamento
                    orcamento={aprovandoOrcamento}
                    onClose={() => setAprovandoOrcamento(null)}
                    onConfirmar={handleConfirmarAprovacao}
                />
            )}

            {isAddModalVisible && (
                <AddOrcamentoModal
                    obraId={obraId}
                    onClose={() => setAddModalVisible(false)}
                    onSave={handleSaveOrcamento}
                    servicos={servicos}
                />
            )}

            {editingOrcamento && (
                <EditOrcamentoModal
                    orcamento={editingOrcamento}
                    obraId={obraId}
                    onClose={() => setEditingOrcamento(null)}
                    onSave={handleEditOrcamento}
                    servicos={servicos}
                />
            )}
        </Modal>
    );
};

export default OrcamentosModal;
