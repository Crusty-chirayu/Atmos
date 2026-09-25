import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatHourlyTime,
  formatLocalDate,
  formatLocalTime,
  formatWeekday,
} from "@/lib/weather/utils/date-format";

describe("Timezone Date & Time Formatting Utilities", () => {
  const sampleUtcTimestamp = "2026-09-25T12:00:00Z";

  describe("formatLocalTime", () => {
    it("formats timestamp in UTC", () => {
      const formatted = formatLocalTime(sampleUtcTimestamp, "UTC", {
        hour12: false,
      });
      assert.equal(formatted, "12:00");
    });

    it("converts timestamp to Tokyo local time (UTC+9)", () => {
      const formatted = formatLocalTime(sampleUtcTimestamp, "Asia/Tokyo", {
        hour12: false,
      });
      assert.equal(formatted, "21:00");
    });

    it("converts timestamp to New York local time (EDT: UTC-4)", () => {
      const formatted = formatLocalTime(
        sampleUtcTimestamp,
        "America/New_York",
        {
          hour12: false,
        }
      );
      assert.equal(formatted, "08:00");
    });

    it("handles 12-hour format with AM/PM", () => {
      const formatted = formatLocalTime(sampleUtcTimestamp, "UTC", {
        hour12: true,
      });
      assert.ok(formatted.includes("12:00") && formatted.includes("PM"));
    });

    it("handles invalid timestamp string gracefully without throwing", () => {
      const formatted = formatLocalTime("not-a-valid-date", "UTC");
      assert.equal(formatted, "--:--");
    });
  });

  describe("formatLocalDate", () => {
    it("formats short date string in target timezone", () => {
      const formatted = formatLocalDate("2026-09-25", "UTC", "short");
      assert.ok(formatted.includes("Sep") && formatted.includes("25"));
    });

    it("formats full date with weekday", () => {
      const formatted = formatLocalDate("2026-09-25", "UTC", "long");
      assert.ok(
        formatted.includes("Friday") &&
          formatted.includes("September") &&
          formatted.includes("25")
      );
    });
  });

  describe("formatHourlyTime", () => {
    it("formats 24-hour hour string", () => {
      const formatted = formatHourlyTime("2026-09-25T15:00:00Z", "UTC", false);
      assert.equal(formatted, "15:00");
    });

    it("formats 12-hour hour string", () => {
      const formatted = formatHourlyTime("2026-09-25T15:00:00Z", "UTC", true);
      assert.ok(formatted.includes("3") && formatted.includes("PM"));
    });
  });

  describe("formatWeekday", () => {
    it("returns 'Today' for index 0", () => {
      assert.equal(formatWeekday("2026-09-25", "UTC", 0), "Today");
    });

    it("returns 'Tomorrow' for index 1", () => {
      assert.equal(formatWeekday("2026-09-26", "UTC", 1), "Tomorrow");
    });

    it("returns abbreviated weekday for other days", () => {
      const weekday = formatWeekday("2026-09-25", "UTC", 2);
      assert.equal(weekday, "Fri");
    });
  });
});
