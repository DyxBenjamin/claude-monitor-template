/**
 * @file Exports `apiRoutes`: /api/items JSON routes that validate bodies with zod and attribute every write to the user.
 * @tags http-api, items
 * @related src/web/api.test.ts, src/shared/items.ts
 */
import type { Database } from "bun:sqlite";
import type { BunRequest } from "bun";
import type { z } from "zod";
import { createItem, deleteItem, listItems, updateItem } from "../shared/items.ts";
import { CreateItem, UpdateItem } from "../shared/schemas.ts";

type ItemRequest = BunRequest<"/api/items/:id">;

async function readBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  const parsed = schema.safeParse(await req.json().catch(() => undefined));
  return parsed.success ? parsed.data : Response.json({ error: parsed.error.issues }, { status: 400 });
}

const notFound = () => Response.json({ error: "Item not found" }, { status: 404 });

// Every write from the web API is attributed to the user, which is what the monitor reports.
export function apiRoutes(db: Database) {
  return {
    "/api/items": {
      GET: () => Response.json(listItems(db)),
      POST: async (req: Request) => {
        const input = await readBody(req, CreateItem);
        if (input instanceof Response) return input;
        return Response.json(createItem(db, input, "user"), { status: 201 });
      },
    },
    "/api/items/:id": {
      PATCH: async (req: ItemRequest) => {
        const patch = await readBody(req, UpdateItem);
        if (patch instanceof Response) return patch;
        const item = updateItem(db, Number(req.params.id), patch, "user");
        return item ? Response.json(item) : notFound();
      },
      DELETE: (req: ItemRequest) => {
        const item = deleteItem(db, Number(req.params.id), "user");
        return item ? Response.json(item) : notFound();
      },
    },
  };
}
