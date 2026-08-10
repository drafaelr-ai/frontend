import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WindowsNavBar from './WindowsNavBar';


const baseProps = {
    user: { username: 'Diego', role: 'master' },
    currentPage: 'home',
    setCurrentPage: jest.fn(),
    obraSelecionada: { id: 2, nome: 'Alphaville' },
    setObraSelecionada: jest.fn(),
    obras: [{ id: 2, nome: 'Alphaville' }],
    onLogout: jest.fn(),
    onBackToSelector: jest.fn(),
    onNavigateBack: jest.fn(),
};

describe('WindowsNavBar por modulo', () => {
    beforeEach(() => {
        window.navigateTo = jest.fn();
    });

    afterEach(() => {
        delete window.navigateTo;
    });

    it('Planejamento tem Home e não expõe ferramentas de Obras', () => {
        const onModuleHome = jest.fn();
        render(
            <WindowsNavBar
                {...baseProps}
                moduleMode="planejamento"
                currentPage="planejamento"
                onModuleHome={onModuleHome}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Home' }));
        expect(onModuleHome).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Planejamento da obra' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Orçamento' })).not.toBeInTheDocument();
    });

    it('logo Obraly volta para o dashboard principal, não para a home do módulo', () => {
        const onBackToSelector = jest.fn();
        const onModuleHome = jest.fn();
        render(
            <WindowsNavBar
                {...baseProps}
                moduleMode="financeiro"
                onBackToSelector={onBackToSelector}
                onModuleHome={onModuleHome}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Ir para o dashboard principal' }));

        expect(onBackToSelector).toHaveBeenCalledTimes(1);
        expect(onModuleHome).not.toHaveBeenCalled();
    });

    it('volta para a tela anterior sem confundir com o atalho do logo', () => {
        const onNavigateBack = jest.fn();
        const onBackToSelector = jest.fn();
        render(
            <WindowsNavBar
                {...baseProps}
                onNavigateBack={onNavigateBack}
                onBackToSelector={onBackToSelector}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Voltar para a tela anterior' }));

        expect(onNavigateBack).toHaveBeenCalledTimes(1);
        expect(onBackToSelector).not.toHaveBeenCalled();
    });

    it('Financeiro mantém seus atalhos e não expõe o orçamento de engenharia', () => {
        const onModuleHome = jest.fn();
        render(
            <WindowsNavBar
                {...baseProps}
                moduleMode="financeiro"
                onModuleHome={onModuleHome}
            />
        );

        expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cronograma' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Boletos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Caixa' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Novo Pagamento/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Orçamento' })).not.toBeInTheDocument();
    });

    it('Obras mantém orçamento e não mostra Planejamento na barra', () => {
        render(<WindowsNavBar {...baseProps} moduleMode="obras" onModuleHome={jest.fn()} />);

        expect(screen.getByRole('button', { name: 'Orçamento' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Planejamento da obra' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Boletos' })).not.toBeInTheDocument();
    });
});
