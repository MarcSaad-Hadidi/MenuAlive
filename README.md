# Vistaire

Vistaire est une experience web premium pour restaurants haut de gamme. Le client scanne un QR code a table et accede a une carte digitale rapide, elegante, visuelle et immersive.

Le produit doit rendre le menu plus desirable, plus clair et plus vendeur qu'un PDF, un menu imprime basique ou un menu digital standard.

## Stack
- Next.js App Router, React, TypeScript, Tailwind CSS.
- npm, verifie par `package-lock.json`.
- Clerk pour les routes internes/protegees.
- Supabase pour les donnees et analytics serveur.
- Mistral pour l'assistant admin, avec fallback.
- `@google/model-viewer`, GLB, USDZ et Quick Look pour la 3D/AR.
- Playwright pour les parcours e2e.
- Node test runner pour les tests unitaires.

## Routes principales
- `/`: landing publique Vistaire.
- `/demo`: menu client exemple Maison Elyse.
- `/demo/dishes/[slug]`: fiche plat detaillee avec 3D/AR quand disponible.
- `/admin`: apercu restaurateur public de demonstration.
- `/owner`: espace interne protege.
- `/sign-in`: connexion interne.
- `/todos`: route starter protegee a traiter plus tard, ne pas supprimer sans plan.
- `/menu-digital-restaurant`, `/menu-qr-code-restaurant`, `/menu-3d-ar-restaurant`, `/menu-pdf-vs-menu-digital`: pages SEO publiques.

## Installation

```bash
npm ci
```

Sur Windows, si `npm` est bloque par PowerShell:

```powershell
npm.cmd ci
```

## Commandes

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run 3d:validate
npm run validate
```

`npm run test:e2e` utilise `npm run start`; il faut donc un build valide avant de lancer Playwright.

## Variables d'environnement

Copier `.env.example` vers `.env.local` si necessaire. Ne jamais commiter de secret.

Variables attendues:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- Mistral: `MISTRAL_API_KEY`, `MISTRAL_MODEL`.
- URLs SEO: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `SITE_URL`.
- Demo: `NEXT_PUBLIC_DEMO_RESTAURANT_ID`, `NEXT_PUBLIC_DEMO_MENU_ID`.

## Validations

Avant de conclure une tache de setup ou code:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Si la 3D/AR ou les assets sont touches:

```bash
npm run validate:assets
npm run 3d:validate-network -- --base-url http://localhost:3000
```

Si l'UI/frontend est touchee, verifier aussi Chrome DevTools: console, network, responsive mobile, hydration, assets, video, 3D/AR et overflow horizontal.

## Workflow Git
- Verifier branche et status avant modification.
- Ne pas travailler sur `main` ou `master` sauf instruction explicite.
- Utiliser une branche `codex/...` claire.
- Ne pas commit, push ou deployer sans instruction explicite.
- Ne pas melanger refonte, cleanup et feature.

## Workflow Codex
- Lire `AGENTS.md` en premier.
- Utiliser les AGENTS specialises dans `components/landing`, `components/menu`, `components/dish`, `app/admin` et `lib/analytics` si ces zones sont touchees.
- Pour les grosses taches, utiliser des subagents ou simuler les roles: repo, UX/UI, mobile performance, 3D/AR, QA/CI, securite/cleanup, final review.
- Reporter ce qui est `VERIFIED CODE`, `VERIFIED COMMAND`, `VERIFIED TOOL`, `VERIFIED LIVE`, `INFERRED` ou `NON-VERIFIABLE`.

## Notes 3D/AR
- L'AR n'est jamais promise sans asset valide et validation appareil.
- Quick Look iOS exige USDZ stable, budgete, sans query/hash et non marque `failed-real-device`.
- Les modeles lourds ne doivent pas etre precharges au premier rendu.
- Les fallbacks photo/texte restent obligatoires.

## Performance mobile
- Mobile-first sur landing, menu et fiche plat.
- Video hero mobile cible: fichier court, deferre, compatible Save-Data et reduced motion.
- Images menu et fiches plats: verifier tailles livrees, LCP et layout shift.
- 3D/AR: charger sur intention utilisateur, pas par defaut.

## Production cleanup
Avant une PR, verifier:
- `git status --short`;
- pas de fichiers temporaires, screenshots, reports ou traces inutiles;
- pas de `debugger`;
- pas de `console.log` runtime ajoute;
- pas de secret;
- pas de route dev exposee sans justification.
