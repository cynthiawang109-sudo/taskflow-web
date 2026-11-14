"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorText, type Status, type Task } from "@/lib/api";
function ServiceStatus() {
  const [status, setStatus] = useState("Checking service…");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) setStatus("Waking the free-tier demo up…");
    }, 3000);
    api
      .health()
      .then((health) => {
        if (active)
          setStatus(
            health.status === "ok" ? "Service operational" : "Service degraded",
          );
      })
      .catch(() => {
        if (active) setStatus("Service unreachable");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [attempt]);
  return (
    <div className="service">
      <span role="status">● {status}</span>
      <button
        className="quiet"
        onClick={() => {
          setStatus("Checking service…");
          setAttempt((value) => value + 1);
        }}
      >
        Check again
      </button>
    </div>
  );
}
export default function Home() {
  const [filter, setFilter] = useState<Status | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const generation = useRef(0);
  const created = useRef<Task[]>([]);
  async function load(
    status?: Status,
    next?: number,
    version = generation.current,
  ) {
    try {
      const page = await api.tasks({ status, cursor: next, limit: 20 });
      if (version !== generation.current) return;
      setTasks((previous) => {
        const local = created.current.filter(
          (task) => status === undefined || task.status === status,
        );
        const merged =
          next === undefined
            ? [...local, ...page.items]
            : [...previous, ...page.items];
        return [...new Map(merged.map((task) => [task.id, task])).values()];
      });
      setCursor(page.next_cursor);
    } catch (cause) {
      if (version === generation.current) setError(errorText(cause));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    const requests = generation;
    const version = ++requests.current;
    void load(undefined, undefined, version);
    return () => {
      requests.current = version + 1;
    };
  }, []);
  function changeFilter(status?: Status) {
    const version = ++generation.current;
    setLoading(true);
    setError("");
    setFilter(status);
    setTasks([]);
    setCursor(null);
    void load(status, undefined, version);
  }
  function loadMore() {
    setLoading(true);
    setError("");
    void load(filter, tasks.length ? (cursor ?? undefined) : undefined);
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setCreateError("");
    try {
      const task = await api.createTask(title.trim());
      created.current.unshift(task);
      setTitle("");
      changeFilter(undefined);
      setTasks([...created.current]);
    } catch (cause) {
      setCreateError(errorText(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <main>
      <header>
        <Link className="brand" href="/">
          TaskFlow<span> / demo workspace</span>
        </Link>
        <ServiceStatus />
      </header>
      <section className="intro">
        <p className="eyebrow">A little clarity for your day</p>
        <h1>Make room for what’s next.</h1>
        <p>One shared board. Small steps, visible progress.</p>
      </section>
      <section className="panel">
        <h2>Create a task</h2>
        <form onSubmit={create} className="inline-form">
          <label className="grow">
            Task title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen?"
              required
              disabled={saving}
            />
          </label>
          <button disabled={saving || !title.trim()}>
            {saving ? "Creating…" : "Create task"}
          </button>
        </form>
        {createError && <p role="alert">{createError}</p>}
      </section>
      <section className="board">
        <div className="section-heading">
          <h2>Your tasks</h2>
          <span className="muted">Read-only statuses</span>
        </div>
        <div className="filters" aria-label="Filter tasks">
          {(
            [
              [undefined, "All"],
              ["todo", "To do"],
              ["doing", "Doing"],
              ["done", "Done"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              aria-pressed={filter === value}
              onClick={() => changeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert">
            {error} <button onClick={loadMore}>Try again</button>
          </p>
        )}
        {!loading && !error && !tasks.length && (
          <p className="empty">No tasks here yet. Create one to get started.</p>
        )}
        <ul className="tasks">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`}>
                <span>
                  <small>TF-{task.id}</small>
                  <strong>{task.title}</strong>
                </span>
                <span className={`badge ${task.status}`}>
                  {{ todo: "To do", doing: "Doing", done: "Done" }[task.status]}
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
        {loading && <p role="status">Loading tasks…</p>}
        {cursor !== null && !loading && (
          <button onClick={loadMore}>Load more</button>
        )}
      </section>
      <footer>
        TaskFlow demo · Fictional data only. Public data may reset when the
        service restarts.
      </footer>
    </main>
  );
}
