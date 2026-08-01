import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';


async function request(path, options = {}) {
    const response = await fetchWithAuth(`${API_URL}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload.erro || payload.message || 'Não foi possível concluir a operação.');
        error.status = response.status;
        error.field = payload.campo;
        error.details = payload.detalhes;
        throw error;
    }
    return payload;
}

export const planejamentoApi = {
    getPanel: (params = {}) => {
        const query = new URLSearchParams(params);
        return request(`/planejamento/painel?${query}`);
    },
    listActivities: (obraId, params = {}) => {
        const query = new URLSearchParams(params);
        return request(`/obras/${obraId}/planejamento/atividades?${query}`);
    },
    getBudget: (obraId) => request(`/obras/${obraId}/planejamento/orcamento-disponivel`),
    getSchedules: (obraId) => request(`/obras/${obraId}/cronograma`),
    getClosings: (obraId) => request(`/obras/${obraId}/planejamento/fechamentos`),
    createActivity: (obraId, data) => request(`/obras/${obraId}/planejamento/atividades`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateActivity: (activityId, data) => request(`/planejamento/atividades/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteActivity: (activityId) => request(`/planejamento/atividades/${activityId}`, {
        method: 'DELETE',
    }),
    importBudget: (obraId, data) => request(`/obras/${obraId}/planejamento/importar-orcamento`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    importSpreadsheet: (obraId, file, confirm = false) => {
        const form = new FormData();
        form.append('arquivo', file);
        if (confirm) form.append('confirmar', 'true');
        return request(`/obras/${obraId}/planejamento/importar-planilha`, {
            method: 'POST',
            body: form,
        });
    },
    addProgress: (activityId, data) => request(`/planejamento/atividades/${activityId}/apontamentos`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    addRestriction: (activityId, data) => request(`/planejamento/atividades/${activityId}/restricoes`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    resolveRestriction: (restrictionId) => request(`/planejamento/restricoes/${restrictionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolvida' }),
    }),
    closeWeek: (obraId, data) => request(`/obras/${obraId}/planejamento/fechamentos`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

export { request as planejamentoRequest };
