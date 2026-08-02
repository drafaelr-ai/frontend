import {
    calculateBudgetItemTotals,
    getBudgetQuantityError,
    getEffectiveBudgetQuantity,
    normalizeBudgetForm
} from './orcamentoItem';

describe('regras de quantidade do item de orçamento', () => {
    test('verba com valor e quantidade zero assume uma unidade', () => {
        const form = {
            unidade: 'vb',
            quantidade: '0',
            tipo_composicao: 'separado',
            preco_mao_obra: '4000',
            preco_material: '4000'
        };

        expect(getEffectiveBudgetQuantity(form)).toBe(1);
        expect(normalizeBudgetForm(form).quantidade).toBe(1);
        expect(calculateBudgetItemTotals(form)).toEqual({
            quantidade: 1,
            maoObra: 4000,
            material: 4000,
            total: 8000
        });
        expect(getBudgetQuantityError(form)).toBeNull();
    });

    test('mantém a quantidade informada para verba', () => {
        expect(getEffectiveBudgetQuantity({ unidade: 'vb', quantidade: '2' })).toBe(2);
    });

    test('rejeita valor positivo sem quantidade em unidades mensuráveis', () => {
        const form = {
            unidade: 'm²',
            quantidade: '0',
            tipo_composicao: 'composto',
            preco_unitario: '150'
        };

        expect(getEffectiveBudgetQuantity(form)).toBe(0);
        expect(getBudgetQuantityError(form)).toBe(
            'Informe uma quantidade maior que zero para calcular o valor do item'
        );
    });

    test('rejeita quantidade negativa', () => {
        expect(getBudgetQuantityError({ unidade: 'un', quantidade: '-1' })).toBe(
            'A quantidade não pode ser negativa'
        );
    });
});
