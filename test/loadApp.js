import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const appScript = readFileSync(path.join(root, "scripts.js"), "utf8");

const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!bodyMatch) {
  throw new Error("index.html has no <body>");
}

const bodyWithoutScripts = bodyMatch[1].replace(
  /<script\b[\s\S]*?<\/script>/gi,
  "",
);

const attachGlobals = `
${appScript}
globalThis.start = start;
globalThis.sliderChange = sliderChange;
globalThis.resetSliders = resetSliders;
globalThis.considerationText = considerationText;
globalThis.sumFilledWeights = sumFilledWeights;
globalThis.calculate = calculate;
`;

export function loadApp() {
  document.body.innerHTML = bodyWithoutScripts;
  new Function(attachGlobals)();
}

export function fillConsideration(sliderClass, rowIndex, text, weight) {
  const slider = document.getElementsByClassName(sliderClass)[rowIndex];
  const textInput = slider.parentElement
    .previousElementSibling.querySelector("input[type='text']");
  textInput.value = text;
  slider.value = String(weight);
}
