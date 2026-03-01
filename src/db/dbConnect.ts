// src/db/dbConnect.ts
import mongoose from "mongoose";
import { getMongoUri } from "./mongoUri";

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
};

const globalForMongoose = globalThis as unknown as { mongoose: Cached };

const cached =
  globalForMongoose.mongoose ??
  (globalForMongoose.mongoose = { conn: null, promise: null, uri: null });

export async function dbConnect() {
  const uri = getMongoUri();

  if (cached.conn && cached.uri === uri) {
    return cached.conn;
  }

  if (cached.uri && cached.uri !== uri) {
    cached.conn = null;
    cached.promise = null;
    cached.uri = null;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  if (!cached.promise) {
    cached.uri = uri;
    cached.promise = mongoose
      .connect(uri, {
        // importante en serverless
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
        bufferCommands: false,
      })
      .catch((error) => {
        cached.conn = null;
        cached.promise = null;
        cached.uri = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
