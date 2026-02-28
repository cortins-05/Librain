import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/db/dbConnect";
import Stored, {
  STORED_STATES,
  type StoredState,
} from "@/db/Models/Stored/main.model";

interface TaskBody {
  resource: "url" | "file" | "text";
  value: string;
  description: string;
}

interface TaskGenerationResult {
  descriptionIA: string;
  state: StoredState;
  score: number;
}

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const parsedOllamaTimeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? "120000");
const OLLAMA_TIMEOUT_MS =
  Number.isFinite(parsedOllamaTimeout) && parsedOllamaTimeout > 0
    ? parsedOllamaTimeout
    : 120000;
const BASE_PROMPT_PATH = path.join(process.cwd(), "src", "IA", "BASEPrompt.md");

let basePromptCache: string | null = null;

function isStoredState(value: unknown): value is StoredState {
  return (
    typeof value === "string" &&
    (STORED_STATES as readonly string[]).includes(value)
  );
}

function normalizeState(value: unknown): StoredState | null {
  if (isStoredState(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "usable" : "raw";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 3) return "actionable";
    if (value >= 2) return "solid";
    if (value >= 1) return "usable";
    return "raw";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"`.,;:!?()[\]{}]/g, "")
    .replace(/[\s_-]+/g, "");

  switch (normalized) {
    case "raw":
    case "borrador":
    case "insuficiente":
    case "incompleto":
    case "caotico":
      return "raw";
    case "usable":
    case "useable":
    case "util":
    case "aprovechable":
    case "entendible":
      return "usable";
    case "solid":
    case "solido":
    case "structured":
    case "estructurado":
      return "solid";
    case "actionable":
    case "accionable":
    case "ejecutable":
      return "actionable";
    default:
      if (normalized.includes("action") || normalized.includes("accion")) {
        return "actionable";
      }
      if (normalized.includes("solid") || normalized.includes("estructur")) {
        return "solid";
      }
      if (
        normalized.includes("usable") ||
        normalized.includes("aprovech") ||
        normalized.includes("util")
      ) {
        return "usable";
      }
      if (
        normalized.includes("raw") ||
        normalized.includes("insuf") ||
        normalized.includes("caot")
      ) {
        return "raw";
      }
      return null;
  }
}

function inferStateFromScore(score: number): StoredState {
  if (score >= 85) return "actionable";
  if (score >= 65) return "solid";
  if (score >= 35) return "usable";
  return "raw";
}

function parseJsonObject(text: string): unknown {
  const raw = text.trim();
  if (!raw) {
    throw new Error("Ollama returned an empty response");
  }

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Ollama response is not valid JSON");
    }

    return JSON.parse(raw.slice(start, end + 1));
  }
}

function normalizeGeneratedTask(result: unknown): TaskGenerationResult {
  if (!result || typeof result !== "object") {
    throw new Error("Generated payload is not an object");
  }

  const payload = result as Record<string, unknown>;
  const descriptionIA =
    typeof payload.descriptionIA === "string" ? payload.descriptionIA.trim() : "";
  let normalizedState = normalizeState(payload.state);
  const numericScore =
    typeof payload.score === "number"
      ? payload.score
      : typeof payload.score === "string"
        ? Number(payload.score)
        : Number.NaN;
        
  const normalizedScore: number | null = Number.isFinite(numericScore)
    ? Math.max(0, Math.min(100, Math.round(numericScore)))
    : null;

  if (!descriptionIA) {
    throw new Error("descriptionIA is missing");
  }

  if (!normalizedState && normalizedScore !== null) {
    normalizedState = inferStateFromScore(normalizedScore);
  }

  if (!normalizedState && normalizedScore === null) {
    throw new Error(
      `Payload inválido: state="${String(payload.state)}", score="${String(payload.score)}"`
    );
  }

  if (!normalizedState) {
    throw new Error(`state is invalid: ...`);
  }

  if (normalizedScore === null) {
    throw new Error("score is invalid");
  }

  return {
    descriptionIA,
    state: normalizedState,
    score: normalizedScore,
  };
}

