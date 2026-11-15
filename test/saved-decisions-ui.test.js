import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE_SAVED_DECISION_LABEL,
    LOAD_ERROR,
    LOAD_LABEL,
    LOAD_SUCCESS,
    REPLACE_CONFIRMATION,
    SAVED_DECISIONS_DIALOG_TITLE,
    SAVED_DECISIONS_EMPTY,
    SAVE_LABEL,
    SAVE_SUCCESS,
    SIGN_IN_WITH_GOOGLE_LABEL,
    SIGN_OUT_LABEL,
} from "../js/constants/strings.js";
import { enterConsideration, loadApp, setDecisionNames } from "./loadApp.js";

const MAX_FILE_SIZE = 1_000_000;

function sampleSavedPayload(nameA = "Stay", nameB = "Leave") {
    return {
        format: "decision-making-app-saved-decisions",
        version: 1,
        model: "squared",
        decisions: [
            {
                name: nameA,
                pros: [{ text: "Good team", rating: 8 }],
                cons: [{ text: "Long commute", rating: 4 }],
            },
            {
                name: nameB,
                pros: [{ text: "New challenge", rating: 7 }],
                cons: [{ text: "", rating: 0 }],
            },
        ],
    };
}

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

describe("loading saved decisions (signed out file fallback)", () => {
    beforeEach(() => {
        loadApp();
    });

    it("shows Sign in with Google in the app bar when signed out", () => {
        const signInLink = document.getElementById("sign-in-google");
        const signOutButton = document.getElementById("sign-out");

        expect(signInLink.textContent).toBe(SIGN_IN_WITH_GOOGLE_LABEL);
        expect(signInLink.getAttribute("href")).toBe("/api/auth/google");
        expect(signInLink.hidden).toBe(false);
        expect(signOutButton.hidden).toBe(true);
    });

    it("announces a successful load to assistive technology", async () => {
        selectSavedDecisions(sampleSavedPayload(), MAX_FILE_SIZE);

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
            sampleSavedPayload("Replacement A", "Replacement B"),
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

describe("cloud saved decisions when signed in", () => {
    function createMockStore(overrides = {}) {
        return {
            getUser: vi.fn().mockResolvedValue({
                id: "user-1",
                email: "alex@example.com",
                name: "Alex Rivera",
            }),
            logout: vi.fn().mockResolvedValue(),
            list: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(sampleSavedPayload()),
            save: vi.fn().mockResolvedValue({
                id: "dec-1",
                title: "Stay vs. Leave",
            }),
            remove: vi.fn().mockResolvedValue(),
            ...overrides,
        };
    }

    it("shows the signed-in user and signs out when Sign out is clicked", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        const signInLink = document.getElementById("sign-in-google");
        const signedInUser = document.getElementById("signed-in-user");
        const signOutButton = document.getElementById("sign-out");

        await vi.waitFor(() => {
            expect(signInLink.hidden).toBe(true);
            expect(signedInUser.hidden).toBe(false);
            expect(signedInUser.textContent).toBe("Alex Rivera");
            expect(signOutButton.hidden).toBe(false);
            expect(signOutButton.textContent).toBe(SIGN_OUT_LABEL);
        });

        signOutButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.logout).toHaveBeenCalledTimes(1);
            expect(signInLink.hidden).toBe(false);
            expect(signedInUser.hidden).toBe(true);
            expect(signOutButton.hidden).toBe(true);
        });
    });

    it("saves the decision table to the cloud store and updates the same record on subsequent saves", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(document.getElementById("sign-out").hidden).toBe(false);
        });

        setDecisionNames("Stay", "Leave");
        enterConsideration("prosA", 0, "Good team", 8);

        const saveButton = [...document.querySelectorAll("button")].find(
            (button) => button.textContent === SAVE_LABEL,
        );
        saveButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.save).toHaveBeenCalledTimes(1);
            expect(
                document.getElementById("load-decisions-status").textContent,
            ).toBe(SAVE_SUCCESS);
        });
        const [firstJson, firstId] = decisionsStore.save.mock.calls[0];
        expect(firstId).toBeNull();
        expect(JSON.parse(firstJson).decisions[0].name).toBe("Stay");

        setDecisionNames("Stay Here", "Leave");
        saveButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.save).toHaveBeenCalledTimes(2);
        });
        const [, secondId] = decisionsStore.save.mock.calls[1];
        expect(secondId).toBe("dec-1");
    });

    it("opens the saved decisions dialog on Load, loads a chosen comparison, and deletes comparisons", async () => {
        const decisionsStore = createMockStore({
            list: vi.fn().mockResolvedValue([
                {
                    id: "dec-1",
                    title: "Stay vs. Leave",
                    updated_at: "2026-11-15T10:00:00Z",
                },
                {
                    id: "dec-2",
                    title: "Buy vs. Rent",
                    updated_at: "2026-11-14T10:00:00Z",
                },
            ]),
            get: vi.fn().mockResolvedValue(sampleSavedPayload("Stay", "Leave")),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(document.getElementById("sign-out").hidden).toBe(false);
        });

        const loadButton = [...document.querySelectorAll("button")].find(
            (button) => button.textContent === LOAD_LABEL,
        );
        loadButton.click();

        const dialog = document.getElementById("saved-decisions-dialog");
        await vi.waitFor(() => {
            expect(dialog.open).toBe(true);
            expect(
                dialog.querySelector(".dialog-title").textContent,
            ).toBe(SAVED_DECISIONS_DIALOG_TITLE);
            expect(
                dialog.querySelectorAll(".saved-decision-item"),
            ).toHaveLength(2);
        });

        const items = dialog.querySelectorAll(".saved-decision-item");
        const secondDeleteButton = [...items[1].querySelectorAll("button")].find(
            (button) => button.textContent === DELETE_SAVED_DECISION_LABEL,
        );
        secondDeleteButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.remove).toHaveBeenCalledWith("dec-2");
            expect(
                dialog.querySelectorAll(".saved-decision-item"),
            ).toHaveLength(1);
        });

        enterConsideration("prosA", 0, "Unsaved pro", 5);
        const confirmSpy = vi
            .spyOn(window, "confirm")
            .mockReturnValue(true);

        const firstLoadButton = [...items[0].querySelectorAll("button")].find(
            (button) => button.textContent === LOAD_LABEL,
        );
        firstLoadButton.click();

        await vi.waitFor(() => {
            expect(confirmSpy).toHaveBeenCalledWith(REPLACE_CONFIRMATION);
            expect(decisionsStore.get).toHaveBeenCalledWith("dec-1");
            expect(document.getElementById("A").value).toBe("Stay");
            expect(document.getElementById("B").value).toBe("Leave");
            expect(
                document.getElementById("load-decisions-status").textContent,
            ).toBe(LOAD_SUCCESS);
            expect(dialog.open).toBe(false);
        });

        confirmSpy.mockRestore();
    });

    it("shows an empty message when the signed-in user has no saved decisions", async () => {
        const decisionsStore = createMockStore({
            list: vi.fn().mockResolvedValue([]),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(document.getElementById("sign-out").hidden).toBe(false);
        });

        document.getElementById("load-decisions").click();

        const dialog = document.getElementById("saved-decisions-dialog");
        await vi.waitFor(() => {
            expect(dialog.open).toBe(true);
            const empty = document.getElementById("saved-decisions-empty");
            expect(empty.hidden).toBe(false);
            expect(empty.textContent).toBe(SAVED_DECISIONS_EMPTY);
        });
    });
});
