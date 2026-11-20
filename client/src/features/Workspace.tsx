import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { Api } from '../api/client';
import { getRequests, pageSize } from '../api/requests';
import { Brand } from '../components/Brand';
import { Pagination } from '../components/Pagination';
import type { ServiceRequest } from '../types';
import { useResource } from '../use-resource';
import type { Session } from './AuthScreen';
import { DashboardSummary } from './DashboardSummary';
import { RequestDetails } from './RequestDetails';
import { RequestForm } from './RequestForm';
import { RequestList } from './RequestList';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'detail' | 'edit'; item: ServiceRequest };

export function Workspace({ session, api, onLogout }: { session: Session; api: Api; onLogout: () => void }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [view, setView] = useState<View>({ kind: 'list' });
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [notice, setNotice] = useState('');
    const heading = useRef<HTMLHeadingElement>(null);
    const load = useCallback((signal: AbortSignal) => getRequests(api, page, signal), [api, page]);
    const { data, loading, error } = useResource(load, revision);

    const overview = pathname === '/';
    const admin = session.actor.role === 'ADMIN';
    const workspaceTitle = overview ? 'Overview' : pathname === '/admin' ? 'Administration' : 'Requests';
    const title = view.kind === 'create' ? 'New request' : view.kind === 'edit' ? 'Edit request' :
        view.kind === 'detail' ? view.item.title : workspaceTitle;

    useEffect(() => {
        heading.current?.focus();
    }, [pathname, view.kind]);

    function showList() {
        setView({ kind: 'list' });
        setNotice('');
    }

    function reload() {
        showList();
        setRevision(value => value + 1);
    }

    function save(item: ServiceRequest, operation: 'created' | 'updated' | 'status') {
        setNotice(operation === 'status' ? 'Request status updated.' : `Request ${operation}.`);
        if (operation === 'created') setPage(1);
        setRevision(value => value + 1);
        setView({ kind: 'detail', item });
    }

    return <div className="workspace">
        <a className="skip-link" href="#workspace-main">Skip to content</a>
        <aside className="sidebar">
            <NavLink className="brand-link" to="/" onClick={showList}><Brand /></NavLink>
            <nav aria-label="Workspace" className="workspace-links">
                <NavLink to="/" end onClick={showList}><span aria-hidden="true">◫</span> Overview</NavLink>
                <NavLink to="/requests" onClick={showList}><span aria-hidden="true">☷</span> {admin ? 'All requests' : 'My requests'}</NavLink>
                {admin && <NavLink to="/admin" onClick={showList}><span aria-hidden="true">◇</span> Administration</NavLink>}
            </nav>
            <div className="account">
                <span className="avatar" aria-hidden="true">{session.email[0]?.toUpperCase()}</span>
                <div className="account-copy"><strong>{session.email}</strong><span>{admin ? 'Administrator' : 'Member'}</span></div>
                <button type="button" onClick={() => { onLogout(); navigate('/login', { replace: true }); }}>Sign out</button>
            </div>
        </aside>
        <main className="workspace-main" id="workspace-main" tabIndex={-1}>
            <header className="workspace-header"><span>Service workspace</span><span className="workspace-role">{admin ? 'Administrator' : 'Member'}</span></header>
            <div className="workspace-content">
                {view.kind !== 'list' && <button className="text-button back" type="button" onClick={showList}>Back to {workspaceTitle.toLowerCase()}</button>}
                <div className="page-heading">
                    <div><h1 ref={heading} tabIndex={-1}>{title}</h1>{view.kind === 'list' && <p className="muted">
                        {pathname === '/admin' ? 'Review requests, advance their status and inspect audit history.' :
                            admin ? 'Review service requests across the workspace.' : 'Track and manage your service requests.'}
                    </p>}</div>
                    {view.kind === 'list' && <button className="primary" type="button" onClick={() => { setNotice(''); setView({ kind: 'create' }); }}><span aria-hidden="true">＋</span> New request</button>}
                </div>
                {notice && <p role="status" className="notice">{notice}</p>}
                {view.kind === 'list' && <>
                    {loading && <p role="status" className="panel padded">Loading requests…</p>}
                    {error && <div className="notice danger"><p role="alert">{error}</p><button type="button" onClick={reload}>Retry</button></div>}
                    {data && <>
                        {overview && <DashboardSummary rows={data} />}
                        <section className="panel request-panel" aria-labelledby="request-list-title">
                            <div className="section-heading panel-header">
                                <h2 id="request-list-title">{overview ? 'Recent requests' : 'Service requests'}</h2>
                                <span className="muted">{data.length} on this page</span>
                            </div>
                            <RequestList key={page} rows={data} onOpen={item => { setNotice(''); setView({ kind: 'detail', item }); }} />
                            {(page > 1 || data.length > 0) && <Pagination name="Request pages" page={page} canAdvance={data.length === pageSize} onPage={setPage} />}
                        </section>
                    </>}
                </>}
                {view.kind === 'create' && <RequestForm api={api} onSaved={item => save(item, 'created')} onCancel={showList} />}
                {view.kind === 'edit' && <RequestForm api={api} existing={view.item} onSaved={item => save(item, 'updated')}
                    onCancel={() => setView({ kind: 'detail', item: view.item })} />}
                {view.kind === 'detail' && <RequestDetails key={view.item.id} api={api} actor={session.actor} item={view.item}
                    onEdit={() => { setNotice(''); setView({ kind: 'edit', item: view.item }); }}
                    onUpdated={item => save(item, 'status')} onConflict={reload} />}
            </div>
        </main>
    </div>;
}
