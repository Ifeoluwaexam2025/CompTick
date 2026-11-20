import { useId, type ReactNode } from 'react';

export function Field({ label, error, render }: {
    label: string; error?: string; render: (attributes: {
        id: string; 'aria-invalid': boolean; 'aria-describedby'?: string;
    }) => ReactNode;
}) {
    const id = useId();
    return <div className="field">
        <label htmlFor={id}>{label}</label>
        {render({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })}
        {error && <small className="error-text" id={`${id}-error`}>{error}</small>}
    </div>;
}
