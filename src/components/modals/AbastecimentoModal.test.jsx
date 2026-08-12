import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AbastecimentoModal from './AbastecimentoModal';
import { frotaApi } from '../../screens/Frota/frotaApi';

jest.mock('../../screens/Frota/frotaApi', () => ({
    frotaApi: { criarAbastecimento: jest.fn(), editarAbastecimento: jest.fn() },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('AbastecimentoModal', () => {
    beforeEach(() => jest.clearAllMocks());

    it('calcula o valor por litro enquanto valor e litros são preenchidos', async () => {
        frotaApi.criarAbastecimento.mockResolvedValue({ id: 31, preco_litro: 7 });
        const onSaved = jest.fn();

        render(
            <AbastecimentoModal
                isOpen
                veiculos={[{ id: 5, placa: 'ABC1D23', modelo: 'Saveiro' }]}
                veiculoFixo={{ id: 5, placa: 'ABC1D23', modelo: 'Saveiro' }}
                condutores={[]}
                onClose={jest.fn()}
                onSaved={onSaved}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '350,00' } });
        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '50' } });

        expect(screen.getByLabelText('Valor por litro calculado')).toHaveValue('7,000');
        fireEvent.click(screen.getByRole('button', { name: /Salvar abastecimento/i }));

        await waitFor(() => expect(frotaApi.criarAbastecimento).toHaveBeenCalledWith(
            expect.objectContaining({ veiculo_id: 5, valor: '350,00', litros: '50' })
        ));
        expect(onSaved).toHaveBeenCalled();
    });

    it('carrega o abastecimento e salva a data corrigida no modo de edição', async () => {
        frotaApi.editarAbastecimento.mockResolvedValue({ id: 44 });
        const onSaved = jest.fn();

        render(
            <AbastecimentoModal
                isOpen
                abastecimento={{
                    id: 44, veiculo_id: 5, data: '2026-08-10', valor: 206.08,
                    litros: 60.97, km: 84808, combustivel: 'gasolina', posto: 'Tempus',
                }}
                veiculos={[{ id: 5, placa: 'ABC1D23', modelo: 'Doblo' }]}
                condutores={[]}
                onClose={jest.fn()}
                onSaved={onSaved}
            />
        );

        expect(screen.getByText('Editar abastecimento')).toBeInTheDocument();
        expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
        fireEvent.change(screen.getByDisplayValue('2026-08-10'), {
            target: { value: '2026-08-09' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

        await waitFor(() => expect(frotaApi.editarAbastecimento).toHaveBeenCalledWith(
            44,
            expect.objectContaining({ data: '2026-08-09', veiculo_id: 5 }),
        ));
        expect(frotaApi.criarAbastecimento).not.toHaveBeenCalled();
        expect(onSaved).toHaveBeenCalled();
    });
});
