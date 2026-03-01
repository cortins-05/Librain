type GeminiStoredResponse = {
  name: string;
  score: number;
  descriptionIA: string;
};

export type LibrainAssistantInput = {
  userMessage: string;
  userName?: string;
  currentRoute?: string;
  isLoggedIn?: boolean;
  preferences?: string[];
};

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:1b";
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE ?? "20m";
const OLLAMA_TIMEOUT_MS = clampInt(process.env.OLLAMA_TIMEOUT_MS, 14_000, 3_000, 60_000);
const OLLAMA_CHAT_TIMEOUT_MS = clampInt(
  process.env.OLLAMA_CHAT_TIMEOUT_MS,
  OLLAMA_TIMEOUT_MS,
  3_000,
  60_000
);
const OLLAMA_METADATA_TIMEOUT_MS = clampInt(
  process.env.OLLAMA_METADATA_TIMEOUT_MS,
  Math.max(18_000, OLLAMA_TIMEOUT_MS),
  6_000,
  90_000
);

const MAX_ASSISTANT_MESSAGE_CHARS = 1_600;
const MAX_ASSISTANT_RESPONSE_CHARS = 1_200;
const MAX_ASSISTANT_RESPONSE_LINES = 8;
const MAX_METADATA_TEXT_CHARS = 4_500;
const MAX_USER_PREFERENCES = 8;

const ASSISTANT_SYSTEM_PROMPT = `
Eres Librain AI, asistente del producto Librain.
Responde siempre en espanol, texto plano, tono cordial y practico.

Que SI existe en Librain:
- Crear inquietudes desde URL, texto o archivo.
- Archivos soportados en creacion: PDF, imagen, audio.
- Video solo por URL, no como archivo subido directo.
- Ver panel con score, estado y resumen IA.
- Marcar inquietudes como completadas.
- Eliminar inquietudes.
- Gestionar preferencias en /profile.
- Ver recomendacion diaria en /daily.

Que NO existe ahora:
- Editar inquietudes ya creadas.
- Cambiar foto, nombre o email desde UI.
- Recuperacion de contrasena en la UI.
- Adjuntar archivos en este chat.
- Acciones en lote, export/import, recordatorios, notificaciones.

Reglas:
- Si algo no existe, dilo claramente y ofrece alternativa real.
- No inventes funciones ni endpoints.
- Respuesta corta por defecto; si el usuario esta bloqueado, da pasos numerados.
- Evita repetir frases o ideas.
- Suena natural, sin muletillas ni texto robotico.
- No uses caracteres corruptos o texto ilegible.
- No uses markdown, tablas ni bloques de codigo.
- Si falta contexto, haz una sola pregunta corta.
`;

const SPANISH_HINT_WORDS = new Set([
  "de",
  "la",
  "el",
  "que",
  "y",
  "en",
  "para",
  "con",
  "por",
  "una",
  "un",
  "como",
  "puedo",
  "puedes",
  "te",
  "tu",
  "si",
  "no",
  "hola",
  "gracias",
]);

const ENGLISH_HINT_WORDS = new Set([
  "the",
  "and",
  "is",
  "are",
  "this",
  "that",
  "for",
  "with",
  "you",
  "your",
  "can",
  "cannot",
  "please",
]);

function clampInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function sanitizeForPrompt(text: string) {
  return text.replace(/```/g, "\u0060\u0060\u0060").replace(/\s+/g, " ").trim();
}

function shortText(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function tokenizeWords(text: string) {
  return text.toLowerCase().match(/[a-z0-9\u00c0-\u024f]+/gi) ?? [];
}

function normalizeAssistantLine(line: string) {
  return line
    .replace(/^(assistant|asistente|librain ai|librain)\s*:\s*/i, "")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^[*-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelySpanishText(text: string) {
  const words = tokenizeWords(text);
  if (words.length < 5) return true;

  let spanishHits = 0;
  let englishHits = 0;

  for (const word of words) {
    if (SPANISH_HINT_WORDS.has(word)) spanishHits++;
    if (ENGLISH_HINT_WORDS.has(word)) englishHits++;
  }

  if (words.length >= 12 && spanishHits === 0) return false;
  if (englishHits >= 4 && englishHits > spanishHits * 2) return false;

  return true;
}

function cleanupAssistantOutput(raw: string) {
  const withoutCodeFences = raw.replace(/```(?:\w+)?/g, "");
  const lines = withoutCodeFences
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => normalizeAssistantLine(line))
    .filter((line) => line.length > 0);

  const dedupedAdjacent: string[] = [];
  const seenLines = new Set<string>();
  for (const line of lines) {
    const fingerprint = line.toLowerCase();
    if (
      dedupedAdjacent[dedupedAdjacent.length - 1]?.toLowerCase() !== fingerprint &&
      !seenLines.has(fingerprint)
    ) {
      dedupedAdjacent.push(line);
      seenLines.add(fingerprint);
      if (dedupedAdjacent.length >= MAX_ASSISTANT_RESPONSE_LINES) break;
    }
  }

  const collapsed = dedupedAdjacent.join("\n").replace(/[ \t]{2,}/g, " ").trim();
  return shortText(collapsed, MAX_ASSISTANT_RESPONSE_CHARS);
}

