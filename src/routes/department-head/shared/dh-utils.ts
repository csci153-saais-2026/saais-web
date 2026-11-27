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
] as const;

/**
 * Format an ISO `YYYY-MM-DD` date string without local-timezone drift.
 */
export function formatDisplayDate(
  isoDate: string,
  { padDay = true }: { padDay?: boolean } = {},
): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const [year, monthIndex, day] = parts;
  const month = MONTHS_SHORT[monthIndex - 1];
  if (!month) return isoDate;
  const dayLabel = padDay ? String(day).padStart(2, "0") : String(day);
  return `${dayLabel} ${month} ${year}`;
}

/**
 * Format a start and end `YYYY-MM-DD` pair like `"04 Aug – 19 Dec 2025"`
 * (or include both years when spanning calendar years).
 */
export function formatTermDateRange(startIso: string, endIso: string): string {
  const sParts = startIso.split("-").map(Number);
  const eParts = endIso.split("-").map(Number);
  if (
    sParts.length !== 3 ||
    eParts.length !== 3 ||
    sParts.some(Number.isNaN) ||
    eParts.some(Number.isNaN)
  ) {
    return `${startIso} – ${endIso}`;
  }

  const [sy, sm, sd] = sParts;
  const [ey, em, ed] = eParts;
  const sMonth = MONTHS_SHORT[sm - 1];
  const eMonth = MONTHS_SHORT[em - 1];
  if (!sMonth || !eMonth) return `${startIso} – ${endIso}`;

  const startDay = String(sd).padStart(2, "0");
  const endDay = String(ed).padStart(2, "0");
  if (sy === ey) {
    return `${startDay} ${sMonth} – ${endDay} ${eMonth} ${ey}`;
  }
  return `${startDay} ${sMonth} ${sy} – ${endDay} ${eMonth} ${ey}`;
}

/** Today's calendar date in Philippine time, as YYYY-MM-DD. */
export function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
