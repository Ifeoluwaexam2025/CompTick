export function Pagination({ page, canAdvance, onPage, name }: {
    page: number; canAdvance: boolean; onPage: (page: number) => void; name: string;
}) {
    return <nav aria-label={name} className="pagination">
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={!canAdvance} onClick={() => onPage(page + 1)}>Next</button>
    </nav>;
}
