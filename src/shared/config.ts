/**
 * @file Exports `config`: database path, web port, monitor poll and heartbeat intervals, read from env vars with defaults.
 * @tags config, env
 * @related src/shared/db.ts
 */
import { join } from "node:path";

export const config = {
  dbPath: Bun.env.CLAUDE_MONITOR_DB ?? join(import.meta.dir, "../../data/claude-monitor.sqlite"),
  webPort: Number(Bun.env.CLAUDE_MONITOR_PORT ?? 3000),
  monitorIntervalMs: Number(Bun.env.CLAUDE_MONITOR_MONITOR_INTERVAL ?? 1000),
  heartbeatMs: Number(Bun.env.CLAUDE_MONITOR_HEARTBEAT ?? 2000),
};
