import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ModuleSelectorScreen from './ModuleSelectorScreen';
import { fetchWithAuth } from '../auth/fetchWithAuth';


jest.mock('../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../utils/notify', () => ({ notify: { error: jest.fn() } }));

describe('ModuleSelectorScreen', () => {
    it('mostra Financeiro e Planejamento como modulos principais', async () => {
        // Este teste cobre somente a escolha de modulos. Mantemos o painel de
        // alertas pendente para nao introduzir uma atualizacao assincrona alheia.
        fetchWithAuth.mockReturnValue(new Promise(() => {}));
        const onSelectModule = jest.fn();
        render(
            <ModuleSelectorScreen
                user={{ username: 'Diego', role: 'master' }}
                allowedModules={['obras', 'financeiro', 'planejamento']}
                onSelectModule={onSelectModule}
            />
        );

        expect(screen.getByText('Financeiro')).toBeInTheDocument();
        expect(screen.getByText('Planejamento')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Financeiro'));
        expect(onSelectModule).toHaveBeenCalledWith('financeiro');
    });
});
