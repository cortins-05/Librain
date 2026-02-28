"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Hash,
  Loader2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import { toggleCompletedAction } from "@/actions/tasks/toggleCompleted";
import type { TaskListItem, TaskListState } from "./types";

const stateUI: Record<
  TaskListState,
  {
    label: string;
    badgeClass: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  raw: {
    label: "raw",
    badgeClass: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
    icon: Circle,
  },
  usable: {
    label: "usable",
    badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    icon: Circle,
  },
  solid: {
    label: "solid",
    badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    icon: Circle,
  },
  actionable: {
    label: "actionable",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

function safeDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TaskView({
  task,
  onDeleted,
}: {
  task: TaskListItem;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const { id, name, description, descriptionIA, state, score, createdAt, completedAt } =
    task;
  const displayName = name.trim() || "Tarea sin titulo";

  const isCompleted = Boolean(completedAt) || state === "actionable";
  const createdLabel = safeDateLabel(createdAt);
  const completedLabel = completedAt ? safeDateLabel(completedAt) : null;
  const shortId = id.length > 12 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;

  const ui = stateUI[state];
  const StateIcon = ui.icon;

  async function deleteTask() {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/task/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Delete failed (${res.status})`);
      }

      onDeleted?.(id);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar la tarea.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function toggleCompleted() {
    try {
      await toggleCompletedAction(id);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar el estado de la tarea.");
    }
  }

  return (
    <Card className="group relative overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-primary/10 to-transparent opacity-70" />

      <CardHeader className="relative space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg font-semibold leading-tight sm:text-xl">
              {displayName}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                  ui.badgeClass
                )}
              >
                <StateIcon className="size-3.5" />
                {ui.label}
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                <Star className="size-3.5" />
                score {score}
              </Badge>

              <Badge
                variant="outline"
                className="hidden rounded-full border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex"
              >
                <Hash className="size-3.5" />
                {shortId}
              </Badge>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <Sparkles className="size-5" />
          </div>
        </div>

        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="relative space-y-3 pt-0">
        {descriptionIA ? (
          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary/80" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resumen IA
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{descriptionIA}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Created</p>
              <p className="truncate text-sm">{createdLabel}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="h-auto w-full justify-start rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:bg-muted/40"
            onClick={toggleCompleted}
          >
            <div className="flex w-full items-center gap-2 text-left">
              {isCompleted ? (
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Completed</p>
                <p className="truncate text-sm">{completedLabel ?? "Pendiente"}</p>
              </div>
            </div>
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/70 bg-muted/15 px-6 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          {isCompleted ? "Completada" : "Pendiente de accion"}
        </span>
        <Button
          variant="destructive"
          size="icon"
          onClick={deleteTask}
          disabled={isDeleting}
          className="transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Delete task"
          title="Delete"
        >
          {isDeleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

