import { expect, test } from "bun:test";
import { openDb } from "../shared/db.ts";
import { createItem } from "../shared/items.ts";
import { once } from "./index.ts";

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
