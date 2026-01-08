import { Outlet } from "react-router-dom";
import { SpaceNavigation } from "./SpaceNavigation";
import { StatusBar } from "./StatusBar";
import { ProfileRefresher } from "@/components/shared/ProfileRefresher";

export function SpaceLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Profile Data Refresher */}
      <ProfileRefresher />

      {/* Top Status Bar */}
      <StatusBar />

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <SpaceNavigation />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto space-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
