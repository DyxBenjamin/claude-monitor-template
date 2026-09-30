import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { openDb } from "../shared/db.ts";
import { listEventsAfter } from "../shared/events.ts";
import { drain } from "../monitor/index.ts";
import { createItem } from "../shared/items.ts";
import { createMcpServer } from "./server.ts";

test("Claude changes via MCP are recorded as claude events; the monitor reports only user ones", async () => {
  const db = openDb(":memory:");
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(db).connect(serverSide);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientSide);

  const tools = (await client.listTools()).tools.map((t) => t.name);
  expect(tools).toEqual(["list_items", "create_item", "update_item", "delete_item"]);

  await client.callTool({ name: "create_item", arguments: { title: "From Claude" } });
  const missing = await client.callTool({ name: "delete_item", arguments: { id: 999 } });
  expect(missing.isError).toBe(true);
  expect(listEventsAfter(db, 0, "claude")).toHaveLength(1);

  createItem(db, { title: "From user" }, "user");
  const lines: string[] = [];
  expect(drain(db, 0, (line) => lines.push(line))).toBe(2);
  expect(lines).toEqual([expect.stringMatching(/^user created item 2: .*From user/)]);

  await client.close();
});
