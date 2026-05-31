import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/dish/DishDetail.tsx", "utf8");

test("legacy dish detail does not prefetch Quick Look USDZ from a mount effect", () => {
  assert.doesNotMatch(
    source,
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*return\s+prefetchUsdzForQuickLook\(/m
  );
});

test("legacy dish detail prepares Quick Look only from explicit 3D intent", () => {
  assert.match(source, /handleVoir3dClick[\s\S]*prefetchUsdzForQuickLook\(/m);
});
