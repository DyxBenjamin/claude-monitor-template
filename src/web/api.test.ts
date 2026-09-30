import { afterAll, expect, test } from "bun:test";
import { openDb } from "../shared/db.ts";
import { listEventsAfter } from "../shared/events.ts";
import { apiRoutes } from "./api.ts";

const db = openDb(":memory:");
const server = Bun.serve({ port: 0, routes: apiRoutes(db) });
afterAll(() => server.stop());

const call = (path: string, method = "GET", body?: unknown) =>
  fetch(new URL(path, server.url), { method, body: body === undefined ? undefined : JSON.stringify(body) });

test("CRUD over HTTP is recorded as user events", async () => {
  const created = await (await call("/api/items", "POST", { title: "Review PR" })).json();
  expect(created).toMatchObject({ title: "Review PR", done: false });

  const updated = await (await call(`/api/items/${created.id}`, "PATCH", { done: true })).json();
  expect(updated.done).toBe(true);

  expect(await (await call("/api/items")).json()).toHaveLength(1);
  expect((await call(`/api/items/${created.id}`, "DELETE")).status).toBe(200);
  expect(listEventsAfter(db, 0, "user").map((e) => e.action)).toEqual(["create", "update", "delete"]);
});

test("invalid bodies are 400 and unknown ids are 404", async () => {
  expect((await call("/api/items", "POST", { title: "" })).status).toBe(400);
  expect((await call("/api/items", "POST")).status).toBe(400);
  expect((await call("/api/items/999", "PATCH", { done: true })).status).toBe(404);
});
