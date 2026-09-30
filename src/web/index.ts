/**
 * @file Exports `web`, the CLI command that starts Bun.serve with the React UI and /api/items routes, and a heartbeat.
 * @tags http-api, web-ui, cli, entrypoint
 * @related src/web/api.ts, src/web/ui/index.html
 */
import { openDb } from "../shared/db.ts";
import { startHeartbeat } from "../shared/heartbeats.ts";
import { config } from "../shared/config.ts";
import { apiRoutes } from "./api.ts";
import app from "./ui/index.html";

export function web(): void {
  const db = openDb();
  const dev = Bun.env.NODE_ENV !== "production";
  const server = Bun.serve({
    port: config.webPort,
    routes: { "/": app, ...apiRoutes(db) },
    development: dev && { hmr: true, console: true },
  });
  startHeartbeat(db, "web");
  console.log(`claude-monitor web on ${server.url}`);
}
