import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DetalheVeiculo } from './VeiculosFrota';
import { frotaApi } from './frotaApi';

jest.mock('./frotaApi', () => ({
    frotaApi: {
        documentos: jest.fn(),
        editarVeiculo: jest.fn(),
    },
}));

jest.mock('../../utils/notify', () => ({
    notify: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
    confirmDialog: jest.fn(),
}));

describe('DetalheVeiculo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        frotaApi.documentos.mockResolvedValue([]);
    });

    it('oferece edição do cadastro dentro do detalhe', async () => {
        render(
            <DetalheVeiculo
                veiculo={{
                    id: 8, placa: 'ABC1D23', modelo: 'Doblo', marca: 'Fiat',
                    tipo: 'carro', status: 'ativo', km_atual: 84808,
                }}
                obras={[]}
                imoveis={[]}
                condutores={[]}
                onVoltar={jest.fn()}
                onChanged={jest.fn()}
            />
        );

        await screen.findByText('Nenhum documento.');
        fireEvent.click(screen.getByRole('button', { name: 'Editar veículo' }));
        expect(screen.getByRole('heading', { name: 'Editar veículo' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doblo')).toBeInTheDocument();
    });
});
