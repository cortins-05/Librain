"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ListTodo } from "lucide-react";

import ViewTasks from "@/components/Tasks/ViewTasks";
import type { TaskListItem } from "@/components/Tasks/types";
import { Button } from "@/components/ui/button";

type Props = {
  completedTasks: TaskListItem[];
  unCompletedTasks: TaskListItem[];
  initialView?: "pending" | "completed";
};

export default function TasksDashboard({
  completedTasks,
  unCompletedTasks,
  initialView = "pending",
}: Props) {
  const [view, setView] = useState<"pending" | "completed">(initialView);

  const tasksItems = useMemo(() => {
    return view === "completed" ? completedTasks : unCompletedTasks;
  }, [view, completedTasks, unCompletedTasks]);

  return (
    <>
      <section className="grid gap-4 grid-cols-2">
        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500 h-full"
          onClick={() => setView("pending")}
          aria-pressed={view === "pending"}
        >
          <div className="space-y-2 py-6">
            <span className="inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <ListTodo className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-wide text-red-700">
              PENDIENTES
            </p>
            <p className="text-2xl font-semibold">{unCompletedTasks.length}</p>
          </div>
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 backdrop-blur duration-500 [animation-delay:140ms] h-full"
          onClick={() => setView("completed")}
          aria-pressed={view === "completed"}
        >
          <div className="space-y-2 py-6">
            <span className="inline-flex rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="size-4" />
            </span>
            <p className="text-xs uppercase tracking-wide text-blue-700">
              COMPLETADAS
            </p>
            <p className="text-2xl font-semibold text-primary">
              {completedTasks.length}
            </p>
          </div>
        </Button>
      </section>

      <ViewTasks tasks={tasksItems} type={view=="completed" ? "completadas" : "pendientes"} />
    </>
  );
}