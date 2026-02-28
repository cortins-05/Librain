"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Star,
  Hash,
  Trash2,
  Loader2,
} from "lucide-react";

import type { TaskListItem, TaskListState } from "./types";
import { toggleCompletedAction } from "@/actions/tasks/toggleCompleted";

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
    badgeClass: "border-muted-foreground/15 bg-muted/40 text-muted-foreground",
    icon: Circle,
  },
  usable: {
    label: "usable",
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    icon: Circle,
  },
  solid: {
    label: "solid",
    badgeClass:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    icon: Circle,
  },
  actionable: {
    label: "actionable",
    badgeClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

function safeDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

  const isCompleted = Boolean(completedAt) || state === "actionable";
  const createdLabel = safeDateLabel(createdAt);
  const completedLabel = completedAt ? safeDateLabel(completedAt) : null;

  const ui = stateUI[state];
  const StateIcon = ui.icon;

  async function deleteTask() {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      // ✅ usa el endpoint con id
      const res = await fetch(`/api/task/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Delete failed (${res.status})`);
      }

      // ✅ para listas: quítalo en el padre sin esperar refresh
      onDeleted?.(id);

      // ✅ si tu listado es server component o depende de fetch cache, refresca
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar la tarea.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function toggleCompleted(){
    await toggleCompletedAction(id);
    router.refresh();
  }

  return (
    <Card className="group relative overflow-hidden border border-border/60 bg-background/60 shadow-sm backdrop-blur transition hover:shadow-md">
      <div className="h-1 w-full bg-linear-to-r from-transparent via-primary/30 to-transparent" />

      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-tight sm:text-xl">
              {name}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  ui.badgeClass,
                ].join(" ")}
              >
                <StateIcon className="h-3.5 w-3.5" />
                {ui.label}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Star className="h-3.5 w-3.5" />
                score: <span className="font-semibold">{score}</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="max-w-55 truncate">{id}</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-primary/15 bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        {description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {descriptionIA ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">IA summary</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {descriptionIA}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Created</p>
              <p className="truncate text-sm">{createdLabel}</p>
            </div>
          </div>

          <Button variant={"ghost"} className="h-full w-full p-0 flex" onClick={toggleCompleted}>
            <div className="flex-1 h-full p-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background/40">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Completed</p>
                <p className="truncate text-sm">{completedLabel ?? "—"}</p>
              </div>
            </div>
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-6 py-3 text-xs text-muted-foreground">

        <Button
          variant="destructive"
          size="icon"
          onClick={deleteTask}
          disabled={isDeleting}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          aria-label="Delete task"
          title="Delete"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}