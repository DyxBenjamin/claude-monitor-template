/**
 * @file Exports zod schemas and inferred types for Item, CreateItem, UpdateItem, Source, Action and Event.
 * @tags validation, items, event-log
 * @related src/shared/db.ts
 */
import { z } from "zod";

export const Item = z.object({
  id: z.number().int(),
  title: z.string(),
  done: z.boolean(),
  updatedAt: z.string(),
});
export type Item = z.infer<typeof Item>;

export const CreateItem = z.object({
  title: z.string().trim().min(1),
});
export type CreateItem = z.infer<typeof CreateItem>;

export const UpdateItem = z.object({
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
});
export type UpdateItem = z.infer<typeof UpdateItem>;

export const Source = z.enum(["user", "claude"]);
export type Source = z.infer<typeof Source>;

export const Action = z.enum(["create", "update", "delete"]);
export type Action = z.infer<typeof Action>;

export const Event = z.object({
  id: z.number().int(),
  source: Source,
  action: Action,
  item: Item,
  createdAt: z.string(),
});
export type Event = z.infer<typeof Event>;
