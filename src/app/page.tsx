export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ListTodo, Plus } from "lucide-react";

import ViewTasks from "@/components/Tasks/ViewTasks";
import type { TaskListItem } from "@/components/Tasks/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dbConnect } from "@/db/dbConnect";
import StoredModel from "@/db/Models/Task/Task.model";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

function toIsoOrNow(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export default async function HomePage() {
  await dbConnect();

  const session = await auth.api.getSession({headers: await headers()});

  const tasksFromDb = await StoredModel
  .find({ user: session!.user.id })
  .sort({ score: -1 }) // 👈 mayor a menor
  .lean();
  const tasks: TaskListItem[] = tasksFromDb.map((task) => ({
    id: String(task._id),
    userId: String(task.user),
    name: typeof task.name === "string" ? task.name : "",
    description: typeof task.description === "string" ? task.description : "",
    descriptionIA:
      typeof task.descriptionIA === "string" ? task.descriptionIA : "",
    score:
      typeof task.score === "number"
        ? Math.max(0, Math.min(100, Math.round(task.score)))
        : 0,
    createdAt: toIsoOrNow(task.createdAt),
    completedAt: task.completedAt ? toIsoOrNow(task.completedAt) : null,
  }));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => Boolean(task.completedAt)
  ).length;

  return (
    <main className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/25" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-xs tracking-wide">
              Espacio Librain
            </Badge>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Tu panel de recomendaciones inteligentes.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg font-fira-sans">
              Reúne ideas, notas y recursos en un solo lugar. Librain los convierte en recomendaciones
              claras con puntuación y estado para ayudarte a decidir qué ejecutar primero.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/actions/addTask" className="z-10">
                  <Plus />
                  Nueva<span className="text-blue-800">inquietud</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">
                  Cómo funciona
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 grid-cols-2">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500">
            <CardContent className="space-y-2 py-6">
              <span className="inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <ListTodo className="size-4" />
              </span>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total de <span className="text-red-400">ya lo haré...</span></p>
              <p className="text-2xl font-semibold">{totalTasks}</p>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500 [animation-delay:140ms]">
            <CardContent className="space-y-2 py-6">
              <span className="inline-flex rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                <CheckCircle2 className="size-4" />
              </span>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completadas</p>
              <p className="text-2xl font-semibold">{completedTasks}</p>
            </CardContent>
          </Card>
        </section>

        <ViewTasks tasks={tasks} />
      </div>
    </main>
  );
}
