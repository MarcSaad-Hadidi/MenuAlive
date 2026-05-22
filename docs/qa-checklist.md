# QA Checklist Vistaire

## Avant PR
- Branche dediee et `git status --short` compris.
- Aucun changement UI, asset ou runtime sensible hors perimetre.
- `npm run lint` passe.
- `npm run typecheck` passe si disponible.
- `npm run test:unit` passe.
- `npm run build` passe.
- Non-verifie et risques restants reportes.

## Pages a verifier selon la tache
- `/`
- `/demo`
- `/demo/dishes/homard-bisque`
- `/admin`
- Route specifique touchee par la tache.

## Chrome DevTools pour UI/frontend
- Console sans erreurs inattendues.
- Network sans 404/500 asset.
- Hydration sans warning bloquant.
- Responsive mobile 390 x 844 minimum.
- Pas d'overflow horizontal.
- Layout stable sans contenu masque.
- Video hero: bon fichier mobile/desktop, pas de requete inutile en Save-Data/reduced motion.
- 3D/AR: GLB/USDZ seulement apres intention utilisateur sauf prefetch approuve.
- Transfer sizes et cache headers coherents.

## Playwright
- Utiliser `npm run test:e2e` si un parcours critique est touche et que l'environnement le permet.
- Ajouter un viewport mobile pour une tache UI mobile critique.
- Ne pas rendre la CI fragile avec des tests video/scroll/AR non stabilises.
- Se souvenir que Playwright utilise `npm run start`, donc build requis.

## 3D/AR
- Verifier fallback photo/texte.
- Verifier loading state.
- Verifier error state.
- Verifier absence de promesse AR si l'asset n'est pas approuve.
- Lancer `npm run validate:assets` si assets ou manifests changent.
- Lancer `npm run 3d:validate-network -- --base-url http://localhost:3000` si headers/routes assets changent.
- Reporter iPhone Safari Quick Look et Android Chrome comme `VERIFIED LIVE` seulement si vraiment testes.

## Cleanup
- Aucun fichier temporaire ou screenshot inutile.
- Aucun report Playwright/coverage/test-result commite.
- Aucun secret dans diff.
- Aucun `debugger`.
- Aucun `console.log` runtime ajoute.
- Aucun mock ou fixture abandonne.
- Aucune route dev/starter exposee sans justification.

## Reporting obligatoire
- Branche.
- Fichiers modifies.
- Validations lancees et resultats.
- Chrome DevTools utilise ou non.
- Playwright utilise ou non.
- Cleanup effectue.
- Non-verifie.
- Risques restants.
