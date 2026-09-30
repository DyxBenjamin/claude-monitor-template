/**
 * @file Exports `mcp`, the CLI command that serves the MCP server over stdio, logs to stderr and writes a heartbeat.
 * @tags mcp, cli, entrypoint
 * @related src/mcp/server.ts
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDb } from "../shared/db.ts";
import { startHeartbeat } from "../shared/heartbeats.ts";
import { createMcpServer } from "./server.ts";

// stdout carries the MCP protocol; logs go to stderr.
export async function mcp(): Promise<void> {
  const db = openDb();
  await createMcpServer(db).connect(new StdioServerTransport());
  startHeartbeat(db, "mcp");
  console.error("claude-monitor mcp ready on stdio");
}
