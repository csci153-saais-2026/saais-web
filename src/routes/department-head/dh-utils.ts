import { useCallback, useEffect, useRef, useState } from "react"
import { useOutletContext } from "react-router"
import {
  MOCK_DEPARTMENT_NOTIFICATIONS,
  type DepartmentNotificationRecord,
} from "./mock-data"

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export interface DepartmentNotificationsContext {
  notifications: DepartmentNotificationRecord[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

/**
 * Access notification state provided by `DepartmentHeadLayout`, with a local
 * fallback when routes are rendered standalone in isolation/tests.
 */
export function useDepartmentNotifications(): DepartmentNotificationsContext {
  const ctx = useOutletContext<DepartmentNotificationsContext | undefined>()
  const [fallback, setFallback] = useState<DepartmentNotificationRecord[]>(
    MOCK_DEPARTMENT_NOTIFICATIONS
  )

  if (ctx) return ctx

  return {
    notifications: fallback,
    markNotificationRead: (id: string) =>
      setFallback((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      ),
    markAllNotificationsRead: () =>
      setFallback((prev) => prev.map((n) => ({ ...n, unread: false }))),
  }
}

/**
 * Hook returning ephemeral toast state and a trigger helper matching the
 * mockup's non-blocking confirmation toast (`department-head.js`).
 */
export function useDepartmentToast(durationMs = 3200) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showToast = useCallback(
    (nextMessage: string) => {
      clearTimer()
      setMessage(nextMessage)
      timerRef.current = window.setTimeout(() => {
        setMessage(null)
        timerRef.current = null
      }, durationMs)
    },
    [clearTimer, durationMs]
  )

  const dismissToast = useCallback(() => {
    clearTimer()
    setMessage(null)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  return { message, showToast, dismissToast }
}

/**
 * Format an ISO `YYYY-MM-DD` date string without local-timezone drift.
 */
export function formatDisplayDate(
  isoDate: string,
  { padDay = true }: { padDay?: boolean } = {}
): string {
  const parts = isoDate.split("-").map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate
  }
  const [year, monthIndex, day] = parts
  const month = MONTHS_SHORT[monthIndex - 1]
  if (!month) return isoDate
  const dayLabel = padDay ? String(day).padStart(2, "0") : String(day)
  return `${dayLabel} ${month} ${year}`
}

/**
 * Format a start and end `YYYY-MM-DD` pair like `"04 Aug – 19 Dec 2025"`
 * (or include both years when spanning calendar years).
 */
export function formatTermDateRange(startIso: string, endIso: string): string {
  const sParts = startIso.split("-").map(Number)
  const eParts = endIso.split("-").map(Number)
  if (
    sParts.length !== 3 ||
    eParts.length !== 3 ||
    sParts.some(Number.isNaN) ||
    eParts.some(Number.isNaN)
  ) {
    return `${startIso} – ${endIso}`
  }

  const [sy, sm, sd] = sParts
  const [ey, em, ed] = eParts
  const sMonth = MONTHS_SHORT[sm - 1]
  const eMonth = MONTHS_SHORT[em - 1]
  if (!sMonth || !eMonth) return `${startIso} – ${endIso}`

  const startDay = String(sd).padStart(2, "0")
  const endDay = String(ed).padStart(2, "0")
  if (sy === ey) {
    return `${startDay} ${sMonth} – ${endDay} ${eMonth} ${ey}`
  }
  return `${startDay} ${sMonth} ${sy} – ${endDay} ${eMonth} ${ey}`
}
