import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';

const base = `${API_URL}/rh`;

async function j(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.erro || data.msg || `Erro ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const rhApi = {
    // referência
    obras: () => fetchWithAuth(`${API_URL}/obras`).then(j),
    categorias: () => fetchWithAuth(`${base}/categorias`).then(j),
    criarCategoria: (body) =>
        fetchWithAuth(`${base}/categorias`, { method: 'POST', body: JSON.stringify(body) }).then(j),

    // convenções
    convencoes: () => fetchWithAuth(`${base}/convencoes`).then(j),
    convencao: (id) => fetchWithAuth(`${base}/convencoes/${id}`).then(j),
    extrairCct: (formData) =>
        fetchWithAuth(`${base}/convencoes/extrair`, { method: 'POST', body: formData }).then(j),
    criarConvencao: (formData) =>
        fetchWithAuth(`${base}/convencoes`, { method: 'POST', body: formData }).then(j),
    removerConvencao: (id) =>
        fetchWithAuth(`${base}/convencoes/${id}`, { method: 'DELETE' }).then(j),

    // funcionários
    funcionarios: (params = '') => fetchWithAuth(`${base}/funcionarios${params}`).then(j),
    pisoSugerido: (categoriaId, obraId) =>
        fetchWithAuth(
            `${base}/funcionarios/piso-sugerido?categoria_id=${categoriaId || ''}&obra_id=${obraId || ''}`,
        ).then(j),
    criarFuncionario: (body) =>
        fetchWithAuth(`${base}/funcionarios`, { method: 'POST', body: JSON.stringify(body) }).then(j),
    editarFuncionario: (id, body) =>
        fetchWithAuth(`${base}/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
    importarFuncionarios: (formData) =>
        fetchWithAuth(`${base}/funcionarios/importar`, { method: 'POST', body: formData }).then(j),
    migrarObra: (id, obraId) =>
        fetchWithAuth(`${base}/funcionarios/${id}/obra`, {
            method: 'PATCH', body: JSON.stringify({ obra_id: obraId }),
        }).then(j),
    inativarFuncionario: (id) =>
        fetchWithAuth(`${base}/funcionarios/${id}`, { method: 'DELETE' }).then(j),

    // pagamentos
    pagamentos: (params = '') => fetchWithAuth(`${base}/pagamentos${params}`).then(j),
    criarPagamento: (body, isForm) =>
        fetchWithAuth(`${base}/pagamentos`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    removerPagamento: (id) =>
        fetchWithAuth(`${base}/pagamentos/${id}`, { method: 'DELETE' }).then(j),

    // encargos
    encargos: (params = '') => fetchWithAuth(`${base}/encargos${params}`).then(j),
    sugestaoEncargo: (tipo, competencia, obraId) =>
        fetchWithAuth(
            `${base}/encargos/sugestao?tipo=${tipo}&competencia=${competencia}&obra_id=${obraId || ''}`,
        ).then(j),
    criarEncargo: (body, isForm) =>
        fetchWithAuth(`${base}/encargos`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    importarEncargos: (formData) =>
        fetchWithAuth(`${base}/encargos/importar`, { method: 'POST', body: formData }).then(j),
    removerEncargo: (id) =>
        fetchWithAuth(`${base}/encargos/${id}`, { method: 'DELETE' }).then(j),

    // arquivo (signed url) + dashboard
    arquivoUrl: (tipo, id) => fetchWithAuth(`${base}/arquivo/${tipo}/${id}`).then(j),
    dashboard: (competencia) => fetchWithAuth(`${base}/dashboard?competencia=${competencia}`).then(j),
};
