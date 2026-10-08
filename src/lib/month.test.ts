import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonth,
  formatDayLabel,
  formatMonthLabel,
  isMonth,
  monthRange,
  todayLocal,
} from "./month";

describe("month helpers", () => {
  it("validates months", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 0)).toBe("2026-10");
  });

  it("builds half-open ranges", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", endExclusive: "2026-11-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", endExclusive: "2027-01-01" });
  });

  it("uses Mauritius time (UTC+4) for the current month", () => {
    // 20:00 UTC on Oct 31 is already Nov 1 in Mauritius
    const instant = new Date("2026-10-31T20:00:00Z");
    expect(todayLocal(instant)).toBe("2026-11-01");
    expect(currentMonth(instant)).toBe("2026-11");
    expect(currentMonth(new Date("2026-10-31T19:59:00Z"))).toBe("2026-10");
  });

  it("formats labels without shifting the date", () => {
    expect(formatMonthLabel("2026-10")).toBe("October 2026");
    expect(formatDayLabel("2026-10-07")).toBe("Wed 7 Oct");
    expect(formatDayLabel("2026-12-31")).toBe("Thu 31 Dec");
  });
});
