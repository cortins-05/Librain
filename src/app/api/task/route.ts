import { NextResponse } from "next/server";
import path from "path";
import Groq from "groq-sdk";
import { Types } from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractText, getDocumentProxy, getMeta } from "unpdf";

import StoredModel from "@/db/Models/Task/Task.model";
import { dbConnect } from "@/db/dbConnect";
import { generateStoredMetadata } from "@/lib/gemini";
import AudioExtract from "@/lib/ExtractInfo/Audio.extract";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const runtime = "nodejs";

// -------------------------
// Types
// -------------------------
type Extracted = {
  kind: "pdf" | "image" | "video" | "audio" | "url" | "text" | "unknown";
  text?: string;
  meta?: Record<string, unknown>;
};

// OJO: tu UI envía "file" en FormData.
type ResourceType = "url" | "file" | "text";

// -------------------------
// SDK clients
// -------------------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// -------------------------
// Helpers
// -------------------------
function safeTrim(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

function getExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

function isVideoMime(mime: string) {
  return mime.startsWith("video/");
}
function isImageMime(mime: string) {
  return mime.startsWith("image/");
}
function isAudioMime(mime: string) {
  return mime.startsWith("audio/");
}

function guessKindFromFile(file: File): Extracted["kind"] {
  const mime = (file.type || "").toLowerCase();
  const ext = getExt(file.name);

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (isImageMime(mime) || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (isVideoMime(mime) || ["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "video";
  if (isAudioMime(mime) || ["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";

  return "unknown";
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

// -------------------------
// Extract functions
// -------------------------
async function PdfExtractFromBuffer(buffer: Buffer): Promise<Extracted> {
  const u8 = new Uint8Array(buffer);

  const pdf = await getDocumentProxy(u8);

  const result = await extractText(pdf, { mergePages: true });

  const totalPages = result.totalPages;

  // 👇 Tipado explícito
  const rawText = result.text as string | string[];

  const finalText =
    typeof rawText === "string"
      ? rawText
      : Array.isArray(rawText)
      ? rawText.join("\n\n")
      : "";

  let meta: Record<string, unknown> = { totalPages };

  try {
    const m = await getMeta(pdf);
    meta = { ...meta, info: m.info, metadata: m.metadata };
  } catch {
    // ignore
  }

  return {
    kind: "pdf",
    text: finalText,
    meta,
  };
}

async function ImageExtract(input: { imageUrl: string; prompt?: string }): Promise<Extracted> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Falta GROQ_API_KEY");
  }

  const prompt =
    input.prompt ??
    "Describe la imagen y extrae texto visible si lo hay. Devuelve: 1) resumen (2-4 líneas) 2) bullets con puntos clave.";

  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: input.imageUrl } },
        ],
      },
    ],
  });

  return { kind: "image", text: completion.choices?.[0]?.message?.content ?? "", meta: {} };
}

async function AudioExtractFromBuffer(
  buffer: Buffer,
  fileName?: string,
  mimeType?: string
): Promise<Extracted> {
  const result = await AudioExtract({
    buffer,
    fileName,
    mimeType,
    language: "es",
    temperature: 0,
  });

  return {
    kind: "audio",
    text: result.text,
    meta: { model: result.model },
  };
}

async function VideoExtract(input: { videoUrl: string; prompt?: string }): Promise<Extracted> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY");
  }

  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt =
    input.prompt ??
    "Interpreta el vídeo: resume qué ocurre, identifica escenas/eventos importantes y extrae cualquier información relevante. Si puedes, referencia momentos aproximados.";

  const result = await model.generateContent([
    { text: prompt },
    { fileData: { mimeType: "video/mp4", fileUri: input.videoUrl } },
  ]);

  return { kind: "video", text: result.response.text(), meta: {} };
}

async function UrlExtract(url: string): Promise<Extracted> {
  return { kind: "url", text: `URL: ${url}`, meta: {} };
}

async function TextExtract(text: string): Promise<Extracted> {
  return { kind: "text", text, meta: {} };
}

// -------------------------
// Route
// -------------------------
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const contentType = req.headers.get("content-type") ?? "";

    let resource: ResourceType | null = null;
    let value = "";
    let description = "";
    let extracted: Extracted | undefined;

    // --------- FILE (FormData) ---------
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      resource = (form.get("resource") as ResourceType | null) ?? "file";
      description = safeTrim(form.get("description"));
      value = safeTrim(form.get("value"));

      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
      }

      const kind = guessKindFromFile(file);

      if (!value) value = file.name;

      if (kind === "pdf") {
        const buffer = Buffer.from(await file.arrayBuffer());
        extracted = await PdfExtractFromBuffer(buffer);
      } else if (kind === "image") {
        const dataUrl = await fileToDataUrl(file);
        extracted = await ImageExtract({ imageUrl: dataUrl });
      } else if (kind === "video") {
        return NextResponse.json(
          { error: "Para vídeo, súbelo a storage y envía una URL (resource=url). Este endpoint no acepta vídeo como archivo." },
          { status: 400 }
        );
      } else if (kind === "audio") {
        const buffer = Buffer.from(await file.arrayBuffer());
        extracted = await AudioExtractFromBuffer(buffer, file.name, file.type);
      } else {
        return NextResponse.json(
          { error: `Tipo de archivo no soportado (${file.type || file.name})` },
          { status: 400 }
        );
      }
    } else {
      // --------- JSON (url/text) ---------
      const body = (await req.json().catch(() => null)) as
        | { resource?: ResourceType; value?: string; description?: string }
        | null;

      resource = (body?.resource ?? null) as ResourceType | null;
      value = safeTrim(body?.value);
      description = safeTrim(body?.description);

      if (!resource) return NextResponse.json({ error: "Falta el recurso" }, { status: 400 });
      if (!value) return NextResponse.json({ error: "Falta el valor" }, { status: 400 });

      if (resource === "url") {
        const lower = value.toLowerCase();

        if (/\.(png|jpg|jpeg|webp|gif|bmp)(\?|#|$)/.test(lower)) {
          extracted = await ImageExtract({ imageUrl: value });
        } else if (/\.(mp4|mov|webm|mkv|avi)(\?|#|$)/.test(lower)) {
          extracted = await VideoExtract({ videoUrl: value });
        } else {
          extracted = await UrlExtract(value);
        }
      } else if (resource === "text") {
        extracted = await TextExtract(value);
      } else {
        return NextResponse.json({ error: "Recurso no válido para un cuerpo JSON" }, { status: 400 });
      }
    }

    if (!extracted?.text || extracted.text.trim().length === 0) {
      return NextResponse.json({ error: "No se pudo extraer contenido útil" }, { status: 400 });
    }

    const preferences = session.user.preferences;

    const aiData = await generateStoredMetadata(extracted.text, preferences, description);

    const score = Number.isFinite(aiData.score) ? Math.max(0, Math.min(100, aiData.score)) : 0;

    const storedDoc = await StoredModel.create({
      user: new Types.ObjectId(session.user.id),
      name: aiData.name,
      state: aiData.state,
      score,
      description: description ?? "",
      descriptionIA: aiData.descriptionIA,
    });

    return NextResponse.json({
      stored: { _id: storedDoc._id },
      ai: { fallback: false, error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(err);
    return NextResponse.json(
      { error: message, ai: { fallback: true, error: message } },
      { status: 500 }
    );
  }
}
