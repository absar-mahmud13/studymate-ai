import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
const schema = new mongoose.Schema({ id: { type: String, unique: true, required: true }, userId: { type: String, required: true, index: true }, kind: { type: String, required: true }, title: { type: String, required: true }, data: { type: mongoose.Schema.Types.Mixed, required: true }, createdAt: { type: Date, default: Date.now } }, { versionKey: false });
schema.index({ userId: 1, kind: 1, createdAt: -1 });
const Entry = mongoose.model('Entry', schema);
export async function createStore(demo, uri) {
    const memory = new Map();
    if (!demo)
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    return {
        async create(userId, kind, title, data) {
            const item = { id: randomUUID(), userId, kind, title, data, createdAt: new Date() };
            if (demo) {
                memory.set(item.id, structuredClone(item));
                return item;
            }
            await Entry.create(item);
            return item;
        },
        async list(userId, kind, limit = 100) {
            if (demo)
                return [...memory.values()].filter(e => e.userId === userId && e.kind === kind).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map(e => structuredClone(e));
            return Entry.find({ userId, kind }).sort({ createdAt: -1 }).limit(limit).select('-_id').lean();
        },
        async get(userId, kind, id) {
            if (demo) {
                const e = memory.get(id);
                return e?.userId === userId && e.kind === kind ? structuredClone(e) : null;
            }
            return Entry.findOne({ userId, kind, id }).select('-_id').lean();
        },
        async update(userId, kind, id, data, onlyUnsubmitted = false) {
            if (demo) {
                const e = memory.get(id);
                if (!e || e.userId !== userId || e.kind !== kind || (onlyUnsubmitted && e.data.result))
                    return null;
                e.data = structuredClone(data);
                return structuredClone(e);
            }
            const filter = { userId, kind, id };
            if (onlyUnsubmitted)
                filter['data.result'] = { $exists: false };
            return Entry.findOneAndUpdate(filter, { $set: { data } }, { new: true }).select('-_id').lean();
        },
        async remove(userId, kind, id) {
            if (demo) {
                const e = memory.get(id);
                return e?.userId === userId && e.kind === kind ? memory.delete(id) : false;
            }
            return (await Entry.deleteOne({ userId, kind, id })).deletedCount === 1;
        }
    };
}
