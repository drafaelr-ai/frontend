import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EntregaPublica from './index';

const basePayload = {
    numero: 21,
    status: 'Aprovada',
    obra_nome: 'Igaratá 5c',
    tipo: 'Material',
    data_necessidade: '2026-08-20',
    observacao: null,
    fornecedor: 'Depósito Mundial',
    prazo_entrega: '5 dias úteis',
    itens: [
        { id: 1, descricao: 'Manilha de concreto 150DN', quantidade: 6, unidade: 'un' },
        { id: 2, descricao: 'Cimento CP-II 50kg', quantidade: 40, unidade: 'sc' },
    ],
    entregue_em: null,
    observacao_entrega: null,
};

const mockFetch = (payload, respostasPost = {}) => {
    global.fetch = jest.fn((url, opts = {}) => {
        if (!opts.method || opts.method === 'GET') {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
        }
        const corpo = url.includes('/confirmar')
            ? (respostasPost.confirmar || { entregue_em: '2026-08-12T19:00:00', observacao_entrega: 'NF 4521' })
            : (respostasPost.mensagem || { mensagem: 'ok' });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(corpo) });
    });
};

describe('EntregaPublica', () => {
    afterEach(() => { delete global.fetch; });

    it('lista pequena sem rolagem, com botão de PDF do pedido', async () => {
        mockFetch(basePayload);
        render(<EntregaPublica token="tok123" />);

        expect(await screen.findByText(/Entrega — Solicitação #21/)).toBeInTheDocument();
        expect(screen.getByText('Manilha de concreto 150DN')).toBeInTheDocument();
        expect(screen.queryByTestId('itens-rolagem')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Pedido em PDF/ }))
            .toHaveAttribute('href', expect.stringContaining('/solicitacoes/entrega/tok123/pedido.pdf'));
    });

    it('lista muito grande (40 itens, descrição de 300 chars) ganha rolagem própria', async () => {
        const itens = Array.from({ length: 40 }, (_, n) => ({
            id: n + 1,
            descricao: `Item volumoso ${n + 1} ${'x'.repeat(280)}`.slice(0, 300),
            quantidade: n + 1,
            unidade: 'un',
        }));
        mockFetch({ ...basePayload, itens });
        render(<EntregaPublica token="tok123" />);

        await screen.findByText(/Material \(40 itens\)/);
        expect(screen.getByTestId('itens-rolagem')).toBeInTheDocument();
        // Todos os itens renderizados dentro da área rolável — nada é cortado.
        expect(screen.getAllByText(/Item volumoso/)).toHaveLength(40);
    });

    it('confirma a entrega com observação e mostra o estado entregue', async () => {
        mockFetch(basePayload);
        render(<EntregaPublica token="tok123" />);

        fireEvent.change(await screen.findByPlaceholderText(/Observação \(opcional\)/),
            { target: { value: 'NF 4521' } });
        fireEvent.click(screen.getByRole('button', { name: /Material entregue na obra/ }));

        expect(await screen.findByText(/Entregue em/)).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/solicitacoes/entrega/tok123/confirmar'),
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ observacao: 'NF 4521' }) }),
        );
    });

    it('mensagem do motorista para o comprador', async () => {
        mockFetch(basePayload);
        render(<EntregaPublica token="tok123" />);

        fireEvent.change(await screen.findByPlaceholderText(/fornecedor só libera/),
            { target: { value: 'Caminhão não entra na rua' } });
        fireEvent.click(screen.getByRole('button', { name: /Enviar mensagem/ }));

        expect(await screen.findByText(/Mensagem enviada/)).toBeInTheDocument();
    });
});
