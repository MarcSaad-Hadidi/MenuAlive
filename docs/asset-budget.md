# Asset Budget Vistaire

## Principes
- Mobile-first: aucun asset lourd ne doit etre charge sans intention claire.
- La photo et la lisibilite du plat priment sur l'effet.
- Toute 3D/AR doit avoir fallback.
- Tout nouvel asset doit etre valide par Network et, si possible, par script.

## Images
- Image carte mobile livree: cible 150-200 KB.
- Image fiche plat livree: cible 250-300 KB.
- Poster hero ou poster 3D: cible 150 KB, warning 250 KB, fail 500 KB.
- Utiliser `next/image`, `sizes`, dimensions stables et qualite justifiee.
- Ne pas ajouter de PNG multi-MB si une variante WebP/AVIF optimisee suffit.

## Hero video
- Mobile hero: cible proche de 3 MB.
- Desktop hero: verifier transfer size et chargement conditionnel.
- Respecter reduced motion et Save-Data.
- Ne pas precharger la video desktop sur mobile.
- Verifier que le poster suffit quand la video est deferree.

## 3D/AR
Budgets production existants dans `scripts/3d/shared/budgets.mjs`:
- Web GLB: target 6 MB, warning 8 MB, fail 12 MB.
- Mobile GLB: target 3 MB, warning 5 MB, fail 8 MB.
- AR-lite GLB: target 4 MB, warning 6 MB, fail 8 MB.
- iOS Quick Look USDZ: target 3.5 MB, warning 4.5 MB, fail 5 MiB.
- Profil plat signature: total public target 10 MB, warning 14 MB, fail 18 MB.

## Lazy loading et preload
- Menu: pas de GLB/USDZ charge au rendu initial.
- Fiche plat: charger `model-viewer` et le modele sur intention utilisateur.
- Prefetch Quick Look uniquement si l'asset est approuve, stable et compatible avec la politique runtime.
- Decoder meshopt: verifier cache et absence de requete inutile.

## Ajouter un nouvel asset
1. Ajouter l'asset dans le bon dossier public ou fixture.
2. Verifier nommage stable, sans query/hash pour USDZ actif.
3. Mettre a jour les donnees ou manifest seulement si l'asset est vraiment utilise.
4. Lancer les validateurs pertinents:
   - `npm run validate:assets`
   - `npm run 3d:validate`
   - `npm run 3d:validate-network -- --base-url http://localhost:3000` si headers concernes.
5. Verifier Chrome DevTools Network sur mobile.
6. Reporter toute validation appareil non faite.

## Erreurs a eviter
- Reactiver un USDZ `failed-real-device`.
- Charger un GLB lourd depuis une carte menu.
- Promettre AR sans Quick Look/Scene Viewer teste.
- Ajouter un asset source/drop/export dans `public`.
- Casser les headers MIME GLB/USDZ.
- Confondre asset demo lourd et asset production approuve.
