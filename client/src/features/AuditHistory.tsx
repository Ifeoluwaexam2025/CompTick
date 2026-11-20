import { useCallback, useState } from 'react';
import type { Api } from '../api/client';
import { getAudits, pageSize } from '../api/requests';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { date } from '../format';
import { useResource } from '../use-resource';

export function AuditHistory({ api, id, revision }: { api: Api; id: string; revision: number }) {
    const [page, setPage] = useState(1);
    const [retry, setRetry] = useState(0);
    const load = useCallback((signal: AbortSignal) =>
        getAudits(api, id, page, signal), [api, id, page]);
    const { data, loading, error } = useResource(load, revision + retry);

    return <section aria-labelledby="audit-title" className="panel padded">
        <h2 id="audit-title">Audit history</h2>
        {loading && <p role="status">Loading audit history…</p>}
        {error && <div className="notice danger"><p role="alert">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
        {data?.length === 0 && <p className="muted">{page === 1 ? 'No status changes recorded.' : 'No more audit entries.'}</p>}
        {Boolean(data?.length) && <ol className="timeline">
            {data?.map(audit => <li key={audit.id}>
                <div className="audit-status"><Badge value={audit.old_status ?? 'Previous status unavailable'} /> <span aria-label="to">→</span> <Badge value={audit.new_status} /></div>
                {audit.note && <p className="preserve">{audit.note}</p>}
                <p className="meta"><time dateTime={audit.changed_at}>{date(audit.changed_at)}</time><br />Administrator <span className="identifier">{audit.changed_by}</span></p>
            </li>)}
        </ol>}
        {data && (data.length > 0 || page > 1) && <Pagination name="Audit pages" page={page} canAdvance={data.length === pageSize} onPage={setPage} />}
    </section>;
}
