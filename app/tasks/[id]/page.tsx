"use client";
import Link from "next/link";
import { use, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorText, type Task, type Comment } from "@/lib/api";
import { CommentChains, chainHeads } from "@/components/comment-chains";
export default function TaskDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TaskConversation key={id} id={id} />;
}
async function fetchThread(id: string) {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)))
    throw new ApiError("task_not_found", "This task could not be found.", 404);
  const task = await api.task(Number(id));
  const comments: Comment[] = [];
  let cursor: number | undefined;
  const visited = new Set<number>();
  do {
    const page = await api.comments(Number(id), cursor);
    comments.push(...page.items);
    cursor = page.next_cursor ?? undefined;
    if (cursor !== undefined) {
      if (visited.has(cursor)) throw new Error("Repeated cursor");
      visited.add(cursor);
    }
  } while (cursor !== undefined);
  return { task, comments };
}
function TaskConversation({ id }: { id: string }) {
  const [task, setTask] = useState<Task>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [revise, setRevise] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  useEffect(() => {
    let active = true;
    fetchThread(id)
      .then((thread) => {
        if (!active) return;
        setTask(thread.task);
        setComments(thread.comments);
        setRevise("");
        setSaveError("");
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reloadCount]);
  function reload() {
    setLoading(true);
    setError("");
    setReloadCount((count) => count + 1);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const comment = await api.addComment(
        Number(id),
        body.trim(),
        revise ? Number(revise) : undefined,
      );
      setComments((previous) => [...previous, comment]);
      setBody("");
      setRevise("");
    } catch (cause) {
      setSaveError(errorText(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <main>
      <header>
        <Link className="brand" href="/">
          TaskFlow
        </Link>
        <Link href="/">← Back to board</Link>
      </header>
      {loading ? (
        <p role="status" className="empty">
          Loading task and conversation…
        </p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={reload}>Retry</button>
        </div>
      ) : (
        task && (
          <>
            <section className="intro">
              <p className="eyebrow">
                TF-{task.id} · {task.status}
              </p>
              <h1>{task.title}</h1>
              <p>Conversation & revision history</p>
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>Comments</h2>
                <button className="quiet" disabled={saving} onClick={reload}>
                  Reload thread
                </button>
              </div>
              <CommentChains comments={comments} />
              <form onSubmit={submit} className="comment-form">
                <h2>Add to the conversation</h2>
                <label>
                  Comment
                  <textarea
                    required
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={saving}
                    placeholder="Share an update (fictional data only)"
                  />
                </label>
                <label>
                  Revision
                  <select
                    value={revise}
                    onChange={(event) => setRevise(event.target.value)}
                    disabled={saving}
                  >
                    <option value="">Add a new comment</option>
                    {chainHeads(comments).map((head) => (
                      <option key={head.id} value={head.id}>
                        Revise latest comment #{head.id}:{" "}
                        {head.body.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                </label>
                {saveError && <p role="alert">{saveError}</p>}
                <button disabled={saving || !body.trim()}>
                  {saving
                    ? "Posting…"
                    : revise
                      ? "Post revision"
                      : "Post comment"}
                </button>
              </form>
            </section>
          </>
        )
      )}
      <footer>
        Fictional data only · Comments and their revision history are public.
      </footer>
    </main>
  );
}
