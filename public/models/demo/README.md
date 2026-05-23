# Demo 3D models

These GLB and USDZ files are stylized Maison Elyse demo assets. They are not
photorealistic scans.

| File | Usage |
| --- | --- |
| `.glb` | Web and Android via Chrome, `model-viewer`, WebXR, and Scene Viewer. |
| `ar-lite/*.usdz` | Active iPhone/iPad Quick Look assets through `ios-src` and `rel="ar"` links. |

Heavy source USDZ exports that are not the active Quick Look asset must not stay
in this public deploy tree. The old ravioles source USDZ was removed so Vercel
can clone and deploy without Git LFS.

## Regenerate GLB

Without Blender:

```bash
npm run demo:generate-3d
```

With Blender 3.6+:

```bash
blender --background --python scripts/create-demo-3d-models.py
```

## Regenerate USDZ

Local conversion:

```bash
npm run demo:convert-usdz
```

After GLB changes, run the generation/conversion workflow and verify the active
paths in `lib/demoMenuData.ts`, especially `model3dUrl`, `webModel3dUrl`,
`arModel3dUrl`, and `arUsdzUrl`. Heavy exports that are not active runtime
assets belong outside `public`.

## Deployment

For AR, serve the site over HTTPS. Exact behavior depends on the browser; iOS
Safari exposes Quick Look through the active `ar-lite` USDZ files.

## Commercial Version

For production, replace demo assets with photogrammetry, professional scans, or
artist-authored 3D models that meet the restaurant's quality bar.
