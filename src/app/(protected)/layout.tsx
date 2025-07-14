import { SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import type React from "react";
import { AppSidebar } from "@/app/(protected)/app-sidebar";

type Props = {
  children: React.ReactNode;
};

const SidebarLayout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex min-h-screen flex-1 flex-col bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-lg dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "w-10 h-10 rounded-xl shadow-lg border-2 border-white dark:border-slate-700",
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
