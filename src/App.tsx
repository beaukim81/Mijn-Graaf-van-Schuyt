import type { ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import * as mock from "./data/mockData";
import { useLocalCollection } from "./hooks/useLocalCollection";
import { AppDataContext, type AppDataContextValue } from "./lib/AppDataContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { paths } from "./routes/paths";
import { AuthPage } from "./pages/AuthPage";
import { BulletinPage } from "./pages/BulletinPage";
import { ContactsPage } from "./pages/ContactsPage";
import { HelpPage } from "./pages/HelpPage";
import { HomePage } from "./pages/HomePage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { UpdatePasswordPage } from "./pages/UpdatePasswordPage";

function AppDataProvider({ children }: { children: ReactNode }) {
  const { configured, loading, passwordRecovery, user, profile } = useAuth();
  const contacts = useLocalCollection(mock.contacts);
  const reports = useLocalCollection(mock.reports);
  const documents = useLocalCollection(mock.knowledgeDocuments);
  const helpRequests = useLocalCollection(mock.helpRequests);
  const bulletinPosts = useLocalCollection(mock.bulletinPosts);

  if (configured && loading) {
    return <LoadingState />;
  }

  if (configured && !user) {
    return <AuthPage />;
  }

  if (configured && passwordRecovery) {
    return <UpdatePasswordPage />;
  }

  const value: AppDataContextValue = {
    profile: profile ?? mock.activeProfile,
    contacts,
    reports,
    documents,
    helpRequests,
    bulletinPosts,
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
    <AuthProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
      </AppDataProvider>
    </AuthProvider>
  );
}
