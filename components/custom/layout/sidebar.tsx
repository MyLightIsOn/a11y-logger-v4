"use client";

import Link from "next/link";
import {
  LayoutDashboardIcon,
  FileCheck,
  User,
  Folder,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { LogoutButton } from "@/components/custom/logout-button";
import { useEffect, useState } from "react";

export default function SideBar({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar:collapsed");
      if (saved != null) setCollapsed(saved === "true");
    } catch (e) {
      console.log(e);
      // ignore
    }
  }, []);

  return (
    <div className={"w-full"}>
      <div
        className={
          `grid relative min-h-full ` +
          (collapsed ? "grid-cols-[72px_1fr]" : "grid-cols-[240px_1fr]")
        }
      >
        <nav className="border-r bg-primary-foreground dark:bg-card pt-[65px]">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-controls="nav"
                aria-expanded={!collapsed}
                onClick={() => {
                  localStorage.setItem("sidebar:collapsed", String(!collapsed));
                  setCollapsed(!collapsed);
                }}
                className={`inline-flex ${collapsed ? "justify-center" : "justify-end"} w-full rounded-md px-2 py-1 text-sm text-primary a11y-focus`}
              >
                <div className={"border border-border rounded-sm p-1"}>
                  {collapsed ? (
                    <ChevronRight className={"h-6 w-6"} />
                  ) : (
                    <ChevronLeft className={"h-6 w-6"} />
                  )}
                </div>
                <span className={"sr-only"}>
                  {collapsed ? "Expand" : "Collapse"}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-auto relative">
              <nav
                id={"nav"}
                className={
                  "grid items-start text-sm font-medium " +
                  (collapsed ? "px-1" : "px-4")
                }
              >
                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/dashboard"
                  title="Dashboard"
                >
                  <LayoutDashboardIcon
                    className={collapsed ? "h-6 w-6" : "h-4 w-4"}
                  />
                  <span className={collapsed ? "sr-only" : ""}>Dashboard</span>
                </Link>
                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/projects"
                  title="Projects"
                >
                  <Folder className={collapsed ? "h-6 w-6" : "h-4 w-4"} />
                  <span className={collapsed ? "sr-only" : ""}>Projects</span>
                </Link>
                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/assessments"
                  title="Assessments"
                >
                  <FileCheck className={collapsed ? "h-6 w-6" : "h-4 w-4"} />
                  <span className={collapsed ? "sr-only" : ""}>
                    Assessments
                  </span>
                </Link>

                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/issues"
                  title="Issues"
                >
                  <AlertTriangle
                    className={collapsed ? "h-6 w-6" : "h-4 w-4"}
                  />
                  <span className={collapsed ? "sr-only" : ""}>Issues</span>
                </Link>

                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/vpats"
                  title="VPATs"
                >
                  <ClipboardList
                    className={collapsed ? "h-6 w-6" : "h-4 w-4"}
                  />
                  <span className={collapsed ? "sr-only" : ""}>VPATS</span>
                </Link>

                <Link
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus " +
                    (collapsed ? "justify-center" : "")
                  }
                  href="/account"
                  title="Account"
                >
                  <User className={collapsed ? "h-6 w-6" : "h-4 w-4"} />
                  <span className={collapsed ? "sr-only" : ""}>Account</span>
                </Link>
              </nav>
              <div
                className={
                  "absolute bottom-0 border-t border-[hsl(var(--primary)_/_0.3)] w-full p-2"
                }
              >
                <LogoutButton />
              </div>
            </div>
          </div>
        </nav>
        <main
          id={"main"}
          className="flex flex-col min-h-screen p-4 overflow-auto pt-[65px]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
