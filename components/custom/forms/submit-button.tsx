"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Loader from "@/components/custom/layout/loader";
import React from "react";

interface SubmitButtonProps {
  text: string;
  loadingText: string;
  className?: string;
  loading?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  isLoading?: boolean;
  form?: string;
}

export function SubmitButton({
  text,
  loadingText,
  className,
  onClick,
  isLoading,
  form,
}: Readonly<SubmitButtonProps>) {
  return (
    <Button
      form={form}
      type="submit"
      aria-disabled={isLoading}
      disabled={isLoading}
      className={cn(className)}
      onClick={onClick}
    >
      {isLoading ? <Loader text={loadingText} /> : text}
    </Button>
  );
}
