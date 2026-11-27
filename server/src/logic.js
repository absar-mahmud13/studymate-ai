// Pure validation and scoring: testable without external services.
export class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
export function text(value, name, max = 5000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new HttpError(400, `${name} must contain 1–${max} characters.`);
    return value.trim();
}
export function integer(value, name, min, max) {
    if (!Number.isInteger(value) || value < min || value > max)
        throw new HttpError(400, `${name} must be an integer between ${min} and ${max}.`);
    return value;
}
export function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new HttpError(400, 'Choose a valid exam date.');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value)
        throw new HttpError(400, 'Choose a valid exam date.');
    return value;
}
const aiString = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validateGenerated(kind, value, count) {
    const fail = () => { throw new HttpError(502, 'AI returned an invalid response. Try again.'); };
    if (!Array.isArray(value) || !value.length || (count !== undefined && value.length !== count) || value.length > 30)
        fail();
    if (kind === 'quiz')
        return value.map(q => {
            if (!q || !aiString(q.question, 1000) || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => aiString(o, 500)) || new Set(q.options).size !== 4 || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3 || !aiString(q.explanation, 2000))
                fail();
            return { question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation };
        });
    if (kind === 'flashcards')
        return value.map(q => {
            if (!q || !aiString(q.question, 1000) || !aiString(q.answer, 2000))
                fail();
            return { question: q.question, answer: q.answer };
        });
    if (kind === 'plan')
        return value.map(q => {
            if (!q || !aiString(q.task, 500) || !Number.isInteger(q.minutes) || q.minutes < 5 || q.minutes > 720 || !Number.isInteger(q.day) || q.day < 1 || q.day > 30)
                fail();
            return { task: q.task, minutes: q.minutes, day: q.day, done: false };
        });
    fail();
}
export function scoreQuiz(questions, answers) {
    if (!Array.isArray(answers) || answers.length !== questions.length || answers.some(x => !Number.isInteger(x) || x < 0 || x > 3))
        throw new HttpError(400, 'Answer every question before submitting.');
    const score = questions.reduce((n, q, i) => n + Number(q.correctAnswer === answers[i]), 0);
    return { score, total: questions.length, answers: [...answers], percent: Math.round(100 * score / questions.length) };
}
export function publicEntry(entry) {
    const { userId, ...safe } = entry;
    if (safe.kind === 'quiz' && !safe.data.result)
        return { ...safe, data: { questions: safe.data.questions.map(({ question, options }) => ({ question, options })) } };
    return safe;
}
export function validatePlanBudget(tasks, days, minutes) {
    const sums = {};
    for (const task of tasks) {
        sums[task.day] = (sums[task.day] || 0) + task.minutes;
        if (task.day > days || sums[task.day] > minutes)
            throw new HttpError(502, 'Generated plan exceeded your time budget. Try again.');
    }
    return tasks;
}
