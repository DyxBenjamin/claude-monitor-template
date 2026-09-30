/**
 * @file Exports `monitor`, `once`, `drain`, `formatEvent`: prints one line per user event, polling or once per hook call.
 * @tags monitor, event-log, cli
 * @related src/shared/events.ts, src/monitor/monitor.test.ts
 */
import type { Database } from "bun:sqlite";
import { parseArgs } from "util";
import { config } from "../shared/config.ts";
import { openDb } from "../shared/db.ts";
import { getCursor, lastEventId, listEventsAfter, setCursor } from "../shared/events.ts";
import type { Event } from "../shared/schemas.ts";

export const formatEvent = (event: Event): string =>
  `user ${event.action}d item ${event.item.id}: ${JSON.stringify(event.item)}`;

// Writes one line per user event after `cursor` and returns the new cursor.
export function drain(db: Database, cursor: number, write: (line: string) => void): number {
  for (const event of listEventsAfter(db, cursor, "user")) {
    write(formatEvent(event));
    cursor = event.id;
  }
  return cursor;
}

// One-shot for hooks: prints the user changes since the previous call under `name`, or nothing.
// The first call only sets the cursor, so a new project does not receive the whole history.
export function once(db: Database, name: string, write: (text: string) => void): void {
  const saved = getCursor(db, name);
  if (saved === null) return setCursor(db, name, lastEventId(db));
  const lines: string[] = [];
  const cursor = drain(db, saved, (line) => lines.push(line));
  if (lines.length) write(["User changes in claude-monitor:", ...lines].join("\n"));
  setCursor(db, name, cursor);
}

// Long-running: one stdout line per user change, meant to be streamed to Claude.
export function monitor(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: { from: { type: "string" }, once: { type: "boolean" }, cursor: { type: "string", default: "hook" } },
  });
  const db = openDb();
  if (values.once) return once(db, values.cursor, console.log);
  let cursor = values.from ? Number(values.from) : lastEventId(db);
  console.error(`claude-monitor monitor watching user changes after event ${cursor}`);
  setInterval(() => {
    cursor = drain(db, cursor, console.log);
  }, config.monitorIntervalMs);
}
