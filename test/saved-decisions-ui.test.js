import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DELETE_ACCOUNT_CONFIRMATION,
    DELETE_ACCOUNT_ERROR,
    DELETE_ACCOUNT_LABEL,
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
import { ELEMENT_IDS, SELECTORS } from "../js/constants/selectors.js";

const MAX_FILE_SIZE = 1_000_000;
const GOOGLE_AUTH_PATH = "/api/auth/google";
const TEST_USER = Object.freeze({
    id: "user-1",
    email: "alex@example.com",
    name: "Alex Rivera",
});

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
    const input = document.getElementById(ELEMENT_IDS.loadDecisionsFile);
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

describe("loading saved decisions when signed out", () => {
    beforeEach(() => {
        loadApp();
    });

    it("offers to sign in with Google when signed out", () => {
        const signInLink = document.getElementById(ELEMENT_IDS.signInGoogle);
        const accountMenu = document.getElementById(ELEMENT_IDS.accountMenu);

        expect(signInLink.textContent).toBe(SIGN_IN_WITH_GOOGLE_LABEL);
        expect(signInLink.getAttribute("href")).toBe(GOOGLE_AUTH_PATH);
        expect(signInLink.hidden).toBe(false);
        expect(accountMenu.hidden).toBe(true);
    });

    it("announces a successful load to assistive technology", async () => {
        selectSavedDecisions(sampleSavedPayload(), MAX_FILE_SIZE);

        await vi.waitFor(() => {
            const announcement = document.querySelector(SELECTORS.statusRole);
            expect(announcement).not.toBeNull();
            expect(announcement.textContent.trim()).not.toBe("");
        });
    });

    it("rejects an oversized file with an accessible error", async () => {
        const initialDecisionName = "Keep this decision";
        const currentName = document.getElementById(ELEMENT_IDS.decisionA);
        currentName.value = initialDecisionName;

        selectSavedDecisions(
            sampleSavedPayload("Replacement A", "Replacement B"),
            MAX_FILE_SIZE + 1,
        );

        await vi.waitFor(() => {
            const error = document.querySelector(SELECTORS.alertRole);
            expect(error.hidden).toBe(false);
            expect(error.textContent).toBe(LOAD_ERROR);
            expect(currentName.value).toBe(initialDecisionName);
        });
    });

    it("preserves in-progress decisions across signing in with Google", async () => {
        setDecisionNames("Remote job", "Office job");
        enterConsideration("prosA", 0, "No commute", 9);
        enterConsideration("consB", 0, "Long commute", 7);
        const modelSelect = document.getElementById(ELEMENT_IDS.model);
        modelSelect.value = "linear";
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));

        const signInLink = document.getElementById(ELEMENT_IDS.signInGoogle);
        signInLink.addEventListener("click", (event) => event.preventDefault());
        signInLink.click();

        loadApp({
            decisionsStore: {
                getUser: vi.fn().mockResolvedValue(TEST_USER),
                logout: vi.fn().mockResolvedValue(),
                deleteAccount: vi.fn().mockResolvedValue(),
                list: vi.fn().mockResolvedValue([]),
                get: vi.fn(),
                save: vi.fn(),
                remove: vi.fn(),
            },
        });

        await vi.waitFor(() => {
            expect(document.getElementById(ELEMENT_IDS.accountMenu).hidden).toBe(
                false,
            );
        });
        expect(document.getElementById(ELEMENT_IDS.decisionA).value).toBe(
            "Remote job",
        );
        expect(document.getElementById(ELEMENT_IDS.decisionB).value).toBe(
            "Office job",
        );
        expect(document.getElementById(ELEMENT_IDS.model).value).toBe("linear");
        expect(
            document
                .getElementsByClassName("prosA")[0]
                .parentElement.previousElementSibling.querySelector(
                    "input[type='text']",
                ).value,
        ).toBe("No commute");
        expect(document.getElementsByClassName("consB")[0].value).toBe("7");
    });
});

