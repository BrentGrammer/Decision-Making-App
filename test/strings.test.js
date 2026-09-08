import { describe, expect, it } from "vitest";
import {
  formatComparison,
  leadResult,
  MISSING_NAMES_RESULT,
  NAME_LENGTH_RESULT,
  TIE_RESULT,
} from "../js/constants/strings.js";
import { KIND } from "../js/scoring.js";

describe("formatComparison", () => {
  it("formats missing names", () => {
    expect(formatComparison({ kind: KIND.missingNames })).toBe(
      MISSING_NAMES_RESULT,
    );
  });

  it("formats a name that is too long", () => {
    expect(formatComparison({ kind: KIND.nameLength })).toBe(
      NAME_LENGTH_RESULT,
    );
  });

  it("formats a tie", () => {
    expect(formatComparison({ kind: KIND.tie })).toBe(TIE_RESULT);
  });

  it("formats a lead", () => {
    expect(
      formatComparison({
        kind: KIND.lead,
        winner: "Stay",
        loser: "Leave",
        points: 4,
      }),
    ).toBe(leadResult("Stay", "Leave", 4));
  });
});
