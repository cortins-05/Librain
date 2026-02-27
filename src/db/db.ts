// src/db.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("Please define MONGODB_URI in your env");
}

const client = new MongoClient(uri);

export { client };