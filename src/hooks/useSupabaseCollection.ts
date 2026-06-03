import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataCollection } from "../lib/AppDataContext";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
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
    return stored ? (sanitizeForStorage(JSON.parse(stored)) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeForStorage(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:image/") || value.startsWith("blob:")) return "";
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForStorage).filter((item) => item !== "");
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForStorage(item)]));
  }

  return value;
}

function persistItems<T>(storageKey: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sanitizeForStorage(items)));
  } catch (error) {
    reportError(error);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage cleanup failures.
    }
  }
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
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...items]));
  } catch (error) {
    reportError(error);
  }
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
        setSyncError(friendlyErrorMessage(error, "Gegevens ophalen lukt nu niet. Vernieuw de pagina of probeer het later opnieuw."));
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
          setSyncError(friendlyErrorMessage(error, "Opslaan lukt nu niet. Controleer je internet en probeer het opnieuw."));
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
          setSyncError(friendlyErrorMessage(error, "Verwijderen lukt nu niet. Controleer je internet en probeer het opnieuw."));
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
            setSyncError(friendlyErrorMessage(error, "Je bericht kon nog niet online worden opgeslagen. Controleer je internet en probeer het opnieuw."));
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
            setSyncError(friendlyErrorMessage(error, "De wijziging kon nog niet online worden opgeslagen. Controleer je internet en probeer het opnieuw."));
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
            setSyncError(friendlyErrorMessage(error, "Verwijderen kon nog niet online worden opgeslagen. Controleer je internet en probeer het opnieuw."));
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
