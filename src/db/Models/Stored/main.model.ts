import { Schema, model, Document, Types } from 'mongoose';

type archiveType = 'image' | 'video' | 'document' | 'audio' | 'other';

export interface IStored{
    user: Types.ObjectId;
    name: string;
    type: archiveType;
    resourceUrl: string;
    createdAt: Date;
    completedAt: Date;
    state: boolean;
    score: number;
}

export interface IStoredDocument extends IStored, Document {}

const StoredSchema = new Schema<IStoredDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document', 'audio', 'other'], required: true },
    resourceUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    state: { type: Boolean, default: false },
    score: { type: Number, default: 0 }
});

export default model<IStoredDocument>('Stored', StoredSchema);