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

const VALID_RESOURCES = ["url", "file", "text"] as const;
type TaskResource = (typeof VALID_RESOURCES)[number];

interface TaskFileContext {
  fileName: string;
  mimeType: string;
  size: number;
  extractedText?: string;
  imageBase64?: string;
}

interface TaskBody {
  resource: TaskResource;
  value: string;
  description: string;
  fileContext?: TaskFileContext;
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

interface OllamaTag {
  name?: string;
  model?: string;
}

interface OllamaTagsResponse {
  models?: OllamaTag[];
}

class RequestValidationError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const OLLAMA_VISION_MODEL =
  process.env.OLLAMA_VISION_MODEL ?? "llama3.2-vision:11b";
const parsedOllamaModelCacheTtlMs = Number(process.env.OLLAMA_MODEL_CACHE_TTL_MS ?? "300000");
const OLLAMA_MODEL_CACHE_TTL_MS =
  Number.isFinite(parsedOllamaModelCacheTtlMs) && parsedOllamaModelCacheTtlMs > 0
    ? parsedOllamaModelCacheTtlMs
    : 300000;

const parsedOllamaTimeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? "120000");
const OLLAMA_TIMEOUT_MS =
  Number.isFinite(parsedOllamaTimeout) && parsedOllamaTimeout > 0
    ? parsedOllamaTimeout
    : 120000;

const parsedMaxFileSizeMb = Number(process.env.OLLAMA_MAX_FILE_SIZE_MB ?? "10");
const MAX_FILE_SIZE_BYTES =
  Number.isFinite(parsedMaxFileSizeMb) && parsedMaxFileSizeMb > 0
    ? Math.floor(parsedMaxFileSizeMb * 1024 * 1024)
    : 10 * 1024 * 1024;

const parsedMaxFileTextChars = Number(process.env.OLLAMA_FILE_TEXT_MAX_CHARS ?? "14000");
const FILE_TEXT_MAX_CHARS =
  Number.isFinite(parsedMaxFileTextChars) && parsedMaxFileTextChars > 0
    ? Math.floor(parsedMaxFileTextChars)
    : 14000;

const parsedOllamaNumPredict = Number(process.env.OLLAMA_NUM_PREDICT ?? "220");
const OLLAMA_NUM_PREDICT =
  Number.isFinite(parsedOllamaNumPredict) && parsedOllamaNumPredict > 0
    ? Math.floor(parsedOllamaNumPredict)
    : 220;

const parsedOllamaTemperature = Number(process.env.OLLAMA_TEMPERATURE ?? "0.15");
const OLLAMA_TEMPERATURE =
  Number.isFinite(parsedOllamaTemperature) && parsedOllamaTemperature >= 0
    ? parsedOllamaTemperature
    : 0.15;

const parsedOllamaTopP = Number(process.env.OLLAMA_TOP_P ?? "0.9");
const OLLAMA_TOP_P =
  Number.isFinite(parsedOllamaTopP) && parsedOllamaTopP > 0 && parsedOllamaTopP <= 1
    ? parsedOllamaTopP
    : 0.9;

const parsedOllamaTopK = Number(process.env.OLLAMA_TOP_K ?? "40");
const OLLAMA_TOP_K =
  Number.isFinite(parsedOllamaTopK) && parsedOllamaTopK > 0
    ? Math.floor(parsedOllamaTopK)
    : 40;

const parsedOllamaNumCtx = Number(process.env.OLLAMA_NUM_CTX ?? "4096");
const OLLAMA_NUM_CTX =
  Number.isFinite(parsedOllamaNumCtx) && parsedOllamaNumCtx > 0
    ? Math.floor(parsedOllamaNumCtx)
    : 4096;

const parsedPromptFileTextChars = Number(
  process.env.OLLAMA_PROMPT_FILE_TEXT_CHARS ?? "8000"
);
const OLLAMA_PROMPT_FILE_TEXT_CHARS =
  Number.isFinite(parsedPromptFileTextChars) && parsedPromptFileTextChars > 0
    ? Math.floor(parsedPromptFileTextChars)
    : 8000;

const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE ?? "30m";
const CONTENT_PRIORITY_WEIGHT = 0.8;
const DESCRIPTION_HINT_WEIGHT = 0.2;

