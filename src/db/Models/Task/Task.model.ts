import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IStored {
  user: Types.ObjectId;
  name: string;
  createdAt: Date;
  completedAt?: Date;
  score: number;
  description: string;
  descriptionIA: string;
  category: string;
  tags: string[];
  // Contenido original para reanálisis
  sourceType?: "url" | "file" | "text" | "image" | "video" | "audio" | "pdf";
  sourceContent?: string; // Texto extraído o contenido original
  sourceUrl?: string; // URL original si aplica
  sourceMimeType?: string; // Tipo MIME del archivo original
  sourceFileName?: string; // Nombre del archivo original
}

export interface IStoredDocument extends IStored, Document {}

const StoredSchema = new Schema<IStoredDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  score: { type: Number, default: 0 },
  description: { type: String, required: false },
  descriptionIA: { type: String, default: "" },
  category: {type:String, required: false},
  tags: { type: [String], default: [] },
  // Contenido original para reanálisis
  sourceType: { type: String, enum: ["url", "file", "text", "image", "video", "audio", "pdf"], required: false },
  sourceContent: { type: String, required: false },
  sourceUrl: { type: String, required: false },
  sourceMimeType: { type: String, required: false },
  sourceFileName: { type: String, required: false },
});

const StoredModel =
  (models.Stored as Model<IStoredDocument> | undefined) ??
  model<IStoredDocument>("Stored", StoredSchema);

export default StoredModel;
