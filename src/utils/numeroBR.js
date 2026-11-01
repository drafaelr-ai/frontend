/**
 * Leitura de número escrito à brasileira, em um lugar só.
 *
 * O mesmo parser estava copiado em cinco arquivos, e todas as cópias tinham o
 * mesmo ponto cego: sem vírgula no texto, o ponto era tratado como decimal.
 * Resultado — '1.250', que é como se digita mil duzentos e cinquenta, virava
 * 1.25. Sem erro nenhum, com o valor mil vezes menor enviado para a API.
 *
 * A regra depende do que o número significa, e é por isso que `milhar` existe:
 *
 * - Dinheiro (`milhar: true`, padrão): '1.250' é 1250. Ninguém digita R$ 1,25
 *   como "1.250", e um valor de mil reais escrito assim é comum.
 * - Preço unitário com três decimais (`milhar: false`): '5.899' é 5.899.
 *   Combustível a R$ 5,899 por litro é o normal; R$ 5.899 por litro é absurdo.
 *
 * Com vírgula presente o caso é inequívoco nos dois modos: a vírgula é o
 * decimal e o ponto é separador de milhar.
 *
 * Espelha services/numero_br.py no backend, que é a fonte da verdade — o
 * preview na tela não pode divergir do que a API grava.
 */

const MILHAR_BR = /^-?\d{1,3}(\.\d{3})+$/;

export function paraNumero(valor, { milhar = true } = {}) {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'boolean') return null;
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

    let texto = String(valor).replace(/r\$/gi, '').trim().replace(/\s/g, '');
    if (!texto) return null;
    if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
    else if (milhar && MILHAR_BR.test(texto)) texto = texto.replace(/\./g, '');

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
}

/** Preço unitário com três decimais: aqui o ponto é sempre decimal. */
export function paraPreco(valor) {
    return paraNumero(valor, { milhar: false });
}
