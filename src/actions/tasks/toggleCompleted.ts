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

  const isNowCompleted = !task.completedAt;
  
  let updateQuery: any = {
    $set: { completedAt: isNowCompleted ? new Date() : null }
  };
  
  // Si se marca como completada, limpiar contenido original para liberar espacio
  if (isNowCompleted) {
    console.log(`🧹 Tarea completada, limpiando contenido original guardado...`);
    updateQuery.$unset = {
      sourceContent: 1,
      sourceUrl: 1,
      sourceMimeType: 1,
      sourceFileName: 1,
    };
  }
  
  const updated = await StoredModel.findByIdAndUpdate(
    id,
    updateQuery,
    { new: true }
  ).select("completedAt");

  return {
    id,
    completedAt: updated?.completedAt ?? null,
  };
}
