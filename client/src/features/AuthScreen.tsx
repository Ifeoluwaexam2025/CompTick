import { useLifetime } from '../use-lifetime';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { Field } from '../components/Field';
import { createApi, errorMessage } from '../api/client';
import type { Actor } from '../types';
import { validateCredentials } from './validation';

const publicApi = createApi();

export type Session = { token: string; actor: Actor; email: string };

export function AuthScreen({ registration, onSession, notice }: {
    registration: boolean; onSession: (session: Session) => void; notice?: string;
}) {
    const navigate = useNavigate();
    const [fields, setFields] = useState<Record<string, string>>({});
    const [failure, setFailure] = useState('');
    const [pending, setPending] = useState(false);
    const lifetime = useLifetime();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const signal = lifetime.current?.signal;
        if (pending || !signal || signal.aborted) return;
        setFailure('');
        const form = new FormData(event.currentTarget);
        const email = String(form.get('email')).trim();
        const password = String(form.get('password'));
        const errors = validateCredentials(email, password, registration ? String(form.get('confirmation')) : undefined);
        setFields(errors);
        if (Object.keys(errors).length) return;
        setPending(true);
        try {
            const body = JSON.stringify({ email, password });
            if (registration) {
                await publicApi<Actor>('/auth/register', { method: 'POST', body, signal });
                if (signal.aborted) return;
                navigate('/login', { replace: true, state: { registered: true } });
                return;
            }
            const { token } = await publicApi<{ token: string }>('/auth/login', { method: 'POST', body, signal });
            const actor = await createApi(token)<Actor>('/auth/me', { signal });
            if (signal.aborted) return;
            onSession({ token, actor, email });
            navigate('/');
        } catch (error) {
            if (signal.aborted) return;
            setFailure(errorMessage(error));
        } finally {
            if (!signal.aborted) setPending(false);
        }
    }

    return <main className="auth-layout">
        <section className="auth-brand" aria-label="CompTick">
            <Brand />
            <div className="auth-message">
                <p className="eyebrow">Service Request Management Platform</p>
                <p className="tagline"><span>Track requests.</span><span>Manage progress.</span><span>Resolve issues.</span></p>
            </div>
        </section>
        <section className="auth-content">
            <div className="auth-form">
                <h1>{registration ? 'Create your account' : 'Sign in to CompTick'}</h1>
                <p className="muted">{registration ? 'Create a CompTick account to submit and track requests.' : 'Use your account to access your request workspace.'}</p>
                {notice && <p role="status" className="notice">{notice}</p>}
                {failure && <p role="alert" className="notice danger">{failure}</p>}
                <form noValidate onSubmit={submit}>
                    <fieldset disabled={pending}>
                        <Field label="Email" error={fields.email} render={props => <input {...props} type="email" name="email" autoComplete="email" required />} />
                        <Field label="Password" error={fields.password} render={props => <input {...props} type="password" name="password" autoComplete={registration ? 'new-password' : 'current-password'} required />} />
                        {registration && <Field label="Confirm password" error={fields.confirmation} render={props => <input {...props} type="password" name="confirmation" autoComplete="new-password" required />} />}
                        <button className="primary full" type="submit">{pending ? 'Please wait…' : registration ? 'Create account' : 'Sign in'}</button>
                    </fieldset>
                </form>
                <p className="auth-switch">{registration ? 'Already have an account? ' : 'New to CompTick? '}
                    <Link to={registration ? '/login' : '/register'}>{registration ? 'Sign in' : 'Create an account'}</Link>
                </p>
            </div>
        </section>
    </main>;
}
