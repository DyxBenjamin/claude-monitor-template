import { expect, test } from "bun:test";
import { openDb } from "./db.ts";
import { lastEventId, listEventsAfter } from "./events.ts";
import { createItem, deleteItem, listItems, updateItem } from "./items.ts";

test("mutations change items and record one event per change with its source", () => {
  const db = openDb(":memory:");
  const item = createItem(db, { title: "Deploy" }, "user");
  updateItem(db, item.id, { done: true }, "claude");
  deleteItem(db, item.id, "user");

  expect(listItems(db)).toEqual([]);
  expect(lastEventId(db)).toBe(3);
  expect(listEventsAfter(db, 0, "user").map((e) => [e.action, e.item.title])).toEqual([
    ["create", "Deploy"],
    ["delete", "Deploy"],
  ]);
  expect(listEventsAfter(db, 0, "claude")[0]?.item.done).toBe(true);
});

test("update and delete of a missing item return null without recording events", () => {
  const db = openDb(":memory:");
  expect(updateItem(db, 99, { done: true }, "user")).toBeNull();
  expect(deleteItem(db, 99, "user")).toBeNull();
  expect(lastEventId(db)).toBe(0);
});
