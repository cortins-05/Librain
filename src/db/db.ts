import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI");

declare global {
  var _mongoClient: MongoClient | undefined;
}

export const client =
  global._mongoClient ?? new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  global._mongoClient = client;
}

// Opcional, por comodidad
export const db = client.db(); // usa el DB del URI, o client.db("nombre")
