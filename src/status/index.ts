/**
 * @file Exports `status`, the CLI command printing one status-line row of running services, and `formatStatus`.
 * @tags status-line, heartbeat, cli
 * @related src/shared/heartbeats.ts, src/status/status.test.ts, templates/statusline.json
 */
import { openDb } from "../shared/db.ts";
import { SERVICES, serviceStatus, type Service } from "../shared/heartbeats.ts";

const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export const formatStatus = (status: Record<Service, boolean>): string =>
  `${DIM}claude-monitor${RESET} ` +
  SERVICES.map((service) => (status[service] ? `${GREEN}●${RESET} ${service}` : `${DIM}○ ${service}${RESET}`)).join("  ");

// Claude Code runs this as the status line command and shows its first stdout line.
export function status(): void {
  console.log(formatStatus(serviceStatus(openDb())));
}
