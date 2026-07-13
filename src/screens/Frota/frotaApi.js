import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';

const base = `${API_URL}/frota`;

async function j(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.erro || data.msg || `Erro ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const frotaApi = {
    // referência
    obras: () => fetchWithAuth(`${API_URL}/obras`).then(j),
    imoveisAdmin: () => fetchWithAuth(`${base}/imoveis-admin`).then(j),
    funcionarios: () => fetchWithAuth(`${API_URL}/rh/funcionarios?status=ativo`).then(j),

    // veículos
    veiculos: (params = '') => fetchWithAuth(`${base}/veiculos${params}`).then(j),
    veiculo: (id) => fetchWithAuth(`${base}/veiculos/${id}`).then(j),
    criarVeiculo: (body) =>
        fetchWithAuth(`${base}/veiculos`, { method: 'POST', body: JSON.stringify(body) }).then(j),
    editarVeiculo: (id, body) =>
        fetchWithAuth(`${base}/veiculos/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
    inativarVeiculo: (id) =>
        fetchWithAuth(`${base}/veiculos/${id}`, { method: 'DELETE' }).then(j),
    atribuirCondutor: (id, condutorId) =>
        fetchWithAuth(`${base}/veiculos/${id}/condutor`, {
            method: 'PATCH', body: JSON.stringify({ condutor_id: condutorId }),
        }).then(j),

    // movimentações
    movimentacoes: (veiculoId) =>
        fetchWithAuth(`${base}/veiculos/${veiculoId}/movimentacoes`).then(j),
    criarMovimentacao: (veiculoId, body) =>
        fetchWithAuth(`${base}/veiculos/${veiculoId}/movimentacoes`, {
            method: 'POST', body: JSON.stringify(body),
        }).then(j),

    // condutores
    condutores: (params = '') => fetchWithAuth(`${base}/condutores${params}`).then(j),
    criarCondutor: (body) =>
        fetchWithAuth(`${base}/condutores`, { method: 'POST', body: JSON.stringify(body) }).then(j),
    editarCondutor: (id, body) =>
        fetchWithAuth(`${base}/condutores/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
    inativarCondutor: (id) =>
        fetchWithAuth(`${base}/condutores/${id}`, { method: 'DELETE' }).then(j),

    // documentos
    documentos: (veiculoId) =>
        fetchWithAuth(`${base}/veiculos/${veiculoId}/documentos`).then(j),
    criarDocumento: (veiculoId, body, isForm) =>
        fetchWithAuth(`${base}/veiculos/${veiculoId}/documentos`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    editarDocumento: (id, body, isForm) =>
        fetchWithAuth(`${base}/documentos/${id}`, {
            method: 'PUT', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    removerDocumento: (id) =>
        fetchWithAuth(`${base}/documentos/${id}`, { method: 'DELETE' }).then(j),

    // manutenções
    manutencoes: (params = '') => fetchWithAuth(`${base}/manutencoes${params}`).then(j),
    criarManutencao: (body, isForm) =>
        fetchWithAuth(`${base}/manutencoes`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    editarManutencao: (id, body, isForm) =>
        fetchWithAuth(`${base}/manutencoes/${id}`, {
            method: 'PUT', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    removerManutencao: (id) =>
        fetchWithAuth(`${base}/manutencoes/${id}`, { method: 'DELETE' }).then(j),

    // abastecimentos
    abastecimentos: (params = '') => fetchWithAuth(`${base}/abastecimentos${params}`).then(j),
    criarAbastecimento: (body) =>
        fetchWithAuth(`${base}/abastecimentos`, { method: 'POST', body: JSON.stringify(body) }).then(j),
    editarAbastecimento: (id, body) =>
        fetchWithAuth(`${base}/abastecimentos/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
    removerAbastecimento: (id) =>
        fetchWithAuth(`${base}/abastecimentos/${id}`, { method: 'DELETE' }).then(j),

    // multas
    multas: (params = '') => fetchWithAuth(`${base}/multas${params}`).then(j),
    criarMulta: (body, isForm) =>
        fetchWithAuth(`${base}/multas`, {
            method: 'POST', body: isForm ? body : JSON.stringify(body),
        }).then(j),
    editarMulta: (id, body) =>
        fetchWithAuth(`${base}/multas/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(j),
    removerMulta: (id) =>
        fetchWithAuth(`${base}/multas/${id}`, { method: 'DELETE' }).then(j),

    // arquivo (signed url) + dashboard
    arquivoUrl: (tipo, id) => fetchWithAuth(`${base}/arquivo/${tipo}/${id}`).then(j),
    dashboard: (competencia) => fetchWithAuth(`${base}/dashboard?competencia=${competencia}`).then(j),
};
