const STATUS_ENCERRADOS = new Set(['pago', 'cancelado']);

/**
 * Converte parcelas pendentes em itens independentes para o Superlink.
 * Assim cada vencimento mantém seu valor e deixa de aparecer quando pago.
 */
export function montarParcelasParaSuperlink(pagamentosParcelados = [], obraNome = '') {
  return pagamentosParcelados.flatMap((pagamento) => {
    if (pagamento.status !== 'Ativo') return [];

    return (pagamento.parcelas || [])
      .filter((parcela) => !STATUS_ENCERRADOS.has(String(parcela.status || '').toLowerCase()))
      .map((parcela) => {
        const numero = Number(parcela.numero_parcela);
        const referencia = numero === 0
          ? 'entrada'
          : `parcela ${numero}${pagamento.numero_parcelas ? `/${pagamento.numero_parcelas}` : ''}`;

        return {
          id: `parcela-${parcela.id}`,
          descricao: `${pagamento.descricao || pagamento.fornecedor || 'Pagamento parcelado'} · ${referencia}`,
          valor: Number(parcela.valor_parcela) || 0,
          tipo: 'parcelado',
          contexto: obraNome,
          pix_chave: pagamento.pix || '',
          codigo_barras: parcela.codigo_barras || '',
          dataVencimento: parcela.data_vencimento || '',
        };
      });
  });
}
