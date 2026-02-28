import { Button } from '@/components/ui/button';
import { dbConnect } from '@/db/dbConnect';
import StoredModel, { STORED_STATES } from '@/db/Models/Stored/main.model';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import ViewTasks from '../components/Tasks/ViewTasks';
import type { TaskListItem, TaskListState } from '@/components/Tasks/types';

const TASK_STATE_SET = new Set<TaskListState>(STORED_STATES);

function normalizeTaskState(value: unknown): TaskListState {
  return typeof value === "string" && TASK_STATE_SET.has(value as TaskListState)
    ? (value as TaskListState)
    : "raw";
}

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

  const tasksFromDb = await StoredModel.find().sort({ createdAt: -1 }).lean();
  const tasks: TaskListItem[] = tasksFromDb.map((task) => ({
    id: String(task._id),
    userId: String(task.user),
    name: typeof task.name === "string" ? task.name : "",
    description: typeof task.description === "string" ? task.description : "",
    descriptionIA:
      typeof task.descriptionIA === "string" ? task.descriptionIA : "",
    state: normalizeTaskState(task.state),
    score:
      typeof task.score === "number"
        ? Math.max(0, Math.min(100, Math.round(task.score)))
        : 0,
    createdAt: toIsoOrNow(task.createdAt),
    completedAt: task.completedAt ? toIsoOrNow(task.completedAt) : null,
  }));

  return (
    <main className="flex-1 p-10 h-full flex flex-col overflow-y-scroll">
      <Link href={"/actions/addTask"} className='self-start'>
        <Button className='w-fit'>
          <Plus size={50} className='h-full w-auto font-bold' />
        </Button>
      </Link>
      <ViewTasks tasks={tasks} />
    </main>
  );
}
