import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = process.cwd();
const LARGE_FILE_CHECK = join(ROOT, "scripts", "check-large-files.mjs");
const LFS_POLICY_CHECK = join(ROOT, "scripts", "check-lfs-policy.mjs");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-asset-policy-"));
  assert.equal(run("git", ["init", "-q"], { cwd: dir }).status, 0);
  assert.equal(
    run("git", ["config", "user.email", "asset-policy@example.test"], {
      cwd: dir
    }).status,
    0
  );
  assert.equal(
    run("git", ["config", "user.name", "Asset Policy Test"], { cwd: dir })
      .status,
    0
  );
  return dir;
}

function writeBinary(path, bytes) {
  writeFileSync(path, Buffer.alloc(bytes, 0x41));
}

test("large-file guard blocks an unallowlisted dangerous GLB", () => {
  const repo = makeRepo();
  const assetDir = join(repo, "3D Plat");
  mkdirSync(assetDir);
  writeBinary(join(assetDir, "export.glb"), 6 * 1024 * 1024);

  const result = run("node", [LARGE_FILE_CHECK], { cwd: repo });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /3D Plat\/export\.glb/);
  assert.match(result.stdout, /\.glb/);
  assert.match(result.stdout, /recommendation/i);
});

test("large-file guard ignores ignored local output directories", () => {
  const repo = makeRepo();
  mkdirSync(join(repo, "node_modules", "renderer"), { recursive: true });
  writeFileSync(join(repo, ".gitignore"), "node_modules/\n");
  writeBinary(join(repo, "node_modules", "renderer", "heavy.glb"), 8 * 1024 * 1024);
  writeFileSync(join(repo, "README.md"), "ok\n");

  const result = run("node", [LARGE_FILE_CHECK], { cwd: repo });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /passed/i);
});

test("LFS policy guard rejects broad binary LFS patterns", () => {
  const repo = makeRepo();
  writeFileSync(join(repo, ".gitattributes"), "*.glb filter=lfs diff=lfs merge=lfs -text\n");

  const result = run("node", [LFS_POLICY_CHECK], { cwd: repo });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /\*\.glb/);
  assert.match(result.stdout, /broad/i);
});
