"use server";

import { dbConnect } from "@/db/dbConnect";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import StoredModel from "@/db/Models/Task/Task.model";
import { generateStoredMetadata } from "@/lib/librainGemini";

/**
 * Reevalúa todas las tareas del usuario con las nuevas preferencias
 */
async function reevaluateUserTasks(userId: string, preferences: string[]) {
  await dbConnect();
  
  // Obtener todas las tareas del usuario que no están completadas
  const tasks = await StoredModel.find({
    user: userId,
    completedAt: { $exists: false }
  });

  // Si no hay tareas, no hacer nada
  if (tasks.length === 0) {
    return;
  }

  // Reevaluar cada tarea con las nuevas preferencias
  const reevaluationPromises = tasks.map(async (task) => {
    try {
      // Generar nueva metadata usando descripción existente
      const { score } = await generateStoredMetadata(
        task.description || task.descriptionIA,
        preferences,
        task.description
      );

      // Actualizar solo el score
      await StoredModel.updateOne(
        { _id: task._id },
        { $set: { score } }
      );
    } catch (error) {
      console.error(`Error reevaluando tarea ${task._id}:`, error);
      // Continuar con las demás tareas si una falla
    }
  });

  await Promise.all(reevaluationPromises);
}

export async function addPreferenceAction(name: string) {
  await dbConnect();

  if (name.length==0) {
    throw new Error("Nombre no válido");
  }

  const session = await auth.api.getSession({headers: await headers()});

  if(!session?.user){
    throw new Error("Usuario no válido");
  }

  const preferences = session.user.preferences;
  preferences.push(name);

  const {status} = await auth.api.updateUser({
    headers: await headers(),
    body: {
        preferences
    }
  })

  // Reevaluar tareas con las nuevas preferencias
  await reevaluateUserTasks(session.user.id, preferences);
    
  return {
    status
  }
    
}

export async function deletePreferenceAction(name:string) {
  await dbConnect();
  const session = await auth.api.getSession({headers:await headers()});
  if(!session) return;
  const preferences = session.user.preferences;
  const prefePulidas = preferences.filter(pre=>pre!=name);
  const {status} = await auth.api.updateUser({
    headers: await headers(),
    body: {
      preferences: prefePulidas
    }
  })

  // Reevaluar tareas con las nuevas preferencias
  await reevaluateUserTasks(session.user.id, prefePulidas);

  return status;
}
