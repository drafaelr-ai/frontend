import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';

const base = `${API_URL}/almoxarifado`;

async function json(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(data.erro || data.msg || `Erro ${res.status}`);
        error.status = res.status;
        throw error;
    }
    return data;
}

export const almoxarifadoApi = {
    dashboard: () => fetchWithAuth(`${base}/dashboard`).then(json),
    referencias: () => fetchWithAuth(`${base}/referencias`).then(json),
    itensOrcamento: (obraId) => fetchWithAuth(`${API_URL}/obras/${obraId}/orcamento-eng/itens-lista`).then(json),
    itens: (params = '') => fetchWithAuth(`${base}/itens${params}`).then(json),
    criarItem: (body) => fetchWithAuth(`${base}/itens`, {
        method: 'POST', body: JSON.stringify(body),
    }).then(json),
    importarNotaFiscal: (formData) => fetchWithAuth(`${base}/entradas/importar-nf`, {
        method: 'POST', body: formData,
    }).then(json),
    criarEntradas: (body) => fetchWithAuth(`${base}/entradas`, {
        method: 'POST', body: JSON.stringify(body),
    }).then(json),
    editarItem: (id, body) => fetchWithAuth(`${base}/itens/${id}`, {
        method: 'PUT', body: JSON.stringify(body),
    }).then(json),
    inativarItem: (id) => fetchWithAuth(`${base}/itens/${id}`, { method: 'DELETE' }).then(json),
    movimentacoes: (params = '') => fetchWithAuth(`${base}/movimentacoes${params}`).then(json),
    criarMovimentacao: (body) => fetchWithAuth(`${base}/movimentacoes`, {
        method: 'POST', body: JSON.stringify(body),
    }).then(json),
};
