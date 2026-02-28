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
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b-instruct";
const parsedOllamaTimeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? "45000");
const OLLAMA_TIMEOUT_MS =
  Number.isFinite(parsedOllamaTimeout) && parsedOllamaTimeout > 0
    ? parsedOllamaTimeout
    : 45000;
const BASE_PROMPT_PATH = path.join(process.cwd(), "src", "IA", "BASEPrompt.md");

let basePromptCache: string | null = null;

function isStoredState(value: unknown): value is StoredState {
  return (
    typeof value === "string" &&
    (STORED_STATES as readonly string[]).includes(value)
  );
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
  const state = payload.state;
  const numericScore =
    typeof payload.score === "number"
      ? payload.score
      : typeof payload.score === "string"
        ? Number(payload.score)
        : Number.NaN;

  if (!descriptionIA) {
    throw new Error("descriptionIA is missing");
  }

  if (!isStoredState(state)) {
    throw new Error("state is invalid");
  }

  if (!Number.isFinite(numericScore)) {
    throw new Error("score is invalid");
  }

  return {
    descriptionIA,
    state,
    score: Math.max(0, Math.min(100, Math.round(numericScore))),
  };
}

async function getBasePrompt(): Promise<string> {
  if (basePromptCache) {
    return basePromptCache;
  }

  basePromptCache = await readFile(BASE_PROMPT_PATH, "utf8");
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

  const ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
    }),
  });

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
  try {
    generatedTask = await generateTaskMetadata(
      { resource, value, description },
      preferences
    );
  } catch (err) {
    console.error("[POST /api/task] Ollama generation failed", err);
    return NextResponse.json(
      { error: "Failed to generate task metadata with Ollama" },
      { status: 502 }
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

    return NextResponse.json({ stored }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/task] database error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
