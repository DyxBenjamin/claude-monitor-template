/**
 * @file Exports `monitor`, `once`, `deliver`, `drain`, `formatEvent`: prints user events past a named cursor.
 * @tags monitor, event-log, cli
 * @related src/shared/events.ts, src/monitor/monitor.test.ts
 */
import type { Database } from "bun:sqlite";
import { parseArgs } from "util";
import { config } from "../shared/config.ts";
import { openDb } from "../shared/db.ts";
import { startHeartbeat } from "../shared/heartbeats.ts";
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

// Hands the user changes after the cursor `name` to `write` and advances the cursor.
// The stream and the hook share the cursor, so a change reaches Claude once whichever delivers it.
// Without a saved cursor it only sets one, so a new consumer does not receive the whole history.
export function deliver(db: Database, name: string, write: (lines: string[]) => void): void {
  const saved = getCursor(db, name);
  if (saved === null) return setCursor(db, name, lastEventId(db));
  const lines: string[] = [];
  const cursor = drain(db, saved, (line) => lines.push(line));
  if (!lines.length) return;
  write(lines);
  setCursor(db, name, cursor);
}

// One-shot for hooks: prints the user changes since the previous delivery, or nothing.
export function once(db: Database, name: string, write: (text: string) => void): void {
  deliver(db, name, (lines) => write(["User changes in claude-monitor:", ...lines].join("\n")));
}

// Long-running: one stdout line per user change, meant for Claude's Monitor tool.
export function monitor(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: { from: { type: "string" }, once: { type: "boolean" }, cursor: { type: "string", default: "hook" } },
  });
  const db = openDb();
  if (values.once) return once(db, values.cursor, console.log);
  if (values.from) setCursor(db, values.cursor, Number(values.from));
  else if (getCursor(db, values.cursor) === null) setCursor(db, values.cursor, lastEventId(db));
  console.error(`claude-monitor monitor watching user changes after event ${getCursor(db, values.cursor)}`);
  startHeartbeat(db, "monitor");
  const tick = () => deliver(db, values.cursor, (lines) => lines.forEach((line) => console.log(line)));
  tick();
  setInterval(tick, config.monitorIntervalMs);
}
