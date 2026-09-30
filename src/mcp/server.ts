/**
 * @file Exports `createMcpServer`: list, create, update and delete item tools whose writes are attributed to Claude.
 * @tags mcp, items
 * @related src/mcp/server.test.ts, src/shared/items.ts
 */
import type { Database } from "bun:sqlite";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createItem, deleteItem, listItems, updateItem } from "../shared/items.ts";
import { CreateItem, UpdateItem } from "../shared/schemas.ts";

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const notFound = (id: number) => ({
  content: [{ type: "text" as const, text: `Item ${id} not found.` }],
  isError: true,
});

const ItemId = { id: z.number().int().describe("Item id") };

export function createMcpServer(db: Database): McpServer {
  const server = new McpServer({ name: "claude-monitor", version: "0.1.0" });

  server.registerTool(
    "list_items",
    { description: "List every item in the app state." },
    async () => json(listItems(db)),
  );

  server.registerTool(
    "create_item",
    { description: "Create an item in the app state.", inputSchema: CreateItem.shape },
    async (input) => json(createItem(db, input, "claude")),
  );

  server.registerTool(
    "update_item",
    { description: "Change the title or done flag of an item.", inputSchema: { ...ItemId, ...UpdateItem.shape } },
    async ({ id, ...patch }) => {
      const item = updateItem(db, id, patch, "claude");
      return item ? json(item) : notFound(id);
    },
  );

  server.registerTool(
    "delete_item",
    { description: "Delete an item from the app state.", inputSchema: ItemId },
    async ({ id }) => {
      const item = deleteItem(db, id, "claude");
      return item ? json(item) : notFound(id);
    },
  );

  return server;
}
