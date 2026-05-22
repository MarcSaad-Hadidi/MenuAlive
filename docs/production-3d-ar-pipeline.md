# Pipeline 3D/AR production Vistaire

Ce pipeline est volontairement parallele au pipeline demo Maison Elyse. Il ne
remplace pas `/public/models/demo`, ne reactive pas les anciens USDZ refuses, et
ne change pas le parcours `/demo`.

## Dossiers

Sources et travail hors public:

```text
assets/3d/source/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/
assets/3d/work/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/
assets/3d/reports/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/
```

Publication publique:

```text
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/web/
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/mobile/
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/ar-lite/
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/ios/
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/poster/
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/manifest.json
public/models/restaurants/{restaurantSlug}/manifest.json
```

Les dossiers publics sont des emplacements de publication. Tant qu'un plat n'est
pas approuve, garder les candidats dans `assets/3d/work` ou `asset-review`, pas
dans `public`.

## Commandes

Analyser un manifest sans ecrire d'artefact:

```bash
npm run 3d:analyze -- --manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json
```

Valider le manifest et les fichiers references:

```bash
npm run 3d:validate -- --manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json --context demo-fixture
```

Generer un manifest restaurant depuis un ou plusieurs manifests plat:

```bash
npm run 3d:manifest -- --dish-manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json
```

Lire un report Markdown pour revue humaine:

```bash
npm run 3d:report -- --manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json --context demo-fixture
```

Par defaut, les commandes pointent vers un fixture non public de Maison Elyse
qui reference des assets demo existants. Ce fixture sert a tester le contrat de
manifest.

Un petit pilote public en statut `review` existe aussi pour tester les headers
production sous `/models/restaurants/maison-elyse/demo/maison-elyse-n1/`. Il
copie les petits assets `maison-elyse-n1` existants sans deplacer ni modifier
`/models/demo`. Il ne doit pas etre considere publie tant que `status` reste
`review`.

## Manifest plat

Le manifest plat est plat et contient:

- `restaurantSlug`, `menuSlug`, `dishSlug`, `activeVersion`
- `status`: `draft`, `review`, `approved`, `published`, `archived`
- `variants.web`, `variants.mobile`, `variants.arLite`, `variants.iosUsdz`, `variants.poster`
- `bytes` et `sha256` pour chaque variant
- `budgets`
- `physicalDimensions` en metres
- `validation.warnings`, `validation.fails`
- `generatedAt`, `approvedAt`, `publishedAt`

En contexte production, les URLs doivent rester sous `/models/restaurants/`.
En contexte demo/fixture, elles peuvent rester sous `/models/demo/`. Les URLs
Quick Look iOS production ne doivent jamais contenir de query string ou de hash.

## Budgets initiaux

Les budgets officiels vivent dans `scripts/3d/shared/budgets.mjs`.

- Web GLB: cible 10 MiB, warning 15 MiB, fail 18 MiB.
- Mobile GLB: cible 6 MiB, warning 10 MiB, fail 12 MiB.
- AR-lite GLB: cible 8 MiB, warning 10 MiB, fail 12 MiB, sans extension requise.
- iOS USDZ: cible 4.5 MiB, fail 5 MiB.
- Poster: cible 250 KiB, warning 400 KiB, fail 700 KiB.
- Texture max: cible 1024 px, warning 2048 px, fail 4096 px.
- Materials: cible 4, warning 6, fail 8.
- Meshes/primitives: cible 3, warning 6, fail 10.
- Triangle count: placeholder mesure, a stabiliser par les outils de build source.

## Migration depuis `/public/models/demo`

1. Choisir un plat pilote et garder les fichiers demo intacts.
2. Copier ou reconstruire les variants optimises vers `public/models/restaurants/.../{version}/`.
3. Generer un manifest plat avec tailles et SHA-256.
4. Valider avec `3d:validate --context production`.
5. Publier en pointant le manifest actif vers la version approuvee.
6. Rollback: repointer le manifest actif vers une version precedente. Ne jamais
   remplacer un fichier public immutable sous le meme nom.

## Manuel obligatoire

Ces controles restent manuels avant publication:

- iPhone Safari Quick Look sur l'URL exacte, WiFi et reseau mobile.
- Android Chrome / Scene Viewer sur vrai appareil.
- Review visuelle premium: echelle, materiaux, textures, pivot, grounding.
- Save-Data et reseau lent: aucun gros asset ne doit partir sans intention utilisateur.
