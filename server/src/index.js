import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createStore } from './store.js';
import { createAuth } from './auth.js';
import { createAI } from './ai.js';
import { routes } from './routes.js';
import { HttpError } from './logic.js';
const demo = process.env.DEMO_MODE === 'true';
const port = Number(process.env.PORT || 5000);
if (demo && process.env.NODE_ENV === 'production')
    throw new Error('Demo mode must never be deployed.');
if (!demo)
    for (const key of ['MONGODB_URI', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'CLIENT_URL'])
        if (!process.env[key])
            throw new Error(`Missing ${key}. See .env.example.`);
const store = await createStore(demo, process.env.MONGODB_URI);
const auth = createAuth(demo, process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
const ai = createAI({ demo, key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL });
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1')
    app.set('trust proxy', 1);
app.use(helmet());
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(x => x.trim());
app.use(cors({ origin: (origin, cb) => !origin || origins.includes(origin) ? cb(null, true) : cb(new HttpError(403, 'Origin not allowed.')) }));
app.use(express.json({ limit: '64kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 150, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests.' } }));
app.get('/', (req, res) => res.json({ name: 'StudyMate AI', status: 'ok', demo }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', demo }));
app.use('/api', routes({ store, ai, auth, demo }));
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => {
    if (res.headersSent)
        return next(err);
    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ message: 'PDF must be 10 MB or smaller.' });
    const status = err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500)
        console.error('Request error:', err.name, status);
    res.status(status).json({ message: err instanceof HttpError ? err.message : status === 400 ? 'Invalid request.' : status === 413 ? 'Request too large.' : 'Server error. Please try again.' });
});
app.listen(port, demo ? '127.0.0.1' : '0.0.0.0', () => console.log(`StudyMate API on port ${port} (${demo ? 'LOCAL DEMO' : 'LIVE'})`));
