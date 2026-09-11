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
    expect(formatComparison({ kind: KIND.missingNames })).toEqual([
      MISSING_NAMES_RESULT,
    ]);
  });

  it("formats a name that is too long", () => {
    expect(formatComparison({ kind: KIND.nameLength })).toEqual([
      NAME_LENGTH_RESULT,
    ]);
  });

  it("formats a tie", () => {
    expect(formatComparison({ kind: KIND.tie })).toEqual([TIE_RESULT]);
  });

  it("formats a lead", () => {
    expect(
      formatComparison({
        kind: KIND.lead,
        winner: "Stay",
        loser: "Leave",
        points: 4,
        marginPercent: 29,
      }),
    ).toEqual([leadResult("Stay", "Leave", 4, 29)]);
  });

  it("states the margin as a share of the weight entered, not as being better", () => {
    const [verdict] = formatComparison({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 7,
      marginPercent: 23,
    });

    expect(verdict).toContain("23%");
    expect(verdict).not.toContain("better");
  });
});
