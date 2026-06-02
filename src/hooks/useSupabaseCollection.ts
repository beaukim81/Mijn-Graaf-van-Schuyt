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

function readStoredSet(storageKey: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const stored = window.localStorage.getItem(storageKey);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function persistSet(storageKey: string, items: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify([...items]));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Opslaan in de database is nog niet gelukt.";
}

function reportError(error: unknown) {
  console.error(error);
}

export function useSupabaseCollection<T extends WithId>(initialItems: T[], options: SupabaseCollectionOptions<T>): DataCollection<T> {
  const [items, setItems] = useState<T[]>(() => readStoredItems(options.storageKey, initialItems));
  const [syncError, setSyncError] = useState<string>();
  const pendingUpsertKey = `${options.storageKey}:pending-upserts`;
  const pendingDeleteKey = `${options.storageKey}:pending-deletes`;
  const pendingUpsertIds = useRef(readStoredSet(pendingUpsertKey));
  const pendingDeleteIds = useRef(readStoredSet(pendingDeleteKey));
  const retryingUpsertIds = useRef(new Set<string>());
  const retryingDeleteIds = useRef(new Set<string>());

  useEffect(() => {
    persistItems(options.storageKey, items);
  }, [items, options.storageKey]);

  useEffect(() => {
    persistSet(pendingUpsertKey, pendingUpsertIds.current);
    persistSet(pendingDeleteKey, pendingDeleteIds.current);
  }, [pendingDeleteKey, pendingUpsertKey]);

  useEffect(() => {
    if (!options.enabled || !isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    options
      .fetchItems()
      .then((fetchedItems) => {
        if (!cancelled) {
          setSyncError(undefined);
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
      .catch((error) => {
        setSyncError(`Gegevens ophalen lukte niet: ${errorMessage(error)}`);
        reportError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [options]);

  useEffect(() => {
    if (!options.enabled || !isSupabaseConfigured || !supabase) return;

    const pendingItems = items.filter((item) => pendingUpsertIds.current.has(item.id) && !retryingUpsertIds.current.has(item.id));
    pendingItems.forEach((item) => {
      retryingUpsertIds.current.add(item.id);
      Promise.resolve()
        .then(async () => {
          await options.insertItem(item);
        })
        .then(() => {
          pendingUpsertIds.current.delete(item.id);
          persistSet(pendingUpsertKey, pendingUpsertIds.current);
          setSyncError(undefined);
        })
        .catch((error) => {
          setSyncError(`Opslaan in de database is nog niet gelukt: ${errorMessage(error)}`);
          reportError(error);
        })
        .finally(() => retryingUpsertIds.current.delete(item.id));
    });

    const pendingDeleteIdsList = [...pendingDeleteIds.current].filter((id) => !retryingDeleteIds.current.has(id));
    pendingDeleteIdsList.forEach((id) => {
      retryingDeleteIds.current.add(id);
      options
        .deleteItem(id)
        .then(() => {
          pendingDeleteIds.current.delete(id);
          persistSet(pendingDeleteKey, pendingDeleteIds.current);
          setSyncError(undefined);
        })
        .catch((error) => {
          setSyncError(`Verwijderen in de database is nog niet gelukt: ${errorMessage(error)}`);
          reportError(error);
        })
        .finally(() => retryingDeleteIds.current.delete(id));
    });
  }, [items, options, pendingDeleteKey, pendingUpsertKey]);

  const add = useCallback(
    (item: T) => {
      pendingUpsertIds.current.add(item.id);
      pendingDeleteIds.current.delete(item.id);
      persistSet(pendingUpsertKey, pendingUpsertIds.current);
      persistSet(pendingDeleteKey, pendingDeleteIds.current);
      setSyncError(undefined);
      setItems((current) => [item, ...current]);
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .insertItem(item)
          .then(() => {
            pendingUpsertIds.current.delete(item.id);
            persistSet(pendingUpsertKey, pendingUpsertIds.current);
            setSyncError(undefined);
          })
          .catch((error) => {
            setSyncError(`Je bericht is lokaal bewaard, maar nog niet in de database opgeslagen: ${errorMessage(error)}`);
            reportError(error);
          });
      }
    },
    [options, pendingDeleteKey, pendingUpsertKey],
  );

  const update = useCallback(
    (id: string, changes: Partial<T>) => {
      const previousItem = items.find((item) => item.id === id);
      const nextItem = previousItem ? { ...previousItem, ...changes } : undefined;
      if (!nextItem) return;

      pendingUpsertIds.current.add(id);
      pendingDeleteIds.current.delete(id);
      persistSet(pendingUpsertKey, pendingUpsertIds.current);
      persistSet(pendingDeleteKey, pendingDeleteIds.current);
      setSyncError(undefined);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .updateItem(id, changes, nextItem, previousItem)
          .then(() => {
            pendingUpsertIds.current.delete(id);
            persistSet(pendingUpsertKey, pendingUpsertIds.current);
            setSyncError(undefined);
          })
          .catch((error) => {
            setSyncError(`De wijziging is lokaal bewaard, maar nog niet in de database opgeslagen: ${errorMessage(error)}`);
            reportError(error);
          });
      }
    },
    [items, options, pendingDeleteKey, pendingUpsertKey],
  );

  const remove = useCallback(
    (id: string) => {
      const item = items.find((current) => current.id === id);
      pendingUpsertIds.current.delete(id);
      pendingDeleteIds.current.add(id);
      persistSet(pendingUpsertKey, pendingUpsertIds.current);
      persistSet(pendingDeleteKey, pendingDeleteIds.current);
      setSyncError(undefined);
      setItems((current) => current.filter((current) => current.id !== id));
      if (options.enabled && isSupabaseConfigured && supabase) {
        options
          .deleteItem(id, item)
          .then(() => {
            pendingDeleteIds.current.delete(id);
            persistSet(pendingDeleteKey, pendingDeleteIds.current);
            setSyncError(undefined);
          })
          .catch((error) => {
            setSyncError(`Verwijderen is lokaal verwerkt, maar nog niet in de database opgeslagen: ${errorMessage(error)}`);
            reportError(error);
          });
      }
    },
    [items, options, pendingDeleteKey, pendingUpsertKey],
  );

  return useMemo(
    () => ({
      items,
      syncError,
      clearSyncError: () => setSyncError(undefined),
      add,
      update,
      remove,
      replace: setItems,
    }),
    [add, items, remove, syncError, update],
  );
}