function buildFallbackTaskMetadata(
  input: TaskBody,
  preferences: string[]
): TaskGenerationResult {
  const prefText =
    preferences.length > 0 ? preferences.join(", ") : "sin preferencias definidas";

  return {
    descriptionIA: [
      "No se pudo generar metadata con IA en este momento.",
      `Descripcion original: ${input.description}`,
      `Recurso: ${input.resource}`,
      `Preferencias del usuario: ${prefText}`,
      "La tarea se guardo con valores seguros y puede reintentarse el analisis despues.",
    ].join("\n"),
    state: "raw",
    score: 0,
  };
}

async function getBasePrompt(): Promise<string> {
  if (basePromptCache) {
    return basePromptCache;
  }

  basePromptCache = await readFile(BASE_PROMPT_PATH, "utf8");
  if (!basePromptCache.trim()) {
    basePromptCache = null;
    throw new Error("BASEPrompt.md está vacío");
  }
  return basePromptCache;
}

async function generateTaskMetadata(
  input: TaskBody,
  preferences: string[]
): Promise<TaskGenerationResult> {
  const basePrompt = await getBasePrompt();

  const prompt = [
    basePrompt,
    "",
    "ENTRADA DEL USUARIO:",
    JSON.stringify(
      {
        resource: input.resource,
        value: input.value,
        description: input.description,
        preferences,
      },
      null,
      2
    ),
    "",
    "Devuelve exclusivamente JSON valido con descriptionIA, state y score.",
  ].join("\n");

  const requestBody = JSON.stringify({
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    format: "json",
    keep_alive: "10m",
  });

  let ollamaResponse: Response;
  try {
    ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      body: requestBody,
    });
  } catch (err) {
    // First load of a model can be slow; one retry usually recovers this case.
    if (err instanceof Error && err.name === "TimeoutError") {
      ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS * 2),
        body: requestBody,
      });
    } else {
      throw err;
    }
  }

  if (!ollamaResponse.ok) {
    const errorBody = await ollamaResponse.text();
    throw new Error(`Ollama HTTP ${ollamaResponse.status}: ${errorBody}`);
  }

  const generated = (await ollamaResponse.json()) as OllamaGenerateResponse;
  if (generated.error) {
    throw new Error(generated.error);
  }

  if (typeof generated.response !== "string") {
    throw new Error("Ollama payload does not include response text");
  }

  const parsed = parseJsonObject(generated.response);
  return normalizeGeneratedTask(parsed);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TaskBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resource = body.resource;
  const value = typeof body.value === "string" ? body.value.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!resource || !value || !description) {
    return NextResponse.json(
      { error: "Missing required fields: resource, value, description" },
      { status: 422 }
    );
  }

  if (!["url", "file", "text"].includes(resource)) {
    return NextResponse.json(
      { error: "resource must be one of: url, file, text" },
      { status: 422 }
    );
  }

  const userWithPreferences = session.user as typeof session.user & {
    preferences?: unknown;
  };

  const preferences = Array.isArray(userWithPreferences.preferences)
    ? userWithPreferences.preferences.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];

  let generatedTask: TaskGenerationResult;
  let ollamaError: string | null = null;
  try {
    generatedTask = await generateTaskMetadata(
      { resource, value, description },
      preferences
    );
  } catch (err) {
    ollamaError = err instanceof Error ? err.message : "Unknown Ollama error";
    console.error("[POST /api/task] Ollama generation failed", err);
    generatedTask = buildFallbackTaskMetadata(
      { resource, value, description },
      preferences
    );
  }

  try {
    await dbConnect();

    const stored = await Stored.create({
      user: session.user.id,
      name: description,
      description,
      descriptionIA: generatedTask.descriptionIA,
      state: generatedTask.state,
      score: generatedTask.score,
    });

    return NextResponse.json(
      {
        stored,
        ai: {
          fallback: Boolean(ollamaError),
          error: ollamaError,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/task] database error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
