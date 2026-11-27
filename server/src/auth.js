import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
export function createAuth(demo, credentials) {
    if (demo)
        return (req, res, next) => { req.user = { uid: 'local-demo', name: 'Demo Student', email: 'demo@example.invalid' }; next(); };
    initializeApp({ credential: cert(JSON.parse(credentials)) });
    return async (req, res, next) => {
        const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
        if (!token)
            return res.status(401).json({ message: 'Please sign in.' });
        try {
            req.user = await getAuth().verifyIdToken(token);
            next();
        }
        catch {
            return res.status(401).json({ message: 'Session expired or invalid. Sign in again.' });
        }
    };
}
