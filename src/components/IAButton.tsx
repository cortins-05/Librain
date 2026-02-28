"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrainCog, Loader2, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const historyForApi = [...messages, userMessage]
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/librain-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Hubo un problema al responder. Intentalo otra vez.";

      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Ahora mismo no pude responder correctamente. Si quieres, vuelve a intentarlo en unos segundos.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild className={className}>
        <Button
          variant="secondary"
          size="icon-lg"
          className="gap-2 hover:border-primary transition-all p-8 px-11 rounded-2xl"
        >
          <BrainCog className="w-4 h-4 text-primary" />
          Librain
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
            onChange={(e) => setInput(e.target.value)}
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

