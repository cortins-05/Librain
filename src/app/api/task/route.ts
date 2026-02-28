import { headers } from "next/headers";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { dbConnect } from "@/db/dbConnect";
import Stored from "@/db/Models/Stored/main.model";

export async function POST(request: Request) {
  
}
