/**
 * @file Exports `init`, the CLI command, and `install`: writes skills, CLAUDE.md block, MCP servers, hooks and status line.
 * @tags installer, cli, mcp
 * @related src/init/files.ts, src/init/install.test.ts
 */
import { join, resolve } from "node:path";
import { parseArgs } from "util";
import { copyTree, mergeHooks, updateJson, upsertBlock, type Change } from "./files.ts";

const TEMPLATES = join(import.meta.dir, "../../templates");
const template = (path: string) => Bun.file(join(TEMPLATES, path));

export async function install(root: string): Promise<Change[]> {
  const servers = await template("mcp.json").json();
  const hooks = await template("hooks.json").json();
  const statusLine = await template("statusline.json").json();
  let foreignStatusLine = false;
  const settings = await updateJson(root, ".claude/settings.json", (json) => {
    // A status line the project already set is kept; ours is replaced so re-running init updates it.
    foreignStatusLine = !!json.statusLine && !String(json.statusLine.command).startsWith("claude-monitor status");
    return {
      ...json,
      hooks: mergeHooks(json.hooks ?? {}, hooks),
      statusLine: foreignStatusLine ? json.statusLine : statusLine,
    };
  });
  if (foreignStatusLine) settings.note = "kept the existing statusLine; claude-monitor status was not installed";
  return [
    ...(await copyTree(join(TEMPLATES, "skills"), root, ".claude/skills")),
    await upsertBlock(root, "CLAUDE.md", await template("CLAUDE.md").text()),
    await updateJson(root, ".mcp.json", (json) => ({ ...json, mcpServers: { ...json.mcpServers, ...servers } })),
    settings,
  ];
}

// Installs the Claude Code integration (skills, CLAUDE.md block, MCP server, hooks, status line) into a project.
export async function init(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { dir: { type: "string" } } });
  const root = resolve(values.dir ?? process.cwd());
  for (const change of await install(root)) {
    console.log(`${change.status.padEnd(9)} ${change.path}${change.note ? ` (${change.note})` : ""}`);
  }
  if (!Bun.which("claude-monitor")) {
    console.error("warning: `claude-monitor` is not on PATH; run `bun link` in the claude-monitor repo.");
  }
}
