import React, { useState } from 'react';
import Modal from './Modal';
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
        <Modal onClose={onClose} customWidth="600px">
            <h2>📋 Nova Solicitação de Compra</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Descrição do Item/Serviço *</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Cimento CP-II 50kg (100 sacos)" required />
                </div>
                <div className="form-group">
                    <label>Fornecedor</label>
                    <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Casa do Construtor" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Tipo *</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                            <option>Material</option>
                            <option>Mão de Obra</option>
                            <option>Serviço</option>
                            <option>Equipamentos</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Vincular ao Serviço</label>
                        <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                            <option value="">Nenhum (Geral)</option>
                            {(servicos || []).map(s => (
                                <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <hr style={{margin: '20px 0'}} />
                <h4 style={{ marginBottom: '15px', color: '#666' }}>💰 Condições de Pagamento</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Valor Total (R$) *</label>
                        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
                    </div>
                    <div className="form-group">
                        <label>Data 1º Vencimento *</label>
                        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                        <label>Nº de Parcelas</label>
                        <input type="number" min="1" max="60" value={numeroParcelas} onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)} />
                    </div>
                    {numeroParcelas > 1 && (
                        <div className="form-group">
                            <label>Periodicidade</label>
                            <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
                                <option value="Semanal">Semanal</option>
                                <option value="Quinzenal">Quinzenal</option>
                                <option value="Mensal">Mensal</option>
                            </select>
                        </div>
                    )}
                </div>

                {numeroParcelas > 1 && valor && (
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '0.95em'
                    }}>
                        💡 <strong>{numeroParcelas}x</strong> de <strong>{formatCurrency(valorParcela)}</strong> ({periodicidade.toLowerCase()})
                    </div>
                )}

                <div className="form-group">
                    <label>Dados de Pagamento (PIX, Conta, etc.)</label>
                    <input type="text" value={dadosPagamento} onChange={(e) => setDadosPagamento(e.target.value)} placeholder="PIX: (71) 99999-9999" />
                </div>

                <div className="form-group">
                    <label>Observações</label>
                    <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" placeholder="Ex: Entrega em 5 dias úteis"></textarea>
                </div>

                <div className="form-group">
                    <label>Anexos (Orçamentos, PDF)</label>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                    />
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
                    <button type="submit" className="submit-btn">📤 Enviar para Aprovação</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddOrcamentoModal;
