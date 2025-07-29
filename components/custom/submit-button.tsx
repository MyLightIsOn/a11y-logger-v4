"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";

function Loader({ text }: { readonly text: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      <p>{text}</p>
    </div>
  );
}

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
