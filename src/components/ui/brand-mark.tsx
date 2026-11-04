import { cn } from "@/lib/utils"

/** SAAIS logo tile with wordmark and optional portal caption. */
function BrandMark({ caption, className }: { caption?: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img src="/logo-mark.png" alt="" className="size-9 rounded-lg" />
      <span className="flex flex-col leading-tight">
        <b className="font-heading text-lg font-bold tracking-wide">SAAIS</b>
        {caption && (
          <small className="text-[11px] font-semibold tracking-[0.12em] uppercase opacity-70">{caption}</small>
        )}
      </span>
    </span>
  )
}

export { BrandMark }
