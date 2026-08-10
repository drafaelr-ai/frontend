import { act, renderHook } from '@testing-library/react';
import useModuleTabHistory from './useModuleTabHistory';

describe('useModuleTabHistory', () => {
    it('volta pelas telas internas na ordem em que foram abertas', () => {
        const { result } = renderHook(() => useModuleTabHistory('inicio'));

        act(() => result.current.setTab('lista'));
        act(() => result.current.setTab('detalhe'));
        expect(result.current.tab).toBe('detalhe');

        act(() => expect(result.current.goBack()).toBe(true));
        expect(result.current.tab).toBe('lista');
        act(() => expect(result.current.goBack()).toBe(true));
        expect(result.current.tab).toBe('inicio');
        act(() => expect(result.current.goBack()).toBe(false));
    });
});
