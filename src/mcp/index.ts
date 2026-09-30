/**
 * @file Exports `mcp`, the CLI command that serves the MCP server over stdio on the shared database, logging to stderr.
 * @tags mcp, cli, entrypoint
 * @related src/mcp/server.ts
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDb } from "../shared/db.ts";
import { createMcpServer } from "./server.ts";

// stdout carries the MCP protocol; logs go to stderr.
export async function mcp(): Promise<void> {
  const server = createMcpServer(openDb());
  await server.connect(new StdioServerTransport());
  console.error("claude-monitor mcp ready on stdio");
}
