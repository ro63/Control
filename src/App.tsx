import { useState } from "react";
import { StoreProvider, useStore } from "./store";
import type { Page } from "./types";
import { Layout } from "./components/Layout";
import { Toasts } from "./components/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ScanPage } from "./pages/Scan";
import { InspectionsPage } from "./pages/Inspections";
import { EquipmentPage } from "./pages/Equipment";
import { ChecklistsPage } from "./pages/Checklists";
import { ReportsPage } from "./pages/Reports";
import { UsersPage } from "./pages/Users";
import { ArchivePage, LogsPage, NotificationsPage } from "./pages/More";

function Shell() {
  const { user } = useStore();
  const [page, setPage] = useState<Page>("dashboard");
  const [scanPre, setScanPre] = useState("");

  if (!user) {
    return (
      <>
        <Login />
        <Toasts />
      </>
    );
  }

  const nav = (p: Page) => {
    if (p !== "scan") setScanPre("");
    setPage(p);
  };
  const goScan = (code: string) => {
    setScanPre(code);
    setPage("scan");
  };

  return (
    <>
      <Layout page={page} setPage={nav}>
        {page === "dashboard" && <Dashboard goScan={goScan} />}
        {page === "scan" && <ScanPage preselect={scanPre} onExit={() => nav("dashboard")} />}
        {page === "inspections" && <InspectionsPage goScan={() => goScan("")} />}
        {page === "equipment" && <EquipmentPage />}
        {page === "checklists" && <ChecklistsPage />}
        {page === "users" && <UsersPage />}
        {page === "reports" && <ReportsPage />}
        {page === "notifications" && <NotificationsPage />}
        {page === "logs" && <LogsPage />}
        {page === "archive" && <ArchivePage />}
      </Layout>
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
