# AGENTS.md - Vistaire

## Mission produit
- Vistaire est une experience web premium pour restaurants haut de gamme.
- Objectif: rapprocher Vistaire du meilleur site de son marche.
- Le produit doit etre rapide, mobile-first, visuel, credible, elegant et maintenable.
- Le menu client et les fiches plats sont le coeur du produit.
- La 3D/AR est utile seulement si elle ameliore la comprehension ou le desir du plat.
- L'execution doit etre ambitieuse mais controlee.

## Niveau d'ambition
- Ne jamais viser "juste fonctionnel" pour une surface publique.
- Viser premium, production-ready et mobile-first.
- Ne pas reduire le projet a une maquette.
- Ne pas ajouter de complexite ou de dependances sans preuve de valeur.
- Ne pas lancer de refonte massive sans demande explicite, plan et validations.
- Chaque changement doit proteger la clarte business, la desirabilite culinaire et la performance mobile.

## Stack
- Application Next.js App Router avec React, TypeScript et Tailwind CSS.
- Package manager: npm, verifie par `package-lock.json`.
- Auth et donnees: Clerk, Supabase SSR/client/admin.
- IA admin: Mistral via `MISTRAL_API_KEY`, avec fallback attendu.
- 3D/AR: `@google/model-viewer`, GLB/USDZ, Quick Look iOS, Scene Viewer/WebXR selon compatibilite.
- Animations/media: GSAP, Lenis, video hero optimisee.
- Tests: Node test runner (`node --test`) et Playwright.
- CI existante: CodeQL. CI applicative attendue dans `.github/workflows/ci.yml`.
- Deploiement probable: Vercel, mais ne pas supposer un projet Vercel configure sans preuve locale ou outil.

## Branding
- Nom public visible: Vistaire.
- Ne pas ajouter MenuAlive ou MenuVivant dans les textes publics.
- Les anciens noms internes peuvent rester si les renommer cree un risque inutile.
- Toute migration branding doit etre progressive, verifiee, non destructive et limitee aux routes concernees.
- Signaler toute reference legacy visible au public au lieu de la corriger en masse sans plan.

## Regles Git
- Toujours verifier `git branch --show-current` et `git status --short` avant modification.
- Ne jamais travailler directement sur `main` ou `master` sauf instruction explicite.
- Creer une branche dediee claire si la branche courante n'est pas pertinente.
- Ne pas recreer une branche si la tache continue une branche pertinente.
- Ne pas commit, push ou deployer sans instruction explicite.
- Ne pas melanger plusieurs objectifs produit ou techniques dans un meme changement.
- Ne jamais ecraser, reformater ou nettoyer des changements existants non lies.

## Regles frontend
- Preserver les routes existantes, contrats de donnees et conventions du repo.
- Modifier le minimum necessaire pour l'objectif demande.
- Ne pas ajouter de dependance sans justification claire et validation.
- Ne pas inventer de backend, auth, dashboard, ordering, paiement, reservation ou POS sans demande explicite.
- Ne pas creer de fausse fonctionnalite, faux indicateur ou promesse produit non implementee.
- Les surfaces publiques doivent rester compatibles avec la vision premium de Vistaire.

## Regles UX/UI premium
- Direction: chaud, culinaire, sobre, haut de gamme.
- Favoriser hierarchie visuelle forte, spacing premium, typographie coherente et CTA clairs.
- Prevoir les etats loading, empty et error quand ils changent l'experience.
- Eviter le SaaS froid, les palettes crypto/gaming, le futurisme agressif, les gradients random, le bento decoratif et l'AI slop.
- Aucun effet gratuit ne doit ralentir l'experience mobile ou distraire du menu.
- Les composants doivent rester scannables, tactiles et lisibles sur mobile.

## Regles landing
- Preserver ce qui fonctionne, en particulier le hero video et les animations existantes.
- Renforcer la clarte business: montrer le produit, ne pas seulement l'expliquer.
- Mettre en avant le menu client, les fiches plats, le premium, le mobile et la 3D/AR seulement quand credible.
- Verifier responsive, console, network et absence d'overflow horizontal avec Chrome DevTools pour toute tache UI.
- Ne pas transformer la landing en page SaaS generique ou promesse marketing creuse.

## Regles menu client
- Mobile-first absolu.
- Categories lisibles, navigation simple, cartes plats desirables, prix clairs.
- Badges utiles seulement: signature, recommande, indisponible, allergenes ou immersion disponible si vraie.
- Recherche, filtres et disponibilite doivent rester rapides et comprehensibles.
- Le CTA fiche plat doit etre evident sans creer de friction.
- Aucun backend ne doit etre introduit si les donnees locales suffisent pour la tache.

