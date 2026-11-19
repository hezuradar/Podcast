import { describe, expect, test } from "vitest";
import { formatDuration, formatRelative } from "./format";

describe("formatDuration", () => {
  test("minutes and seconds under an hour", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
  });

  test("hours when needed", () => {
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });

  test("negative or invalid values show zero", () => {
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-19T12:00:00Z");

  test("recent times read as relative Spanish text", () => {
    expect(formatRelative("2026-11-19T11:58:00Z", now)).toBe("hace 2 minutos");
    expect(formatRelative("2026-11-18T12:00:00Z", now)).toBe("ayer");
  });

  test("an invalid date reads as unknown", () => {
    expect(formatRelative("not a date", now)).toBe("fecha desconocida");
  });
});
