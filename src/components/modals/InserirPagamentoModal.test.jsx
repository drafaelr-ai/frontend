import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InserirPagamentoModal from './InserirPagamentoModal';

// Rede de seguranca escrita ANTES de consolidar os 23 useState (F-06): o que
// importa e que o payload entregue ao onSave nao mude. Sem isto o refactor
// seria no escuro — o arquivo tem 677 linhas e nenhum teste o cobria.

const abrir = (props = {}) => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const utils = render(
        <InserirPagamentoModal
            onClose={() => {}}
            onSave={onSave}
            itensOrcamento={[]}
            obraId={1}
            embedded
            {...props}
        />,
    );
    return { onSave, ...utils };
};

const preencherBasico = ({ descricao = 'Cimento', valor = '1000' } = {}) => {
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: descricao } });
    fireEvent.change(screen.getByLabelText('Valor total'), { target: { value: valor } });
};

const salvarEFechar = () =>
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Fechar/ }));

describe('InserirPagamentoModal — à vista', () => {
    it('entrega o payload à vista, sem campos de parcelamento', async () => {
        const { onSave } = abrir();
        preencherBasico();
        salvarEFechar();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const [dados, salvarENovo] = onSave.mock.calls[0];
        expect(dados).toMatchObject({
            descricao: 'Cimento',
            valor: 1000,
            tipo: 'Material',
            status: 'A Pagar',
            tipo_forma_pagamento: 'avista',
            meio_pagamento: 'PIX',
            fornecedor: null,
            orcamento_item_id: null,
        });
        expect(dados).not.toHaveProperty('numero_parcelas');
        expect(salvarENovo).toBe(false);
    });

    it('converte valor para número e fornecedor vazio para null', async () => {
        const { onSave } = abrir();
        preencherBasico({ valor: '250.50' });
        salvarEFechar();
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0].valor).toBe(250.5);
        expect(onSave.mock.calls[0][0].fornecedor).toBeNull();
    });
});

describe('InserirPagamentoModal — parcelado', () => {
    const irParaParcelado = () =>
        fireEvent.click(screen.getByRole('radio', { name: /Parcelado/ }));

    it('entrega número de parcelas e periodicidade', async () => {
        const { onSave } = abrir();
        preencherBasico({ valor: '1200' });
        irParaParcelado();
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '3' } });
        salvarEFechar();

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toMatchObject({
            tipo_forma_pagamento: 'parcelado',
            numero_parcelas: 3,
            periodicidade: 'Mensal',
        });
    });

    it('calcula entrada e valor da parcela sobre o restante', async () => {
        const { onSave } = abrir();
        preencherBasico({ valor: '1000' });
        irParaParcelado();
        fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('checkbox', { name: /entrada/i }));
        salvarEFechar();

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        const dados = onSave.mock.calls[0][0];
        // 30% de entrada e o padrao; as 2 parcelas dividem os 700 restantes.
        expect(dados.tem_entrada).toBe(true);
        expect(dados.percentual_entrada).toBe(30);
        expect(dados.valor_entrada).toBeCloseTo(300, 2);
        expect(dados.valor_parcela).toBeCloseTo(350, 2);
    });
});

describe('InserirPagamentoModal — salvar e novo', () => {
    it('limpa descrição e valor mas mantém o fornecedor, e conta o inserido', async () => {
        const { onSave } = abrir();
        preencherBasico();
        fireEvent.change(screen.getByLabelText('Fornecedor'), { target: { value: 'Fornecedor X' } });
        fireEvent.click(screen.getByRole('button', { name: /Salvar e Novo/ }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][1]).toBe(true);

        expect(await screen.findByRole('button', { name: /Fechar \(1 inserido\)/ }))
            .toBeInTheDocument();
        expect(screen.getByLabelText('Descrição')).toHaveValue('');
        expect(screen.getByLabelText('Valor total')).toHaveValue(null);
        // O fornecedor é mantido de propósito: lançar vários do mesmo fornecedor.
        expect(screen.getByLabelText('Fornecedor')).toHaveValue('Fornecedor X');
    });
});

describe('InserirPagamentoModal — obra obrigatória', () => {
    it('não salva quando há lista de obras e nenhuma escolhida', async () => {
        const { onSave } = abrir({ obras: [{ id: 1, nome: 'Obra A' }], obraId: '' });
        preencherBasico();
        salvarEFechar();
        await waitFor(() => expect(onSave).not.toHaveBeenCalled());
    });
});
