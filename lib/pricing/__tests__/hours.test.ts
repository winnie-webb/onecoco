import { describe, expect, it } from "vitest";
import { formatHoursToday } from "@/lib/pricing/serviceability";

const PILOT = { mon: [["09:00", "17:00"]], tue: [["09:00", "17:00"]], sun: [["09:00", "17:00"]] };

describe("formatHoursToday", () => {
  it("formats today's window in the beach's timezone", () => {
    // Tue 27 Oct 2026, 14:00 UTC = 09:00 in Jamaica (UTC-5, no DST)
    expect(formatHoursToday(PILOT, new Date("2026-10-27T14:00:00Z"), "America/Jamaica")).toBe("9am–5pm");
  });

  it("uses the local day, not the UTC day", () => {
    // Wed 03:00 UTC is still Tue 22:00 in Jamaica
    expect(formatHoursToday(PILOT, new Date("2026-10-28T03:00:00Z"), "America/Jamaica")).toBe("9am–5pm");
  });

  it("returns null on a day with no delivery", () => {
    // Thu in Jamaica, not in the schedule
    expect(formatHoursToday(PILOT, new Date("2026-10-29T15:00:00Z"), "America/Jamaica")).toBeNull();
  });

  it("returns undefined when no schedule is configured", () => {
    expect(formatHoursToday(null, new Date(), "America/Jamaica")).toBeUndefined();
  });

  it("keeps minutes and joins split windows", () => {
    const hours = { tue: [["08:30", "12:00"], ["13:15", "23:59"]] };
    expect(formatHoursToday(hours, new Date("2026-10-27T14:00:00Z"), "America/Jamaica")).toBe(
      "8:30am–12pm, 1:15pm–11:59pm",
    );
  });

  it("says all day for a 24-hour schedule", () => {
    const hours = { tue: [["00:00", "23:59"]] };
    expect(formatHoursToday(hours, new Date("2026-10-27T14:00:00Z"), "America/Jamaica")).toBe("all day");
  });
});
