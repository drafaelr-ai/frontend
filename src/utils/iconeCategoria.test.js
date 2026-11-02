import { iconeCategoria, ICONE_CATEGORIA_PADRAO } from './iconeCategoria';

describe('iconeCategoria', () => {
    it('traduz os emoji das categorias padrão do admin', () => {
        expect(iconeCategoria('🏛️')).toBe('ti-building-bank');
        expect(iconeCategoria('🏢')).toBe('ti-building-community');
        expect(iconeCategoria('💧')).toBe('ti-droplet');
        expect(iconeCategoria('🏠')).toBe('ti-home');
        expect(iconeCategoria('💰')).toBe('ti-coins');
    });

    it('aceita emoji com e sem o seletor de variação U+FE0F', () => {
        expect(iconeCategoria('🏗️')).toBe('ti-bricks');
        expect(iconeCategoria('🏗')).toBe('ti-bricks');
        expect(iconeCategoria('🛡️')).toBe('ti-shield-check');
        expect(iconeCategoria('🛡')).toBe('ti-shield-check');
    });

    it('deixa passar um valor que já é classe Tabler', () => {
        expect(iconeCategoria('ti-gas-station')).toBe('ti-gas-station');
        expect(iconeCategoria('  ti-wallet  ')).toBe('ti-wallet');
    });

    it('cai no padrão para valor vazio, desconhecido ou inválido', () => {
        [undefined, null, '', '   ', 42, {}, '🦄'].forEach(valor => {
            expect(iconeCategoria(valor)).toBe(ICONE_CATEGORIA_PADRAO);
        });
    });

    it('nunca devolve emoji', () => {
        const emEmoji = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}]/u;
        ['🏛️', '📡', '🧽', 'ti-cash', '', 'desconhecido'].forEach(valor => {
            expect(iconeCategoria(valor)).not.toMatch(emEmoji);
            expect(iconeCategoria(valor)).toMatch(/^ti-[a-z0-9-]+$/);
        });
    });
});
