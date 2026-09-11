import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOAD_ERROR } from "../js/constants/strings.js";
import { loadApp } from "./loadApp.js";

const MAX_FILE_SIZE = 1_000_000;

function selectSavedDecisions(saved, size = JSON.stringify(saved).length) {
    const input = document.getElementById("load-decisions-file");
    Object.defineProperty(input, "files", {
        configurable: true,
        value: [
            {
                size,
                text: () => Promise.resolve(JSON.stringify(saved)),
            },
        ],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("loading saved decisions", () => {
    beforeEach(() => {
        loadApp();
    });

    it("announces a successful load to assistive technology", async () => {
        selectSavedDecisions(
            {
                format: "decision-making-app-saved-decisions",
                version: 1,
                model: "squared",
                decisions: [
                    {
                        name: "Stay",
                        pros: [{ text: "Good team", rating: 8 }],
                        cons: [{ text: "Long commute", rating: 4 }],
                    },
                    {
                        name: "Leave",
                        pros: [{ text: "New challenge", rating: 7 }],
                        cons: [{ text: "", rating: 0 }],
                    },
                ],
            },
            MAX_FILE_SIZE,
        );

        await vi.waitFor(() => {
            const announcement = document.querySelector('[role="status"]');
            expect(announcement).not.toBeNull();
            expect(announcement.textContent.trim()).not.toBe("");
        });
    });

    it("rejects an oversized file with an accessible error", async () => {
        const currentName = document.getElementById("A");
        currentName.value = "Keep this decision";

        selectSavedDecisions(
            {
                format: "decision-making-app-saved-decisions",
                version: 1,
                model: "squared",
                decisions: [
                    {
                        name: "Replacement A",
                        pros: [{ text: "Pro", rating: 1 }],
                        cons: [{ text: "Con", rating: 1 }],
                    },
                    {
                        name: "Replacement B",
                        pros: [{ text: "Pro", rating: 1 }],
                        cons: [{ text: "Con", rating: 1 }],
                    },
                ],
            },
            MAX_FILE_SIZE + 1,
        );

        await vi.waitFor(() => {
            const error = document.querySelector('[role="alert"]');
            expect(error.hidden).toBe(false);
            expect(error.textContent).toBe(LOAD_ERROR);
            expect(currentName.value).toBe("Keep this decision");
        });
    });
});
