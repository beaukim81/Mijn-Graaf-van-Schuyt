import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataCollection } from "../lib/AppDataContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type WithId = { id: string };

interface SupabaseCollectionOptions<T extends WithId> {
  storageKey: string;
  enabled: boolean;
  fetchItems: () => Promise<T[]>;
  insertItem: (item: T) => Promise<void>;
  updateItem: (id: string, changes: Partial<T>, nextItem: T, previousItem?: T) => Promise<void>;
  deleteItem: (id: string, item?: T) => Promise<void>;
}

function readStoredItems<T>(storageKey: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function persistItems<T>(storageKey: string, items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function reportError(error: unknown) {
  console.error(error);
}

export function useSupabaseCollection<T extends WithId>(initialItems: T[], options: SupabaseCollectionOptions<T>): DataCollection<T> {
  const [items, setItems] = useState<T[]>(() => readStoredItems(options.storageKey, initialItems));

  useEffect(() => {
    persistItems(options.storageKey, items);
  }, [items, options.storageKey]);

  useEffect(() => {
    if (!options.enabled || !isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    options
      .fetchItems()
      .then((fetchedItems) => {
        if (!cancelled) setItems(fetchedItems);
      })
      .catch(reportError);

    return () => {
      cancelled = true;
    };
  }, [options]);

  const add = useCallback(
    (item: T) => {
      setItems((current) => [item, ...current]);
      if (options.enabled && isSupabaseConfigured && supabase) {
        options.insertItem(item).catch(reportError);
      }
    },
    [options],
  );

  const update = useCallback(
    (id: string, changes: Partial<T>) => {
      let previousItem: T | undefined;
      let nextItem: T | undefined;
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          previousItem = item;
          nextItem = { ...item, ...changes };
          return nextItem;
        }),
      );
      if (options.enabled && isSupabaseConfigured && supabase && nextItem) {
        options.updateItem(id, changes, nextItem, previousItem).catch(reportError);
      }
    },
    [options],
  );

  const remove = useCallback(
    (id: string) => {
      const item = items.find((current) => current.id === id);
      setItems((current) => current.filter((current) => current.id !== id));
      if (options.enabled && isSupabaseConfigured && supabase) {
        options.deleteItem(id, item).catch(reportError);
      }
    },
    [items, options],
  );

  return useMemo(
    () => ({
      items,
      add,
      update,
      remove,
      replace: setItems,
    }),
    [add, items, remove, update],
  );
}
