import Link from "next/link";
import { ArrowLeft, BrainCog, Sparkles } from "lucide-react";

import MainComponentAddTask from "@/components/AddTask/mainComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AddTaskPage() {
  return (
    <section className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/25" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-xs tracking-wide">
              Add Task
            </Badge>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Agrega una nueva tarea inteligente
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Carga una URL, texto o archivo. Librain analizara el contenido y te devolvera
              resumen IA, estado y score para priorizar mejor.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  <ArrowLeft />
                  Volver al panel
                </Link>
              </Button>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                <BrainCog className="size-3.5" />
                Analisis IA
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                <Sparkles className="size-3.5" />
                Priorizacion automatica
              </Badge>
            </div>
          </div>
        </header>

        <MainComponentAddTask />
      </div>
    </section>
  );
}
