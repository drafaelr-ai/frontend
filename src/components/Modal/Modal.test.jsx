import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Modal from './Modal';

const abrir = (props = {}) => render(
    <Modal isOpen title="Caixa de Obra" onClose={() => {}} {...props}>
        <p>conteúdo</p>
    </Modal>
);

describe('Modal — diálogo (padrão)', () => {
    it('é anunciado como diálogo modal', () => {
        abrir();
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('sai do lugar onde foi renderizado (createPortal para o body)', () => {
        const { container } = abrir();
        expect(within(container).queryByRole('heading')).toBeNull();
        expect(screen.getByRole('heading', { name: 'Caixa de Obra' })).toBeInTheDocument();
    });

    it('tem botão de fechar', () => {
        abrir();
        expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    });
});

describe('Modal — embutido na página (embedded)', () => {
    // Este é o caso que o ObraDetalhe usa: ele já renderizava estes
    // componentes no slot de página passando embedded={true}, mas a prop não
    // era lida por ninguém — a tela mostrava um modal por cima da página em
    // vez da página.

    it('fica no fluxo da página, onde foi renderizado', () => {
        const { container } = abrir({ embedded: true });
        expect(within(container).getByRole('heading', { name: 'Caixa de Obra' }))
            .toBeInTheDocument();
        expect(within(container).getByText('conteúdo')).toBeInTheDocument();
    });

    it('não se anuncia como diálogo para o leitor de tela', () => {
        // Sem role="dialog"/aria-modal: o resto da página continua acessível,
        // e dizer o contrário seria mentira para quem usa leitor de tela.
        abrir({ embedded: true });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('não mostra o X — quem fecha é a navegação da página', () => {
        abrir({ embedded: true });
        expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
    });
});
