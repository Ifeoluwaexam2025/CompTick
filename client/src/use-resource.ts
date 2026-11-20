import { useEffect, useState } from 'react';
import { errorMessage } from './api/client';

type Result<T> = { data?: T; error?: string };

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, revision = 0) {
    const [result, setResult] = useState<{ load: typeof load; revision: number; value: Result<T> }>();
    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal).then(
            data => { if (!controller.signal.aborted) setResult({ load, revision, value: { data } }); },
            error => { if (!controller.signal.aborted) setResult({ load, revision, value: { error: errorMessage(error) } }); }
        );
        return () => controller.abort();
    }, [load, revision]);

    const value = result?.load === load && result.revision === revision ? result.value : undefined;
    return { ...value, loading: !value };
}
