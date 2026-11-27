import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { HttpError, text, integer, date, scoreQuiz, publicEntry, validatePlanBudget } from './logic.js';
const kinds = new Set(['chat', 'notes', 'quiz', 'flashcards', 'plan']);
export function routes({ store, ai, auth, demo }) {
    const r = Router();
    r.use(auth);
    const limiter = rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => req.user.uid, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many AI requests. Wait a minute.' } });
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, fieldSize: 100 }, fileFilter: (req, file, cb) => file.mimetype === 'application/pdf' ? cb(null, true) : cb(new HttpError(400, 'Only PDF files are accepted.')) });
    const save = async (req, res, kind, title, data) => res.status(201).json(publicEntry(await store.create(req.user.uid, kind, title, data)));
    const get = async (req, kind, id) => { const item = await store.get(req.user.uid, kind, id); if (!item)
        throw new HttpError(404, 'Item not found.'); return item; };
    const kindOf = req => { if (!kinds.has(req.params.kind))
        throw new HttpError(404, 'Unknown category.'); return req.params.kind; };
    r.get('/me', (req, res) => res.json({ uid: req.user.uid, name: req.user.name || req.user.email || 'Student', email: req.user.email || '', demo }));
    r.get('/entries/:kind', async (req, res) => res.json((await store.list(req.user.uid, kindOf(req))).map(publicEntry)));
    r.delete('/entries/:kind/:id', async (req, res) => { if (!await store.remove(req.user.uid, kindOf(req), req.params.id))
        throw new HttpError(404, 'Item not found.'); res.json({ ok: true }); });
    r.post('/ai/chat', limiter, async (req, res) => {
        const question = text(req.body?.question, 'Question');
        const history = await store.list(req.user.uid, 'chat', 5);
        const context = req.body?.useHistory === false ? '' : history.reverse().map(x => `Student: ${x.data.question}\nTutor: ${x.data.answer.slice(0, 4000)}`).join('\n');
        const answer = await ai.generate(`Previous study conversation (if any):\n${context}\nCurrent question: ${question}`);
        await save(req, res, 'chat', question.slice(0, 100), { question, answer });
    });
    r.post('/pdf/summarize', limiter, upload.single('file'), async (req, res) => {
        if (!req.file || req.file.buffer.subarray(0, 5).toString() !== '%PDF-')
            throw new HttpError(400, 'Upload a valid PDF file.');
        const language = req.body.language === 'Bangla' ? 'Bangla' : 'English';
        const summary = await ai.generate(`Summarize the attached PDF in ${language}. Include key points, definitions, exam revision questions and page references when confident. If unreadable, say so.`, { pdf: req.file.buffer });
        await save(req, res, 'notes', req.file.originalname.slice(0, 200), { summary, filename: req.file.originalname.slice(0, 200) });
    });
    r.post('/quiz/generate', limiter, async (req, res) => {
        const topic = text(req.body?.topic, 'Topic', 300), count = integer(req.body?.count, 'Count', 3, 10);
        const difficulty = ['Easy', 'Medium', 'Hard'].includes(req.body?.difficulty) ? req.body.difficulty : 'Medium';
        const questions = await ai.structured('quiz', `Generate exactly ${count} ${difficulty} MCQs about ${topic}. Use the topic language. Return only a JSON array of objects with question (string), options (exactly 4 distinct strings), correctAnswer (zero-based index 0–3), explanation (string).`, count);
        await save(req, res, 'quiz', topic, { questions });
    });
    r.post('/quiz/:id/submit', async (req, res) => {
        const item = await get(req, 'quiz', req.params.id);
        if (item.data.result)
            throw new HttpError(409, 'Quiz already submitted. Generate a new one.');
        const result = scoreQuiz(item.data.questions, req.body?.answers);
        const updated = await store.update(req.user.uid, 'quiz', item.id, { ...item.data, result }, true);
        if (!updated)
            throw new HttpError(409, 'Quiz already submitted.');
        res.json(publicEntry(updated));
    });
    r.post('/flashcards/generate', limiter, async (req, res) => {
        const topic = text(req.body?.topic, 'Topic', 300), count = integer(req.body?.count, 'Count', 3, 15);
        const cards = await ai.structured('flashcards', `Generate ${count} revision flashcards for ${topic} in the topic language. Return only a JSON array with question and answer strings.`, count);
        await save(req, res, 'flashcards', topic, { cards });
    });
    r.post('/planner/generate', limiter, async (req, res) => {
        const subject = text(req.body?.subject, 'Subject', 300), examDate = date(req.body?.examDate), minutes = integer(req.body?.minutes, 'Daily minutes', 15, 720);
        const today = date(req.body?.today), remaining = Math.ceil((Date.parse(examDate) - Date.parse(today)) / 86400000);
        if (remaining < 1)
            throw new HttpError(400, 'Exam date must be after today.');
        const days = Math.min(remaining, 14), weakTopics = typeof req.body?.weakTopics === 'string' ? req.body.weakTopics.slice(0, 500) : '';
        const tasks = validatePlanBudget(await ai.structured('plan', `Create a ${days}-day study plan for ${subject}. Weak topics: ${weakTopics}. Maximum total ${minutes} minutes per day. Return only JSON array of at most 30 tasks, each with day (integer 1-${days}), task (string), minutes (integer >=5). Prioritize practice and revision.`, undefined, { subject, days, minutes }), days, minutes);
        await save(req, res, 'plan', subject, { examDate, startDate: today, minutes, tasks: tasks.sort((a, b) => a.day - b.day) });
    });
    r.patch('/planner/:id/task/:index', async (req, res) => {
        const item = await get(req, 'plan', req.params.id), idx = integer(Number(req.params.index), 'Task index', 0, item.data.tasks.length - 1);
        if (typeof req.body?.done !== 'boolean')
            throw new HttpError(400, 'Invalid task status.');
        item.data.tasks[idx].done = req.body.done;
        const updated = await store.update(req.user.uid, 'plan', item.id, item.data);
        if (!updated)
            throw new HttpError(404, 'Plan not found.');
        res.json(publicEntry(updated));
    });
    r.get('/progress', async (req, res) => {
        const [quizzes, plans, notes, chats, cards] = await Promise.all(['quiz', 'plan', 'notes', 'chat', 'flashcards'].map(k => store.list(req.user.uid, k, 100)));
        const results = quizzes.filter(q => q.data.result).reverse(), tasks = plans.flatMap(p => p.data.tasks), completed = tasks.filter(t => t.done);
        res.json({ quizCount: results.length, average: results.length ? Math.round(results.reduce((s, q) => s + q.data.result.percent, 0) / results.length) : 0, completedTasks: completed.length, totalTasks: tasks.length, studyMinutes: completed.reduce((s, t) => s + t.minutes, 0), notes: notes.length, chats: chats.length, flashcardSets: cards.length, trend: results.slice(-10).map((q, i) => ({ name: `Quiz ${i + 1}`, topic: q.title, score: q.data.result.percent })) });
    });
    return r;
}
