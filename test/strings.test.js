import { describe, expect, it } from "vitest";
import {
  contributorsResult,
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
    const contributors = {
      toward: [{ text: "near family", rating: 10, option: "Stay" }],
      against: [],
    };

    expect(
      formatComparison({
        kind: KIND.lead,
        winner: "Stay",
        loser: "Leave",
        points: 4,
        marginPercent: 29,
        contributors,
      }),
    ).toEqual([
      leadResult("Stay", "Leave", 4, 29),
      contributorsResult("Stay", "Leave", contributors),
    ]);
  });

  it("says which rows drove the result on a line of its own", () => {
    const lines = formatComparison({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 7,
      marginPercent: 23,
      contributors: {
        toward: [
          { text: "near family", rating: 10, option: "Stay" },
          { text: "long commute", rating: 8, option: "Leave" },
        ],
        against: [{ text: "higher salary", rating: 9, option: "Leave" }],
      },
    });

    expect(lines).toHaveLength(2);
    for (const text of ["near family", "long commute", "higher salary"]) {
      expect(lines[1]).toContain(text);
    }
  });

  it("attributes a row to the option it belongs to", () => {
    const line = contributorsResult("Stay", "Leave", {
      toward: [{ text: "long commute", rating: 8, option: "Leave" }],
      against: [],
    });

    expect(line.indexOf("Leave")).toBeLessThan(line.indexOf("long commute"));
  });

  it("reports the ratings the user gave, not the model's weights", () => {
    const line = contributorsResult("Stay", "Leave", {
      toward: [{ text: "near family", rating: 10, option: "Stay" }],
      against: [],
    });

    expect(line).toContain("10");
    expect(line).not.toContain("100");
  });

  it("names every row it is given, strongest first", () => {
    const line = contributorsResult("Stay", "Leave", {
      toward: [
        { text: "near family", rating: 10, option: "Stay" },
        { text: "cheap rent", rating: 9, option: "Stay" },
        { text: "long commute", rating: 8, option: "Leave" },
      ],
      against: [],
    });

    expect(line.indexOf("near family")).toBeLessThan(line.indexOf("cheap rent"));
    expect(line.indexOf("cheap rent")).toBeLessThan(line.indexOf("long commute"));
  });

  it("reports the rows pulling the other way after the rows behind the winner", () => {
    const line = contributorsResult("Stay", "Leave", {
      toward: [{ text: "near family", rating: 10, option: "Stay" }],
      against: [
        { text: "higher salary", rating: 9, option: "Leave" },
        { text: "new city", rating: 7, option: "Leave" },
      ],
    });

    expect(line.indexOf("near family")).toBeLessThan(
      line.indexOf("higher salary"),
    );
    expect(line.indexOf("higher salary")).toBeLessThan(line.indexOf("new city"));
  });

  it("drops the in-favor clause when nothing favours the loser", () => {
    const toward = [{ text: "near family", rating: 10, option: "Stay" }];
    const against = [{ text: "higher salary", rating: 9, option: "Leave" }];

    const withOpposition = contributorsResult("Stay", "Leave", {
      toward,
      against,
    });
    const withoutOpposition = contributorsResult("Stay", "Leave", {
      toward,
      against: [],
    });

    expect(withOpposition).toContain("higher salary");
    expect(withoutOpposition).not.toContain("higher salary");
    expect(withoutOpposition.trim()).toMatch(/\.$/);
  });

  it("states the margin as a share of the weight entered, not as being better", () => {
    const [verdict] = formatComparison({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 7,
      marginPercent: 23,
      contributors: {
        toward: [{ text: "near family", rating: 10, option: "Stay" }],
        against: [],
      },
    });

    expect(verdict).toContain("23%");
    expect(verdict).not.toContain("better");
  });
});
