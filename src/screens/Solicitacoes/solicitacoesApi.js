import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';

const base = `${API_URL}/solicitacoes`;

async function j(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.erro || data.msg || `Erro ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const solicitacoesApi = {
    // referência
    obras: () => fetchWithAuth(`${API_URL}/obras`).then(j),
    usuarios: () => fetchWithAuth(`${API_URL}/admin/users`).then(j),  // master only (config)

    // solicitações
    listar: (params = '') => fetchWithAuth(`${base}${params}`).then(j),
    detalhe: (id) => fetchWithAuth(`${base}/${id}`).then(j),
    criar: (body) =>
        fetchWithAuth(`${base}`, { method: 'POST', body: JSON.stringify(body) }).then(j),
    cancelar: (id) =>
        fetchWithAuth(`${base}/${id}/cancelar`, { method: 'PATCH' }).then(j),

    // cotações
    criarCotacao: (id, body, isForm) =>
        fetchWithAuth(`${base}/${id}/cotacoes`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    removerCotacao: (id, cotId) =>
        fetchWithAuth(`${base}/${id}/cotacoes/${cotId}`, { method: 'DELETE' }).then(j),
    arquivoCotacao: (id, cotId) =>
        fetchWithAuth(`${base}/${id}/cotacoes/${cotId}/arquivo`).then(j),

    // fluxo de decisão
    enviarAprovacao: (id) =>
        fetchWithAuth(`${base}/${id}/enviar-aprovacao`, { method: 'PATCH' }).then(j),
    aprovar: (id, cotacaoId) =>
        fetchWithAuth(`${base}/${id}/aprovar`, {
            method: 'POST', body: JSON.stringify({ cotacao_id: cotacaoId }),
        }).then(j),
    rejeitar: (id, motivo) =>
        fetchWithAuth(`${base}/${id}/rejeitar`, {
            method: 'POST', body: JSON.stringify({ motivo }),
        }).then(j),

    // config (master)
    getConfig: () => fetchWithAuth(`${base}/config`).then(j),
    putConfig: (body) =>
        fetchWithAuth(`${base}/config`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
};
