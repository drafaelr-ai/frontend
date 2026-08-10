import { useCallback, useRef, useState } from 'react';

export default function useModuleTabHistory(initialTab) {
    const [tab, setTabState] = useState(initialTab);
    const historyRef = useRef([]);

    const setTab = useCallback((nextValue) => {
        setTabState((current) => {
            const next = typeof nextValue === 'function' ? nextValue(current) : nextValue;
            if (next !== current) historyRef.current.push(current);
            return next;
        });
    }, []);

    const goBack = useCallback(() => {
        const previous = historyRef.current.pop();
        if (previous === undefined) return false;
        setTabState(previous);
        return true;
    }, []);

    return { tab, setTab, goBack };
}
