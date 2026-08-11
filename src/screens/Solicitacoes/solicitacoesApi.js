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

async function arquivo(res, nomePadrao) {
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.erro || data.msg || `Erro ${res.status}`);
        err.status = res.status;
        throw err;
    }
    const disposition = res.headers.get('content-disposition') || '';
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const simples = disposition.match(/filename="?([^";]+)"?/i);
    const nome = decodeURIComponent((utf8?.[1] || simples?.[1] || nomePadrao).trim());
    return { blob: await res.blob(), nome };
}

export const solicitacoesApi = {
    // referência
    obras: () => fetchWithAuth(`${API_URL}/obras`).then(j),
    usuarios: () => fetchWithAuth(`${API_URL}/admin/users`).then(j),  // master only (config)

    // solicitações
    listar: (params = '') => fetchWithAuth(`${base}${params}`).then(j),
    // histórico: compras já atendidas (fora da lista de compras)
    historico: (params = '') =>
        fetchWithAuth(`${base}?historico=true${params ? `&${params}` : ''}`).then(j),
    detalhe: (id) => fetchWithAuth(`${base}/${id}`).then(j),
    criar: (body, isForm) =>
        fetchWithAuth(`${base}`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    editar: (id, body, isForm) =>
        fetchWithAuth(`${base}/${id}`, {
            method: 'PATCH', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    lerPedido: (file) => {
        const body = new FormData();
        body.append('arquivo', file);
        return fetchWithAuth(`${base}/ler-pedido`, { method: 'POST', body }).then(j);
    },
    exportar: (id, formato) =>
        fetchWithAuth(`${base}/${id}/exportar.${formato}`)
            .then(res => arquivo(res, `solicitacao_${id}.${formato}`)),
    cancelar: (id) =>
        fetchWithAuth(`${base}/${id}/cancelar`, { method: 'PATCH' }).then(j),
    arquivoSolicitacao: (id) =>
        fetchWithAuth(`${base}/${id}/arquivo`).then(j),

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

    // baixa do comprador — sai da lista de compras e vai para o histórico
    atender: (id, { observacao = '', data_atendimento = null } = {}) =>
        fetchWithAuth(`${base}/${id}/atender`, {
            method: 'PATCH', body: JSON.stringify({ observacao, data_atendimento }),
        }).then(j),
    reabrir: (id) =>
        fetchWithAuth(`${base}/${id}/reabrir`, { method: 'PATCH' }).then(j),

    // config (master)
    getConfig: () => fetchWithAuth(`${base}/config`).then(j),
    putConfig: (body) =>
        fetchWithAuth(`${base}/config`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
};
