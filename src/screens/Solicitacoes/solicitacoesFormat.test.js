import { diasDesdeSolicitacao, textoDiasSolicitado } from './solicitacoesFormat';

describe('tempo da solicitação', () => {
    it('conta dias civis sem interferência de horário ou fuso', () => {
        expect(diasDesdeSolicitacao('2026-08-04T23:50:00', '2026-08-09T00:05:00')).toBe(5);
        expect(textoDiasSolicitado('2026-08-08', '2026-08-09')).toBe('1 dia');
        expect(textoDiasSolicitado('2026-08-09', '2026-08-09')).toBe('0 dias');
    });

    it('não apresenta tempo negativo', () => {
        expect(textoDiasSolicitado('2026-08-10', '2026-08-09')).toBe('0 dias');
    });
});
