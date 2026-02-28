"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";

import TaskView from "./TaskView";
import type { TaskListItem } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ViewTasks({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <Card className="overflow-hidden border-border/70 bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col items-start gap-4 py-10 sm:py-12">
            <span className="inline-flex rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <ClipboardList className="size-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold sm:text-3xl">Aún no hay inquietudes</h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Empieza cargando una URL, un texto o un archivo. Librain te devolverá un resumen
                IA, estado de madurez y puntuación para priorizar.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/actions/addTask">
                Crear primera inquietud
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-wrap items-center justify-between gap-3 duration-500">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Tus inquietudes</h2>
          <p className="text-sm text-muted-foreground font-fira-sans">
            Revisa, completa o limpia tu lista de pendientes sin perder contexto.
          </p>
        </div>

        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
          <Sparkles className="size-3.5" />
          {tasks.length} activas
        </Badge>
      </div>

      <main className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <TaskView task={task} />
          </div>
        ))}
      </main>
    </section>
  );
}
