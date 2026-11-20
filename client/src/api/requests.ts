import type { Api } from './client';
import type { Audit, RequestInput, ServiceRequest, Status } from '../types';

export const pageSize = 10;

export function getRequests(api: Api, page: number, signal: AbortSignal) {
    return api<ServiceRequest[]>(`/requests?page=${page}&limit=${pageSize}`, { signal });
}

export function saveRequest(api: Api, input: RequestInput, signal: AbortSignal, id?: string) {
    return api<ServiceRequest>(id ? `/requests/${id}` : '/requests', {
        method: id ? 'PUT' : 'POST', signal,
        body: JSON.stringify(input)
    });
}

export function changeStatus(api: Api, id: string, status: Status, note: string, signal: AbortSignal) {
    return api<ServiceRequest>(`/requests/${id}/status`, {
        method: 'PATCH', signal, body: JSON.stringify({ status, note })
    });
}

export function getAudits(api: Api, id: string, page: number, signal: AbortSignal) {
    return api<Audit[]>(`/requests/${id}/audits?page=${page}&limit=${pageSize}`, { signal });
}
