import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single-line text that ends in an ellipsis once it passes its max width.
 * The full text is exposed as a native tooltip. Set the cap with a `max-w-*`
 * class (default `max-w-56`); it works inside table cells and flex rows.
 */
function Truncate({
  text,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  text: string | null | undefined;
}) {
  return (
    <span
      data-slot="truncate"
      title={text ?? undefined}
      className={cn("block max-w-56 min-w-0 truncate", className)}
      {...props}
    >
      {text}
    </span>
  );
}

export { Truncate };
