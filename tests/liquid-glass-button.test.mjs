import assert from "node:assert/strict";
import test from "node:test";
import { liquidGlassButtonClasses, liquidGlassButtonBase } from "../lib/liquidGlassButton.ts";

test("liquidGlassButtonClasses includes liquid glass base and primary variant", () => {
  const classes = liquidGlassButtonClasses({ variant: "primary" });
  assert.match(classes, new RegExp(liquidGlassButtonBase.replace(/ /g, "\\s+")));
  assert.match(classes, /liquid-glass-button-primary/);
  assert.match(classes, /glass-button-primary/);
});

test("liquidGlassButtonClasses maps icon variant to compact rounded-square sizing", () => {
  const classes = liquidGlassButtonClasses({ variant: "icon" });
  assert.match(classes, /liquid-glass-button-icon/);
  assert.match(classes, /liquid-glass-button-icon-size/);
  assert.match(classes, /rounded-2xl/);
});

test("liquidGlassButtonClasses keeps secondary and ghost variants distinct", () => {
  const secondary = liquidGlassButtonClasses({ variant: "secondary" });
  const ghost = liquidGlassButtonClasses({ variant: "ghost" });
  assert.match(secondary, /liquid-glass-button-secondary/);
  assert.match(ghost, /liquid-glass-button-ghost/);
  assert.notEqual(secondary, ghost);
});
