import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { askLibrainAssistant } from "@/lib/librainGemini";

export const runtime = "nodejs";

type RequestBody = {
  message?: unknown;
  currentRoute?: unknown;
  history?: unknown;
};

type HistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHistory(input: unknown): HistoryEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .slice(-8)
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const roleRaw = "role" in entry ? (entry as { role?: unknown }).role : null;
      const contentRaw = "content" in entry ? (entry as { content?: unknown }).content : null;

      const role = roleRaw === "assistant" ? "assistant" : "user";
      const content = toTrimmedString(contentRaw).slice(0, 600);

      return content.length > 0 ? [{ role, content }] : [];
    });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;

    const message = toTrimmedString(body?.message).slice(0, 4000);
    if (!message) {
      return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
    }

    const currentRoute = toTrimmedString(body?.currentRoute).slice(0, 120);
    const history = normalizeHistory(body?.history);

    const historyContext = history
      .map((entry) => `${entry.role === "assistant" ? "Asistente" : "Usuario"}: ${entry.content}`)
      .join("\n");

    const composedUserMessage = historyContext
      ? `Historial reciente de la conversacion:\n${historyContext}\n\nMensaje actual del usuario:\n${message}`
      : message;

    const userMeta = session.user as typeof session.user & { preferences?: string[] };

    const preferences = Array.isArray(userMeta.preferences)
      ? userMeta.preferences
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    const answer = await askLibrainAssistant({
      userMessage: composedUserMessage,
      userName: toTrimmedString(session.user.name),
      currentRoute,
      isLoggedIn: true,
      preferences,
    });

    if (!answer || answer.trim().length === 0) {
      return NextResponse.json({ error: "Respuesta vacia del asistente" }, { status: 502 });
    }

    return NextResponse.json({ answer: answer.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[POST /api/librain-assistant]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

