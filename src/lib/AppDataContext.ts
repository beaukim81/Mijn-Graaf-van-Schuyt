import { createContext, useContext } from "react";
import type { BuildingAnnouncement, BulletinPost, Contact, HelpRequest, KnowledgeDocument, NotificationPreference, Profile, Report } from "../types";

export interface DataCollection<T extends { id: string }> {
  items: T[];
  syncError?: string;
  clearSyncError: () => void;
  add: (item: T) => void;
  update: (id: string, changes: Partial<T>) => void;
  remove: (id: string) => void;
  replace: (items: T[]) => void;
}

export interface AppDataContextValue {
  profile: Profile;
  contacts: DataCollection<Contact>;
  reports: DataCollection<Report>;
  documents: DataCollection<KnowledgeDocument>;
  helpRequests: DataCollection<HelpRequest>;
  bulletinPosts: DataCollection<BulletinPost>;
  buildingAnnouncements: DataCollection<BuildingAnnouncement>;
  notificationPreferences: DataCollection<NotificationPreference>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataContext");
  return value;
}
