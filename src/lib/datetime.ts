export const DISPLAY_TZ = "Africa/Lagos";

export function todayInZone(timeZone = DISPLAY_TZ): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

export function formatDateTime(iso: string, timeZone = DISPLAY_TZ): string {
  const formatted = new Date(iso).toLocaleString("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatted} WAT`;
}

export function formatRunStamp(iso: string, timeZone = DISPLAY_TZ): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time} WAT`;
}
