import Groq from "groq-sdk";

const DEFAULT_MODEL = "whisper-large-v3";

export type AudioExtractInput = {
  buffer: Buffer | Uint8Array | ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
  model?: "whisper-large-v3" | "whisper-large-v3-turbo";
};

export type AudioExtractResult = {
  text: string;
  model: string;
};

function normalizeBuffer(input: AudioExtractInput["buffer"]): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  return Buffer.from(input);
}

export default async function AudioExtract(input: AudioExtractInput): Promise<AudioExtractResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GROQ_API_KEY");
  }

  const groq = new Groq({ apiKey });

  const audioBuffer = normalizeBuffer(input.buffer);
  if (audioBuffer.length === 0) {
    throw new Error("Audio vacio");
  }

  const fileName = input.fileName?.trim() || "audio-input.wav";
  const mimeType = input.mimeType?.trim() || "audio/wav";

  const upload = await Groq.toFile(audioBuffer, fileName, { type: mimeType });
  const transcription = await groq.audio.transcriptions.create({
    file: upload,
    model: input.model ?? DEFAULT_MODEL,
    language: input.language,
    prompt: input.prompt,
    temperature: input.temperature ?? 0,
    response_format: "verbose_json",
  });

  const text = typeof transcription.text === "string" ? transcription.text.trim() : "";

  return {
    text,
    model: input.model ?? DEFAULT_MODEL,
  };
}
