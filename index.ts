#!/usr/bin/env bun
/**
 * @file Bun CLI entrypoint that dispatches the first argument to init, mcp, web, monitor or status, else prints usage.
 * @tags cli, entrypoint
 * @related src/init/index.ts, src/mcp/index.ts, src/web/index.ts, src/monitor/index.ts, src/status/index.ts
 */
import { init } from "./src/init/index.ts";
import { mcp } from "./src/mcp/index.ts";
import { monitor } from "./src/monitor/index.ts";
import { status } from "./src/status/index.ts";
import { web } from "./src/web/index.ts";

const commands: Record<string, (args: string[]) => void | Promise<void>> = { init, mcp, web, monitor, status };

const usage = `Usage: claude-monitor <command> [args]

Commands:
  init [--dir PATH]              Installs skills, hooks, the CLAUDE.md block and the MCP server into a project
  mcp                            MCP server on stdio: Claude reads and changes the app state
  web                            Web server: the user manages the app state
  monitor [--from N]             Streams user changes to Claude, one line each
  monitor --once [--cursor NAME] Prints user changes since the last call, for hooks
  status                         One line with which services are running, for the Claude Code status line`;

const [name, ...args] = Bun.argv.slice(2);
const command = name ? commands[name] : undefined;

if (!command) {
  console.error(usage);
  process.exit(name ? 1 : 0);
}

await command(args);
