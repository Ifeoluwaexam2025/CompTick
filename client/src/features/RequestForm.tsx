import { useLifetime } from '../use-lifetime';
import { useState, type FormEvent } from 'react';
import { errorMessage, type Api } from '../api/client';
import { saveRequest } from '../api/requests';
import { Field } from '../components/Field';
import { label } from '../format';
import { priorities, type RequestInput, type ServiceRequest } from '../types';
import { validateRequest } from './validation';

export function RequestForm({ api, existing, onSaved, onCancel }: {
    api: Api; existing?: ServiceRequest; onSaved: (item: ServiceRequest) => void; onCancel: () => void;
}) {
    const [errors, setErrors] = useState<ReturnType<typeof validateRequest>>({});
    const [failure, setFailure] = useState('');
    const [pending, setPending] = useState(false);
    const lifetime = useLifetime();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const signal = lifetime.current?.signal;
        if (pending || !signal || signal.aborted) return;
        setFailure('');
        const form = new FormData(event.currentTarget);
        const priority = priorities.find(value => value === form.get('priority'));
        const input: RequestInput = {
            title: String(form.get('title')).trim(),
            description: String(form.get('description')).trim(),
            category: String(form.get('category')).trim(),
            priority: priority ?? 'MEDIUM'
        };
        const nextErrors = validateRequest(input);
        if (!priority) nextErrors.priority = 'Choose a priority.';
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        setPending(true);
        try {
            const item = await saveRequest(api, input, signal, existing?.id);
            if (!signal.aborted) onSaved(item);
        } catch (error) {
            if (signal.aborted) return;
            setFailure(errorMessage(error));
        } finally {
            if (!signal.aborted) setPending(false);
        }
    }

    return <form noValidate onSubmit={submit} className="panel padded editor">
        {failure && <p role="alert" className="notice danger">{failure}</p>}
        <fieldset disabled={pending}>
            <Field label="Title" error={errors.title} render={props => <input {...props} name="title" defaultValue={existing?.title} maxLength={255} required />} />
            <Field label="Description" error={errors.description} render={props => <textarea {...props} name="description" defaultValue={existing?.description} rows={5} maxLength={10000} required />} />
            <div className="form-columns">
                <Field label="Category" error={errors.category} render={props => <input {...props} name="category" defaultValue={existing?.category} maxLength={50} required />} />
                <Field label="Priority" error={errors.priority} render={props => <select {...props} name="priority" defaultValue={existing?.priority ?? 'MEDIUM'}>
                    {priorities.map(priority => <option key={priority} value={priority}>{label(priority)}</option>)}
                </select>} />
            </div>
            <div className="actions">
                <button className="primary" type="submit">{pending ? 'Saving…' : existing ? 'Save changes' : 'Submit request'}</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </div>
        </fieldset>
    </form>;
}
