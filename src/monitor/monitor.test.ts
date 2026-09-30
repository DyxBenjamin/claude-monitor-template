import { expect, test } from "bun:test";
import { openDb } from "../shared/db.ts";
import { createItem } from "../shared/items.ts";
import { deliver, once } from "./index.ts";

test("once reports user changes since the previous call, starting after the first", () => {
  const db = openDb(":memory:");
  createItem(db, { title: "Before" }, "user");
  const out: string[] = [];
  once(db, "hook", (text) => out.push(text));
  expect(out).toEqual([]);

  createItem(db, { title: "After" }, "user");
  once(db, "hook", (text) => out.push(text));
  once(db, "hook", (text) => out.push(text));
  expect(out).toEqual([expect.stringMatching(/^User changes in claude-monitor:\nuser created item 2: .*After/)]);
});

test("the stream and the hook share a cursor, so each change is delivered once", () => {
  const db = openDb(":memory:");
  const streamed: string[][] = [];
  const hooked: string[] = [];
  deliver(db, "hook", () => {});

  createItem(db, { title: "Streamed" }, "user");
  deliver(db, "hook", (lines) => streamed.push(lines));
  once(db, "hook", (text) => hooked.push(text));
  expect(streamed).toEqual([[expect.stringContaining("Streamed")]]);
  expect(hooked).toEqual([]);

  createItem(db, { title: "Hooked" }, "user");
  once(db, "hook", (text) => hooked.push(text));
  deliver(db, "hook", (lines) => streamed.push(lines));
  expect(hooked).toEqual([expect.stringContaining("Hooked")]);
  expect(streamed).toHaveLength(1);
});
