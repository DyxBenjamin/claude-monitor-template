/**
 * @file Item repository: list, get, create, update and delete, each mutation recording its event in one transaction.
 * @tags items, repository, sqlite
 * @related src/shared/items.test.ts, src/shared/events.ts, src/shared/schemas.ts
 */
import type { Database } from "bun:sqlite";
import { recordEvent } from "./events.ts";
import type { CreateItem, Item, Source, UpdateItem } from "./schemas.ts";

type ItemRow = { id: number; title: string; done: number; updated_at: string };

const toItem = (row: ItemRow): Item => ({
  id: row.id,
  title: row.title,
  done: row.done === 1,
  updatedAt: row.updated_at,
});

export function listItems(db: Database): Item[] {
  return db.query<ItemRow, []>("SELECT * FROM items ORDER BY id").all().map(toItem);
}

export function getItem(db: Database, id: number): Item | null {
  const row = db.query<ItemRow, [number]>("SELECT * FROM items WHERE id = ?").get(id);
  return row ? toItem(row) : null;
}

// Every mutation writes the item and its event in one transaction,
// so the monitor never sees a change without its event or vice versa.

export function createItem(db: Database, input: CreateItem, source: Source): Item {
  return db.transaction(() => {
    const row = db
      .query<ItemRow, [string, string]>("INSERT INTO items (title, updated_at) VALUES (?, ?) RETURNING *")
      .get(input.title, new Date().toISOString())!;
    const item = toItem(row);
    recordEvent(db, source, "create", item);
    return item;
  })();
}

export function updateItem(db: Database, id: number, patch: UpdateItem, source: Source): Item | null {
  return db.transaction(() => {
    const current = getItem(db, id);
    if (!current) return null;
    const row = db
      .query<ItemRow, [string, number, string, number]>(
        "UPDATE items SET title = ?, done = ?, updated_at = ? WHERE id = ? RETURNING *",
      )
      .get(patch.title ?? current.title, Number(patch.done ?? current.done), new Date().toISOString(), id)!;
    const item = toItem(row);
    recordEvent(db, source, "update", item);
    return item;
  })();
}

export function deleteItem(db: Database, id: number, source: Source): Item | null {
  return db.transaction(() => {
    const current = getItem(db, id);
    if (!current) return null;
    db.query("DELETE FROM items WHERE id = ?").run(id);
    recordEvent(db, source, "delete", current);
    return current;
  })();
}
