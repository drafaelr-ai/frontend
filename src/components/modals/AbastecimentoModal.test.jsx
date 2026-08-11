import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AbastecimentoModal from './AbastecimentoModal';
import { frotaApi } from '../../screens/Frota/frotaApi';

jest.mock('../../screens/Frota/frotaApi', () => ({
    frotaApi: { criarAbastecimento: jest.fn() },
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
});
