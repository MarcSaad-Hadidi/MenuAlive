# Workflow Codex Vistaire

## Demander une tache

Une bonne demande Codex doit preciser:
- objectif produit;
- routes ou composants concernes;
- niveau de validation attendu;
- contraintes de branding;
- si commit, push ou PR sont autorises.

## Modes de travail
- Ask: questions, explications, audit sans modification.
- Plan: inspection et plan avant execution.
- Agent: inspection, plan court, execution, validation et rapport.

Par defaut, les taches de code doivent passer par inspection avant modification.

## Branche
- Verifier branche et `git status --short`.
- Ne pas travailler sur `main` ou `master`.
- Utiliser une branche `codex/...` claire.
- Ne pas commit/push/deployer sans instruction explicite.

## Subagents
Pour les taches larges, utiliser ou simuler:
- Repo Architecture;
- Codex Environment;
- Vistaire Product / UX Premium;
- Mobile Performance;
- 3D / AR;
- QA / CI;
- Security / Production Cleanup;
- Final Reviewer.

Les subagents doivent donner des constats avec preuves, pas des preferences vagues.

## Validations
- Toujours identifier npm via `package-lock.json`.
- Sur Windows, utiliser `npm.cmd` si PowerShell bloque `npm`.
- Gates standards:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run build`
- Gates assets/3D:
  - `npm run validate:assets`
  - `npm run 3d:validate-network -- --base-url http://localhost:3000`
- Gates e2e:
  - `npm run test:e2e` pour les parcours critiques si l'environnement est stable.

## Chrome DevTools
Obligatoire avant de confirmer une tache UI/frontend comme fonctionnelle si disponible:
- console;
- network;
- hydration;
- responsive mobile;
- overflow horizontal;
- assets;
- video;
- 3D/AR si concerne.

Si DevTools est indisponible ou bloque par le profil local, le rapport final doit le dire.

## Playwright
- Utiliser pour parcours critiques et regressions mesurables.
- Garder les tests e2e cibles et stables.
- Ne pas ajouter Playwright a la CI obligatoire si les tests sont trop dependants du timing video/scroll/AR.

## Skills
- Utiliser les skills existants quand ils couvrent la tache: frontend, Playwright/browser, GitHub, Vercel, SEO, debugging, verification.
- Ne pas creer de skill custom Vistaire si `AGENTS.md`, docs, subagents et scripts suffisent.
- Un skill custom n'est justifie que pour un workflow repetitif specifique impossible a maintenir proprement dans ce repo.

## Cleanup
Avant conclusion:
- `git status --short`;
- aucun fichier temporaire;
- aucun screenshot/report inutile;
- aucun secret;
- aucun `debugger`;
- aucun log runtime ajoute;
- aucun artefact public suspect.

## Reporting final
Classer les preuves avec:
- VERIFIED CODE;
- VERIFIED COMMAND;
- VERIFIED TOOL;
- VERIFIED LIVE;
- VERIFIED DOCS;
- INFERRED;
- NON-VERIFIABLE.

Toujours inclure validations lancees, echecs, non-verifie, risques restants et niveau de confiance.
