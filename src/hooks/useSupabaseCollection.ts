import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const pendingUpsertIds = useRef(new Set<string>());
  const pendingDeleteIds = useRef(new Set<string>());

  useEffect(() => {
    persistItems(options.storageKey, items);
  }, [items, options.storageKey]);

  useEffect(() => {
    if (!options.enabled || !isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    options
      .fetchItems()
      .then((fetchedItems) => {
        if (!cancelled) {
          setItems((currentItems) => {
            const currentById = new Map(currentItems.map((item) => [item.id, item]));
            const fetchedIds = new Set(fetchedItems.map((item) => item.id));
            const fetchedWithPendingChanges = fetchedItems
              .filter((item) => !pendingDeleteIds.current.has(item.id))
              .map((item) => (pendingUpsertIds.current.has(item.id) ? currentById.get(item.id) ?? item : item));
            const localPendingItems = currentItems.filter(
              (item) => pendingUpsertIds.current.has(item.id) && !pendingDeleteIds.current.has(item.id) && !fetchedIds.has(item.id),
            );

            return [...localPendingItems, ...fetchedWithPendingChanges];
          });
        }
      })
      .catch(reportError);

    return () => {
      cancelled = true;
    };
  }, [options]);

  const add = useCallback(
    (item: T) => {
      pendingUpsertIds.current.add(item.id);
      pendingDeleteIds.current.delete(item.id);
      setItems((current) => [item, ...current]);
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .insertItem(item)
          .then(() => pendingUpsertIds.current.delete(item.id))
          .catch(reportError);
      }
    },
    [options],
  );

  const update = useCallback(
    (id: string, changes: Partial<T>) => {
      const previousItem = items.find((item) => item.id === id);
      const nextItem = previousItem ? { ...previousItem, ...changes } : undefined;
      if (!nextItem) return;

      pendingUpsertIds.current.add(id);
      pendingDeleteIds.current.delete(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .updateItem(id, changes, nextItem, previousItem)
          .then(() => pendingUpsertIds.current.delete(id))
          .catch(reportError);
      }
    },
    [items, options],
  );

  const remove = useCallback(
    (id: string) => {
      const item = items.find((current) => current.id === id);
      pendingUpsertIds.current.delete(id);
      pendingDeleteIds.current.add(id);
      setItems((current) => current.filter((current) => current.id !== id));
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .deleteItem(id, item)
          .then(() => pendingDeleteIds.current.delete(id))
          .catch(reportError);
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
