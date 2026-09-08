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

export function fillConsideration(sliderClass, rowIndex, text, weight) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  const textInput = slider.parentElement
    .previousElementSibling.querySelector("input[type='text']");
  textInput.value = text;
  slider.value = String(weight);
}

export function setDecisionNames(decisionA, decisionB) {
  document.getElementById("A").value = decisionA;
  document.getElementById("B").value = decisionB;
}
