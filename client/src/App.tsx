import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { createApi } from './api/client';
import { AuthScreen, type Session } from './features/AuthScreen';
import { Workspace } from './features/Workspace';

export function App() {
    const [{ session, expired }, setAuth] = useState<{ session?: Session; expired?: boolean }>({});
    const token = session?.token;
    const location = useLocation();
    const api = useMemo(() => createApi(token, () => {
        // A delayed 401 from an earlier session must not sign out a newer session.
        setAuth(current => current.session?.token === token ? { expired: true } : current);
    }), [token]);

    function signIn(session: Session) {
        setAuth({ session });
    }

    if (!session) {
        return <Routes>
            <Route path="/login" element={<AuthScreen key="login" registration={false} onSession={signIn}
                notice={expired ? 'Your session ended. Sign in again.' : location.state?.registered ? 'Account created. Sign in to continue.' : undefined} />} />
            <Route path="/register" element={<AuthScreen key="register" registration onSession={signIn} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>;
    }

    const workspace = <Workspace session={session} api={api} onLogout={() => setAuth({})} />;
    return <Routes>
        <Route path="/" element={workspace} />
        <Route path="/requests" element={workspace} />
        <Route path="/admin" element={session.actor.role === 'ADMIN' ? workspace : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
}
