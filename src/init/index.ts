/**
 * @file Exports `install` (writes skills, CLAUDE.md block, MCP servers and hooks into a project) and the `init` CLI command.
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
  return [
    ...(await copyTree(join(TEMPLATES, "skills"), root, ".claude/skills")),
    await upsertBlock(root, "CLAUDE.md", await template("CLAUDE.md").text()),
    await updateJson(root, ".mcp.json", (json) => ({ ...json, mcpServers: { ...json.mcpServers, ...servers } })),
    await updateJson(root, ".claude/settings.json", (json) => ({ ...json, hooks: mergeHooks(json.hooks ?? {}, hooks) })),
  ];
}

// Installs the Claude Code integration (skills, CLAUDE.md block, MCP server, hooks) into a project.
export async function init(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { dir: { type: "string" } } });
  const root = resolve(values.dir ?? process.cwd());
  for (const change of await install(root)) console.log(`${change.status.padEnd(9)} ${change.path}`);
  if (!Bun.which("claude-monitor")) {
    console.error("warning: `claude-monitor` is not on PATH; run `bun link` in the claude-monitor repo.");
  }
}
