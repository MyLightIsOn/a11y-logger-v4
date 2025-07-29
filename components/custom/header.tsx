import React from "react";
import { Logo } from "@/components/custom/logo";
import { LightDarkToggle } from "@/components/custom/light-dark-toggle";

function Header() {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-primary shadow-md dark:bg-card border-b dark:border-border relative z-10">
      <Logo text="A11y Bug Logger" />
      <div className="flex items-center gap-4">
        <LightDarkToggle />
      </div>
    </div>
  );
}

export default Header;
