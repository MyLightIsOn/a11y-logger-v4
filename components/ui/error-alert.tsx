"use client";

import React from "react";

export type ErrorAlertProps = {
  message: string | null | undefined;
  variant?: "banner" | "inline";
  id?: string;
};

/**
 * Standardized error alert component for section-level and top-level errors.
 */
export function ErrorAlert({ message, variant = "inline", id }: ErrorAlertProps) {
  if (!message) return null;
  const classes =
    variant === "banner"
      ? "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
      : "text-sm text-red-700 mb-2";
  return (
    <div className={classes} role="alert" id={id}>
      {message}
    </div>
  );
}

export default ErrorAlert;
