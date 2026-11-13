import { FlagIcon, GridIcon, PencilIcon, UploadIcon, UsersIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const adviserNav: NavSection = {
  title: "Adviser",
  items: [
    { label: "Dashboard", href: "/adviser/dashboard", icon: GridIcon },
    { label: "Advisees", href: "/adviser/advisees", icon: UsersIcon },
    { label: "Encode grades", href: "/adviser/encode-grades", icon: PencilIcon },
    { label: "Import grades", href: "/adviser/import-grades", icon: UploadIcon },
    { label: "Grade flags", href: "/adviser/grade-flags", icon: FlagIcon },
  ],
}
