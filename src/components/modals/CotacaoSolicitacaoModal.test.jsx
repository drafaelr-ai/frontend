import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CotacaoSolicitacaoModal from './CotacaoSolicitacaoModal';
import { solicitacoesApi } from '../../screens/Solicitacoes/solicitacoesApi';

jest.mock('../../screens/Solicitacoes/solicitacoesApi', () => ({
    solicitacoesApi: { criarCotacao: jest.fn() },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock('../Modal/Modal', () => ({ isOpen, title, children, footer }) => (
    isOpen ? <div role="dialog" aria-label="Cotação">{title}{children}{footer}</div> : null
));

describe('CotacaoSolicitacaoModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        solicitacoesApi.criarCotacao.mockResolvedValue({ id: 1 });
    });

    it('envia vários arquivos como anexos da mesma cotação', async () => {
        const onSaved = jest.fn();
        const { container } = render(
            <CotacaoSolicitacaoModal
                isOpen
                solicitacao={{ id: 18 }}
                onClose={jest.fn()}
                onSaved={onSaved}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('Ex.: Depósito Central'), {
            target: { value: 'Fornecedor Dois PDFs' },
        });
        fireEvent.change(screen.getByPlaceholderText('0,00'), {
            target: { value: '1.500,00' },
        });
        const parte1 = new File(['parte 1'], 'orcamento-parte-1.pdf', { type: 'application/pdf' });
        const parte2 = new File(['parte 2'], 'orcamento-parte-2.pdf', { type: 'application/pdf' });
        fireEvent.change(container.querySelector('input[type="file"]'), {
            target: { files: [parte1, parte2] },
        });
        fireEvent.click(screen.getByRole('button', { name: /Salvar cotação/i }));

        await waitFor(() => expect(solicitacoesApi.criarCotacao).toHaveBeenCalledTimes(1));
        const [id, body, isForm] = solicitacoesApi.criarCotacao.mock.calls[0];
        expect(id).toBe(18);
        expect(isForm).toBe(true);
        expect(body).toBeInstanceOf(FormData);
        expect(body.getAll('arquivos')).toEqual([parte1, parte2]);
        expect(onSaved).toHaveBeenCalledTimes(1);
    });
});
