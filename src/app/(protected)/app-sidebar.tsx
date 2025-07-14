"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Plus,
  Presentation,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Button } from "../../components/ui/button";
import useProject from "../../hooks/use-project";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: Bot,
  },
  {
    title: "Meetings",
    url: "/meetings",
    icon: Presentation,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { projects, projectId, setProjectId } = useProject();

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="mt-7 block border-r border-slate-200 sm:block md:block lg:block xl:block dark:border-slate-700"
    >
      <SidebarHeader className="border-b border-slate-200 pb-4 dark:border-slate-700">
        <div className="flex items-center gap-3 px-2">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-2 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          {open && (
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
              Zenoryx
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-slate-600 dark:text-slate-400">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                          {
                            "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:bg-none hover:from-blue-700 hover:to-purple-700":
                              isActive,
                          },
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-slate-600 dark:text-slate-400">
            Your Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {projects?.map((project, idx) => {
                const isSelected = project.id === projectId;
                return (
                  <SidebarMenuItem key={idx}>
                    <SidebarMenuButton asChild>
                      <div
                        onClick={() => setProjectId(project.id)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                          {
                            "bg-slate-100 dark:bg-slate-800": isSelected,
                          },
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all duration-200",
                            {
                              "border-transparent bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg":
                                isSelected,
                              "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300":
                                !isSelected,
                            },
                          )}
                        >
                          {project.name[0]!.toUpperCase()}
                        </div>
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {project.name}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {open && (
                <SidebarMenuItem className="mt-4">
                  <Link href="/create">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start gap-2 rounded-xl border-slate-300 bg-transparent hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  </Link>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
