import { useState } from "react";
import { Link } from "react-router";
import { MenuIcon } from "@/components/icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LEFT_LINKS, NAV_RIGHT_LINKS } from "@/routes/landing/landingData";

export interface LandingHeaderProps {
  onRequestWalkthrough?: () => void;
}

export function LandingHeader({ onRequestWalkthrough }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleWalkthrough = () => {
    setMobileOpen(false);
    if (onRequestWalkthrough) {
      onRequestWalkthrough();
      return;
    }
    const target = document.getElementById("walkthrough");
    target?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 py-4 md:px-14 md:py-5">
        <div className="flex items-center gap-10">
          <Link
            to="/"
            aria-label="SAAIS home"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BrandMark className="text-foreground" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV_LEFT_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-sm text-[14.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_RIGHT_LINKS.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                to={item.href}
                className="rounded-sm text-[14.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="rounded-sm text-[14.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {item.label}
              </a>
            ),
          )}

          <Link
            to="/login"
            className="rounded-sm text-[14.5px] font-semibold text-primary transition-colors hover:text-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Sign in
          </Link>

          <Button
            type="button"
            size="sm"
            onClick={handleWalkthrough}
            className="rounded-lg px-[18px] py-[9px] text-[13.5px]"
          >
            Request a walkthrough
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open navigation menu"
                className="size-11 rounded-lg"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card p-0">
              <SheetHeader className="border-b border-border px-6 py-5 text-left">
                <SheetTitle>
                  <BrandMark className="text-foreground" />
                </SheetTitle>
              </SheetHeader>

              <nav
                aria-label="Mobile navigation"
                className="flex flex-col gap-1 px-4 py-4"
              >
                {[...NAV_LEFT_LINKS, ...NAV_RIGHT_LINKS].map((item) =>
                  item.href.startsWith("/") ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {item.label}
                    </a>
                  ),
                )}

                <div className="my-3 border-t border-line-soft" />

                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Sign in
                </Link>

                <Button
                  type="button"
                  onClick={handleWalkthrough}
                  className="mt-2 min-h-11 w-full rounded-lg"
                >
                  Request a walkthrough
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
