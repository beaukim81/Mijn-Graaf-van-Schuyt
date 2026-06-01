import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import * as mock from "./data/mockData";
import { useLocalCollection } from "./hooks/useLocalCollection";
import { AppDataContext, type AppDataContextValue } from "./lib/AppDataContext";
import { paths } from "./routes/paths";
import { BulletinPage } from "./pages/BulletinPage";
import { ContactsPage } from "./pages/ContactsPage";
import { HelpPage } from "./pages/HelpPage";
import { HomePage } from "./pages/HomePage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";

function AppDataProvider({ children }: { children: ReactNode }) {
  const value: AppDataContextValue = {
    profile: mock.activeProfile,
    contacts: useLocalCollection(mock.contacts),
    reports: useLocalCollection(mock.reports),
    documents: useLocalCollection(mock.knowledgeDocuments),
    helpRequests: useLocalCollection(mock.helpRequests),
    bulletinPosts: useLocalCollection(mock.bulletinPosts),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

const router = createBrowserRouter([
  {
    path: paths.home,
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: paths.contacts, element: <ContactsPage /> },
      { path: paths.reports, element: <ReportsPage /> },
      { path: paths.knowledge, element: <KnowledgePage /> },
      { path: paths.help, element: <HelpPage /> },
      { path: paths.bulletin, element: <BulletinPage /> },
      { path: paths.profile, element: <ProfilePage /> },
    ],
  },
]);

export default function App() {
  return (
    <AppDataProvider>
      <RouterProvider router={router} />
    </AppDataProvider>
  );
}
