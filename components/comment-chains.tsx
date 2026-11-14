import type { Comment } from "@/lib/api";
export function chainHeads(comments: Comment[]) {
  const superseded = new Set(comments.map((comment) => comment.supersedes_id));
  return comments.filter((comment) => !superseded.has(comment.id));
}
export function CommentChains({ comments }: { comments: Comment[] }) {
  if (!comments.length)
    return <p className="empty">No comments yet. Start the conversation.</p>;
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  return (
    <ol className="thread">
      {chainHeads(comments).map((head) => {
        const history: Comment[] = [];
        const seen = new Set([head.id]);
        let prior = head.supersedes_id;
        while (prior !== null && !seen.has(prior)) {
          const revision = byId.get(prior);
          if (!revision) break;
          history.push(revision);
          seen.add(prior);
          prior = revision.supersedes_id;
        }
        return (
          <li className="comment" key={head.id}>
            <span className="eyebrow">Comment #{head.id}</span>
            <p>{head.body}</p>
            {history.length > 0 && (
              <details>
                <summary>
                  {history.length} superseded{" "}
                  {history.length === 1 ? "revision" : "revisions"}
                </summary>
                {history.map((revision) => (
                  <p key={revision.id}>
                    <del>{revision.body}</del>
                  </p>
                ))}
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
