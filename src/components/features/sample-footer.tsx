import type * as React from "react"

/** Muted note under page content, e.g. "Sample records for presentation · Reference date: …". */
function SampleFooter({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-xs text-muted-2">{children}</p>
}

export { SampleFooter }
