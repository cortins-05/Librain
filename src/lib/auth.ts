import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { client, db } from "@/db/db";

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    // si no pasas client, no hay transacciones
    client,
  }),

  user: {
    additionalFields: {
      preferences: {
        type: "string[]",    
        required: true,
        defaultValue: [],    
      },
    },
  },

  emailAndPassword: { enabled: true },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }
  },

  // opcional: joins (desde 1.4.0)
  experimental: { joins: true },
});