/**
 * @file Event log queries (`recordEvent`, `listEventsAfter`, `lastEventId`) and named cursors (`getCursor`, `setCursor`).
 * @tags event-log, sqlite
 * @related src/shared/schemas.ts, src/monitor/index.ts
 */
import type { Database } from "bun:sqlite";
import type { Action, Event, Item, Source } from "./schemas.ts";

type EventRow = {
  id: number;
  source: Source;
  action: Action;
  item: string;
  created_at: string;
};

const toEvent = (row: EventRow): Event => ({
  id: row.id,
  source: row.source,
  action: row.action,
  item: JSON.parse(row.item),
  createdAt: row.created_at,
});

export function recordEvent(db: Database, source: Source, action: Action, item: Item): void {
  db.query("INSERT INTO events (source, action, item_id, item, created_at) VALUES (?, ?, ?, ?, ?)").run(
    source,
    action,
    item.id,
    JSON.stringify(item),
    new Date().toISOString(),
  );
}

export function listEventsAfter(db: Database, afterId: number, source: Source): Event[] {
  return db
    .query<EventRow, [number, Source]>("SELECT * FROM events WHERE id > ? AND source = ? ORDER BY id")
    .all(afterId, source)
    .map(toEvent);
}

export function lastEventId(db: Database): number {
  return db.query<{ id: number | null }, []>("SELECT MAX(id) AS id FROM events").get()?.id ?? 0;
}

export function getCursor(db: Database, name: string): number | null {
  return db.query<{ event_id: number }, [string]>("SELECT event_id FROM cursors WHERE name = ?").get(name)?.event_id ?? null;
}

export function setCursor(db: Database, name: string, eventId: number): void {
  db.query("INSERT INTO cursors (name, event_id) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET event_id = excluded.event_id").run(
    name,
    eventId,
  );
}
