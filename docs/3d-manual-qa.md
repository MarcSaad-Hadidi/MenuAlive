# Vistaire 3D Manual QA

Automated validators prove structure, headers, budgets, and runtime safety.
The visual-quality report also records deterministic geometry, scale, material,
and texture-coverage evidence. These checks do not prove that AR works on real
devices, and they do not replace human review of plating fidelity.

## Chrome DevTools

Check `/`, `/demo`, `/demo/dishes/homard-bisque`, and any affected production
menu route at 375px, 390px, 430px, and desktop.

- Console has no unexpected errors.
- Network has no unexpected 404/500 responses.
- `document.documentElement.scrollWidth - document.documentElement.clientWidth <= 2`.
- No `.glb` or `.usdz` request appears before explicit 3D/AR intent.
- After `Voir en 3D`, the selected GLB loads once.
- Desktop does not fetch USDZ.
- GLB uses `Content-Type: model/gltf-binary`.
- USDZ uses `Content-Type: model/vnd.usdz+zip` and `Content-Disposition: inline`.

## iPhone Safari

Use a real iPhone over HTTPS. Do not report this as validated from desktop
Chrome, Playwright, or an iOS user-agent override.

- Open the dish page in Safari.
- Confirm no USDZ loads before intent.
- Tap the AR control only after the 3D panel is open.
- Confirm Quick Look opens, scale is credible, object is grounded, and the dish
  appears in front of the user.
- Record the exact device, iOS version, Safari version, network type, manifest
  version, and USDZ URL.
- Repeat on WiFi and cellular.

## Android Scene Viewer

Use a real Android device with Chrome and ARCore support.

- Confirm only AR-lite GLBs are offered for Android AR.
- Confirm unsupported Android browsers fall back to local 3D copy.
- Confirm Scene Viewer opens only after intent.
- Confirm the dish is grounded, correctly scaled, and visually acceptable.
- Record the exact device, Android version, Chrome version, ARCore availability,
  network type, manifest version, and GLB URL.
