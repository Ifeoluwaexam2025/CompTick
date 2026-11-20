import { useState } from 'react';
import { Badge } from '../components/Badge';
import { date, label } from '../format';
import { priorities, statuses, type ServiceRequest } from '../types';

export function RequestList({ rows, onOpen }: {
    rows: ServiceRequest[]; onOpen: (item: ServiceRequest) => void;
}) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const visible = rows.filter(row =>
        (!status || row.status === status) && (!priority || row.priority === priority) &&
        `${row.title} ${row.category}`.toLowerCase().includes(search.trim().toLowerCase())
    );

    if (!rows.length) return <div className="empty"><strong>No requests on this page</strong><p>New requests appear here after they are submitted.</p></div>;

    return <>
        <div className="filters" aria-label="Filter the current page">
            <label>Search this page<input type="search" placeholder="Title or category" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
            <label>Priority<select value={priority} onChange={event => setPriority(event.target.value)}>
                <option value="">All priorities</option>{priorities.map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
        </div>
        {!visible.length ? <p className="empty">No requests match your filters on this page.</p> :
            <table className="requests-table" role="table">
                <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Request</th><th scope="col" role="columnheader">Category</th><th scope="col" role="columnheader">Priority</th><th scope="col" role="columnheader">Status</th><th scope="col" role="columnheader">Created</th></tr></thead>
                <tbody role="rowgroup">{visible.map(row => <tr role="row" key={row.id}>
                    <th scope="row" role="rowheader"><button className="text-button" onClick={() => onOpen(row)}>{row.title}</button></th>
                    <td role="cell"><span className="mobile-label" aria-hidden="true">Category</span>{row.category}</td>
                    <td role="cell"><span className="mobile-label" aria-hidden="true">Priority</span><Badge value={row.priority} /></td>
                    <td role="cell"><span className="mobile-label" aria-hidden="true">Status</span><Badge value={row.status} /></td>
                    <td role="cell"><span className="mobile-label" aria-hidden="true">Created</span><time dateTime={row.created_at}>{date(row.created_at)}</time></td>
                </tr>)}</tbody>
            </table>}
    </>;
}
