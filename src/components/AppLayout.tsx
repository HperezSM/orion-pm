import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
        <AppFooter />
      </div>
    </div>
  );
}
