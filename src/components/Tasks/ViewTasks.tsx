"use client"

import TaskView from "./TaskView";
import type { TaskListItem } from "./types";

export default function ViewTasks({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <main className="grid grid-cols-3 gap-3 mt-3 items-start">
      {
        tasks.map((task) => (
          <TaskView key={task.id} task={task} />
        ))
      }
    </main>
  );
}
