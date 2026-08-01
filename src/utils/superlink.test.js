import { montarParcelasParaSuperlink } from './superlink';

describe('montarParcelasParaSuperlink', () => {
  it('inclui cada parcela pendente com o valor e meio de pagamento corretos', () => {
    const itens = montarParcelasParaSuperlink([{
      status: 'Ativo',
      descricao: 'Locação de andaime',
      numero_parcelas: 3,
      pix: 'fornecedor@pix',
      parcelas: [
        { id: 101, numero_parcela: 1, valor_parcela: 250.5, status: 'Previsto', data_vencimento: '2026-08-10' },
        { id: 102, numero_parcela: 2, valor_parcela: 300, status: 'Previsto', codigo_barras: '83660000000' },
        { id: 103, numero_parcela: 3, valor_parcela: 300, status: 'Pago' },
      ],
    }], 'Obra Central');

    expect(itens).toEqual([
      expect.objectContaining({
        id: 'parcela-101',
        descricao: 'Locação de andaime · parcela 1/3',
        valor: 250.5,
        pix_chave: 'fornecedor@pix',
        dataVencimento: '2026-08-10',
      }),
      expect.objectContaining({
        id: 'parcela-102',
        valor: 300,
        codigo_barras: '83660000000',
      }),
    ]);
  });

  it('não inclui parcelas encerradas nem parcelamentos inativos', () => {
    const itens = montarParcelasParaSuperlink([
      { status: 'Ativo', parcelas: [{ id: 1, status: 'Cancelado', valor_parcela: 10 }] },
      { status: 'Concluído', parcelas: [{ id: 2, status: 'Previsto', valor_parcela: 10 }] },
    ]);

    expect(itens).toEqual([]);
  });
});
