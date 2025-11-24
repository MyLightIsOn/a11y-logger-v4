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
  const [hovered, setHovered] = useState<boolean>(false);
  const [focusWithin, setFocusWithin] = useState<boolean>(false);

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

  // When the sidebar is set to collapsed, allow temporary expansion on hover or focus within
  const isInteracting = hovered || focusWithin;
  const effectiveCollapsed = collapsed && !isInteracting;

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
    <div className={"w-full relative min-h-screen"}>
      {/* Overlay sidebar: positioned on top of content, does not shift layout */}
      <nav
        className={
          (effectiveCollapsed ? "w-[72px]" : "w-[240px]") +
          " fixed left-0 top-0 bottom-0 z-10 border-r bg-primary-foreground dark:bg-card pt-[65px] transition-all duration-200"
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(e) => {
          // Only clear when focus leaves the entire nav, not when moving between children
          const current = e.currentTarget as HTMLElement;
          const next = e.relatedTarget as Node | null;
          if (!next || !current.contains(next)) {
            setFocusWithin(false);
          }
        }}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex-1 overflow-visible relative pt-10">
            <nav
              id={"nav"}
              className={
                "grid items-start text-sm font-medium" +
                (effectiveCollapsed ? " px-1" : " px-4")
              }
            >
              {navItems.map(({ href, title, label, Icon }) => (
                <Link
                  key={href}
                  className={
                    linkBaseClass + (effectiveCollapsed ? "justify-center" : "")
                  }
                  href={href}
                  title={title}
                >
                  <Icon
                    className={effectiveCollapsed ? "h-6 w-6" : "h-4 w-4"}
                  />
                  <span className={effectiveCollapsed ? "sr-only" : ""}>
                    {label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </nav>

      {/* Main content takes full width; sidebar overlays it */}
      <main
        id={"main"}
        className="flex flex-col min-h-screen p-4 overflow-auto pt-[65px]"
      >
        {children}
      </main>
    </div>
  );
}
