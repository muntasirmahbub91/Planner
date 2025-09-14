export type TaskState = "active" | "completed" | "canceled";

export type DayMs = number; // device-local day start ms
export type TaskId = string & { readonly __brand: "TaskId" };

export interface Task {
  id: TaskId;
  text: string;
  flags: { u: boolean; i: boolean };
  date: DayMs | null;
  state: TaskState;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  replacedById?: TaskId;
  rolledFromDate?: DayMs;
}
