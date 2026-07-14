import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { formatCurrency } from '../../utils/format';

const ModalAprovarOrcamento = ({ orcamento, onClose, onConfirmar }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAprovar = async () => {
        setIsSubmitting(true);
        try {
            await onConfirmar();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Aprovar Solicitação"
            subtitle={orcamento.descricao}
            width="default"
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="button" className="m-btn-primary" onClick={handleAprovar} disabled={isSubmitting} style={{ background: 'var(--module-obras)' }}>
                        <i className="ti ti-check" aria-hidden="true"></i>
                        {isSubmitting ? 'Aprovando...' : 'Aprovar Compra'}
                    </button>
                </>
            }
        >
            <dl className="m-view-dl" style={{ marginBottom: 'var(--space-4)' }}>
                <dt className="m-view-dt">Valor</dt>
                <dd className="m-view-dd" style={{ fontWeight: 'var(--weight-medium)', color: 'var(--status-success-text)' }}>
                    {formatCurrency(orcamento.valor)}
                </dd>
                {orcamento.fornecedor && (
                    <>
                        <dt className="m-view-dt">Fornecedor</dt>
                        <dd className="m-view-dd">{orcamento.fornecedor}</dd>
                    </>
                )}
                {orcamento.tipo && (
                    <>
                        <dt className="m-view-dt">Tipo</dt>
                        <dd className="m-view-dd">{orcamento.tipo}</dd>
                    </>
                )}
                {orcamento.servico_nome && (
                    <>
                        <dt className="m-view-dt">Serviço</dt>
                        <dd className="m-view-dd">{orcamento.servico_nome}</dd>
                    </>
                )}
                {orcamento.numero_parcelas > 1 && (
                    <>
                        <dt className="m-view-dt">Parcelamento</dt>
                        <dd className="m-view-dd">
                            {orcamento.numero_parcelas}x de {formatCurrency(orcamento.valor / orcamento.numero_parcelas)}
                        </dd>
                    </>
                )}
                {orcamento.data_vencimento && (
                    <>
                        <dt className="m-view-dt">Vencimento</dt>
                        <dd className="m-view-dd">
                            {new Date(orcamento.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </dd>
                    </>
                )}
            </dl>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
                Ao aprovar, será criado automaticamente um <strong>pagamento futuro</strong> no cronograma financeiro.
                {orcamento.servico_nome && (
                    <><br /><br />O valor será somado ao orçamento do serviço <strong>"{orcamento.servico_nome}"</strong>.</>
                )}
            </p>
        </Modal>
    );
};

export default React.memo(ModalAprovarOrcamento);
