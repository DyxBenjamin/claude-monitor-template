/**
 * @file Exports `beat`, `startHeartbeat` and `serviceStatus`: service heartbeats in SQLite and up/down status from them.
 * @tags heartbeat, sqlite, status-line
 * @related src/shared/db.ts, src/status/index.ts
 */
import type { Database } from "bun:sqlite";
import { config } from "./config.ts";

export const SERVICES = ["web", "mcp", "monitor"] as const;
export type Service = (typeof SERVICES)[number];

export function beat(db: Database, service: Service, now = Date.now()): void {
  db.query(
    "INSERT INTO heartbeats (service, pid, beat_at) VALUES (?, ?, ?) ON CONFLICT (service) DO UPDATE SET pid = excluded.pid, beat_at = excluded.beat_at",
  ).run(service, process.pid, now);
}

// Beats while the process lives; the timer alone does not keep the process running.
// A clean stop removes the row at once, a crash lets it go stale.
export function startHeartbeat(db: Database, service: Service): void {
  beat(db, service);
  setInterval(() => beat(db, service), config.heartbeatMs).unref();
  const stop = () => {
    db.query("DELETE FROM heartbeats WHERE service = ? AND pid = ?").run(service, process.pid);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

// A service is up while its last beat is younger than 2.5 heartbeat intervals.
export function serviceStatus(db: Database, now = Date.now()): Record<Service, boolean> {
  const rows = db.query<{ service: string; beat_at: number }, []>("SELECT service, beat_at FROM heartbeats").all();
  const up = new Set(rows.filter((row) => now - row.beat_at < config.heartbeatMs * 2.5).map((row) => row.service));
  return Object.fromEntries(SERVICES.map((service) => [service, up.has(service)])) as Record<Service, boolean>;
}