## Regles fiches plats
- La fiche plat doit augmenter la valeur percue du plat.
- Priorites: grande image, description appetissante, prix, ingredients, allergenes, options, accompagnements, recommandation chef, disponibilite.
- La 3D/AR est un plus, pas une condition pour comprendre le plat.
- CTA 3D/AR uniquement si l'asset existe, est gate par le code, ou si un fallback explicite est affiche.
- Retour au menu simple et fiable.
- Ne jamais promettre une experience immersive non verifiee.

## Regles 3D/AR
- Ne jamais promettre une AR non verifiee.
- GLB/USDZ/Quick Look seulement avec assets reels et chemins stables.
- Fallback image/texte obligatoire.
- Loading state et error state obligatoires.
- Pas de dependance lourde sans justification et validation.
- Pas de gros asset charge au premier rendu sans preuve Network.
- Verifier `model-viewer`, MIME GLB/USDZ, cache headers, transfer size et erreurs console si la 3D/AR est touchee.
- iPhone Safari Quick Look et Android Chrome/Scene Viewer doivent etre documentes comme verifications reelles ou limites non verifiees.
- Les fichiers connus comme `failed-real-device` ne doivent jamais etre reactives sans validation appareil.

## Regles performance mobile
- La performance mobile est une priorite produit, pas une optimisation optionnelle.
- Verifier images, videos, modeles 3D, lazy loading, preload, layout shift, hydration et overflow horizontal.
- Utiliser `100svh`/`100dvh` avec prudence et verifier le scroll mobile.
- Ne pas ajouter animations lourdes ou import initial inutile.
- Toute modification media doit etre verifiee dans Network.
- Ne pas confirmer une tache UI/frontend sans validation navigateur quand Chrome DevTools ou Playwright est disponible.

## Regles admin/owner
- `/admin` est un apercu restaurateur/demo public et leger, jamais un vrai admin production ouvert.
- `/owner` est l'espace interne/protege quand il est concerne.
- Pas de dashboard SaaS froid, de metriques fictives inutiles ou de promesses business non mesurees.
- Pas d'auth/backend lourd sans demande explicite.
- L'interface restaurateur doit soutenir la valeur du menu, pas devenir un produit separe premature.
- Les insights doivent rester anonymes, comportementaux et limites aux donnees disponibles.
- Ne pas exposer donnees production, secrets, endpoints couteux ou IA non rate-limitee depuis une surface demo publique.

## Subagents
- Utiliser des subagents pour les taches larges ou multidomaines.
- Le main agent coordonne, tranche et verifie.
- Subagents recommandes: repo architecture, environnement Codex, UX/UI premium, performance mobile, 3D/AR, QA/CI, securite/cleanup, final review.
- Si les subagents sont indisponibles, simuler ces roles par sections d'analyse separees.
- Les subagents doivent produire des constats verifiables, pas des opinions vagues.

## Validations obligatoires
- Identifier le package manager via lockfile avant de lancer les commandes.
- Sur Windows, utiliser `npm.cmd` si `npm` est bloque par la policy PowerShell.
- Lancer les validations adaptees:
  - `npm run lint`
  - `npm run typecheck` si disponible
  - `npm run test:unit` si disponible
  - `npm run build`
  - `npm run test:e2e` si parcours UI critiques et environnement disponible
  - validateurs assets/AR si 3D/AR ou assets touches
- Si une validation ne peut pas etre lancee, expliquer pourquoi et reporter le niveau de preuve.

## Chrome DevTools obligatoire pour UI/frontend
Avant de confirmer qu'une tache UI/frontend est fonctionnelle, verifier avec Chrome DevTools si disponible:
- console;
- network;
- erreurs hydration;
- erreurs assets;
- erreurs video;
- erreurs 3D/AR si concerne;
- responsive mobile;
- overflow horizontal;
- layout;
- performance evidente.

## Playwright
- Utiliser Playwright pour les parcours critiques quand disponible.
- Tester au minimum les routes concernees.
- Ajouter un viewport mobile pour les taches UI critiques si pertinent.
- Ne pas rendre la CI fragile avec Playwright lourd sans preuve de stabilite.
- Les e2e existants demarrent via `npm run start`, donc un build valide est requis avant `npm run test:e2e`.

## Cleanup production
Avant de conclure, verifier:
- `git status --short`;
- aucun fichier temporaire inutile;
- aucun screenshot inutile;
- aucun script debug inutile;
- aucun `console.log` ou `debugger` ajoute dans le code runtime;
- aucun mock non utilise;
- aucun fichier brouillon;
- aucun artefact public qui ne doit pas partir en production;
- aucune route starter/dev exposee sans justification.

## Reporting final
Toujours rapporter:
- branche;
- fichiers modifies;
- pourquoi chaque fichier a ete modifie;
- validations lancees;
- resultats;
- Chrome DevTools si utilise;
- cleanup effectue;
- non verifie;
- risques restants;
- niveau de confiance avec preuves.
