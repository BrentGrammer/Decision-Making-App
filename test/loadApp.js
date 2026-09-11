import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculate, initApp, resetSliders, sliderChange } from "../js/scripts.js";

function thisDir() {
  if (import.meta.dirname) {
    return import.meta.dirname;
  }
  const url = import.meta.url;
  return url.startsWith("file:")
    ? path.dirname(fileURLToPath(url))
    : path.dirname(url);
}

const root = path.resolve(thisDir(), "..");

const html = readFileSync(path.join(root, "index.html"), "utf8");

const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!bodyMatch) {
  throw new Error("index.html has no <body>");
}

const bodyWithoutScripts = bodyMatch[1].replace(
  /<script\b[\s\S]*?<\/script>/gi,
  "",
);

export function loadApp() {
  delete globalThis.decisionA;
  delete globalThis.decisionB;
  document.body.innerHTML = bodyWithoutScripts;
  if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
    HTMLElement.prototype.scrollIntoView = function () {};
  }
  initApp();
  globalThis.sliderChange = sliderChange;
  globalThis.resetSliders = resetSliders;
  globalThis.calculate = calculate;
}

function considerationTextCell(sliderClass, rowIndex) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  return slider.parentElement.previousElementSibling;
}

export function fillConsideration(sliderClass, rowIndex, text, weight) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  const textInput = considerationTextCell(sliderClass, rowIndex).querySelector(
    "input[type='text']",
  );
  textInput.value = text;
  slider.value = String(weight);
}

export function addConsideration(group) {
  document.querySelector(`.add-row[data-group="${group}"]`).click();
}

export function removeConsideration(sliderClass, rowIndex) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  slider.closest(".consideration-row").querySelector(".remove-row").click();
}

export function resultLines() {
  return [...document.querySelectorAll("#finalResult .result-line")].map(
    (line) => line.textContent,
  );
}

export function contributorsCaption() {
  return document.querySelector("#finalResult .contributors-caption");
}

export function contributorGroups() {
  return [...document.querySelectorAll("#finalResult .contributor-group")].map(
    (group) => ({
      heading: group.querySelector(".contributor-heading").textContent,
      rows: [...group.querySelectorAll(".contributor-row")].map((row) => ({
        option: row.querySelector(".contributor-option").textContent,
        type: row.querySelector(".contributor-type").textContent,
        text: row.querySelector(".contributor-text").textContent,
        rating: row.querySelector(".contributor-rating").textContent,
      })),
    }),
  );
}

export function contributorShares() {
  return [...document.querySelectorAll("#finalResult .contributor-row")].map(
    (row) => ({
      text: row.querySelector(".contributor-text").textContent,
      share: row.querySelector(".contributor-share").textContent,
    }),
  );
}

export function verdictLine() {
  return resultLines()[0];
}

export function ratingField(sliderClass, rowIndex) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  return slider.parentElement.querySelector(".sliderStatus");
}

export function typeRating(sliderClass, rowIndex, value) {
  const field = ratingField(sliderClass, rowIndex);
  field.value = String(value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

export function moveSlider(sliderClass, rowIndex, value) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  slider.value = String(value);
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

export function considerationTextInput(sliderClass, rowIndex) {
  return considerationTextCell(sliderClass, rowIndex).querySelector(
    "input[type='text']",
  );
}

export function considerationFieldError(sliderClass, rowIndex) {
  return considerationTextCell(sliderClass, rowIndex).querySelector(
    ".field-error",
  );
}

export function validationDialog() {
  return document.getElementById("validation-dialog");
}

export function validationErrorMessages() {
  return [
    ...validationDialog().querySelectorAll(".validation-error"),
  ].map((line) => line.textContent);
}

export function selectScoringModel(id) {
  const select = document.getElementById("model");
  select.value = id;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export function setDecisionNames(decisionA, decisionB) {
  document.getElementById("A").value = decisionA;
  document.getElementById("B").value = decisionB;
}