describe("saving and loading decisions when signed in", () => {
    const savedId = "dec-1";
    const secondSavedId = "dec-2";
    const decisionA = "Stay";
    const decisionB = "Leave";

    function createMockStore(overrides = {}) {
        return {
            getUser: vi.fn().mockResolvedValue(TEST_USER),
            logout: vi.fn().mockResolvedValue(),
            deleteAccount: vi.fn().mockResolvedValue(),
            list: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(
                sampleSavedPayload(decisionA, decisionB),
            ),
            save: vi.fn().mockResolvedValue({
                id: savedId,
                title: `${decisionA} vs. ${decisionB}`,
            }),
            remove: vi.fn().mockResolvedValue(),
            ...overrides,
        };
    }

    it("shows who is signed in in an account menu and lets them sign out", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        const signInLink = document.getElementById(ELEMENT_IDS.signInGoogle);
        const accountMenu = document.getElementById(ELEMENT_IDS.accountMenu);
        const menuTrigger = document.getElementById(
            ELEMENT_IDS.accountMenuTrigger,
        );
        const menuDropdown = document.getElementById(
            ELEMENT_IDS.accountMenuDropdown,
        );
        const signedInUser = document.getElementById(ELEMENT_IDS.signedInUser);
        const signOutButton = document.getElementById(ELEMENT_IDS.signOut);
        const deleteAccountButton = document.getElementById(
            ELEMENT_IDS.deleteAccount,
        );

        await vi.waitFor(() => {
            expect(signInLink.hidden).toBe(true);
            expect(accountMenu.hidden).toBe(false);
            expect(signedInUser.textContent).toBe(TEST_USER.name);
            expect(menuTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(menuDropdown.hidden).toBe(true);
            expect(signOutButton.textContent).toBe(SIGN_OUT_LABEL);
            expect(deleteAccountButton.textContent).toBe(DELETE_ACCOUNT_LABEL);
        });

        menuTrigger.click();
        expect(menuTrigger.getAttribute("aria-expanded")).toBe("true");
        expect(menuDropdown.hidden).toBe(false);

        signOutButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.logout).toHaveBeenCalledTimes(1);
            expect(signInLink.hidden).toBe(false);
            expect(accountMenu.hidden).toBe(true);
            expect(menuDropdown.hidden).toBe(true);
        });
    });

    it("clears application state when signing out", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        setDecisionNames("Stay", "Leave");
        enterConsideration("prosA", 0, "Good team", 8);
        const modelSelect = document.getElementById(ELEMENT_IDS.model);
        modelSelect.value = "linear";
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));

        document.getElementById(ELEMENT_IDS.accountMenuTrigger).click();
        document.getElementById(ELEMENT_IDS.signOut).click();

        await vi.waitFor(() => {
            expect(decisionsStore.logout).toHaveBeenCalledTimes(1);
        });
        expect(document.getElementById(ELEMENT_IDS.decisionA).value).toBe("");
        expect(document.getElementById(ELEMENT_IDS.decisionB).value).toBe("");
        expect(document.getElementById(ELEMENT_IDS.model).value).toBe("squared");
        expect(
            document
                .getElementsByClassName("prosA")[0]
                .parentElement.previousElementSibling.querySelector(
                    "input[type='text']",
                ).value,
        ).toBe("");
    });

    it("saves the decision table to the user's account and updates it when saved again", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        setDecisionNames(decisionA, decisionB);
        enterConsideration("prosA", 0, "Good team", 8);

        const saveButton = [...document.querySelectorAll("button")].find(
            (button) => button.textContent === SAVE_LABEL,
        );
        saveButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.save).toHaveBeenCalledTimes(1);
            expect(
                document.getElementById(ELEMENT_IDS.loadDecisionsStatus)
                    .textContent,
            ).toBe(SAVE_SUCCESS);
        });
        const [firstJson, firstId] = decisionsStore.save.mock.calls[0];
        expect(firstId).toBeNull();
        expect(JSON.parse(firstJson).decisions[0].name).toBe(decisionA);

        setDecisionNames("Stay Here", decisionB);
        saveButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.save).toHaveBeenCalledTimes(2);
        });
        const [, secondId] = decisionsStore.save.mock.calls[1];
        expect(secondId).toBe(savedId);
    });

    it("lets the user browse, load, and delete their saved decisions", async () => {
        const decisionsStore = createMockStore({
            list: vi.fn().mockResolvedValue([
                {
                    id: savedId,
                    title: `${decisionA} vs. ${decisionB}`,
                    updated_at: "2026-11-15T10:00:00Z",
                },
                {
                    id: secondSavedId,
                    title: "Buy vs. Rent",
                    updated_at: "2026-11-14T10:00:00Z",
                },
            ]),
            get: vi.fn().mockResolvedValue(
                sampleSavedPayload(decisionA, decisionB),
            ),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        const loadButton = [...document.querySelectorAll("button")].find(
            (button) => button.textContent === LOAD_LABEL,
        );
        loadButton.click();

        const dialog = document.getElementById(
            ELEMENT_IDS.savedDecisionsDialog,
        );
        await vi.waitFor(() => {
            expect(dialog.open).toBe(true);
            expect(
                dialog.querySelector(SELECTORS.dialogTitle).textContent,
            ).toBe(SAVED_DECISIONS_DIALOG_TITLE);
            expect(
                dialog.querySelectorAll(SELECTORS.savedDecisionItem),
            ).toHaveLength(2);
        });

        const items = dialog.querySelectorAll(SELECTORS.savedDecisionItem);
        const secondDeleteButton = [...items[1].querySelectorAll("button")].find(
            (button) => button.textContent === DELETE_SAVED_DECISION_LABEL,
        );
        secondDeleteButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.remove).toHaveBeenCalledWith(secondSavedId);
            expect(
                dialog.querySelectorAll(SELECTORS.savedDecisionItem),
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
            expect(decisionsStore.get).toHaveBeenCalledWith(savedId);
            expect(
                document.getElementById(ELEMENT_IDS.decisionA).value,
            ).toBe(decisionA);
            expect(
                document.getElementById(ELEMENT_IDS.decisionB).value,
            ).toBe(decisionB);
            expect(
                document.getElementById(ELEMENT_IDS.loadDecisionsStatus)
                    .textContent,
            ).toBe(LOAD_SUCCESS);
            expect(dialog.open).toBe(false);
        });

        confirmSpy.mockRestore();
    });

    it("tells the user when they have no saved decisions yet", async () => {
        const decisionsStore = createMockStore({
            list: vi.fn().mockResolvedValue([]),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        document.getElementById(ELEMENT_IDS.loadDecisions).click();

        const dialog = document.getElementById(
            ELEMENT_IDS.savedDecisionsDialog,
        );
        await vi.waitFor(() => {
            expect(dialog.open).toBe(true);
            const empty = document.getElementById(
                ELEMENT_IDS.savedDecisionsEmpty,
            );
            expect(empty.hidden).toBe(false);
            expect(empty.textContent).toBe(SAVED_DECISIONS_EMPTY);
        });
    });

    it("prompts for confirmation before deleting the user's account", async () => {
        const decisionsStore = createMockStore();
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        const menuTrigger = document.getElementById(
            ELEMENT_IDS.accountMenuTrigger,
        );
        const deleteButton = document.getElementById(ELEMENT_IDS.deleteAccount);

        const confirmSpy = vi
            .spyOn(window, "confirm")
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);

        menuTrigger.click();
        deleteButton.click();

        expect(confirmSpy).toHaveBeenCalledWith(DELETE_ACCOUNT_CONFIRMATION);
        expect(decisionsStore.deleteAccount).not.toHaveBeenCalled();
        expect(document.getElementById(ELEMENT_IDS.accountMenu).hidden).toBe(
            false,
        );

        menuTrigger.click();
        deleteButton.click();

        await vi.waitFor(() => {
            expect(decisionsStore.deleteAccount).toHaveBeenCalledTimes(1);
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(true);
            expect(
                document.getElementById(ELEMENT_IDS.signInGoogle).hidden,
            ).toBe(false);
        });

        confirmSpy.mockRestore();
    });

    it("shows an error if deleting the account fails", async () => {
        const decisionsStore = createMockStore({
            deleteAccount: vi.fn().mockRejectedValue(new Error("boom")),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
        document.getElementById(ELEMENT_IDS.accountMenuTrigger).click();
        document.getElementById(ELEMENT_IDS.deleteAccount).click();

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.loadDecisionsError)
                    .textContent,
            ).toBe(DELETE_ACCOUNT_ERROR);
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        confirmSpy.mockRestore();
    });

    it("disables save and load buttons and shows a spinner while saving", async () => {
        let resolveSave;
        const decisionsStore = createMockStore({
            save: vi.fn(
                () =>
                    new Promise((resolve) => {
                        resolveSave = resolve;
                    }),
            ),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        const saveButton = document.getElementById(ELEMENT_IDS.saveDecisions);
        const loadButton = document.getElementById(ELEMENT_IDS.loadDecisions);

        saveButton.click();
        saveButton.click();

        expect(decisionsStore.save).toHaveBeenCalledTimes(1);
        expect(saveButton.disabled).toBe(true);
        expect(loadButton.disabled).toBe(true);
        expect(saveButton.getAttribute("aria-busy")).toBe("true");
        expect(saveButton.querySelector(".loading-spinner")).not.toBeNull();

        resolveSave({ id: savedId });

        await vi.waitFor(() => {
            expect(saveButton.disabled).toBe(false);
            expect(loadButton.disabled).toBe(false);
        });
        expect(saveButton.getAttribute("aria-busy")).toBeNull();
        expect(saveButton.querySelector(".loading-spinner")).toBeNull();
    });

    it("disables load and save buttons and shows a spinner while fetching saved decisions", async () => {
        let resolveList;
        const decisionsStore = createMockStore({
            list: vi.fn(
                () =>
                    new Promise((resolve) => {
                        resolveList = resolve;
                    }),
            ),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        const saveButton = document.getElementById(ELEMENT_IDS.saveDecisions);
        const loadButton = document.getElementById(ELEMENT_IDS.loadDecisions);

        loadButton.click();

        expect(loadButton.disabled).toBe(true);
        expect(saveButton.disabled).toBe(true);
        expect(loadButton.getAttribute("aria-busy")).toBe("true");
        expect(loadButton.querySelector(".loading-spinner")).not.toBeNull();

        resolveList([]);

        await vi.waitFor(() => {
            expect(loadButton.disabled).toBe(false);
            expect(saveButton.disabled).toBe(false);
        });
        expect(loadButton.getAttribute("aria-busy")).toBeNull();
        expect(loadButton.querySelector(".loading-spinner")).toBeNull();
    });

    it("disables dialog actions and shows a spinner while loading a saved decision", async () => {
        let resolveGet;
        const decisionsStore = createMockStore({
            list: vi.fn().mockResolvedValue([
                {
                    id: savedId,
                    title: `${decisionA} vs ${decisionB}`,
                    updatedAt: "2026-11-14T12:00:00.000Z",
                },
            ]),
            get: vi.fn(
                () =>
                    new Promise((resolve) => {
                        resolveGet = resolve;
                    }),
            ),
        });
        loadApp({ decisionsStore });

        await vi.waitFor(() => {
            expect(
                document.getElementById(ELEMENT_IDS.accountMenu).hidden,
            ).toBe(false);
        });

        document.getElementById(ELEMENT_IDS.loadDecisions).click();

        await vi.waitFor(() => {
            expect(
                document.querySelectorAll(SELECTORS.savedDecisionItem),
            ).toHaveLength(1);
        });

        const item = document.querySelector(SELECTORS.savedDecisionItem);
        const [itemLoadButton, itemDeleteButton] =
            item.querySelectorAll("button");

        itemLoadButton.click();

        expect(itemLoadButton.disabled).toBe(true);
        expect(itemDeleteButton.disabled).toBe(true);
        expect(itemLoadButton.getAttribute("aria-busy")).toBe("true");
        expect(itemLoadButton.querySelector(".loading-spinner")).not.toBeNull();

        resolveGet(sampleSavedPayload(decisionA, decisionB));

        await vi.waitFor(() => {
            expect(itemLoadButton.disabled).toBe(false);
            expect(itemDeleteButton.disabled).toBe(false);
        });
        expect(itemLoadButton.getAttribute("aria-busy")).toBeNull();
        expect(itemLoadButton.querySelector(".loading-spinner")).toBeNull();
    });
});
