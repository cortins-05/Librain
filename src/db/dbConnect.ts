import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Define la variable MONGODB_URI en tu archivo .env.local"
  );
}

/**
 * Cacheamos la conexión en el objeto global para que Next.js no
 * abra una conexión nueva en cada hot-reload (dev) ni en cada
 * invocación de una serverless function (prod).
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const cached = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  // Si ya hay conexión establecida, la reutilizamos
  if (cached.conn) return cached.conn;

  // Si no hay promesa en curso, la creamos
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // lanza error inmediato si no hay conexión, sin hacer cola
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Si falla, reseteamos la promesa para que el próximo intento vuelva a conectar
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}