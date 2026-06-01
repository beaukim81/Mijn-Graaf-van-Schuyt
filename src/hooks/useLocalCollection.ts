import { useMemo, useState } from "react";

type WithId = { id: string };

export function useLocalCollection<T extends WithId>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);

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