const BASE_PROMPT_PATH = path.join(process.cwd(), "src", "IA", "BASEPrompt.md");

let basePromptCache: string | null = null;
let cachedOllamaModels: string[] | null = null;
let cachedOllamaModelsAt = 0;

function isTaskResource(value: unknown): value is TaskResource {
  return (
    typeof value === "string" &&
    (VALID_RESOURCES as readonly string[]).includes(value)
  );
}

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
      `Invalid payload: state="${String(payload.state)}", score="${String(payload.score)}"`
    );
  }

  if (!normalizedState) {
    throw new Error("state is invalid");
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
      `Valor: ${input.value}`,
      `Preferencias del usuario: ${prefText}`,
      "La tarea se guardo con valores seguros y puede reintentarse el analisis despues.",
    ].join("\n"),
    state: "raw",
    score: 0,
  };
}

function extractTrimmedString(entry: FormDataEntryValue | null): string {
  return typeof entry === "string" ? entry.trim() : "";
}

function detectMimeType(file: File): string {
  const browserMime = file.type.trim().toLowerCase();
  if (browserMime) return browserMime;

  const normalizedName = file.name.toLowerCase();
  if (normalizedName.endsWith(".pdf")) return "application/pdf";
  if (normalizedName.endsWith(".png")) return "image/png";
  if (normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalizedName.endsWith(".webp")) return "image/webp";
  if (normalizedName.endsWith(".gif")) return "image/gif";
  if (normalizedName.endsWith(".bmp")) return "image/bmp";
  if (normalizedName.endsWith(".txt")) return "text/plain";
  if (normalizedName.endsWith(".md")) return "text/markdown";

  return "application/octet-stream";
}

function normalizeForPrompt(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function clampTextForPrompt(text: string): string {
  if (text.length <= FILE_TEXT_MAX_CHARS) {
    return text;
  }

  const truncated = text.slice(0, FILE_TEXT_MAX_CHARS);
  const removedCount = text.length - FILE_TEXT_MAX_CHARS;
  return `${truncated}\n\n[Contenido truncado: ${removedCount} caracteres omitidos]`;
}

function clampTextForOllamaPrompt(text: string): string {
  if (text.length <= OLLAMA_PROMPT_FILE_TEXT_CHARS) {
    return text;
  }

  const truncated = text.slice(0, OLLAMA_PROMPT_FILE_TEXT_CHARS);
  const removedCount = text.length - OLLAMA_PROMPT_FILE_TEXT_CHARS;
  return `${truncated}\n\n[Prompt truncado para rendimiento: ${removedCount} caracteres omitidos]`;
}

function isTextLikeMimeType(mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  return [
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
  ].includes(mimeType);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  type PdfJsTextItem = { str?: unknown };
  type PdfJsTextContent = { items: unknown[] };
  type PdfJsPage = { getTextContent: () => Promise<PdfJsTextContent> };
  type PdfJsDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PdfJsPage>;
    destroy?: () => Promise<void> | void;
  };
  type PdfJsLoadingTask = { promise: Promise<PdfJsDocument> };
  type PdfJsWorkerModule = { WorkerMessageHandler?: unknown };
  type GlobalWithPdfJsWorker = typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler?: unknown };
  };
  type PdfJsModule = {
    getDocument: (source: { data: Uint8Array }) => PdfJsLoadingTask;
  };

  const globalScope = globalThis as GlobalWithPdfJsWorker;
  if (!globalScope.pdfjsWorker?.WorkerMessageHandler) {
    // @ts-expect-error pdfjs-dist worker entry does not ship TypeScript declarations.
    const workerModule = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs")) as PdfJsWorkerModule;

    if (workerModule.WorkerMessageHandler) {
      globalScope.pdfjsWorker = {
        WorkerMessageHandler: workerModule.WorkerMessageHandler,
      };
    }
  }

  const pdfJs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJsModule;
  const loadingTask = pdfJs.getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;

  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if (!item || typeof item !== "object" || !("str" in item)) {
            return "";
          }
          return String((item as PdfJsTextItem).str ?? "");
        })
        .filter((itemText) => itemText.trim().length > 0)
        .join(" ");

      if (pageText) {
        pages.push(`Pagina ${pageNumber}: ${pageText}`);
      }
    }
  } finally {
    await document.destroy?.();
  }

  const extracted = normalizeForPrompt(pages.join("\n\n"));

  if (!extracted) {
    throw new Error("No se pudo extraer texto del PDF");
  }

  return clampTextForPrompt(extracted);
}