function looksBrokenAssistantOutput(text: string) {
  if (!text || text.length < 6) return true;
  if (/(.)\1{24,}/.test(text)) return true;
  if (/[\uFFFD]|\u00C3[\x80-\xBF]|\u00C2/.test(text)) return true;
  if (/contexto de sesion|pregunta del cliente|instruccion final/i.test(text)) return true;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length >= 3) {
    const normalizedLines = lines.map((line) => line.toLowerCase());
    const uniqueLineRatio = new Set(normalizedLines).size / normalizedLines.length;
    if (uniqueLineRatio < 0.65) return true;
  }

  const words = tokenizeWords(text);
  if (words.length >= 24) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.35) return true;

    const counts = new Map<string, number>();
    let highestCount = 0;
    for (const word of words) {
      const next = (counts.get(word) ?? 0) + 1;
      counts.set(word, next);
      if (next > highestCount) highestCount = next;
    }
    if (highestCount / words.length > 0.26) return true;
  }

  if (!isLikelySpanishText(text)) return true;

  return false;
}

function extractLatestQuestion(rawMessage: string) {
  const marker = "Mensaje actual del usuario:";
  const idx = rawMessage.lastIndexOf(marker);
  if (idx === -1) return rawMessage.trim();
  const tail = rawMessage.slice(idx + marker.length).trim();
  return tail.length > 0 ? tail : rawMessage.trim();
}

function extractShortHistory(rawMessage: string) {
  const startMarker = "Historial reciente de la conversacion:";
  const endMarker = "Mensaje actual del usuario:";
  const startIdx = rawMessage.indexOf(startMarker);
  const endIdx = rawMessage.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return "";

  const block = rawMessage
    .slice(startIdx + startMarker.length, endIdx)
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (block.length === 0) return "";
  return shortText(block.slice(-2).join(" | "), 320);
}

function extractFirstJsonObject(text: string): string {
  const cleaned = text.replace(/```json|```/g, "").trim();

  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;

  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No se encontro un JSON en la respuesta.");

  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return cleaned.slice(start, i + 1).trim();
  }

  throw new Error("JSON incompleto en la respuesta del modelo.");
}

function isSimpleGreeting(message: string) {
  const normalized = message.toLowerCase().trim();
  return /^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches)$/.test(normalized);
}

function buildStabilizationPrompt(question: string, candidateAnswer: string) {
  return [
    "Corrige la respuesta para que suene natural y clara en espanol.",
    "No inventes funciones de Librain.",
    "Mantente entre 1 y 4 frases cortas.",
    "Texto plano, sin markdown ni codigo.",
    "",
    `Pregunta del usuario: ${question}`,
    `Respuesta borrador: ${candidateAnswer}`,
    "",
    "Respuesta final:",
  ].join("\n");
}

async function stabilizeAssistantOutput(question: string, candidateAnswer: string) {
  try {
    const raw = await ollamaChat({
      system: "Eres un corrector de estilo para respuestas de soporte en Librain.",
      user: buildStabilizationPrompt(question, candidateAnswer),
      temperature: 0,
      numPredict: 170,
      timeoutMs: OLLAMA_CHAT_TIMEOUT_MS,
    });
    return cleanupAssistantOutput(raw);
  } catch {
    return "";
  }
}

function buildAssistantFallback(question: string) {
  const normalized = question.toLowerCase();

  if (/\b(editar|modificar|cambiar)\b/.test(normalized)) {
    return "Ahora mismo no se pueden editar inquietudes ya creadas. Alternativa: elimina la inquietud y crea una nueva desde URL, texto o archivo.";
  }

  if (/\b(video|youtube|vimeo)\b/.test(normalized) && /\b(archivo|subir|adjuntar)\b/.test(normalized)) {
    return "Puedes subir PDF, imagen o audio como archivo. El video solo se admite por URL.";
  }

  if (/\b(foto|nombre|email|perfil|profile)\b/.test(normalized)) {
    return "En la UI actual solo puedes gestionar preferencias en /profile. El cambio de foto, nombre o email aun no esta disponible.";
  }

  if (/\b(contrasena|password|recuperar|olvide)\b/.test(normalized)) {
    return "La recuperacion de contrasena todavia no esta disponible en la UI.";
  }

  return "Te ayudo con eso. Escribeme en una frase que quieres hacer en Librain y te doy pasos concretos.";
}

