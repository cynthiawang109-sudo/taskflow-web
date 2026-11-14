import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, errorText } from "@/lib/api";
const mockFetch = (data: unknown, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify(data), { status }),
      ),
  );
afterEach(() => vi.unstubAllGlobals());
describe("typed API client", () => {
  it("parses tasks and preserves zero cursors in both directions", async () => {
    mockFetch({
      items: [{ id: 1, title: "Plan the demo", status: "todo" }],
      next_cursor: 0,
    });
    const page = await api.tasks({ status: "todo", cursor: 0, limit: 20 });
    expect(page.items[0].title).toBe("Plan the demo");
    expect(page.next_cursor).toBe(0);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/tasks?status=todo&cursor=0&limit=20"),
      expect.any(Object),
    );
  });
  it("omits absent query values and preserves terminal cursors", async () => {
    mockFetch({ items: [], next_cursor: null });
    expect((await api.tasks()).next_cursor).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/tasks$/),
      expect.any(Object),
    );
    await api.comments(3, 7);
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/v1/tasks/3/comments?cursor=7&limit=200"),
      expect.any(Object),
    );
  });
  it.each([
    [409, "conflict"],
    [404, "task_not_found"],
    [422, "validation_error"],
  ])("maps %s envelopes to ApiError with code %s", async (status, code) => {
    mockFetch({ error: { code, message: "Wording can change" } }, status);
    await expect(api.addComment(1, "Update", 2)).rejects.toMatchObject({
      name: "ApiError",
      code,
      status,
      message: "Wording can change",
    });
  });
  it("branches on conflict code rather than message wording", () => {
    expect(errorText(new ApiError("conflict", "Anything"))).toContain(
      "Someone revised this first",
    );
    expect(errorText(new ApiError("other", "conflict"))).toBe("conflict");
  });
  it("handles malformed envelopes and non-JSON errors", async () => {
    mockFetch({ detail: "unavailable" }, 500);
    await expect(api.task(1)).rejects.toMatchObject({
      code: "http_error",
      status: 500,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not JSON", { status: 502 })),
    );
    await expect(api.task(1)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
  it("maps network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(api.health()).rejects.toMatchObject({ code: "unreachable" });
  });
  it("accepts the special degraded health response", async () => {
    mockFetch({ status: "degraded", checks: { database: "down" } }, 503);
    expect((await api.health()).status).toBe("degraded");
  });
  it("posts only the supplied revision fields", async () => {
    mockFetch({ id: 3, task_id: 1, body: "Updated", supersedes_id: 2 }, 201);
    await api.addComment(1, "Updated", 2);
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/v1/tasks/1/comments"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Updated", supersedes_id: 2 }),
      }),
    );
    await api.addComment(1, "New");
    expect(fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ body: "New" }) }),
    );
  });
});