async function prepareFileContext(file: File): Promise<TaskBody> {
  if (!file || file.size <= 0) {
    throw new RequestValidationError("El archivo esta vacio");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new RequestValidationError(
      `El archivo excede el limite de ${Math.floor(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB`
    );
  }

  const mimeType = detectMimeType(file);

  if (mimeType === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    try {
      extractedText = await extractPdfText(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      throw new RequestValidationError(`No se pudo procesar el PDF: ${message}`);
    }

    return {
      resource: "file",
      value: file.name,
      description: "",
      fileContext: {
        fileName: file.name,
        mimeType,
        size: file.size,
        extractedText,
      },
    };
  }

  if (mimeType.startsWith("image/")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      resource: "file",
      value: file.name,
      description: "",
      fileContext: {
        fileName: file.name,
        mimeType,
        size: file.size,
        imageBase64: buffer.toString("base64"),
      },
    };
  }

  if (isTextLikeMimeType(mimeType)) {
    const text = normalizeForPrompt(await file.text());
    if (!text) {
      throw new RequestValidationError("El archivo no contiene texto legible");
    }

    return {
      resource: "file",
      value: file.name,
      description: "",
      fileContext: {
        fileName: file.name,
        mimeType,
        size: file.size,
        extractedText: clampTextForPrompt(text),
      },
    };
  }

  throw new RequestValidationError(
    "Tipo de archivo no soportado. Usa PDF o imagen (png, jpg, jpeg, webp, gif, bmp)."
  );
}

async function parseJsonTaskBody(request: Request): Promise<TaskBody> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RequestValidationError("Invalid JSON body", 400);
  }

  if (!body || typeof body !== "object") {
    throw new RequestValidationError("Body must be a JSON object", 400);
  }

  const payload = body as Record<string, unknown>;
  const resource = payload.resource;
  const value = typeof payload.value === "string" ? payload.value.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";

  if (!isTaskResource(resource)) {
    throw new RequestValidationError("resource must be one of: url, file, text");
  }

  if (!description) {
    throw new RequestValidationError("Missing required field: description");
  }

  if (resource === "file") {
    throw new RequestValidationError(
      "Para resource=file envia multipart/form-data con el campo `file`."
    );
  }

  if (!value) {
    throw new RequestValidationError("Missing required field: value");
  }

  return {
    resource,
    value,
    description,
  };
}

async function parseMultipartTaskBody(request: Request): Promise<TaskBody> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new RequestValidationError("Invalid multipart/form-data body", 400);
  }

  const resourceRaw = extractTrimmedString(formData.get("resource"));
  const description = extractTrimmedString(formData.get("description"));

  if (!isTaskResource(resourceRaw)) {
    throw new RequestValidationError("resource must be one of: url, file, text");
  }

  if (!description) {
    throw new RequestValidationError("Missing required field: description");
  }

  if (resourceRaw === "file") {
    const uploaded = formData.get("file");
    if (!(uploaded instanceof File)) {
      throw new RequestValidationError("Missing required file upload");
    }

    const prepared = await prepareFileContext(uploaded);
    return {
      ...prepared,
      description,
    };
  }

  const value = extractTrimmedString(formData.get("value"));
  if (!value) {
    throw new RequestValidationError("Missing required field: value");
  }

  return {
    resource: resourceRaw,
    value,
    description,
  };
}

async function parseTaskBody(request: Request): Promise<TaskBody> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parseMultipartTaskBody(request);
  }
  return parseJsonTaskBody(request);
}

function getOllamaTagsEndpoint(): string {
  try {
    const url = new URL(OLLAMA_ENDPOINT);
    url.pathname = "/api/tags";
    url.search = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:11434/api/tags";
  }
}

function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

function isVisionModelName(model: string): boolean {
  return /vision|vl|llava|bakllava/i.test(model);
}

