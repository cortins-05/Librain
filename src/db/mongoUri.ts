export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  return uri;
}
