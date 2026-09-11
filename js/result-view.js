import {
    CONSIDERATION_TYPE_LABELS,
    CONTRIBUTOR_COLUMN_LABELS,
    CONTRIBUTORS_CAPTION,
    CONTRIBUTORS_HINT,
    CONTRIBUTORS_HINT_LABEL,
    RESULT_BLOCK,
    sharePercent,
} from "./constants/strings.js";

const CONTRIBUTOR_COLUMNS = ["option", "type", "text", "rating", "share"];

function contributorCellText(row, column) {
    if (column === "type") {
        return CONSIDERATION_TYPE_LABELS[row.type];
    }
    if (column === "share") {
        return sharePercent(row.share);
    }
    return row[column];
}

function contributorCell(row, column) {
    const cell = document.createElement("td");
    cell.className = `contributor-${column}`;
    cell.textContent = contributorCellText(row, column);
    if (column === "type") {
        cell.dataset.type = row.type;
    }
    return cell;
}

function contributorRow(row) {
    const tableRow = document.createElement("tr");
    tableRow.className = "contributor-row";
    tableRow.append(
        ...CONTRIBUTOR_COLUMNS.map((column) => contributorCell(row, column)),
    );
    return tableRow;
}

function contributorHeading(heading) {
    const tableRow = document.createElement("tr");
    tableRow.className = "contributor-heading";
    const cell = document.createElement("th");
    cell.colSpan = CONTRIBUTOR_COLUMNS.length;
    cell.scope = "rowgroup";
    cell.textContent = heading;
    tableRow.append(cell);
    return tableRow;
}

function contributorGroup({ heading, rows }) {
    const body = document.createElement("tbody");
    body.className = "contributor-group";
    body.append(contributorHeading(heading), ...rows.map(contributorRow));
    return body;
}

function contributorColumnHeaders() {
    const head = document.createElement("thead");
    head.className = "contributor-columns";
    const tableRow = document.createElement("tr");
    tableRow.append(
        ...CONTRIBUTOR_COLUMNS.map((column) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = CONTRIBUTOR_COLUMN_LABELS[column];
            return cell;
        }),
    );
    head.append(tableRow);
    return head;
}

function contributorsHint() {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "hint";
    hint.setAttribute("aria-label", CONTRIBUTORS_HINT_LABEL);

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-info");
    icon.append(use);

    const text = document.createElement("span");
    text.className = "hint-text";
    text.textContent = CONTRIBUTORS_HINT;

    hint.append(icon, text);
    return hint;
}

function contributorsCaption() {
    const caption = document.createElement("caption");
    caption.className = "contributors-caption";
    caption.append(CONTRIBUTORS_CAPTION, contributorsHint());
    return caption;
}

function contributorsTable({ groups }) {
    const table = document.createElement("table");
    table.className = "contributors";
    table.append(
        contributorsCaption(),
        contributorColumnHeaders(),
        ...groups.map(contributorGroup),
    );
    return table;
}

function resultLine({ text }) {
    const paragraph = document.createElement("p");
    paragraph.className = "result-line";
    paragraph.textContent = text;
    return paragraph;
}

function resultBlock(block) {
    return block.kind === RESULT_BLOCK.contributors
        ? contributorsTable(block)
        : resultLine(block);
}

export function showResult(blocks) {
    document
        .getElementById("finalResult")
        .replaceChildren(...blocks.map(resultBlock));
}
