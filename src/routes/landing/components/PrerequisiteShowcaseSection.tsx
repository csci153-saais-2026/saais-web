import { AlertIcon, ChevronRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/kicker";
import { PREREQUISITE_ENGINE_SECTION } from "@/routes/landing/landingData";

export function PrerequisiteShowcaseSection() {
  return (
    <section className="bg-background px-4 py-20 sm:px-8 md:py-[112px] lg:px-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[900px] text-center">
          <Kicker className="text-gold-deep">
            {PREREQUISITE_ENGINE_SECTION.kicker}
          </Kicker>
          <h2 className="mx-auto mt-4 max-w-[26ch] text-center font-heading text-[32px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground md:text-[40px]">
            {PREREQUISITE_ENGINE_SECTION.title}
          </h2>
          <p className="mx-auto mt-[18px] max-w-[62ch] text-[17.5px] leading-[1.6] text-muted-foreground">
            {PREREQUISITE_ENGINE_SECTION.subhead}
          </p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-md bg-forest-deep p-6 sm:p-10 md:p-14">
          <div
            className="pointer-events-none absolute -right-[160px] -bottom-[200px] size-[560px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, rgba(224,168,46,0.16), rgba(224,168,46,0) 64%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-[900px]">
            <div className="overflow-hidden rounded-md bg-card shadow-[0_24px_60px_rgba(15,26,6,0.28)]">
              <div className="border-b border-border px-6 py-6 md:px-7 md:py-[26px]">
                <div className="flex items-center gap-2.5 text-status-inc">
                  <AlertIcon className="size-5 shrink-0" />
                  <h3 className="font-heading text-[20px] leading-[1.06] font-bold tracking-[-0.01em] text-foreground">
                    {PREREQUISITE_ENGINE_SECTION.dialogTitle}
                  </h3>
                </div>

                <p className="mt-3 max-w-[74ch] text-sm leading-[1.6] text-muted-foreground">
                  <strong className="font-semibold text-foreground">
                    {PREREQUISITE_ENGINE_SECTION.dialogStudent}
                  </strong>{" "}
                  has not passed{" "}
                  <span className="font-mono text-[13px] font-medium text-foreground">
                    {PREREQUISITE_ENGINE_SECTION.dialogMissingCourse}
                  </span>
                  , a strict prerequisite of{" "}
                  <span className="font-mono text-[13px] font-medium text-foreground">
                    {PREREQUISITE_ENGINE_SECTION.dialogTargetCourse}
                  </span>
                  . Continuing records the attempt with{" "}
                  <strong className="font-semibold text-foreground">
                    prerequisite_override = true
                  </strong>{" "}
                  and writes an audit entry under your name.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 bg-background px-6 py-4 md:px-7">
                <div className="text-[12.5px] text-muted-2">
                  {PREREQUISITE_ENGINE_SECTION.dialogAuditLine}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-border bg-card px-[18px] py-[9px] text-[13.5px] font-semibold text-foreground"
                  >
                    {PREREQUISITE_ENGINE_SECTION.dialogCancelLabel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg border border-gold bg-gold px-[18px] py-[9px] text-[13.5px] font-semibold text-gold-foreground hover:bg-gold/90"
                  >
                    {PREREQUISITE_ENGINE_SECTION.dialogContinueLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[34px] flex justify-center">
          <a
            href={PREREQUISITE_ENGINE_SECTION.linkHref}
            className="inline-flex items-center gap-[7px] rounded-sm text-[14.5px] font-semibold text-primary transition-colors hover:text-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {PREREQUISITE_ENGINE_SECTION.linkLabel}
            <ChevronRightIcon className="size-[15px]" />
          </a>
        </div>
      </div>
    </section>
  );
}