function isModelNotFoundError(status: number, errorBody: string): boolean {
  if (status !== 404) return false;
  const lowered = errorBody.toLowerCase();
  return lowered.includes("model") && lowered.includes("not found");
}

async function listOllamaModels(): Promise<string[]> {
  const now = Date.now();
  if (
    cachedOllamaModels &&
    now - cachedOllamaModelsAt < OLLAMA_MODEL_CACHE_TTL_MS
  ) {
    return cachedOllamaModels;
  }

  try {
    const response = await fetch(getOllamaTagsEndpoint(), {
      method: "GET",
      signal: AbortSignal.timeout(Math.min(OLLAMA_TIMEOUT_MS, 10000)),
    });

    if (!response.ok) {
      return cachedOllamaModels ?? [];
    }

    const parsed = (await response.json()) as OllamaTagsResponse;
    const models = uniqueModels(
      Array.isArray(parsed.models)
        ? parsed.models
            .map((model) => model.name ?? model.model ?? "")
            .filter((name): name is string => typeof name === "string")
        : []
    );

    cachedOllamaModels = models;
    cachedOllamaModelsAt = now;
    return models;
  } catch {
    return cachedOllamaModels ?? [];
  }
}

function selectPreferredModel(
  preferred: string,
  availableModels: string[],
  requiresVision: boolean
): string {
  const normalizedPreferred = preferred.toLowerCase();
  const exact = availableModels.find(
    (model) => model.toLowerCase() === normalizedPreferred
  );
  if (exact) return exact;

  const preferredBase = preferred.split(":")[0]?.toLowerCase() ?? normalizedPreferred;
  const prefixed = availableModels.find((model) =>
    model.toLowerCase().startsWith(preferredBase)
  );
  if (prefixed) return prefixed;

  if (requiresVision) {
    const anyVision = availableModels.find((model) => isVisionModelName(model));
    if (anyVision) return anyVision;
  }

  if (!requiresVision) {
    const exactTextModel = availableModels.find(
      (model) => model.toLowerCase() === OLLAMA_MODEL.toLowerCase()
    );
    if (exactTextModel) return exactTextModel;
  }

  return preferred;
}

async function getBasePrompt(): Promise<string> {
  if (basePromptCache) {
    return basePromptCache;
  }

  basePromptCache = await readFile(BASE_PROMPT_PATH, "utf8");
  if (!basePromptCache.trim()) {
    basePromptCache = null;
    throw new Error("BASEPrompt.md esta vacio");
  }
  return basePromptCache;
}

function buildPromptPayload(input: TaskBody, preferences: string[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    resource: input.resource,
    value: input.value,
    description: input.description,
    preferences,
    analysisPolicy: {
      contentWeight: CONTENT_PRIORITY_WEIGHT,
      descriptionWeight: DESCRIPTION_HINT_WEIGHT,
      descriptionRole: "hint",
      conflictResolution: "If content and description conflict, trust content.",
    },
  };

  if (input.fileContext) {
    payload.file = {
      name: input.fileContext.fileName,
      mimeType: input.fileContext.mimeType,
      sizeBytes: input.fileContext.size,
      extractedText: input.fileContext.extractedText
        ? clampTextForOllamaPrompt(input.fileContext.extractedText)
        : undefined,
      imageAttached: Boolean(input.fileContext.imageBase64),
    };

    payload.contentSource =
      input.fileContext.imageBase64 ? "images[0]" : "file.extractedText";
  } else {
    payload.contentSource = "value";
  }

  return payload;
}

function buildOllamaRequestBody(input: TaskBody, prompt: string, model: string): string {
  const isImageRequest = Boolean(input.fileContext?.imageBase64);

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
    format: "json",
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      num_predict: OLLAMA_NUM_PREDICT,
      temperature: OLLAMA_TEMPERATURE,
      top_p: OLLAMA_TOP_P,
      top_k: OLLAMA_TOP_K,
      num_ctx: OLLAMA_NUM_CTX,
    },
  };

  if (isImageRequest && input.fileContext?.imageBase64) {
    requestBody.images = [input.fileContext.imageBase64];
  }

  return JSON.stringify(requestBody);
}

