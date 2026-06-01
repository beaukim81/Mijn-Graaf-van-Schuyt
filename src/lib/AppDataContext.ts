import { createContext, useContext } from "react";
import type { useLocalCollection } from "../hooks/useLocalCollection";
import type { BulletinPost, Contact, HelpRequest, KnowledgeDocument, Profile, Report } from "../types";

export interface AppDataContextValue {
  profile: Profile;
  contacts: ReturnType<typeof useLocalCollection<Contact>>;
  reports: ReturnType<typeof useLocalCollection<Report>>;
  documents: ReturnType<typeof useLocalCollection<KnowledgeDocument>>;
  helpRequests: ReturnType<typeof useLocalCollection<HelpRequest>>;
  bulletinPosts: ReturnType<typeof useLocalCollection<BulletinPost>>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataContext");
  return value;
}
