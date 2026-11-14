export type Status = "todo" | "doing" | "done";
export interface Task {
  id: number;
  title: string;
  status: Status;
}
export interface Comment {
  id: number;
  task_id: number;
  body: string;
  supersedes_id: number | null;
}
export interface Page<T> {
  items: T[];
  next_cursor: number | null;
}
export type Health =
  | { status: "ok" }
  | { status: "degraded"; checks: Record<string, unknown> };
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const base = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://taskflow-demo-app.onrender.com"
).replace(/\/$/, "");
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
async function request<T>(
  path: string,
  init?: RequestInit,
  health = false,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(60000),
    });
  } catch {
    throw new ApiError(
      "unreachable",
      "The demo is unreachable. Please try again.",
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "invalid_response",
      "The service returned an unreadable response.",
      response.status,
    );
  }
  if (
    !response.ok &&
    !(
      health &&
      response.status === 503 &&
      record(data) &&
      data.status === "degraded"
    )
  ) {
    const error = record(data) && record(data.error) ? data.error : undefined;
    throw new ApiError(
      typeof error?.code === "string" ? error.code : "http_error",
      typeof error?.message === "string"
        ? error.message
        : "The request failed.",
      response.status,
    );
  }
  return data as T;
}
function query(options: { status?: Status; cursor?: number; limit?: number }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options))
    if (value !== undefined) params.set(key, String(value));
  return params.size ? `?${params}` : "";
}
const post = (body: object): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const api = {
  health: () => request<Health>("/health", undefined, true),
  tasks: (options: { status?: Status; cursor?: number; limit?: number } = {}) =>
    request<Page<Task>>(`/v1/tasks${query(options)}`),
  task: (id: number) => request<Task>(`/v1/tasks/${id}`),
  createTask: (title: string) => request<Task>("/v1/tasks", post({ title })),
  comments: (id: number, cursor?: number) =>
    request<Page<Comment>>(
      `/v1/tasks/${id}/comments${query({ cursor, limit: 200 })}`,
    ),
  addComment: (id: number, body: string, supersedes_id?: number) =>
    request<Comment>(
      `/v1/tasks/${id}/comments`,
      post({ body, ...(supersedes_id === undefined ? {} : { supersedes_id }) }),
    ),
};
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "conflict":
        return "Someone revised this first — reload the thread and try again.";
      case "task_not_found":
        return "This task could not be found.";
      case "validation_error":
        return "Please enter a non-blank value and try again.";
      default:
        return error.message;
    }
  }
  return "Something went wrong. Please try again.";
}
