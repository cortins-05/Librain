"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrainCog, Loader2, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from 'next/image';

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantPayload = {
  answer?: string;
  error?: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola, soy Librain AI. Puedo ayudarte a usar la app, resolver bloqueos y mejorar tus inquietudes. Que necesitas?",
};

export default function IAButton({ className }: { className: string }) {
  const MAX_INPUT_CHARS = 2000;
  const REQUEST_TIMEOUT_MS = 20000;
  const DUPLICATE_WINDOW_MS = 1800;
  const MAX_MESSAGES = 30;

  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([WELCOME_MESSAGE]);
  const inFlightRef = useRef(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<{ normalized: string; at: number } | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  async function sendMessage() {
    const text = input.replace(/\s+/g, " ").trim();
    if (!text || inFlightRef.current) return;

    if (text.length > MAX_INPUT_CHARS) {
      setError(`El mensaje supera el limite (${MAX_INPUT_CHARS} caracteres).`);
      return;
    }

    const normalized = text.toLowerCase();
    const now = Date.now();
    if (
      lastSentRef.current &&
      lastSentRef.current.normalized === normalized &&
      now - lastSentRef.current.at < DUPLICATE_WINDOW_MS
    ) {
      return;
    }
    lastSentRef.current = { normalized, at: now };

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const historyForApi = [...messagesRef.current, userMessage]
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage].slice(-MAX_MESSAGES));
    setInput("");
    setError(null);
    inFlightRef.current = true;
    setIsLoading(true);
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/librain-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          currentRoute: pathname,
          history: historyForApi,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AssistantPayload | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo obtener respuesta del asistente.");
      }

      const answer = payload?.answer?.trim();
      if (!answer) {
        throw new Error("El asistente no devolvio contenido.");
      }

      setMessages((prev) => [
        ...(() => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.content === answer) {
            return prev;
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: answer,
            },
          ];
        })(),
      ].slice(-MAX_MESSAGES));
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Tiempo de espera agotado. Revisa que Ollama este activo y vuelve a intentar."
          : err instanceof Error
            ? err.message
            : "Hubo un problema al responder. Intentalo otra vez.";

      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content:
            "Ahora mismo no pude responder correctamente. Si quieres, vuelve a intentarlo en unos segundos.",
        },
      ].slice(-MAX_MESSAGES));
    } finally {
      clearTimeout(timeout);
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }

  function handleInputChange(value: string) {
    if (value.length <= MAX_INPUT_CHARS) {
      setInput(value);
      return;
    }
    setInput(value.slice(0, MAX_INPUT_CHARS));
  }

  return (
    <Dialog>
      <DialogOverlay className="backdrop-blur" />
      <DialogTrigger asChild className={className}>
        <Button
          variant="default"
          size="icon-lg"
          className="flex items-center justify-center gap-2 hover:border-primary transition-all rounded-2xl"
        >
          <Image
            src={"/LibrainAI.png"}
            alt="Librain"
            width={120}
            height={120}
            style={{ objectFit: "contain" }}
          />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted/40 backdrop-blur">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BrainCog className="w-5 h-5 text-primary" />
            Librain AI
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="h-100 overflow-y-auto px-6 py-4 space-y-4 bg-background">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Librain esta escribiendo...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t px-4 py-3 bg-muted/30 flex gap-2">
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Escribe tu duda sobre Librain..."
            className="flex-1 bg-transparent outline-none text-sm px-3 py-2 rounded-lg border border-border focus:border-primary transition"
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="rounded-lg"
            onClick={() => void sendMessage()}
            disabled={isLoading || input.trim().length === 0}
            aria-label="Enviar mensaje"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {error ? (
          <div className="border-t bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
