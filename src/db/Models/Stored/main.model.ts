import { Document, Model, Schema, Types, model, models } from "mongoose";

export const STORED_STATES = ["raw", "usable", "solid", "actionable"] as const;
export type StoredState = (typeof STORED_STATES)[number];

export interface IStored {
  user: Types.ObjectId;
  name: string;
  createdAt: Date;
  completedAt?: Date;
  state: StoredState;
  score: number;
  description: string;
  descriptionIA: string;
}

export interface IStoredDocument extends IStored, Document {}

const StoredSchema = new Schema<IStoredDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  state: { type: String, enum: STORED_STATES, default: "raw" },
  score: { type: Number, default: 0 },
  description: { type: String, required: true },
  descriptionIA: { type: String, default: "" },
});

const StoredModel =
  (models.Stored as Model<IStoredDocument> | undefined) ??
  model<IStoredDocument>("Stored", StoredSchema);

export default StoredModel;
