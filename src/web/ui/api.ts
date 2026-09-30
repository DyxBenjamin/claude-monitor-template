/**
 * @file Exports `api`, the browser fetch client for the /api/items list, create, update and remove endpoints.
 * @tags http-client, web-ui, items
 * @related src/web/api.ts
 */
import type { CreateItem, Item, UpdateItem } from "../../shared/schemas.ts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  list: () => request<Item[]>("/api/items"),
  create: (input: CreateItem) => request<Item>("/api/items", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, patch: UpdateItem) =>
    request<Item>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<Item>(`/api/items/${id}`, { method: "DELETE" }),
};
