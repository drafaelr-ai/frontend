import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ModuleBackButton from './ModuleBackButton';

describe('ModuleBackButton', () => {
    it('expõe rótulo acessível e executa a navegação recebida', () => {
        const onClick = jest.fn();
        render(<ModuleBackButton onClick={onClick} />);

        fireEvent.click(screen.getByRole('button', { name: 'Voltar para a tela anterior' }));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Voltar')).toBeInTheDocument();
    });
});
