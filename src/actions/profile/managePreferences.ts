"use server";

import { dbConnect } from "@/db/dbConnect";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Types } from "mongoose";
import StoredModel from "@/db/Models/Task/Task.model";
import { generateStoredMetadata } from "@/lib/gemini";

type ReevaluationResult = {
  processed: number;
  failed: number;
};

type ReevaluableTask = {
  _id: Types.ObjectId;
  sourceContent?: string;
  description?: string;
  descriptionIA?: string;
  name?: string;
  score?: number;
};

const REEVALUATION_CONCURRENCY = 3;

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

function getTaskContent(task: ReevaluableTask) {
  const candidates = [
    task.sourceContent,
    task.description,
    task.descriptionIA,
    task.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (value) return value;
  }

  return "Tarea sin contenido";
}

function normalizeScore(rawScore: unknown, fallback = 0) {
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) {
    return fallback;
  }

  const rounded = Math.round(rawScore);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

function splitInBatches<T>(items: T[], batchSize: number) {
  if (batchSize <= 0) {
    return [items];
  }

  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

async function reevaluateUserTasks(
  userId: string,
  preferences: string[]
): Promise<ReevaluationResult> {
  await dbConnect();

  const normalizedPreferences = normalizePreferences(preferences);
  const tasks = (await StoredModel.find({
    user: userId,
    $or: [{ completedAt: { $exists: false } }, { completedAt: null }],
  })
    .select("_id sourceContent description descriptionIA name score")
    .lean()) as unknown as ReevaluableTask[];

  if (tasks.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const batch of splitInBatches(tasks, REEVALUATION_CONCURRENCY)) {
    const batchResults = await Promise.all(
      batch.map(async (task) => {
        try {
          const contentToAnalyze = getTaskContent(task);
          const { score } = await generateStoredMetadata(
            contentToAnalyze,
            normalizedPreferences,
            task.description
          );

          const currentScore = normalizeScore(task.score, 0);
          const nextScore = normalizeScore(score, currentScore);

          if (nextScore !== currentScore) {
            await StoredModel.updateOne({ _id: task._id }, { $set: { score: nextScore } });
          }

          return true;
        } catch (error) {
          console.error(`Error reevaluando tarea ${task._id}:`, error);
          return false;
        }
      })
    );

    for (const ok of batchResults) {
      if (ok) {
        processed += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { processed, failed };
}

export async function addPreferenceAction(name: string) {
  await dbConnect();

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    throw new Error("Usuario no valido");
  }

  const newPreference = normalizePreference(name);
  if (!newPreference) {
    throw new Error("Nombre no valido");
  }

  const currentPreferences = normalizePreferences(session.user.preferences);
  const alreadyExists = currentPreferences.some(
    (preference) => preference.toLowerCase() === newPreference.toLowerCase()
  );
  const nextPreferences = alreadyExists
    ? currentPreferences
    : [...currentPreferences, newPreference];

  if (alreadyExists) {
    return {
      status: true,
      preferences: nextPreferences,
      reevaluation: { processed: 0, failed: 0 },
      reevaluationWarning: null,
    };
  }

  const { status } = await auth.api.updateUser({
    headers: requestHeaders,
    body: { preferences: nextPreferences },
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
    console.error("Error general de reevaluacion:", error);
    reevaluationWarning = "No se pudo completar la reevaluacion de tareas";
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

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    throw new Error("Usuario no valido");
  }

  const preferenceToDelete = normalizePreference(name);
  if (!preferenceToDelete) {
    throw new Error("Nombre no valido");
  }

  const currentPreferences = normalizePreferences(session.user.preferences);
  const nextPreferences = currentPreferences.filter(
    (preference) => preference.toLowerCase() !== preferenceToDelete.toLowerCase()
  );

  const didChange = nextPreferences.length !== currentPreferences.length;
  if (!didChange) {
    return {
      status: true,
      preferences: nextPreferences,
      reevaluation: { processed: 0, failed: 0 },
      reevaluationWarning: null,
    };
  }

  const { status } = await auth.api.updateUser({
    headers: requestHeaders,
    body: { preferences: nextPreferences },
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
    console.error("Error general de reevaluacion:", error);
    reevaluationWarning = "No se pudo completar la reevaluacion de tareas";
  }

  return {
    status,
    preferences: nextPreferences,
    reevaluation,
    reevaluationWarning,
  };
}
