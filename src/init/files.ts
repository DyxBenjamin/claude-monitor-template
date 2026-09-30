/**
 * @file Idempotent writers for init: `writeIfChanged`, `copyTree`, `upsertBlock`, `updateJson` and `mergeHooks`.
 * @tags installer, hooks, claude-md
 * @related src/init/index.ts, src/init/install.test.ts
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export type Change = { path: string; status: "created" | "updated" | "unchanged" };

// Writes only when the content differs, so re-running init reports what it actually touched.
export async function writeIfChanged(root: string, path: string, content: string): Promise<Change> {
  const target = join(root, path);
  const file = Bun.file(target);
  const exists = await file.exists();
  if (exists && (await file.text()) === content) return { path, status: "unchanged" };
  await mkdir(dirname(target), { recursive: true });
  await Bun.write(target, content);
  return { path, status: exists ? "updated" : "created" };
}

export async function copyTree(from: string, root: string, to: string): Promise<Change[]> {
  const changes: Change[] = [];
  for await (const path of new Bun.Glob("**/*").scan({ cwd: from, dot: true })) {
    changes.push(await writeIfChanged(root, join(to, path), await Bun.file(join(from, path)).text()));
  }
  return changes;
}

const START = "<!-- claude-monitor:start -->";
const END = "<!-- claude-monitor:end -->";
const BLOCK = new RegExp(`${START}[\\s\\S]*?${END}`);

// Owns only the text between the markers; the rest of the file is left as the user wrote it.
export async function upsertBlock(root: string, path: string, block: string): Promise<Change> {
  const file = Bun.file(join(root, path));
  const current = (await file.exists()) ? await file.text() : "";
  const managed = `${START}\n${block.trim()}\n${END}`;
  const next = BLOCK.test(current)
    ? current.replace(BLOCK, () => managed)
    : current.trim()
      ? `${current.trimEnd()}\n\n${managed}\n`
      : `${managed}\n`;
  return writeIfChanged(root, path, next);
}

type Json = Record<string, any>;

export async function updateJson(root: string, path: string, update: (current: Json) => Json): Promise<Change> {
  const file = Bun.file(join(root, path));
  const current: Json = (await file.exists()) ? await file.json() : {};
  return writeIfChanged(root, path, `${JSON.stringify(update(current), null, 2)}\n`);
}

// Appends each hook group of `add` to its event unless an identical group is already there.
export function mergeHooks(current: Json, add: Json): Json {
  const merged: Json = { ...current };
  for (const [event, groups] of Object.entries(add) as [string, unknown[]][]) {
    const existing: unknown[] = merged[event] ?? [];
    const seen = new Set(existing.map((group) => JSON.stringify(group)));
    merged[event] = [...existing, ...groups.filter((group) => !seen.has(JSON.stringify(group)))];
  }
  return merged;
}
