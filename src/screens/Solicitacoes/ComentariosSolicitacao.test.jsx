import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ComentariosSolicitacao from './ComentariosSolicitacao';
import { solicitacoesApi } from './solicitacoesApi';

jest.mock('./solicitacoesApi', () => ({
    solicitacoesApi: {
        comentarios: jest.fn(),
        usuariosMencao: jest.fn(),
        comentar: jest.fn(),
        removerComentario: jest.fn(),
    },
}));
jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
    confirmDialog: jest.fn(),
}));

const USUARIOS = [
    { id: 2, username: 'Diego', role: 'comum' },
    { id: 5, username: 'Marcos', role: 'comum' },
];

describe('ComentariosSolicitacao', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        solicitacoesApi.usuariosMencao.mockResolvedValue(USUARIOS);
    });

    it('lista comentários e destaca a menção', async () => {
        solicitacoesApi.comentarios.mockResolvedValue([
            {
                id: 1, autor_id: 2, autor_nome: 'Diego',
                texto: 'Confere a medida, @Marcos?',
                mencionados_ids: [5], data_criacao: '2026-08-11T09:00:00',
            },
        ]);

        render(<ComentariosSolicitacao solicitacaoId={8} user={{ id: 3, username: 'ARF', role: 'master' }} />);

        expect(await screen.findByText('Diego')).toBeInTheDocument();
        expect(screen.getByText('@Marcos')).toHaveClass('solc-mention');
    });

    it('autocomplete do @ insere o usuário e envia os mencionados', async () => {
        solicitacoesApi.comentarios.mockResolvedValue([]);
        solicitacoesApi.comentar.mockResolvedValue({ id: 9 });

        render(<ComentariosSolicitacao solicitacaoId={8} user={{ id: 3, username: 'ARF', role: 'master' }} />);
        await screen.findByText(/Nenhum comentário ainda/);

        const area = screen.getByPlaceholderText(/use @ para mencionar/i);
        fireEvent.change(area, { target: { value: 'Qual o prazo, @Di' } });

        fireEvent.click(await screen.findByRole('button', { name: /@Diego/ }));
        expect(area).toHaveValue('Qual o prazo, @Diego ');

        fireEvent.click(screen.getByRole('button', { name: /Comentar/ }));

        await waitFor(() => expect(solicitacoesApi.comentar).toHaveBeenCalledWith(
            8, 'Qual o prazo, @Diego', [2],
        ));
    });

    it('só autor ou master veem o botão de remover', async () => {
        solicitacoesApi.comentarios.mockResolvedValue([
            {
                id: 1, autor_id: 2, autor_nome: 'Diego', texto: 'ok',
                mencionados_ids: [], data_criacao: '2026-08-11T09:00:00',
            },
        ]);

        render(<ComentariosSolicitacao solicitacaoId={8} user={{ id: 5, username: 'Marcos', role: 'comum' }} />);

        await screen.findByText('Diego');
        expect(screen.queryByTitle('Remover comentário')).not.toBeInTheDocument();
    });
});
