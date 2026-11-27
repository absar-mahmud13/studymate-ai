import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
export const demo = import.meta.env.VITE_DEMO_MODE === 'true';
const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID, messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET };
let auth = null, configError = '';
if (!demo) {
    try {
        if (!config.apiKey || !config.projectId || !config.authDomain || !config.appId)
            throw new Error('Missing Firebase configuration. Copy client/.env.example to .env.');
        auth = getAuth(initializeApp(config));
    }
    catch (e) {
        configError = e.message;
    }
}
const Ctx = createContext(null);
const demoUser = { displayName: 'Demo Student', email: 'demo@example.invalid', uid: 'local-demo' };
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null), [loading, setLoading] = useState(!demo && !!auth);
    useEffect(() => { if (auth)
        return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }); }, []);
    const value = { user, loading, configError, login: (email, password) => demo ? Promise.resolve(setUser(demoUser)) : signInWithEmailAndPassword(auth, email, password), register: async (name, email, password) => { if (demo) {
            setUser(demoUser);
            return;
        } const result = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(result.user, { displayName: name }); setUser(result.user); }, google: () => demo ? Promise.resolve(setUser(demoUser)) : signInWithPopup(auth, new GoogleAuthProvider()), logout: () => demo ? Promise.resolve(setUser(null)) : signOut(auth), reset: email => demo ? Promise.reject(new Error('Password reset requires live mode.')) : sendPasswordResetEmail(auth, email) };
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export async function authHeaders() { if (demo)
    return {}; if (!auth?.currentUser)
    throw new Error('Please sign in.'); return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }; }
