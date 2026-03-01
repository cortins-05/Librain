import { MongoClient } from "mongodb";
import { getMongoUri } from "./mongoUri";

const uri = getMongoUri();

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientUri: string | undefined;
}

if (!global._mongoClient || global._mongoClientUri !== uri) {
  global._mongoClient = new MongoClient(uri);
  global._mongoClientUri = uri;
}

export const client = global._mongoClient;
export const db = client.db();
