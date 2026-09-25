/**
 * Timezone-aware date and time formatting utilities.
 * Uses standard Intl.DateTimeFormat to strictly respect the target location's timezone.
 */

/**
 * Formats a timestamp into local time for a specific IANA timezone (e.g. "14:30" or "2:30 PM").
 */
export function formatLocalTime(
  timestamp: string | Date,
  timezone = "UTC",
  options: { hour12?: boolean; includeSeconds?: boolean } = {}
): string {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return "--:--";

    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone === "auto" ? "UTC" : timezone,
      hour: "numeric",
      minute: "2-digit",
      second: options.includeSeconds ? "2-digit" : undefined,
      hour12: options.hour12 ?? false,
    }).format(date);
  } catch {
    // Fallback if timezone string is invalid
    return "--:--";
  }
}

/**
 * Formats a timestamp into a friendly local date string (e.g. "Wednesday, September 25" or "Wed, Sep 25").
 */
export function formatLocalDate(
  timestamp: string | Date,
  timezone = "UTC",
  style: "short" | "medium" | "long" = "medium"
): string {
  try {
    // Handle YYYY-MM-DD format specifically by appending midday to prevent UTC timezone offset rollbacks
    let date: Date;
    if (
      typeof timestamp === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(timestamp)
    ) {
      date = new Date(`${timestamp}T12:00:00Z`);
    } else {
      date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    }

    if (isNaN(date.getTime())) return "";

    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone === "auto" ? "UTC" : timezone,
    };

    if (style === "short") {
      dateOptions.month = "short";
      dateOptions.day = "numeric";
    } else if (style === "medium") {
      dateOptions.weekday = "short";
      dateOptions.month = "short";
      dateOptions.day = "numeric";
    } else {
      dateOptions.weekday = "long";
      dateOptions.month = "long";
      dateOptions.day = "numeric";
    }

    return new Intl.DateTimeFormat("en-US", dateOptions).format(date);
  } catch {
    return "";
  }
}

/**
 * Formats an hourly timestamp into concise time display (e.g. "14:00" or "2 PM").
 */
export function formatHourlyTime(
  timestamp: string,
  timezone = "UTC",
  hour12 = false
): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    if (hour12) {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone === "auto" ? "UTC" : timezone,
        hour: "numeric",
        hour12: true,
      }).format(date);
    }

    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone === "auto" ? "UTC" : timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Returns a friendly weekday label ("Today", "Tomorrow", or e.g. "Thu").
 */
export function formatWeekday(
  dateStr: string,
  timezone = "UTC",
  relativeIndex?: number
): string {
  if (relativeIndex === 0) return "Today";
  if (relativeIndex === 1) return "Tomorrow";

  try {
    const date = new Date(`${dateStr}T12:00:00Z`);
    if (isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone === "auto" ? "UTC" : timezone,
      weekday: "short",
    }).format(date);
  } catch {
    return dateStr;
  }
}
