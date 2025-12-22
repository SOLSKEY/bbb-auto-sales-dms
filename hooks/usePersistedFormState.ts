import { useState, useEffect, useCallback } from 'react';

export function usePersistedFormState<T>(
    key: string,
    initialState: T,
    options: { storage?: 'session' | 'local' } = {}
) {
    const { storage = 'session' } = options;
    const storageApi = storage === 'local' ? localStorage : sessionStorage;
    
    const [state, setState] = useState<T>(() => {
        try {
            const saved = storageApi.getItem(key);
            return saved ? JSON.parse(saved) : initialState;
        } catch {
            return initialState;
        }
    });

    useEffect(() => {
        try {
            storageApi.setItem(key, JSON.stringify(state));
        } catch (err) {
            console.warn('Failed to persist form state:', err);
        }
    }, [key, state, storageApi]);

    const clearPersistedState = useCallback(() => {
        storageApi.removeItem(key);
        setState(initialState);
    }, [key, initialState, storageApi]);

    return [state, setState, clearPersistedState] as const;
}

