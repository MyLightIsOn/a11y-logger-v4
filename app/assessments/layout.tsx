"use client";

import SideBar from "@/components/custom/layout/sidebar";

export default function ProjectsLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <SideBar>{children}</SideBar>;
}
