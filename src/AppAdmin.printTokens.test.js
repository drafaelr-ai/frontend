/**
 * O relatório em PDF do módulo administrativo abre em window.open(), num
 * documento que NÃO carrega styles/tokens.css. Os tokens que ele usa
 * precisam estar definidos no `:root` do próprio template — senão a
 * propriedade fica inválida e a cor sai errada no papel, calada, sem
 * erro de build e sem aviso de lint.
 *
 * Já aconteceu: `--module-admin-dark` ficou um tempo sendo usado ali sem
 * definição. Este teste tranca a invariante.
 */
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'AppAdmin.js');

const extrairTemplateDeImpressao = (fonte) => {
    const ini = fonte.indexOf('const html = `<!DOCTYPE html>');
    expect(ini).toBeGreaterThan(-1);
    const fim = fonte.indexOf('</html>`;', ini);
    expect(fim).toBeGreaterThan(ini);
    return fonte.slice(ini, fim);
};

describe('documento de impressão do AppAdmin', () => {
    const fonte = fs.readFileSync(ARQUIVO, 'utf8');
    const template = extrairTemplateDeImpressao(fonte);

    const definidos = new Set(
        [...template.matchAll(/--([a-z0-9-]+)\s*:\s*#/g)].map(m => m[1])
    );
    const usados = new Set(
        [...template.matchAll(/var\(--([a-z0-9-]+)\)/g)].map(m => m[1])
    );

    it('define no :root todo token que usa', () => {
        const faltando = [...usados].filter(t => !definidos.has(t)).sort();
        expect(faltando).toEqual([]);
    });

    it('define os tokens com valor literal, não com var()', () => {
        // `--x: var(--x)` é auto-referência e invalida a cascata inteira.
        const autoRef = [...template.matchAll(/--([a-z0-9-]+)\s*:\s*var\(--([a-z0-9-]+)\)/g)]
            .map(m => m[0]);
        expect(autoRef).toEqual([]);
    });

    it('não usa classe de ícone Tabler, que não existe nesse documento', () => {
        // A fonte do Tabler não é carregada no documento de impressão:
        // um <i class="ti ti-x"> apareceria vazio.
        expect(template).not.toMatch(/class="ti\s/);
        expect(template).not.toMatch(/className=\{?[`'"]ti /);
    });
});
