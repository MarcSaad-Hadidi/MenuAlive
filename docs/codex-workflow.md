# Codex Workflow

Use this workflow to keep Vistaire changes small, reviewable, and safe to merge.

## Before Editing
- Read `AGENTS.md`.
- Check `git status --short --branch`.
- Confirm the branch is not `main` or `master`.
- Start from updated `origin/main` unless the user explicitly requests a different base.
- Read the route, component, docs, scripts, and tests that bound the task before changing files.

## Scope Control
- Keep one PR to one purpose.
- Do not rebuild the landing, SEO, 3D pipeline, and setup policy in one branch.
- Do not import broad changes from old draft PRs. Inspect them for ideas, then reapply only the minimal parts needed.
- For setup-only work, avoid runtime files such as `app/page.tsx`, `components/landing/*`, `components/dish/*`, `lib/demoMenuData.ts`, and `public/*` assets.

## Subagent Use
Use subagents when the task crosses multiple concerns. Recommended roles:
- Scope review.
- AGENTS/policy review.
- CI workflow review.
- Docs architecture review.
- Package scripts review.
- Asset policy compatibility review.
- Vercel safety review.
- DevTools QA.
- Red team review.
- Cleanup review.

Subagents should return evidence and concrete risks. The main agent integrates the result and verifies it.

## Asset Policy
Do not duplicate asset thresholds, allowlists, or LFS rules in new docs. Link to `docs/repo-asset-policy.md` as the source of truth. For AR specifics, link to `docs/ar-asset-optimization-pipeline.md` and `docs/usdz-optimization.md`.

## Validation Matrix
- Repository asset safety: `npm run assets:check` and `npm run lfs:check`.
- Code quality: `npm run lint`.
- TypeScript: `npm run typecheck` when present.
- Production build: `npm run build`.
- Unit tests: use targeted `node --test tests/*.test.mjs` when touching tested logic.
- E2E: `npm run test:e2e` for route, auth, AR, video, or interaction changes when the environment is stable.

## Browser QA
For functional UI claims, inspect the app with Chrome DevTools or equivalent Playwright/browser automation. Check route load, console, network, mobile viewport, overflow, and media/3D requests relevant to the change.

## Final Handoff
Report:
- Branch and base.
- Files changed.
- What was intentionally excluded.
- Commands run and outcomes.
- Browser QA outcome.
- Asset/LFS outcome.
- Cleanup performed.
- Remaining risks or non-verified items.
