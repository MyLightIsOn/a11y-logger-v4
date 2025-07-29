"use client";

import Link from "next/link";
import {
  LayoutDashboardIcon,
  FileCheck,
  User,
  LogOut,
  Folder,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/data/actions/auth-actions";

export default function SideBar({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] relative min-h-full">
      <nav className="border-r bg-primary-foreground dark:bg-card">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex-1 overflow-auto py-2 relative">
            <nav
              id={"nav"}
              className="grid items-start px-4 text-sm font-medium pt-4"
            >
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                href="/dashboard"
              >
                <LayoutDashboardIcon className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                href="/projects"
              >
                <Folder className="h-4 w-4" />
                Projects
              </Link>
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                href="/assessments"
              >
                <FileCheck className="h-4 w-4" />
                Assessments
              </Link>

              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                href="/issues"
              >
                <AlertTriangle className="h-4 w-4" />
                Issues
              </Link>

              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                href="/account"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
            </nav>
            <div
              className={
                "absolute bottom-0 border-t border-[hsl(var(--primary)_/_0.3)] w-full p-2"
              }
            >
              <Button
                variant={"ghost"}
                className="flex gap-3 w-fit rounded-lg px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-gray-50 a11y-focus"
                onClick={() => logoutAction()}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main
        id={"main"}
        className="flex flex-col min-h-screen p-4 overflow-auto"
      >
        {children}
      </main>
    </div>
  );
}
