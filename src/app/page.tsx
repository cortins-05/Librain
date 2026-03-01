<<<<<<< HEAD
import ThemeButton from "@/components/ThemeButton"
=======
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { TaskListItem } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dbConnect } from "@/db/dbConnect";
import StoredModel from "@/db/Models/Task/Task.model";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import TasksDashboard from "@/components/Tasks/TasksDashboard";
import LoginPreferencesAlert from "@/components/home/LoginPreferencesAlert";

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

  const session = await auth.api.getSession({ headers: await headers() });

  const preferences = Array.isArray(session?.user?.preferences)
    ? session.user.preferences
    : [];
  const shouldWarnAboutPreferences = preferences.length < 4;

  const tasksFromDb = await StoredModel.find({ user: session!.user.id })
    .sort({ score: -1 })
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

  const completedTasks: TaskListItem[] = [];
  const unCompletedTasks: TaskListItem[] = [];

  tasks.forEach((task) => {
    if (Boolean(task.completedAt)) completedTasks.push(task);
    else unCompletedTasks.push(task);
  });

export default function HomePage() {
  return (
<<<<<<< HEAD
    <div>
      <main className="p-10">
        <ThemeButton />
      </main>
      
      <h1>Hello Page</h1>
      
    </div>
=======
    <main className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/25" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <Badge
              variant="outline"
              className="mb-4 rounded-full px-3 py-1 text-xs tracking-wide"
            >
              Espacio Librain
            </Badge>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Tu panel de recomendaciones inteligentes.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg font-fira-sans">
              Reúne ideas, notas y recursos en un solo lugar. Librain los
              convierte en recomendaciones claras con puntuación y estado para
              ayudarte a decidir qué ejecutar primero.
            </p>

            <LoginPreferencesAlert shouldWarn={shouldWarnAboutPreferences} />

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

        <TasksDashboard
          completedTasks={completedTasks}
          unCompletedTasks={unCompletedTasks}
        />
      </div>
    </main>
>>>>>>> 770d94b7637dbabedbb4c4ebe0d75c3435be723b
  );
}
