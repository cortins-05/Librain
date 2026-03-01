"use server";

import { dbConnect } from "@/db/dbConnect";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import StoredModel from "@/db/Models/Task/Task.model";
import { generateStoredMetadata } from "@/lib/gemini";

function normalizePreference(value: string) {
  return value.trim();
}

function normalizePreferences(values: string[] | undefined) {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of source) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(value);
  }

  return normalized;
}

async function reevaluateUserTasks(userId: string, preferences: string[]) {
  await dbConnect();

  const tasks = await StoredModel.find({
    user: userId,
    $or: [{ completedAt: { $exists: false } }, { completedAt: null }],
  });

  if (tasks.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  await Promise.all(
    tasks.map(async (task) => {
      try {
        const contentToAnalyze =
          task.sourceContent || task.description || task.descriptionIA || task.name;

        const { score } = await generateStoredMetadata(
          contentToAnalyze,
          preferences,
          task.description
        );

        await StoredModel.updateOne(
          { _id: task._id },
          { $set: { score } }
        );

        processed += 1;
      } catch (error) {
        failed += 1;
        console.error(`Error reevaluando tarea ${task._id}:`, error);
      }
    })
  );

  return { processed, failed };
}

export async function addPreferenceAction(name: string) {
  await dbConnect();

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("Usuario no válido");
  }

  const newPreference = normalizePreference(name);
  if (!newPreference) {
    throw new Error("Nombre no válido");
  }

  const currentPreferences = normalizePreferences(session.user.preferences);
  const alreadyExists = currentPreferences.some(
    (pre) => pre.toLowerCase() === newPreference.toLowerCase()
  );

  const nextPreferences = alreadyExists
    ? currentPreferences
    : [...currentPreferences, newPreference];

  const { status } = await auth.api.updateUser({
    headers: await headers(),
    body: {
      preferences: nextPreferences,
    },
  });

  if (!status) {
    throw new Error("No se pudieron actualizar las preferencias");
  }

  let reevaluation = { processed: 0, failed: 0 };
  let reevaluationWarning: string | null = null;

  if (!alreadyExists) {
    try {
      reevaluation = await reevaluateUserTasks(session.user.id, nextPreferences);
      if (reevaluation.failed > 0) {
        reevaluationWarning = "Algunas tareas no se pudieron reevaluar";
      }
    } catch (error) {
      console.error("Error general de reevaluación:", error);
      reevaluationWarning = "No se pudo completar la reevaluación de tareas";
    }
  }

  return {
    status,
    preferences: nextPreferences,
    reevaluation,
    reevaluationWarning,
  };
}

export async function deletePreferenceAction(name: string) {
  await dbConnect();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Usuario no válido");
  }

  const preferenceToDelete = normalizePreference(name);
  if (!preferenceToDelete) {
    throw new Error("Nombre no válido");
  }

  const currentPreferences = normalizePreferences(session.user.preferences);
  const nextPreferences = currentPreferences.filter(
    (pre) => pre.toLowerCase() !== preferenceToDelete.toLowerCase()
  );

  const { status } = await auth.api.updateUser({
    headers: await headers(),
    body: {
      preferences: nextPreferences,
    },
  });

  if (!status) {
    throw new Error("No se pudieron actualizar las preferencias");
  }

  let reevaluation = { processed: 0, failed: 0 };
  let reevaluationWarning: string | null = null;

  try {
    reevaluation = await reevaluateUserTasks(session.user.id, nextPreferences);
    if (reevaluation.failed > 0) {
      reevaluationWarning = "Algunas tareas no se pudieron reevaluar";
    }
  } catch (error) {
    console.error("Error general de reevaluación:", error);
    reevaluationWarning = "No se pudo completar la reevaluación de tareas";
  }

  return {
    status,
    preferences: nextPreferences,
    reevaluation,
    reevaluationWarning,
  };
}
