"use server";

import { dbConnect } from "@/db/dbConnect";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function addPreferenceAction(name: string) {
  await dbConnect();

  if (name.length==0) {
    throw new Error("Invalid name");
  }

  const session = await auth.api.getSession({headers: await headers()});

  if(!session?.user){
    throw new Error("Invalid user");
  }

  const preferences = session.user.preferences;
  preferences.push(name);

  const {status} = await auth.api.updateUser({
    headers: await headers(),
    body: {
        preferences
    }
  })

    
  return {
    status
  }
    
}