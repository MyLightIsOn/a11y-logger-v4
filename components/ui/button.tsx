import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive over:underline a11y-focus dark:focus:outline-white focus:outline-black focus:bg-black dark:focus:bg-white dark:focus:text-black dark:hover:bg-white dark:hover:text-black",
  {
    variants: {
      variant: {
        default:
          "bg-button-background text-primary-foreground shadow-xs hover:bg-primary focus:bg-primary dark:bg-button-background dark:text-button-foreground dark:hover:bg-white dark:hover:text-black",
        success:
          "border border-success bg-success text-white shadow-xs hover:bg-primary hover:text-white hover:underline focus-visible:ring-destructive/20 dark:focus-visible:ring-success/40 dark:bg-success/60",
        destructive:
          "border border-destructive bg-destructive text-white shadow-xs hover:bg-primary hover:text-white hover:underline focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border shadow-xs hover:bg-primary hover:text-white hover:underline dark:bg-input/30 dark:border-input",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs border dark:bg-transparent",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-6 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
