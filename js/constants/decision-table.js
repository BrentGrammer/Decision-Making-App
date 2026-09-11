export const DECISION_IDS = Object.freeze(["A", "B"]);
export const CONSIDERATION_LISTS = Object.freeze(["pros", "cons"]);

export const CONSIDERATION_KIND = Object.freeze({
    pro: "pro",
    con: "con",
});

const CONSIDERATION_KIND_BY_LIST = Object.freeze({
    pros: CONSIDERATION_KIND.pro,
    cons: CONSIDERATION_KIND.con,
});

function createConsiderationGroups() {
    const groups = {};
    for (const decisionId of DECISION_IDS) {
        for (const list of CONSIDERATION_LISTS) {
            const id = `${list}${decisionId}`;
            groups[id] = Object.freeze({
                id,
                kind: CONSIDERATION_KIND_BY_LIST[list],
            });
        }
    }
    return Object.freeze(groups);
}

export const CONSIDERATION_GROUPS = createConsiderationGroups();
