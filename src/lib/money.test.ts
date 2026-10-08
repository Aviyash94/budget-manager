import { describe, expect, it } from "vitest";
import { centsToInput, formatMUR, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it.each([
    ["123.45", 12345],
    ["0.1", 10],
    ["1,234.5", 123450],
    ["  7 ", 700],
    ["-20", -2000],
    ["0", 0],
    ["-0", 0],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1.", ".5", "--1", "1e3", "9999999999999999999"])(
    "rejects %s",
    (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    },
  );

  it("does not suffer float drift", () => {
    expect(parseMoneyToCents("0.1")! + parseMoneyToCents("0.2")!).toBe(30);
  });
});

describe("formatMUR", () => {
  it("formats with grouping and two decimals", () => {
    expect(formatMUR(123450)).toBe("Rs 1,234.50");
    expect(formatMUR(5)).toBe("Rs 0.05");
    expect(formatMUR(0)).toBe("Rs 0.00");
    expect(formatMUR(100000000)).toBe("Rs 1,000,000.00");
  });

  it("formats negatives", () => {
    expect(formatMUR(-2000)).toBe("-Rs 20.00");
  });

  it("rejects non-integer cents", () => {
    expect(() => formatMUR(10.5)).toThrow();
  });
});

describe("centsToInput", () => {
  it("round-trips through parseMoneyToCents", () => {
    for (const c of [0, 5, 100, 123456, -250]) {
      expect(parseMoneyToCents(centsToInput(c))).toBe(c);
    }
  });
});
