export const priorities = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;

export type Priority = typeof priorities[number];
export type Status = typeof statuses[number];
export type Actor = { id: string; role: 'USER' | 'ADMIN' };
export type RequestInput = { title: string; description: string; category: string; priority: Priority };
export type ServiceRequest = RequestInput & {
    id: string;
    status: Status;
    created_by: string;
    created_at: string;
    updated_at: string;
};
export type Audit = {
    id: string;
    old_status: Status | null;
    new_status: Status;
    changed_at: string;
    changed_by: string;
    note: string | null;
};
