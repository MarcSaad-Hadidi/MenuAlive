import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readRepoFile(...segments) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

test("owner cockpit uses the Vistaire premium owner shell", () => {
  const layout = readRepoFile("app", "owner", "layout.tsx");
  const page = readRepoFile("app", "owner", "page.tsx");
  const table = readRepoFile("components", "owner", "OwnerRestaurantTable.tsx");
  const form = readRepoFile("components", "owner", "RestaurantCreateForm.tsx");
  const qr = readRepoFile("components", "owner", "MenuQrCode.tsx");
  const css = readRepoFile("components", "owner", "OwnerCockpit.module.css");

  assert.match(layout, /OwnerCockpit\.module\.css/);
  assert.doesNotMatch(layout, /Header/);
  assert.match(layout, /Cockpit owner/);
  assert.match(layout, /className=\{styles\.ownerTheme\}[\s\S]*className=\{styles\.topbarWrap\}[\s\S]*\{children\}/);

  assert.match(page, /PhotoRestoComplet5\.png/);
  assert.match(page, /className=\{styles\.page\}/);
  assert.match(page, /className=\{styles\.frame\}/);
  assert.doesNotMatch(page, /bg-\[#080706\]/);
  assert.doesNotMatch(page, /PrimaryButton/);

  for (const source of [table, form, qr]) {
    assert.match(source, /OwnerCockpit\.module\.css/);
  }

  assert.match(css, /\.ownerTheme[\s\S]*--owner-cream/);
  assert.match(css, /\.ownerTheme[\s\S]*font-family:\s*var\(--owner-body\)/);
  assert.match(css, /\.backgroundImage/);
  assert.match(css, /\.topbar/);
  assert.match(css, /\.heroPanel/);
  assert.match(css, /\.restaurantTable/);
  assert.match(css, /\.createGrid/);
  assert.match(css, /backdrop-filter:\s*blur\(9px\) saturate\(112%\)/);
});
