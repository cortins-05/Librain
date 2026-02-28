export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Star,
  Target,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { dbConnect } from "@/db/dbConnect";
import StoredModel, {
  STORED_STATES,
  type StoredState,
} from "@/db/Models/Task/Task.model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATE_SET = new Set<StoredState>(STORED_STATES);

const stateUI: Record<
  StoredState,
  {
    label: string;
    badgeClass: string;
  }
> = {
  raw: {
    label: "inicial",
    badgeClass: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  },
  usable: {
    label: "utilizable",
    badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  solid: {
    label: "sólida",
    badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  actionable: {
    label: "accionable",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
};

function normalizeState(value: unknown): StoredState {
  return typeof value === "string" && STATE_SET.has(value as StoredState)
    ? (value as StoredState)
    : "raw";
}

function normalizeScore(value: unknown): number {
  return typeof value === "number" ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

function safeDateLabel(value: unknown): string {
  if (!value) return "No disponible";
  const parsed = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(parsed.getTime())) return "No disponible";
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DailyTaskPage() {
  await dbConnect();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
        <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 duration-500">
            <CardContent className="space-y-3 p-8">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs tracking-wide">
                Enfoque diario
              </Badge>
              <h1 className="text-2xl font-bold sm:text-3xl">Inicia sesión para ver tu recomendación del día</h1>
              <p className="text-muted-foreground">
                Necesitamos tu sesión para cargar tus inquietudes y elegir la más prioritaria.
              </p>
              <Button asChild>
                <Link href="/login">
                  Ir al inicio de sesión
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const topTask = await StoredModel.findOne({ user: session.user.id })
    .sort({ score: -1, createdAt: -1 })
    .lean<{
      _id: unknown;
      name?: unknown;
      description?: unknown;
      descriptionIA?: unknown;
      state?: unknown;
      score?: unknown;
      createdAt?: unknown;
      completedAt?: unknown;
      category?: unknown;
    }>();

  return (
    <main className="relative isolate flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-20 right-8 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/25" />
            <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

            <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 text-xs tracking-wide">
              Enfoque diario
            </Badge>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Tu recomendación del día.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Librain te aconseja en base a tus preferencias.
              Lo importante primero.
            </p>
          </div>
        </section>

        {!topTask ? (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500 [animation-delay:70ms]">
            <CardContent className="space-y-4 p-8">
              <span className="inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <ListTodo className="size-5" />
              </span>
              <h2 className="text-2xl font-semibold">Todavía no tienes inquietudes</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Crea tu primera inquietud para que podamos calcular la prioridad diaria y mostrarte
                una recomendación accionable.
              </p>
              <Button asChild size="lg">
                <Link href="/actions/addTask">
                  Crear nueva inquietud
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          (() => {
            const name =
              typeof topTask.name === "string" && topTask.name.trim().length > 0
                ? topTask.name.trim()
                : "Recomendación sin título";
            const description = typeof topTask.description === "string" ? topTask.description : "";
            const descriptionIA =
              typeof topTask.descriptionIA === "string" ? topTask.descriptionIA : "";
            const state = normalizeState(topTask.state);
            const score = normalizeScore(topTask.score);
            const category =
              typeof topTask.category === "string" && topTask.category.trim().length > 0
                ? topTask.category.trim()
                : null;
            const createdAt = safeDateLabel(topTask.createdAt);
            const completedAt = topTask.completedAt ? safeDateLabel(topTask.completedAt) : "Pendiente";
            const isCompleted = state === "actionable" || Boolean(topTask.completedAt);
            const ui = stateUI[state];

            return (
              <Card className="group relative overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 [animation-delay:70ms]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-primary/10 to-transparent opacity-70" />

                <CardHeader className="relative space-y-5 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        <Target className="size-3.5" />
                        Recomendación del día
                      </Badge>
                      <h2 className="max-w-3xl text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                        {name}
                      </h2>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                      <Sparkles className="size-6" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                        ui.badgeClass
                      )}
                    >
                      {ui.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      <Star className="size-3.5" />
                      puntuación {score}
                    </Badge>
                    {category ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {category}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-4 pt-0">
                  {description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {description}
                    </p>
                  ) : null}

                  {descriptionIA ? (
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Resumen IA
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
                        {descriptionIA}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground">Creada</p>
                        <p className="truncate text-sm">{createdAt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
                      <CheckCircle2
                        className={cn(
                          "size-4",
                          completedAt!="Pendiente"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground">Completada</p>
                        <p className="truncate text-sm">{completedAt}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/15 px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isCompleted ? "Completada" : "Pendiente de acción"}
                  </span>
                  <Button asChild variant="outline">
                    <Link href="/">
                      Ver todas las inquietudes
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })()
        )}
      </div>
    </main>
  );
}
