import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { App } from '../src/App';
import type { Audit, ServiceRequest } from '../src/types';

const item: ServiceRequest = {
    id: 'a-request', title: 'Portal access', category: 'Access', description: 'Unable to sign in',
    priority: 'HIGH', status: 'OPEN', created_by: 'actor', created_at: '2026-11-21T09:00:00Z',
    updated_at: '2026-11-21T09:00:00Z'
};

function mockApi(handler: (path: string, options?: RequestInit) => unknown = () => [], role = 'USER') {
    const mock = vi.fn(async (input: string, options?: RequestInit) => {
        const path = input.replace(/^.*\/api/, '');
        if (path === '/auth/login') return Response.json({ token: 'test-token' });
        if (path === '/auth/me') return Response.json({ id: 'actor', role });
        const result = await handler(path, options);
        return result instanceof Response ? result : Response.json(result);
    });
    vi.stubGlobal('fetch', mock);
    return mock;
}

function mount(path = '/') {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
    return userEvent.setup();
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Email'), 'member@example.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'testing-password');
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { name: 'Overview' });
}

async function enterRequest(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Title'), item.title);
    await user.type(screen.getByLabelText('Description'), item.description);
    await user.type(screen.getByLabelText('Category'), item.category);
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
}

test('protects workspace routes and validates login before sending credentials', async () => {
    const fetch = mockApi();
    const user = mount('/admin');
    expect(screen.getByRole('heading', { name: 'Sign in to CompTick' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter a valid email address.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).not.toHaveBeenCalled();
});

test('shows incorrect credentials on the login screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Invalid credentials' }, { status: 401 })));
    const user = mount('/login');
    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
});

test('validates confirmation and registers without sending a role', async () => {
    const fetch = mockApi();
    const user = mount('/register');
    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Passwords must match.')).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Confirm password'), 'testing-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Account created. Sign in to continue.')).toBeVisible();
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
        email: 'member@example.com', password: 'testing-password'
    });
});

