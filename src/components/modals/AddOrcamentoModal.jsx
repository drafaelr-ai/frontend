import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { formatCurrency } from '../../utils/format';

const AddOrcamentoModal = ({ onClose, onSave, servicos }) => {
    const [descricao, setDescricao] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [valor, setValor] = useState('');
    const [dadosPagamento, setDadosPagamento] = useState('');
    const [tipo, setTipo] = useState('Material');
    const [servicoId, setServicoId] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [anexos, setAnexos] = useState([]);

    const [dataVencimento, setDataVencimento] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [numeroParcelas, setNumeroParcelas] = useState(1);
    const [periodicidade, setPeriodicidade] = useState('Mensal');

    const handleFileChange = (e) => {
        setAnexos(Array.from(e.target.files));
    };

    const valorParcela = numeroParcelas > 0 && valor ? (parseFloat(valor) / numeroParcelas) : 0;

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('descricao', descricao);
        formData.append('fornecedor', fornecedor || '');
        formData.append('valor', parseFloat(valor) || 0);
        formData.append('dados_pagamento', dadosPagamento || '');
        formData.append('tipo', tipo);
        formData.append('servico_id', servicoId ? parseInt(servicoId, 10) : '');
        formData.append('observacoes', observacoes || '');

        formData.append('data_vencimento', dataVencimento);
        formData.append('numero_parcelas', numeroParcelas);
        formData.append('periodicidade', periodicidade);

        anexos.forEach(file => {
            formData.append('anexos', file);
        });

        onSave(formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Nova Solicitação de Compra"
            width="large"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="form-add-orcamento" className="m-btn-primary">
                        <i className="ti ti-send" aria-hidden="true"></i>
                        Enviar para Aprovação
                    </button>
                </>
            }
        >
            <form id="form-add-orcamento" onSubmit={handleSubmit}>
                <div className="m-field">
                    <label className="m-label">Descrição do Item/Serviço *</label>
                    <input className="m-input" type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cimento CP-II 50kg (100 sacos)" required />
                </div>
                <div className="m-field">
                    <label className="m-label">Fornecedor <span className="m-label-opt">(opcional)</span></label>
                    <input className="m-input" type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Casa do Construtor" />
                </div>

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Tipo *</label>
                        <select className="m-select" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                            <option>Material</option>
                            <option>Mão de Obra</option>
                            <option>Serviço</option>
                            <option>Equipamentos</option>
                        </select>
                    </div>
                    <div className="m-field">
                        <label className="m-label">Vincular ao Serviço <span className="m-label-opt">(opcional)</span></label>
                        <select className="m-select" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                            <option value="">Nenhum (Geral)</option>
                            {(servicos || []).map(s => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="m-section">Condições de Pagamento</p>

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Valor Total (R$) *</label>
                        <input className="m-input" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
                    </div>
                    <div className="m-field">
                        <label className="m-label">Data 1º Vencimento *</label>
                        <input className="m-input" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                </div>

                <div className="m-row">
                    <div className="m-field">
                        <label className="m-label">Nº de Parcelas</label>
                        <input className="m-input" type="number" min="1" max="60" value={numeroParcelas} onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)} />
                    </div>
                    {numeroParcelas > 1 && (
                        <div className="m-field">
                            <label className="m-label">Periodicidade</label>
                            <select className="m-select" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
                                <option value="Semanal">Semanal</option>
                                <option value="Quinzenal">Quinzenal</option>
                                <option value="Mensal">Mensal</option>
                            </select>
                        </div>
                    )}
                </div>

                {numeroParcelas > 1 && valor && (
                    <div style={{
                        backgroundColor: 'var(--status-success-bg)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-3)',
                        fontSize: 'var(--text-sm)'
                    }}>
                        💡 <strong>{numeroParcelas}x</strong> de <strong>{formatCurrency(valorParcela)}</strong> ({periodicidade.toLowerCase()})
                    </div>
                )}

                <div className="m-field">
                    <label className="m-label">Dados de Pagamento (PIX, Conta, etc.) <span className="m-label-opt">(opcional)</span></label>
                    <input className="m-input" type="text" value={dadosPagamento} onChange={(e) => setDadosPagamento(e.target.value)} placeholder="PIX: (71) 99999-9999" />
                </div>

                <div className="m-field">
                    <label className="m-label">Observações <span className="m-label-opt">(opcional)</span></label>
                    <textarea className="m-textarea" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" placeholder="Ex: Entrega em 5 dias úteis"></textarea>
                </div>

                <div className="m-field">
                    <label className="m-label">Anexos (Orçamentos, PDF) <span className="m-label-opt">(opcional)</span></label>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
                    />
                </div>
            </form>
        </Modal>
    );
};

export default React.memo(AddOrcamentoModal);
