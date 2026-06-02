import { useEffect, useMemo, useState } from "react";

type WithId = { id: string };

function readStoredItems<T>(storageKey: string | undefined, fallback: T[]) {
  if (!storageKey || typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function useLocalCollection<T extends WithId>(initialItems: T[], storageKey?: string) {
  const [items, setItems] = useState<T[]>(() => readStoredItems(storageKey, initialItems));

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  return useMemo(
    () => ({
      items,
      add: (item: T) => setItems((current) => [item, ...current]),
      update: (id: string, changes: Partial<T>) =>
        setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item))),
      remove: (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
      replace: setItems,
    }),
    [items],
  );
}