async function generateTaskMetadata(
  input: TaskBody,
  preferences: string[]
): Promise<TaskGenerationResult> {
  const basePrompt = await getBasePrompt();
  const requiresVision = Boolean(input.fileContext?.imageBase64);
  const preferredModel = requiresVision ? OLLAMA_VISION_MODEL : OLLAMA_MODEL;
  const availableModels = await listOllamaModels();
  const selectedModel = selectPreferredModel(
    preferredModel,
    availableModels,
    requiresVision
  );

  const promptLines = [
    basePrompt,
    "",
    "PRIORIDAD DE ANALISIS (OBLIGATORIA):",
    `- Basa el analisis en un ${Math.round(CONTENT_PRIORITY_WEIGHT * 100)}% en el contenido real del recurso (value, file.extractedText o images).`,
    `- Usa la descripcion solo como pista contextual (${Math.round(DESCRIPTION_HINT_WEIGHT * 100)}%).`,
    "- Si descripcion y contenido se contradicen, prevalece el contenido.",
    "",
    "ENTRADA DEL USUARIO:",
    JSON.stringify(buildPromptPayload(input, preferences)),
    "",
  ];

  if (input.fileContext?.imageBase64) {
    promptLines.push(
      "IMPORTANTE: Hay una imagen adjunta en el campo images. Analizala antes de responder."
    );
    promptLines.push("");
  }
  if (input.fileContext?.mimeType === "application/pdf") {
    promptLines.push(
      "IMPORTANTE: El texto extraido del PDF viene en file.extractedText. Analizalo de forma exhaustiva."
    );
    promptLines.push("");
  }

  promptLines.push("Devuelve exclusivamente JSON valido con descriptionIA, state y score.");

  const prompt = promptLines.join("\n");
  const candidateModels = uniqueModels([
    selectedModel,
    preferredModel,
    !requiresVision ? OLLAMA_MODEL : "",
  ]);

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const requestBody = buildOllamaRequestBody(input, prompt, model);

    let ollamaResponse: Response;
    try {
      ollamaResponse = await fetch(OLLAMA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
        body: requestBody,
      });
    } catch (err) {
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
      if (isModelNotFoundError(ollamaResponse.status, errorBody)) {
        lastError = new Error(`Ollama model not found: ${model}`);
        continue;
      }
      throw new Error(`Ollama HTTP ${ollamaResponse.status}: ${errorBody}`);
    }

    const generated = (await ollamaResponse.json()) as OllamaGenerateResponse;
    if (generated.error) {
      if (generated.error.toLowerCase().includes("not found")) {
        lastError = new Error(`Ollama model not found: ${model}`);
        continue;
      }
      throw new Error(generated.error);
    }

    if (typeof generated.response !== "string") {
      throw new Error("Ollama payload does not include response text");
    }

    const parsed = parseJsonObject(generated.response);
    return normalizeGeneratedTask(parsed);
  }

  const availableText =
    availableModels.length > 0
      ? `Modelos disponibles: ${availableModels.join(", ")}`
      : "No se pudieron listar modelos en /api/tags";
  const modelHint = requiresVision
    ? `Asegurate de tener descargado un modelo de vision (ej. \`ollama pull ${OLLAMA_VISION_MODEL}\`).`
    : `Asegurate de tener descargado \`${OLLAMA_MODEL}\` en Ollama.`;

  throw new Error(
    [
      `No se encontro un modelo compatible para esta solicitud. Ultimo error: ${lastError?.message ?? "sin detalle"}.`,
      availableText,
      modelHint,
    ].join(" ")
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TaskBody;
  try {
    body = await parseTaskBody(request);
  } catch (err) {
    if (err instanceof RequestValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("[POST /api/task] invalid payload", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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
    generatedTask = await generateTaskMetadata(body, preferences);
  } catch (err) {
    ollamaError = err instanceof Error ? err.message : "Unknown Ollama error";
    console.error("[POST /api/task] Ollama generation failed", err);
    generatedTask = buildFallbackTaskMetadata(body, preferences);
  }

  try {
    await dbConnect();

    const stored = await Stored.create({
      user: session.user.id,
      name: body.description,
      description: body.description,
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
