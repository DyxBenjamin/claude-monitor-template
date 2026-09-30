/**
 * @file React item list UI on #root: adds, toggles and deletes items, refetching every 2 s to show Claude's changes.
 * @tags web-ui, react, items
 * @related src/web/ui/api.ts, src/web/ui/index.html
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { Item } from "../../shared/schemas.ts";
import { api } from "./api.ts";

// Claude writes through the MCP server, so the list is refetched to show its changes.
const REFRESH_MS = 2000;

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.list().then(setItems, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const run = (action: Promise<unknown>) =>
    action.then(() => (setError(null), refresh()), (e: Error) => setError(e.message));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    run(api.create({ title }));
    setTitle("");
  };

  return (
    <main>
      <h1>Claude Monitor</h1>
      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New item" aria-label="New item" />
        <button type="submit">Add</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => run(api.update(item.id, { done: !item.done }))}
              />
              <span className={item.done ? "done" : undefined}>{item.title}</span>
            </label>
            <button onClick={() => run(api.remove(item.id))} aria-label={`Delete ${item.title}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="empty">No items yet.</p>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
