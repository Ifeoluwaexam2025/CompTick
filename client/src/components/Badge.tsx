import { label } from '../format';

export function Badge({ value }: { value: string }) {
    return <span className={`badge badge-${value.toLowerCase()}`}>{label(value)}</span>;
}
