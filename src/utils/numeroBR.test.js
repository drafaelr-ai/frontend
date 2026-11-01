import { paraNumero, paraPreco } from './numeroBR';

describe('paraNumero — dinheiro (padrão)', () => {
    it('lê milhar BR sem centavos', () => {
        // O bug que isto conserta: '1.250' virava 1.25 em cinco arquivos.
        expect(paraNumero('1.250')).toBe(1250);
        expect(paraNumero('10.000')).toBe(10000);
        expect(paraNumero('1.000.000')).toBe(1000000);
        expect(paraNumero('R$ 2.500')).toBe(2500);
        expect(paraNumero('-1.250')).toBe(-1250);
    });

    it('lê milhar com centavos', () => {
        expect(paraNumero('2.640,00')).toBe(2640);
        expect(paraNumero('1.250,50')).toBe(1250.5);
        expect(paraNumero('R$ 1.250,50')).toBe(1250.5);
    });

    it('lê vírgula sozinha', () => {
        expect(paraNumero('2640,00')).toBe(2640);
        expect(paraNumero('250,33')).toBe(250.33);
    });

    it('não quebra ponto decimal que não é milhar', () => {
        expect(paraNumero('1250.50')).toBe(1250.5);
        expect(paraNumero('12.34')).toBe(12.34);
        expect(paraNumero('1.25')).toBe(1.25);
    });

    it('passa número nativo direto', () => {
        expect(paraNumero(1250)).toBe(1250);
        expect(paraNumero(0)).toBe(0);
    });

    it('devolve null para vazio e inválido', () => {
        [null, undefined, '', '   ', 'abc', 'R$', true, false, NaN, Infinity]
            .forEach(v => expect(paraNumero(v)).toBeNull());
    });
});

describe('paraPreco — preço unitário de três decimais', () => {
    it('trata o ponto como decimal', () => {
        // R$ 5,899 por litro é o normal; R$ 5.899 por litro é absurdo.
        expect(paraPreco('5.899')).toBe(5.899);
        expect(paraPreco('1.250')).toBe(1.25);
    });

    it('mantém a vírgula inequívoca', () => {
        expect(paraPreco('5,899')).toBe(5.899);
        expect(paraPreco('1.250,50')).toBe(1250.5);
    });
});
