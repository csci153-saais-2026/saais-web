import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * SAAIS icon set. Generated from the SVG sources in src/assets/icons (24px grid, 1.6 stroke,
 * currentColor). Size with Tailwind (`size-4`); icons are decorative (aria-hidden) by default.
 */
export type IconProps = React.ComponentProps<"svg">
export type IconComponent = (props: IconProps) => React.JSX.Element

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/>
    </svg>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10"/>
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 20V10M12 20V4M19 20v-7"/>
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7"/>
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>
    </svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 21V4M6 5h11l-2 4 2 4H6"/>
    </svg>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>
    </svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>
    </svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>
    </svg>
  )
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h14l-3-3M20 16H6l3 3"/>
    </svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 4-6.5 8-6.5s7.3 2 8 6.5"/>
    </svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 4-6.5 8-6.5s7.3 2 8 6.5"/>
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  )
}

/** Rotated variants of the chevron. */
export function ChevronUpIcon({ className, ...props }: IconProps) {
  return <ChevronDownIcon className={cn("rotate-180", className)} {...props} />
}

export function ChevronRightIcon({ className, ...props }: IconProps) {
  return <ChevronDownIcon className={cn("-rotate-90", className)} {...props} />
}

/** Horizontal ellipsis (three dots), used for collapsed breadcrumbs. */
export function EllipsisIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  )
}
