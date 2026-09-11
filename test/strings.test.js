import { describe, expect, it } from "vitest";
import {
  contributorsBlock,
  formatComparison,
  inFavorOf,
  leadResult,
  RESULT_BLOCK,
  TIE_RESULT,
} from "../js/constants/strings.js";
import { CONSIDERATION_TYPE, KIND } from "../js/scoring.js";

const stableTeam = {
  text: "Stable team",
  rating: 10,
  option: "Stay",
  type: CONSIDERATION_TYPE.pro,
};
const longCommute = {
  text: "Long commute",
  rating: 8,
  option: "Leave",
  type: CONSIDERATION_TYPE.con,
};
const higherSalary = {
  text: "Higher salary",
  rating: 9,
  option: "Leave",
  type: CONSIDERATION_TYPE.pro,
};
const smallFlat = {
  text: "Small flat",
  rating: 4,
  option: "Stay",
  type: CONSIDERATION_TYPE.con,
};

describe("formatComparison", () => {
  it("formats a tie as a single line", () => {
    expect(formatComparison({ kind: KIND.tie })).toEqual([
      { kind: RESULT_BLOCK.line, text: TIE_RESULT },
    ]);
  });

  it("formats a lead as a verdict line and a table of contributors", () => {
    const contributors = { toward: [stableTeam], against: [] };

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
      { kind: RESULT_BLOCK.line, text: leadResult("Stay", "Leave", 4, 29) },
      contributorsBlock("Stay", "Leave", contributors),
    ]);
  });

  it("names the winner as the better decision", () => {
    const [verdict] = formatComparison({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 7,
      marginPercent: 23,
      contributors: { toward: [stableTeam], against: [] },
    });

    expect(verdict.text).toContain("Stay is better than Leave");
  });

  it("never attaches the margin percent to the claim of being better", () => {
    const [verdict] = formatComparison({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 7,
      marginPercent: 23,
      contributors: { toward: [stableTeam], against: [] },
    });

    expect(verdict.text).toContain("23%");
    expect(verdict.text).toContain("of all points entered");
    for (const sentence of verdict.text.split(". ")) {
      expect(
        sentence.includes("better") && sentence.includes("%"),
      ).toBe(false);
    }
  });

  it("formats a disqualified option as a single line", () => {
    const blocks = formatComparison({
      kind: KIND.disqualified,
      winner: "Stay",
      loser: "Leave",
      dealbreakers: [{ text: "Sell the car", rating: 10 }],
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe(RESULT_BLOCK.line);
    expect(blocks[0].text).toContain("Stay");
    expect(blocks[0].text).toContain("Leave");
    expect(blocks[0].text).toContain("Sell the car");
  });

  it("names every con that ruled the option out", () => {
    const [block] = formatComparison({
      kind: KIND.disqualified,
      winner: "Stay",
      loser: "Leave",
      dealbreakers: [
        { text: "Sell the car", rating: 10 },
        { text: "Long lease", rating: 10 },
      ],
    });

    expect(block.text).toContain("Sell the car");
    expect(block.text).toContain("Long lease");
  });

  it("reports no margin or point lead for a disqualified option", () => {
    const [block] = formatComparison({
      kind: KIND.disqualified,
      winner: "Stay",
      loser: "Leave",
      dealbreakers: [{ text: "Sell the car", rating: 10 }],
    });

    expect(block.text).not.toContain("%");
    expect(block.text).not.toContain("points");
  });
});

describe("the contributors table", () => {
  it("groups the rows in favor of the winner under the winner's own heading", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [stableTeam, longCommute],
      against: [],
    });

    expect(block.groups).toHaveLength(1);
    expect(block.groups[0].heading).toBe(inFavorOf("Stay"));
    expect(block.groups[0].rows).toEqual([stableTeam, longCommute]);
  });

  it("heads both groups the same way, one per decision", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [stableTeam],
      against: [higherSalary],
    });

    expect(block.groups.map((group) => group.heading)).toEqual([
      inFavorOf("Stay"),
      inFavorOf("Leave"),
    ]);
  });

  it("puts the rows in favor of the loser in the loser's group", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [stableTeam],
      against: [higherSalary, smallFlat],
    });

    expect(block.groups[1].rows).toEqual([higherSalary, smallFlat]);
  });

  it("leaves out the loser's group when nothing favours the loser", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [stableTeam],
      against: [],
    });

    expect(block.groups.map((group) => group.heading)).toEqual([
      inFavorOf("Stay"),
    ]);
  });

  it("keeps each row's decision, type, text and the rating the user gave", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [longCommute],
      against: [],
    });

    expect(block.groups[0].rows[0]).toEqual({
      text: "Long commute",
      rating: 8,
      option: "Leave",
      type: CONSIDERATION_TYPE.con,
    });
  });

  it("keeps the strongest row first within a group", () => {
    const block = contributorsBlock("Stay", "Leave", {
      toward: [stableTeam, longCommute, smallFlat],
      against: [],
    });

    expect(block.groups[0].rows.map((row) => row.text)).toEqual([
      "Stable team",
      "Long commute",
      "Small flat",
    ]);
  });
});
