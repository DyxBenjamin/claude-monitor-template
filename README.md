---
summary: Documents the CLI commands, Claude plugin, status line, shared SQLite state, env vars and Docker setup.
tags: [mcp, http-api, monitor, docker, sqlite]
related: [index.ts, src/shared/items.ts, docker-compose.yml, .mcp.json]
---

# claude-monitor-template

Minimal, working base for an app whose state is shared by a person and Claude. The person manages the state in a web
UI, Claude manages it through MCP tools, and each side learns about the other's changes. Everything runs from one
Bun CLI on one SQLite database, locally or in Docker.

```
person ⇄ web (UI + /api) ────┐
                             ├──► SQLite: items + events ──► monitor ──► Claude (plugin hook)
Claude ⇄ mcp (MCP tools) ────┘

init: installs the Claude plugin (skill, CLAUDE.md block, MCP server, hook, status line) into a project
```

Every write goes through `src/shared/items.ts`, which stores the change and an event tagged with its source (`user`
or `claude`) in one transaction. The web UI shows Claude's changes by refetching; the plugin hands the person's changes
to Claude by reading the `user` events.

## Use this template

Create a repository from this template on GitHub (**Use this template**), then give the app its own name: replace
`claude-monitor` (CLI, MCP server, skill, markers) and `CLAUDE_MONITOR` (env vars) across the repo, and rename
`templates/skills/claude-monitor/`.

## Quick start

```bash
bun install
bun link                  # puts `claude-monitor` on PATH
claude-monitor web        # http://localhost:3000

cd path/to/your-project
claude-monitor init       # installs the Claude plugin there
```

Open Claude Code in that project and enable the `claude-monitor` MCP server when it asks.

## Components

### 1. CLI

`index.ts` is the single entrypoint. It maps the first argument to a command and prints usage for anything else.

| Command                          | Does                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| `init [--dir PATH]`              | Installs the Claude plugin into a project                                |
| `web`                            | Starts the web server                                                    |
| `mcp`                            | Starts the MCP server on stdio                                           |
| `monitor [--from N]`             | Streams the person's changes, one line each, until stopped               |
| `monitor --once [--cursor NAME]` | Prints the person's changes since the previous delivery under `NAME`, then exits |
| `status`                         | One line showing which of web, mcp and monitor are running               |

Settings come from env vars (`src/shared/config.ts`); Bun loads `.env` automatically.

| Variable                          | Default                              |
| --------------------------------- | ------------------------------------ |
| `CLAUDE_MONITOR_DB`               | `data/claude-monitor.sqlite` in the repo |
| `CLAUDE_MONITOR_PORT`             | `3000`                               |
| `CLAUDE_MONITOR_MONITOR_INTERVAL` | `1000` (ms between polls)            |
| `CLAUDE_MONITOR_HEARTBEAT`        | `2000` (ms between service heartbeats) |

**Expand it.** A command is a function `(args: string[]) => void | Promise<void>` in `src/<command>/index.ts`. Add it
to `commands` and to `usage` in `index.ts`, and parse its flags with `parseArgs` from `util`.

### 2. Web server

`claude-monitor web` starts `Bun.serve` with two parts:

- `src/web/api.ts`: JSON routes on `/api/items` (`GET`, `POST`, `PATCH /:id`, `DELETE /:id`). Bodies are validated
  with the zod schemas in `src/shared/schemas.ts`; invalid bodies get `400`, unknown ids `404`. Every write is recorded
  with source `user`.
- `src/web/ui/`: React app served through a Bun HTML import (`index.html` → `app.tsx`), with hot reload outside
  production. It refetches every 2 s, so Claude's changes appear without a reload.

**Expand it.** Add routes to the object `apiRoutes` returns, or a sibling module spread into `routes` in
`src/web/index.ts`. Validate input with a zod schema and write through a repository with source `"user"`, so the
plugin reports the change. Add UI calls to `src/web/ui/api.ts` and components next to `app.tsx`.

### 3. MCP server

`claude-monitor mcp` serves `createMcpServer(db)` from `src/mcp/server.ts` over stdio. Tools:

| Tool          | Input                            |
| ------------- | -------------------------------- |
| `list_items`  | none                             |
| `create_item` | `title`                          |
| `update_item` | `id`, and `title` and/or `done`  |
| `delete_item` | `id`                             |

Tool inputs reuse the zod schemas the web API validates with. Every write is recorded with source `claude`, so the
plugin never echoes Claude's own changes back to it. stdout carries the protocol; logs go to stderr.

