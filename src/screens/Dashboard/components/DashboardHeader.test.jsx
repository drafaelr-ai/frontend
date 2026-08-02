import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthContext } from '../../../auth/AuthContext';
import DashboardHeader from './DashboardHeader';


jest.mock('../../../layout/NotificacoesDropdown', () => () => <div data-testid="notificacoes" />);

describe('DashboardHeader', () => {
    it('usa o logo Obraly como atalho para o dashboard principal', () => {
        const onBackToSelector = jest.fn();

        render(
            <AuthContext.Provider value={{
                user: { nome: 'Diego Rafael', username: 'Diego' },
                logout: jest.fn(),
                onBackToSelector,
            }}>
                <DashboardHeader />
            </AuthContext.Provider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Ir para o dashboard principal' }));

        expect(onBackToSelector).toHaveBeenCalledTimes(1);
    });
});
