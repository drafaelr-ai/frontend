import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { planejamentoApi } from './planejamentoApi';


jest.mock('../../auth/fetchWithAuth', () => ({ fetchWithAuth: jest.fn() }));
jest.mock('../../config', () => ({ API_URL: 'https://api.test' }));

function response(payload, ok = true, status = 200) {
    return { ok, status, json: jest.fn().mockResolvedValue(payload) };
}

describe('planejamentoApi', () => {
    beforeEach(() => fetchWithAuth.mockReset());

    it('carrega o painel consolidado de todas as obras', async () => {
        fetchWithAuth.mockResolvedValue(response({ obras: [], atividades: [] }));
        await planejamentoApi.getPanel({ inicio: '2026-08-01' });
        expect(fetchWithAuth).toHaveBeenCalledWith(
            'https://api.test/planejamento/painel?inicio=2026-08-01',
            {}
        );
    });

    it('lista atividades com filtros codificados', async () => {
        fetchWithAuth.mockResolvedValue(response({ itens: [] }));
        await planejamentoApi.listActivities(7, { busca: 'estrutura metálica', limit: 50 });
        expect(fetchWithAuth).toHaveBeenCalledWith(
            'https://api.test/obras/7/planejamento/atividades?busca=estrutura+met%C3%A1lica&limit=50',
            {}
        );
    });

    it('envia criação e importação do orçamento como JSON', async () => {
        fetchWithAuth.mockResolvedValue(response({ id: 1 }, true, 201));
        await planejamentoApi.createActivity(4, { titulo: 'Concretagem' });
        expect(fetchWithAuth).toHaveBeenLastCalledWith(
            'https://api.test/obras/4/planejamento/atividades',
            { method: 'POST', body: JSON.stringify({ titulo: 'Concretagem' }) }
        );

        await planejamentoApi.importBudget(4, { item_ids: [9] });
        expect(fetchWithAuth).toHaveBeenLastCalledWith(
            'https://api.test/obras/4/planejamento/importar-orcamento',
            { method: 'POST', body: JSON.stringify({ item_ids: [9] }) }
        );
    });

    it('usa FormData na prévia e confirmação de planilha', async () => {
        fetchWithAuth.mockResolvedValue(response({ valido: true }));
        const file = new File(['Atividade\nTeste'], 'plano.csv', { type: 'text/csv' });
        await planejamentoApi.importSpreadsheet(2, file, true);
        const [, options] = fetchWithAuth.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(options.body).toBeInstanceOf(FormData);
        expect(options.body.get('arquivo')).toBe(file);
        expect(options.body.get('confirmar')).toBe('true');
    });

    it('propaga a mensagem e o campo de erro do backend', async () => {
        fetchWithAuth.mockResolvedValue(response({ erro: 'Data inválida.', campo: 'data_fim' }, false, 400));
        await expect(planejamentoApi.updateActivity(1, {})).rejects.toMatchObject({
            message: 'Data inválida.',
            status: 400,
            field: 'data_fim',
        });
    });
});
