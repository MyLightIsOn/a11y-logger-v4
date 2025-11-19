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
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

  const linkBaseClass =
    "flex items-center gap-3 px-3 py-2 text-primary transition-all hover:underline dark:text-gray-400 dark:hover:text-black dark:hover:bg-white dark:focus:text-black dark:focus:bg-white hover:bg-black hover:text-white ";
  const navItems = [
    {
      href: "/dashboard",
      title: "Dashboard",
      label: "Dashboard",
      Icon: LayoutDashboardIcon,
    },
    { href: "/projects", title: "Projects", label: "Projects", Icon: Folder },
    {
      href: "/assessments",
      title: "Assessments",
      label: "Assessments",
      Icon: FileCheck,
    },
    { href: "/issues", title: "Issues", label: "Issues", Icon: AlertTriangle },
    { href: "/account", title: "Account", label: "Account", Icon: User },
  ];

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
            <div className="flex items-center justify-end px-2 bg-transparent">
              <Button
                variant={"outline"}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-controls="nav"
                aria-expanded={!collapsed}
                className={"h-10 w-10 min-w-[10px] p-0 relative right-2"}
                onClick={() => {
                  localStorage.setItem("sidebar:collapsed", String(!collapsed));
                  setCollapsed(!collapsed);
                }}
              >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}{" "}
                <span className={"sr-only"}>
                  {collapsed ? "Expand" : "Collapse"}
                </span>
              </Button>
            </div>

            <div className="flex-1 overflow-visible relative">
              <nav
                id={"nav"}
                className={
                  "grid items-start text-sm font-medium" +
                  (collapsed ? "px-1" : "px-4")
                }
              >
                {navItems.map(({ href, title, label, Icon }) => (
                  <Link
                    key={href}
                    className={
                      linkBaseClass + (collapsed ? "justify-center" : "")
                    }
                    href={href}
                    title={title}
                  >
                    <Icon className={collapsed ? "h-6 w-6" : "h-4 w-4"} />
                    <span className={collapsed ? "sr-only" : ""}>{label}</span>
                  </Link>
                ))}
              </nav>
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
