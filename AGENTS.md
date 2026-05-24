# AGENTS.md - Vistaire

## Product Standard
- Vistaire is a premium restaurant menu experience, not a generic SaaS app.
- Work mobile-first. Check 390px and 430px widths before expanding to desktop.
- Preserve the current premium restaurant direction: food-first visuals, warm dark surfaces, cream/champagne accents, restrained motion, and clear French restaurant copy.
- Do not make broad visual rewrites without evidence from a bug, a failing test, DevTools, measurable performance data, or an explicit design request.
- Keep the menu, dish detail pages, and restaurant value proposition central. Do not turn Vistaire into a cold dashboard, POS, reservation system, or generic SaaS mockup unless asked.

## Git Workflow
- Start from an updated `main` and create one clean working branch from `main`.
- Never work directly on `main` or `master`.
- Do not stack new work on feature branches unless the user explicitly asks.
- Before editing, run `git status --short --branch` and confirm the base with `git merge-base HEAD origin/main` when branch ancestry matters.
- Do not discard, reset, reformat, or clean up existing user work unless the user explicitly asks.
- Keep each PR focused on one objective. Split product work, asset work, SEO work, and setup work into separate PRs.
- Stop and report before editing if the current branch is already ahead with unrelated work, if the planned diff crosses multiple product domains, or if a setup-only task would touch runtime pages, public media, demo data, SEO runtime, or 3D assets.

## Subagents
- Use subagents for non-trivial work when concerns can be separated.
- Useful roles include scope, AGENTS policy, CI, docs, package scripts, asset policy, Vercel safety, DevTools QA, red team, and cleanup.
- The main agent owns integration and must verify subagent findings before final confirmation.
- If real subagents are unavailable, simulate them with clearly separated sections and evidence.

## Assets And LFS
- Do not add large, raw, generated, review, or source media assets to Git.
- Existing large files on `main` are grandfathered exceptions, not precedent.
- Never force-add ignored asset folders such as `3D Plat/`, `3D photo/`, `asset-review/`, `assets/3d/source/`, `assets/3d/work/`, or raw video output.
- Do not add wildcard Git LFS rules. No `*.glb`, `*.usdz`, `*.mp4`, or similar broad `filter=lfs` patterns.
- Any LFS or large-asset exception requires an explicit policy update, owner, reason, max bytes, and checksum. Public runtime assets must not require Git LFS.
- Reference `docs/repo-asset-policy.md` instead of duplicating asset thresholds or allowlists.

## Implementation Guardrails
- Prefer small, evidence-backed changes that follow existing Next.js App Router, React, Tailwind, TypeScript, and local helper patterns.
- Do not replace established auth, analytics, SEO, AR, or asset flows without proving the existing path cannot solve the task.
- Do not add dependencies unless the value is clear and validation proves they work.
- Do not delete production code, public assets, data, or source drops as cleanup without explicit approval.
- Keep setup-only PRs limited to instructions, docs, templates, CI, and package scripts. Do not place internal instructions under `public/`, because files there are served to users.

## Validation
- Identify the package manager from the lockfile before running commands. This repo uses npm.
- Default checks for code/setup changes:
  - `npm run assets:check`
  - `npm run lfs:check`
  - `npm run lint`
  - `npm run build`
- Run `npm run typecheck` when the script exists.
- Run targeted `node --test tests/*.test.mjs` for touched logic and `npm run test:e2e` for changed critical routes when the environment is stable.
- If a check cannot run, report the exact blocker and the remaining risk.

## Browser QA
- Before confirming functional UI/frontend behavior, inspect the app in Chrome DevTools or an equivalent browser automation tool.
- Check affected routes load, console has no unexpected errors, Network has no obvious 404/500 assets, mobile viewport has no horizontal overflow, and relevant media/3D requests are sane.
- For 3D/AR work, verify that GLB/USDZ files are not fetched before user intent unless an existing approved preload path explains it.
- Do not claim real iPhone Quick Look or Android Scene Viewer validation unless tested on those devices.

## Cleanup
- Before final reporting, check `git status --short`.
- Remove task-generated `.next`, `test-results`, `playwright-report`, screenshots, videos, traces, and temporary files when they are not intentionally tracked.
- Verify no `.env`, secret, debug log, or generated heavy asset was added.
- Report changed files, commands run, skipped checks, browser QA, cleanup, residual risks, and why the PR stays within scope.
