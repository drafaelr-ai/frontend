import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VeiculoModal from './VeiculoModal';
import { frotaApi } from '../../screens/Frota/frotaApi';

jest.mock('../../screens/Frota/frotaApi', () => ({
    frotaApi: { editarVeiculo: jest.fn(), criarVeiculo: jest.fn() },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

describe('VeiculoModal em modo de edição', () => {
    beforeEach(() => jest.clearAllMocks());

    it('preenche os dados e salva as alterações do veículo', async () => {
        const atualizado = { id: 8, placa: 'ABC1D23', modelo: 'Doblo Cargo' };
        frotaApi.editarVeiculo.mockResolvedValue(atualizado);
        const onSaved = jest.fn();

        render(
            <VeiculoModal
                isOpen
                veiculo={{
                    id: 8, placa: 'ABC1D23', modelo: 'Doblo', marca: 'Fiat',
                    tipo: 'carro', status: 'ativo', km_atual: 84808,
                }}
                obras={[]}
                imoveis={[]}
                onClose={jest.fn()}
                onSaved={onSaved}
            />
        );

        expect(screen.getByRole('heading', { name: 'Editar veículo' })).toBeInTheDocument();
        fireEvent.change(screen.getByDisplayValue('Doblo'), { target: { value: 'Doblo Cargo' } });
        fireEvent.click(screen.getByRole('button', { name: /Salvar veículo/i }));

        await waitFor(() => expect(frotaApi.editarVeiculo).toHaveBeenCalledWith(
            8, expect.objectContaining({ placa: 'ABC1D23', modelo: 'Doblo Cargo', km_atual: 84808 })
        ));
        expect(onSaved).toHaveBeenCalledWith(atualizado);
    });
});