async function ollamaChat(options: {
  system?: string;
  user: string;
  model?: string;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? OLLAMA_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model ?? OLLAMA_MODEL,
        stream: false,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          temperature: options.temperature ?? 0.2,
          num_ctx: 2048,
          num_predict: options.numPredict ?? 220,
        },
        messages: [
          ...(options.system ? [{ role: "system", content: options.system }] : []),
          { role: "user", content: options.user },
        ],
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(`Ollama error ${res.status}: ${raw}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data?.message?.content ?? "";
    return content.trim();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timeout con Ollama tras ${timeoutMs}ms. Revisa OLLAMA_URL, OLLAMA_MODEL y carga del host.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function askLibrainAssistant({
  userMessage,
  userName,
  currentRoute,
  isLoggedIn,
  preferences,
}: LibrainAssistantInput): Promise<string> {
  const latestQuestion = extractLatestQuestion(userMessage);
  const shortHistory = extractShortHistory(userMessage);

  const cleanUserMessage = shortText(
    sanitizeForPrompt(latestQuestion),
    MAX_ASSISTANT_MESSAGE_CHARS
  );

  if (!cleanUserMessage) {
    return "Escribe tu duda y te ayudo con Librain.";
  }

  if (isSimpleGreeting(cleanUserMessage)) {
    return "Hola. Estoy aqui para ayudarte con Librain. Que necesitas resolver?";
  }

  const compactPreferences = (preferences ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, MAX_USER_PREFERENCES)
    .join(" | ");

  const userPrompt = [
    "Contexto de sesion:",
    `- usuario: ${userName?.trim() || "No disponible"}`,
    `- ruta: ${currentRoute?.trim() || "No disponible"}`,
    `- login: ${typeof isLoggedIn === "boolean" ? String(isLoggedIn) : "No disponible"}`,
    `- preferencias: ${compactPreferences || "Sin preferencias"}`,
    ...(shortHistory ? [`- historial breve: ${shortHistory}`] : []),
    "",
    "Pregunta del cliente:",
    cleanUserMessage,
    "",
    "Instruccion final:",
    "- Responde directo y util.",
    "- Si hay bloqueo, da pasos concretos.",
  ].join("\n");

  const attempts = [
    { temperature: 0.1, numPredict: 220 },
    { temperature: 0, numPredict: 180 },
    { temperature: 0, numPredict: 130 },
  ];
  let bestCandidate = "";

  for (const attempt of attempts) {
    try {
      const raw = await ollamaChat({
        system: ASSISTANT_SYSTEM_PROMPT,
        user: userPrompt,
        temperature: attempt.temperature,
        numPredict: attempt.numPredict,
        timeoutMs: OLLAMA_CHAT_TIMEOUT_MS,
      });

      const cleaned = cleanupAssistantOutput(raw);
      if (cleaned.length > bestCandidate.length) {
        bestCandidate = cleaned;
      }

      if (!looksBrokenAssistantOutput(cleaned)) {
        return cleaned;
      }
    } catch {
      // Intenta una segunda pasada antes de devolver fallback.
    }
  }

  if (bestCandidate.length > 0) {
    const stabilized = await stabilizeAssistantOutput(cleanUserMessage, bestCandidate);
    if (stabilized.length > 0 && !looksBrokenAssistantOutput(stabilized)) {
      return stabilized;
    }
  }

  return buildAssistantFallback(cleanUserMessage);
}

export async function generateStoredMetadata(
  extractedText: string,
  userPreferences: string[],
  userDescription?: string
): Promise<GeminiStoredResponse> {
  const compactExtractedText = shortText(
    sanitizeForPrompt(extractedText),
    MAX_METADATA_TEXT_CHARS
  );
  const compactDescription = shortText(sanitizeForPrompt(userDescription ?? ""), 500);
  const compactPreferences = (userPreferences ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, MAX_USER_PREFERENCES)
    .join(" | ");

  const prompt = `
Devuelve SOLO JSON valido con este schema:
{
  "name": "titulo claro y conciso (max 60 caracteres)",
  "score": 0,
  "descriptionIA": "texto plano maximo 150 caracteres"
}

Contenido:
${compactExtractedText}

Preferencias:
${compactPreferences || "Sin preferencias"}

Descripcion del usuario:
${compactDescription || "Sin descripcion"}

Reglas:
- score entero de 0 a 100
- descriptionIA maximo 150 caracteres sin saltos de linea
- sin markdown
`;

  const attempts = [170, 130];
  for (const numPredict of attempts) {
    try {
      const text = await ollamaChat({
        system: "Clasifica y resume. Responde SOLO JSON valido.",
        user: prompt,
        temperature: 0,
        numPredict,
        timeoutMs: OLLAMA_METADATA_TIMEOUT_MS,
      });

      const jsonStr = extractFirstJsonObject(text);
      const parsed = JSON.parse(jsonStr) as GeminiStoredResponse;

      parsed.name = typeof parsed.name === "string" ? parsed.name.slice(0, 60) : "";
      parsed.descriptionIA =
        typeof parsed.descriptionIA === "string"
          ? parsed.descriptionIA.replace(/\r?\n/g, " ").slice(0, 150)
          : "";
      parsed.score =
        typeof parsed.score === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.score)))
          : 0;

      if (parsed.name.length > 0) {
        return parsed;
      }
    } catch {
      // reintento con menor salida
    }
  }

  return {
    name: shortText(compactDescription || "Inquietud", 60),
    score: 50,
    descriptionIA: "No se pudo analizar con precision. Revisar manualmente.",
  };
}
