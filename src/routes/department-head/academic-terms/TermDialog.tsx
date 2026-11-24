import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Mockup dialog: 680px wide, title row, body and footer separated by hairlines. */
export function TermDialog({
  title,
  footer,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  footer: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-170">
        <DialogHeader className="border-b border-line-soft px-5 py-4 pr-14 sm:px-6 sm:py-5">
          <DialogTitle className="text-[22px] leading-[1.08] tracking-[-0.01em] sm:text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="p-5 text-sm sm:p-6">{children}</div>
        <DialogFooter className="border-t border-line-soft px-5 py-4 sm:px-6">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
