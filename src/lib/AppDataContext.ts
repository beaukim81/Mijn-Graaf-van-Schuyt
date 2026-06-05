import { createContext, useContext } from "react";
import type { AccessRequest, BuildingAnnouncement, BulletinPost, Contact, FeedbackItem, HelpRequest, KnowledgeDocument, NotificationPreference, Profile, Report } from "../types";

export interface DataCollection<T extends { id: string }> {
  items: T[];
  syncError?: string;
  clearSyncError: () => void;
  add: (item: T) => void;
  addAsync: (item: T) => Promise<void>;
  update: (id: string, changes: Partial<T>) => void;
  updateAsync: (id: string, changes: Partial<T>) => Promise<void>;
  remove: (id: string) => void;
  removeAsync: (id: string) => Promise<void>;
  replace: (items: T[]) => void;
}

export interface AppDataContextValue {
  profile: Profile;
  accessRequests: DataCollection<AccessRequest>;
  profiles: DataCollection<Profile>;
  contacts: DataCollection<Contact>;
  reports: DataCollection<Report>;
  documents: DataCollection<KnowledgeDocument>;
  helpRequests: DataCollection<HelpRequest>;
  bulletinPosts: DataCollection<BulletinPost>;
  buildingAnnouncements: DataCollection<BuildingAnnouncement>;
  notificationPreferences: DataCollection<NotificationPreference>;
  feedbackItems: DataCollection<FeedbackItem>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataContext");
  return value;
}
