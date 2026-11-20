import { useLifetime } from '../use-lifetime';
import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage, type Api } from '../api/client';
import { changeStatus } from '../api/requests';
import { Badge } from '../components/Badge';
import { Field } from '../components/Field';
import { date, label } from '../format';
import type { Actor, ServiceRequest } from '../types';
import { AuditHistory } from './AuditHistory';

export function RequestDetails({ api, actor, item, onEdit, onUpdated, onConflict }: {
    api: Api; actor: Actor; item: ServiceRequest; onEdit: () => void;
    onUpdated: (item: ServiceRequest) => void; onConflict: () => void;
}) {
    const [failure, setFailure] = useState('');
    const [conflict, setConflict] = useState(false);
    const [pending, setPending] = useState(false);
    const lifetime = useLifetime();
    const [auditRevision, setAuditRevision] = useState(0);
    const next = item.status === 'OPEN' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'RESOLVED' : undefined;

    async function advance(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const signal = lifetime.current?.signal;
        if (!next || pending || !signal || signal.aborted) return;
        setFailure('');
        setPending(true);
        const form = event.currentTarget;
        try {
            const note = String(new FormData(form).get('note')).trim();
            if (note.includes('\0') || note.length > 2000) {
                setFailure('Enter a note of at most 2,000 characters.');
                return;
            }
            const updated = await changeStatus(api, item.id, next, note, signal);
            if (signal.aborted) return;
            onUpdated(updated);
            setAuditRevision(value => value + 1);
            form.reset();
        } catch (error) {
            if (signal.aborted) return;
            const stale = error instanceof ApiError && error.status === 409;
            setConflict(stale);
            setFailure(stale
                ? 'The status changed while you were viewing this request. Reload the list to see the latest status.'
                : errorMessage(error));
        } finally {
            if (!signal.aborted) setPending(false);
        }
    }

    return <div className="detail-grid">
        <section className="panel padded">
            <div className="section-heading">
                <h2>Request details</h2>
                {actor.id === item.created_by && <button onClick={onEdit}>Edit request</button>}
            </div>
            <p className="preserve description">{item.description}</p>
            <dl className="details">
                <div><dt>Category</dt><dd>{item.category}</dd></div>
                <div><dt>Priority</dt><dd><Badge value={item.priority} /></dd></div>
                <div><dt>Status</dt><dd><Badge value={item.status} /></dd></div>
                <div><dt>Created</dt><dd>{date(item.created_at)}</dd></div>
                <div><dt>Last updated</dt><dd>{date(item.updated_at)}</dd></div>
                <div><dt>Request ID</dt><dd className="identifier">{item.id}</dd></div>
            </dl>
            {actor.role === 'ADMIN' && next && <form className="status-form" onSubmit={advance}>
                <h3>Advance status</h3>
                {failure && <p role="alert" className="notice danger">{failure}</p>}
                {conflict ? <button type="button" onClick={onConflict}>Reload requests</button> :
                    <fieldset disabled={pending}>
                        <Field label="Audit note (optional)" render={props => <textarea {...props} name="note" rows={2} maxLength={2000} />} />
                        <button className="primary" type="submit">{pending ? 'Updating…' : `Move to ${label(next).toLowerCase()}`}</button>
                    </fieldset>}
            </form>}
        </section>
        {actor.role === 'ADMIN' && <AuditHistory api={api} id={item.id} revision={auditRevision} />}
    </div>;
}
