import type { VariantProps } from "class-variance-authority";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-transparent text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none select-none motion-safe:hover:-translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_22px_-16px_rgba(0,82,255,0.78)] hover:bg-primary/92 hover:shadow-[0_14px_26px_-18px_rgba(0,82,255,0.62)]",
        outline:
          "border-border bg-card text-foreground shadow-sm hover:bg-muted/55 hover:shadow-[0_12px_24px_-20px_rgba(7,41,88,0.34)]",
        secondary:
          "border-border/60 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/88 hover:shadow-[0_12px_24px_-20px_rgba(7,41,88,0.3)]",
        ghost:
          "hover:bg-muted/70 hover:text-foreground hover:shadow-[0_10px_18px_-18px_rgba(7,41,88,0.28)]",
        destructive:
          "bg-destructive text-white shadow-[0_10px_22px_-16px_rgba(220,38,38,0.72)] hover:bg-destructive/90 hover:shadow-[0_14px_26px_-18px_rgba(220,38,38,0.6)] focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-lg",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-lg",
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
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
