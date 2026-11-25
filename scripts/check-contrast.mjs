import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const token = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `Missing color: ${name}`);
  return match[1];
};
function luminance(hex) {
  const rgb = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(first, second) {
  const a = luminance(token(first));
  const b = luminance(token(second));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const pairs = [
  ["foreground", "surface", 4.5], ["foreground", "background", 4.5],
  ["muted", "surface", 4.5], ["muted", "background", 4.5],
  ["primary", "surface", 4.5], ["primary", "background", 4.5],
  ["primary", "primary-surface", 4.5], ["primary-hover", "surface", 4.5],
  ["success", "surface", 4.5], ["success", "success-surface", 4.5],
  ["warning", "surface", 4.5], ["warning", "warning-surface", 4.5],
  ["danger", "surface", 4.5], ["danger", "danger-surface", 4.5],
  ["info", "surface", 4.5], ["info", "info-surface", 4.5],
  ["neutral", "neutral-surface", 4.5],
  ["control-border", "surface", 3], ["control-border", "background", 3],
  ["info", "surface", 3], ["surface", "foreground", 3],
];
for (const [first, second, minimum] of pairs) {
  const value = contrast(first, second);
  assert.ok(value >= minimum, `${first} / ${second}: ${value.toFixed(2)} < ${minimum}`);
  console.log(`${first} / ${second}: ${value.toFixed(2)}:1`);
}
console.log(`Passed ${pairs.length} design-token contrast checks. This is not a full accessibility audit.`);
