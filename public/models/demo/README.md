# Modèles 3D démo Maison Élyse (MVP stylisés)

Ces fichiers **GLB** et **USDZ** sont des **assets de démonstration stylisés**. Ce ne sont **pas** des scans photoréalistes.

| Fichier | Usage |
| ------- | ----- |
| `.glb`  | Web et Android (Chrome, `model-viewer`, AR via WebXR / Scene Viewer) |
| `.usdz` | iPhone / iPad — attribut `ios-src` de `model-viewer` (Quick Look quand le navigateur l’expose) |

## Régénérer les GLB

Sans Blender :

```bash
npm run demo:generate-3d
```

Avec Blender (3.6+) :

```bash
blender --background --python scripts/create-demo-3d-models.py
```

## Régénérer les USDZ (à partir des GLB)

Conversion locale (Babylon.js + `fflate`, fonctionne sur Windows) :

```bash
npm run demo:convert-usdz
```

Après modification des GLB, relancer **generate-3d** puis **convert-usdz**, et vérifier les chemins dans `lib/demoMenuData.ts` (`model3dUrl` / `usdzUrl`).

**macOS (alternative)** : `xcrun usdz_converter` ou l’app **Reality Converter** peuvent produire des USDZ ; les fichiers générés par le script npm restent valides pour la démo.

## Déploiement

Pour **AR** : servir le site en **HTTPS** (ex. Vercel). Le comportement exact dépend du navigateur (Safari iOS privilégie souvent Quick Look avec `ios-src`).

## iPhone Quick Look production

Seul `ar-lite/homard-bisque-ios-quicklook-ultra.usdz` est approuve et actif
pour iPhone Quick Look. Les anciens fichiers AR-lite ravioles et souffle ont
ete retires apres echec visuel sur vrai iPhone; ne pas les reactiver sans une
nouvelle validation Safari / Quick Look reelle.

## Version commerciale

Pour la production : remplacer par la **photogrammétrie**, un scan pro ou une **modélisation** par un artiste 3D selon vos standards.
