import { label } from '../format';
import { statuses, type ServiceRequest } from '../types';

export function DashboardSummary({ rows }: { rows: ServiceRequest[] }) {
    return <section aria-label="Request counts on this page">
        <p className="scope-label">Counts on this page</p>
        <dl className="stats">
            <div className="stat"><dt>Total requests</dt><dd>{rows.length}</dd></div>
            {statuses.map(status => <div className={`stat stat-${status.toLowerCase()}`} key={status}>
                <dt>{label(status)}</dt><dd>{rows.filter(row => row.status === status).length}</dd>
            </div>)}
        </dl>
    </section>;
}
