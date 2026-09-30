import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { install } from "./index.ts";

test("install writes the integration, keeps user content and is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "cc-init-"));
  await Bun.write(join(root, "CLAUDE.md"), "# My project\n");
  await Bun.write(join(root, ".mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" } } }));
  const userHook = { matcher: "Bash", hooks: [{ type: "command", command: "echo mine" }] };
  await Bun.write(join(root, ".claude/settings.json"), JSON.stringify({ hooks: { PreToolUse: [userHook] } }));

  const first = await install(root);
  expect(first.map((c) => c.status)).not.toContain("unchanged");
  expect((await install(root)).every((c) => c.status === "unchanged")).toBe(true);

  const claudeMd = await Bun.file(join(root, "CLAUDE.md")).text();
  expect(claudeMd.startsWith("# My project\n")).toBe(true);
  expect(claudeMd.match(/claude-monitor:start/g)).toHaveLength(1);

  const mcp = await Bun.file(join(root, ".mcp.json")).json();
  expect(Object.keys(mcp.mcpServers)).toEqual(["other", "claude-monitor"]);

  const settings = await Bun.file(join(root, ".claude/settings.json")).json();
  expect(settings.hooks.PreToolUse).toEqual([userHook]);
  expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toBe("claude-monitor monitor --once");

  expect(await Bun.file(join(root, ".claude/skills/claude-monitor/SKILL.md")).exists()).toBe(true);
});

test("install sets the status line but keeps one the project already has", async () => {
  const fresh = await mkdtemp(join(tmpdir(), "cc-init-"));
  await install(fresh);
  const settings = await Bun.file(join(fresh, ".claude/settings.json")).json();
  expect(settings.statusLine.command).toBe("claude-monitor status");

  const custom = await mkdtemp(join(tmpdir(), "cc-init-"));
  const theirs = { type: "command", command: "my-status" };
  await Bun.write(join(custom, ".claude/settings.json"), JSON.stringify({ statusLine: theirs }));
  const changes = await install(custom);
  expect((await Bun.file(join(custom, ".claude/settings.json")).json()).statusLine).toEqual(theirs);
  expect(changes.find((c) => c.path === ".claude/settings.json")?.note).toContain("kept");
});
