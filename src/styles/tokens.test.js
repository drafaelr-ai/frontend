/**
 * Guarda da regra do design system: "nenhuma cor hex fora do tokens.css".
 *
 * Dois perigos que nem o build nem o lint pegam:
 *  1. `var(--tipo-errado)` — CSS inválido é simplesmente ignorado pelo
 *     navegador, então a cor sai errada calada;
 *  2. hex voltando a aparecer solto no código.
 *
 * As exceções são explícitas e cada uma tem motivo. Para adicionar uma,
 * é preciso justificar aqui.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const listar = (dir, filtro, acc = []) => {
    for (const nome of fs.readdirSync(dir)) {
        const alvo = path.join(dir, nome);
        const st = fs.statSync(alvo);
        if (st.isDirectory()) listar(alvo, filtro, acc);
        else if (filtro.test(nome)) acc.push(alvo);
    }
    return acc;
};

const arquivosCss = listar(RAIZ, /\.css$/);
const arquivosJs = listar(RAIZ, /\.jsx?$/).filter(f => !/\.test\.jsx?$/.test(f));

/** Onde um hex literal é a única forma possível. */
const EXCECOES_HEX = [
    {
        arquivo: 'AppAdmin.js',
        motivo: 'O relatório abre em window.open(), fora do tokens.css: '
            + 'o :root daquele documento precisa definir os tokens com valor.',
        teste: linha => /--[a-z-]+\s*:\s*#/.test(linha),
    },
    {
        arquivo: 'prepareUpload.js',
        motivo: '<canvas> não resolve var() — ctx.fillStyle cai para preto.',
        teste: linha => /fillStyle/.test(linha),
    },
    {
        arquivo: 'nativePush.js',
        motivo: 'Atravessa a ponte do Capacitor para o canal de notificação '
            + 'do Android, que não lê CSS.',
        teste: linha => /lightColor/.test(linha),
    },
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;

describe('tokens do design system', () => {
    const definidos = new Set();
    for (const f of arquivosCss) {
        const txt = fs.readFileSync(f, 'utf8');
        for (const m of txt.matchAll(/(--[a-z0-9-]+)\s*:/g)) definidos.add(m[1]);
    }
    // Alguns tokens de contexto são definidos em <style> dentro de JS.
    for (const f of arquivosJs) {
        const txt = fs.readFileSync(f, 'utf8');
        for (const m of txt.matchAll(/(--[a-z0-9-]+)\s*:\s*(?:#|var\()/g)) definidos.add(m[1]);
    }

    it('encontra os tokens do tokens.css', () => {
        expect(definidos.has('--status-danger')).toBe(true);
        expect(definidos.has('--chart-1')).toBe(true);
        expect(definidos.size).toBeGreaterThan(80);
    });

    it('todo var(--x) usado tem definição', () => {
        const orfaos = [];
        for (const f of [...arquivosCss, ...arquivosJs]) {
            const txt = fs.readFileSync(f, 'utf8');
            txt.split('\n').forEach((linha, i) => {
                // `var(--chart-${n})` é montado em tempo de execução, e
                // `var(--x)` aparece em comentário como exemplo.
                if (/var\(--[a-z0-9-]*\$\{/.test(linha)) return;
                if (/^\s*(\*|\/\/)/.test(linha)) return;
                for (const m of linha.matchAll(/var\((--[a-z0-9-]+)/g)) {
                    if (!definidos.has(m[1])) {
                        orfaos.push(`${path.relative(RAIZ, f)}:${i + 1} ${m[1]}`);
                    }
                }
            });
        }
        expect(orfaos).toEqual([]);
    });

    it('não tem hex solto fora do tokens.css, salvo exceção justificada', () => {
        const soltos = [];
        for (const f of arquivosJs) {
            const base = path.basename(f);
            const excecoes = EXCECOES_HEX.filter(e => e.arquivo === base);
            fs.readFileSync(f, 'utf8').split('\n').forEach((linha, i) => {
                if (!HEX.test(linha)) return;
                if (excecoes.some(e => e.teste(linha))) return;
                soltos.push(`${path.relative(RAIZ, f)}:${i + 1} ${linha.trim().slice(0, 90)}`);
            });
        }
        expect(soltos).toEqual([]);
    });
});
