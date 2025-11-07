"use client";

import React from "react";

type ButtonToolbarProps = {
  buttons?: React.ReactNode;
};

function ButtonToolbar({ buttons }: ButtonToolbarProps) {
  return <div className="flex gap-2 justify-end">{buttons}</div>;
}

export default ButtonToolbar;