test('shows dashboard loading and empty states with member navigation', async () => {
    let finish!: (items: ServiceRequest[]) => void;
    mockApi(() => new Promise<ServiceRequest[]>(resolve => { finish = resolve; }));
    const user = mount();
    await signIn(user);
    expect(screen.getByText('Loading requests…')).toBeVisible();
    expect(screen.getByRole('link', { name: 'My requests' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
    finish([]);
    expect(await screen.findByText('No requests on this page')).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Request counts on this page' })).getAllByText('0')).toHaveLength(4);
});

test('validates a request, displays a server failure and confirms creation only after success', async () => {
    let writes = 0;
    mockApi((path, options) => {
        if (path === '/requests' && options?.method === 'POST') {
            writes++;
            if (writes === 1) return Response.json({ message: 'Server unavailable' }, { status: 500 });
            expect(JSON.parse(String(options.body))).toEqual({
                title: item.title, description: item.description, category: item.category, priority: item.priority
            });
            return item;
        }
        return [];
    });
    const user = mount();
    await signIn(user);
    await user.click(screen.getByRole('button', { name: 'New request' }));
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(writes).toBe(0);
    await enterRequest(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByText('Request created.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Audit history' })).not.toBeInTheDocument();
});

test('edits a request owned by the signed-in actor', async () => {
    mockApi((path, options) => {
        if (path === '/requests/a-request' && options?.method === 'PUT') {
            return { ...item, title: JSON.parse(String(options.body)).title };
        }
        return [item];
    });
    const user = mount();
    await signIn(user);
    await user.click(await screen.findByRole('button', { name: item.title }));
    await user.click(screen.getByRole('button', { name: 'Edit request' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('heading', { name: 'Updated title' })).toBeVisible();
});

test('pages through requests and scopes search to the current page', async () => {
    mockApi(path => path.includes('page=2') ? [{ ...item, title: 'Second page item' }] :
        Array.from({ length: 10 }, (_, index) => ({ ...item, id: String(index), title: `Request ${index}` })));
    const user = mount();
    await signIn(user);
    await screen.findByRole('button', { name: 'Request 0' });
    await user.type(screen.getByLabelText('Search this page'), 'Other page');
    expect(screen.getByText('No requests match your filters on this page.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('button', { name: 'Second page item' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('updates status as an administrator and displays the refreshed audit history', async () => {
    let status = item.status;
    const audit: Audit = {
        id: 'audit', old_status: 'OPEN', new_status: 'IN_PROGRESS', changed_at: item.created_at,
        changed_by: 'administrator-id', note: 'Started investigation'
    };
    mockApi((path, options) => {
        if (path.includes('/audits')) return status === 'OPEN' ? [] : [audit];
        if (path.endsWith('/status') && options?.method === 'PATCH') {
            expect(JSON.parse(String(options.body))).toEqual({ status: 'IN_PROGRESS', note: audit.note });
            status = 'IN_PROGRESS';
            return { ...item, status };
        }
        return [{ ...item, status }];
    }, 'ADMIN');
    const user = mount();
    await signIn(user);
    await user.click(screen.getByRole('link', { name: 'Administration' }));
    await user.click(await screen.findByRole('button', { name: item.title }));
    expect(await screen.findByText('No status changes recorded.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Move to resolved' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Audit note (optional)'), String(audit.note));
    await user.click(screen.getByRole('button', { name: 'Move to in progress' }));
    expect(await screen.findByText('Request status updated.')).toBeVisible();
    const history = screen.getByRole('region', { name: 'Audit history' });
    expect(await within(history).findByText(String(audit.note))).toBeVisible();
    expect(within(history).getByText(audit.changed_by)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Move to resolved' })).toBeVisible();
});

test('offers a reload when another administrator changed the status', async () => {
    mockApi((path, options) => {
        if (options?.method === 'PATCH') return Response.json({}, { status: 409 });
        if (path.includes('/audits')) return [];
        return [item];
    }, 'ADMIN');
    const user = mount();
    await signIn(user);
    await user.click(await screen.findByRole('button', { name: item.title }));
    await user.click(screen.getByRole('button', { name: 'Move to in progress' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The status changed');
    await user.click(screen.getByRole('button', { name: 'Reload requests' }));
    expect(await screen.findByRole('button', { name: item.title })).toBeVisible();
});

test('returns to login upon an authenticated 401', async () => {
    mockApi(() => Response.json({}, { status: 401 }));
    const user = mount();
    await enterCredentials(user);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Your session ended. Sign in again.')).toBeVisible();
});

test('paginates audit entries in the order returned by the API', async () => {
    const audit: Audit = {
        id: 'last-audit', old_status: 'OPEN', new_status: 'IN_PROGRESS', changed_at: item.created_at,
        changed_by: 'administrator-id', note: 'An earlier change'
    };
    mockApi(path => {
        if (!path.includes('/audits')) return [item];
        if (path.includes('page=2')) return [audit];
        return Array.from({ length: 10 }, (_, index) => ({ ...audit, id: String(index), note: `Change ${index}` }));
    }, 'ADMIN');
    const user = mount();
    await signIn(user);
    await user.click(await screen.findByRole('button', { name: item.title }));
    const auditRegion = screen.getByRole('region', { name: 'Audit history' });
    const entries = await within(auditRegion).findAllByRole('listitem');
    expect(entries[0]).toHaveTextContent('Change 0');
    expect(entries[9]).toHaveTextContent('Change 9');
    await user.click(within(auditRegion).getByRole('button', { name: 'Next' }));
    expect(await within(auditRegion).findByText('An earlier change')).toBeVisible();
});

test('shows a request list error and retries against the API', async () => {
    let attempts = 0;
    mockApi(() => ++attempts === 1 ? Response.json({ message: 'Requests unavailable' }, { status: 503 }) : [item]);
    const user = mount();
    await signIn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Requests unavailable');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: item.title })).toBeVisible();
});
