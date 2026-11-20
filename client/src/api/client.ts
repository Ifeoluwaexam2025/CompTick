const apiOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

export type Api = <T>(path: string, options?: RequestInit) => Promise<T>;

export function createApi(token?: string, onUnauthorized?: () => void): Api {
    return async <T>(path: string, options: RequestInit = {}): Promise<T> => {
        const headers = new Headers(options.headers);
        headers.set('Accept', 'application/json');
        if (options.body) headers.set('Content-Type', 'application/json');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        const response = await fetch(`${apiOrigin}/api${path}`, { ...options, headers });
        if (response.status === 401 && !options.signal?.aborted) onUnauthorized?.();
        const body: unknown = await response.json().catch(() => undefined);
        if (!response.ok) {
            const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
                ? body.message : `Request failed (${response.status}).`;
            throw new ApiError(response.status, message);
        }
        if (body === undefined) throw new Error('The API did not return JSON.');
        return body as T;
    };
}

export function errorMessage(error: unknown): string {
    return error instanceof TypeError
        ? 'Could not reach the API. Check your connection and try again.'
        : error instanceof Error ? error.message : 'Something went wrong.';
}
