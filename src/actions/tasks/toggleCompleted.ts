"use server";

import { dbConnect } from "@/db/dbConnect";
import StoredModel from "@/db/Models/Task/Task.model";
import mongoose from "mongoose";

export async function toggleCompletedAction(id: string) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Id no válido");
  }

  const task = await StoredModel.findById(id).select("completedAt");

  if (!task) {
    throw new Error("Inquietud no encontrada");
  }

  const updated = await StoredModel.findByIdAndUpdate(
    id,
    {
      completedAt: task.completedAt ? null : new Date(),
    },
    { new: true }
  ).select("completedAt");

  return {
    id,
    completedAt: updated?.completedAt ?? null,
  };
}
