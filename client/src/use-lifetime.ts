import { useEffect, useRef } from 'react';

export function useLifetime() {
    const current = useRef<AbortController>(null);
    useEffect(() => {
        const controller = new AbortController();
        current.current = controller;
        return () => controller.abort();
    }, []);
    return current;
}
