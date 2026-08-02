const parseNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const isVerbaUnit = (unidade) => String(unidade || '').trim().toLowerCase() === 'vb';

export const hasPositiveBudgetValue = (form) => {
    if (form.tipo_composicao === 'composto' || form.tipo_composicao === 'fornecimento') {
        return parseNumber(form.preco_unitario) > 0;
    }

    return parseNumber(form.preco_mao_obra) > 0 || parseNumber(form.preco_material) > 0;
};

export const getEffectiveBudgetQuantity = (form) => {
    const quantidade = parseNumber(form.quantidade);
    if (quantidade > 0) return quantidade;
    return isVerbaUnit(form.unidade) ? 1 : 0;
};

export const normalizeBudgetForm = (form) => ({
    ...form,
    quantidade: getEffectiveBudgetQuantity(form)
});

export const getBudgetQuantityError = (form) => {
    if (parseNumber(form.quantidade) < 0) {
        return 'A quantidade não pode ser negativa';
    }
    if (!isVerbaUnit(form.unidade) && hasPositiveBudgetValue(form) && getEffectiveBudgetQuantity(form) <= 0) {
        return 'Informe uma quantidade maior que zero para calcular o valor do item';
    }
    return null;
};

export const calculateBudgetItemTotals = (form) => {
    const quantidade = getEffectiveBudgetQuantity(form);

    if (form.tipo_composicao === 'composto' || form.tipo_composicao === 'fornecimento') {
        const total = quantidade * parseNumber(form.preco_unitario);
        return { quantidade, maoObra: 0, material: 0, total };
    }

    const maoObra = quantidade * parseNumber(form.preco_mao_obra);
    const material = quantidade * parseNumber(form.preco_material);
    return { quantidade, maoObra, material, total: maoObra + material };
};
