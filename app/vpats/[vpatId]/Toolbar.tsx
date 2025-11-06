"use client";

import React from "react";

type ToolbarProps = {
  // Optional custom buttons to render. When provided, they replace the default toolbar buttons.
  buttons?: React.ReactNode;
};

function Toolbar({ buttons }: ToolbarProps) {
  console.log(buttons);
  return <div className="flex gap-2">{buttons}</div>;
}

export default Toolbar;
