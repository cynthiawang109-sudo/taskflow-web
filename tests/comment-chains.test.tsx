import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CommentChains } from "@/components/comment-chains";
it("renders heads with superseded revisions struck through and collapsed under their successor", () => {
  render(
    <CommentChains
      comments={[
        { id: 1, task_id: 1, body: "Original plan", supersedes_id: null },
        { id: 2, task_id: 1, body: "Updated plan", supersedes_id: 1 },
        { id: 3, task_id: 1, body: "Latest plan", supersedes_id: 2 },
        { id: 4, task_id: 1, body: "Separate thought", supersedes_id: null },
      ]}
    />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByText("Latest plan")).toBeVisible();
  const original = screen.getByText("Original plan");
  expect(original.tagName).toBe("DEL");
  const details = original.closest("details");
  expect(details).not.toHaveAttribute("open");
  expect(details?.parentElement).toContainElement(
    screen.getByText("Latest plan"),
  );
  fireEvent.click(screen.getByText("2 superseded revisions"));
  expect(details).toHaveAttribute("open");
});