**Expand it.** Call `server.registerTool(name, { description, inputSchema }, handler)` in `createMcpServer`, with
`inputSchema` as a zod shape, and write with source `"claude"`. Return `isError: true` for failures Claude can act on.
`src/mcp/server.test.ts` shows how to drive the server with an in-memory client.

### 4. Claude plugin

`claude-monitor init` writes the contents of `templates/` into a project, so Claude Code there can use the app:

| Installed in            | From                        | Does                                                                   |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `.claude/skills/`       | `templates/skills/`         | `claude-monitor` skill: the tools and how to treat the person's changes |
| `CLAUDE.md`             | `templates/CLAUDE.md`       | Short standing note, between `claude-monitor:start/end` markers        |
| `.mcp.json`             | `templates/mcp.json`        | Registers the MCP server as `claude-monitor mcp`                       |
| `.claude/settings.json` | `templates/hooks.json`      | `UserPromptSubmit` hook: `claude-monitor monitor --once`               |
| `.claude/settings.json` | `templates/statusline.json` | Status line: `claude-monitor status`                                   |

The person's changes reach Claude two ways, both through the monitor:

- **Live feed.** When the skill loads, Claude starts `claude-monitor monitor` with its Monitor tool and re-arms it each
  time it expires; every change arrives as a notification while Claude works.
- **Prompt hook.** Before each prompt, `claude-monitor monitor --once` adds the changes the feed has not delivered.

Both advance the same cursor (`hook` by default), so each change reaches Claude once.

The status line shows which services are running, for example `claude-monitor ● web ● mcp ○ monitor`. `web`, `mcp`
and `monitor` each write a heartbeat to the database every 2 s; a service counts as running while its last heartbeat
is younger than 5 s. `mcp` is running while Claude Code has the MCP server connected.

`init` is idempotent. It rewrites only the files it owns and the parts of shared files it manages (its `CLAUDE.md`
block, its MCP server entry, its hook groups), leaves the rest as the project had it, and reports each file as
`created`, `updated` or `unchanged`.

**Expand it.** Drop a skill folder into `templates/skills/`, add hook groups to `templates/hooks.json` (same shape as
`hooks` in Claude Code settings), servers to `templates/mcp.json`, or text to `templates/CLAUDE.md`, and re-run
`init`. If the project already sets its own `statusLine`, `init` keeps it and says so. Anything that needs a new
file type gets a writer in `src/init/files.ts` and a line in `install()`.

## Shared state

`src/shared/` is what the components have in common:

| File         | Holds                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| `db.ts`      | `openDb()`: SQLite in WAL mode with a busy timeout, and the table schema   |
| `schemas.ts` | zod schemas and their types (`Item`, `CreateItem`, `UpdateItem`, `Event`)  |
| `items.ts`   | Item repository; each mutation writes the item and its event together     |
| `events.ts`  | Event log queries and the named cursors the monitor delivers from         |
| `heartbeats.ts` | Service heartbeats and the up/down status behind `status`              |
| `config.ts`  | Settings from env vars                                                     |

Tables: `items` (the example state), `events` (one row per change, with source, action and an item snapshot),
`cursors` (last event delivered to each consumer) and `heartbeats` (last beat of each running service).

**Expand it.** `items` is the example entity. To replace or add one: define its schemas in `schemas.ts`, add its
table to `db.ts`, write a repository like `items.ts` that records an event in the same transaction, then expose it
in the web API and as MCP tools. Events store an item snapshot, so a second entity adds an `entity` column to
`events` and uses it in `formatEvent` (`src/monitor/index.ts`).

## Layout

```
index.ts                CLI entrypoint
src/
  shared/               database, schemas, repositories, config
  web/                  api.ts, index.ts, ui/ (React)
  mcp/                  server.ts (tools), index.ts (stdio)
  monitor/              index.ts (stream and --once)
  status/               index.ts (status line)
  init/                 index.ts (install), files.ts (idempotent writers)
templates/              the Claude plugin init installs
```

## Development

```bash
bun test
bun run typecheck
```

This repository's own `.mcp.json` runs `bun index.ts mcp`, so the MCP server works here without `bun link`.

## Docker

```bash
docker compose up -d --build   # web on http://localhost:3000, database in the `data` volume
```

All processes must reach the same database file, so the MCP server and the monitor run inside the container too.
In the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "claude-monitor": {
      "command": "docker",
      "args": ["compose", "-f", "/path/to/claude-monitor-template/docker-compose.yml", "exec", "-T", "app", "bun", "index.ts", "mcp"]
    }
  }
}
```

and the hook command becomes
`docker compose -f /path/to/claude-monitor-template/docker-compose.yml exec -T app bun index.ts monitor --once`.
