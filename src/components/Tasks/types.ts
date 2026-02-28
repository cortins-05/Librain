export type TaskListState = "raw" | "usable" | "solid" | "actionable";

export interface TaskListItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  descriptionIA: string;
  state: TaskListState;
  score: number;
  createdAt: string;
  completedAt: string | null;
}
