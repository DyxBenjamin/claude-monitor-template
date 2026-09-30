import { expect, test } from "bun:test";
import { config } from "../shared/config.ts";
import { openDb } from "../shared/db.ts";
import { beat, serviceStatus } from "../shared/heartbeats.ts";
import { formatStatus } from "./index.ts";

test("a service is up only while its heartbeat is fresh", () => {
  const db = openDb(":memory:");
  const now = Date.now();
  beat(db, "web", now);
  beat(db, "mcp", now - config.heartbeatMs * 3);

  const status = serviceStatus(db, now);
  expect(status).toEqual({ web: true, mcp: false, monitor: false });
  expect(Bun.stripANSI(formatStatus(status))).toBe("claude-monitor ● web  ○ mcp  ○ monitor");
});
