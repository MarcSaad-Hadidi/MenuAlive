# Architecture Vistaire

## Vue d'ensemble

Vistaire est une application Next.js App Router orientee menu client premium, fiche plat immersive et apercu restaurateur leger.

## Routes publiques
- `/`: landing Vistaire.
- `/demo`: menu client exemple Maison Elyse.
- `/demo/dishes/[slug]`: fiche plat detaillee.
- `/admin`: apercu restaurateur public de demonstration.
- `/menu-digital-restaurant`, `/menu-qr-code-restaurant`, `/menu-3d-ar-restaurant`, `/menu-pdf-vs-menu-digital`: pages SEO.

## Routes internes ou protegees
- `/owner`: espace interne.
- `/api/analytics/summary`: resume analytics protege.
- `/api/restaurants`: gestion restaurants protegee.
- `/api/owner/insights`: insights owner proteges.
- `/todos`: route starter protegee, hors produit Vistaire.

## Routes API publiques
- `/api/analytics/events`: endpoint public avec validation de payload et taille.
- `/api/admin/assistant`: endpoint public same-origin pour l'apercu admin demo.

Ces routes publiques ne doivent pas etre traitees comme des surfaces production sans protection supplementaire: rate limit, separation demo/production et controle des couts IA sont a planifier avant un vrai lancement.

## Separation produit
- Landing: `app/page.tsx`, `components/landing/*`, `components/Header.tsx`, `components/SiteFooter.tsx`.
- Menu client: `app/demo/page.tsx`, `components/menu/*`, `lib/demoMenuData.ts`, `lib/menuQuery.ts`.
- Fiche plat: `app/demo/dishes/[slug]/page.tsx`, `components/dish/*`.
- Admin demo: `app/admin/*`, `components/admin/*`, `lib/admin/*`, `lib/demoAdminInsights.ts`.
- Owner interne: `app/owner/*`, `components/owner/*`, `lib/owner/*`.
- Analytics: `lib/analytics/*`, `app/api/analytics/*`.

## Flux analytics
1. Le client interagit avec le menu ou la fiche plat.
2. `lib/analytics/client.ts` envoie un evenement non bloquant.
3. `/api/analytics/events` valide taille, schema, session, source et slugs.
4. `lib/analytics/eventStore.ts` tente l'insertion Supabase.
5. En demo ou en fallback, l'UX ne doit pas etre bloquee.

## Flux 3D/AR
1. La fiche plat affiche d'abord les informations culinaires et la photo.
2. La 3D est chargee sur intention utilisateur via `DishModelViewer`.
3. `model-viewer` charge le GLB web/mobile et le decoder meshopt si necessaire.
4. iOS Quick Look utilise uniquement un USDZ approuve par `resolveActiveQuickLookUsdzUrl`.
5. Android utilise Scene Viewer/WebXR seulement si l'environnement semble compatible.
6. Un fallback texte/photo reste obligatoire si l'asset ou le device echoue.

## Dependances critiques
- Clerk protege `/owner`, `/api/restaurants`, `/api/owner`, `/api/analytics/summary` et `/todos`.
- Supabase sert les donnees owner et analytics.
- Mistral alimente l'assistant admin, avec fallback obligatoire.
- `next.config.ts` definit les headers GLB/USDZ et caches pour les assets demo/restaurants.
- `scripts/3d/*` porte les validations de manifests, budgets, SHA et headers.

## Donnees locales, mocks et fallbacks
- `lib/demoMenuData.ts` contient le restaurant exemple et les plats demo.
- `lib/demoAdminInsights.ts` fournit les donnees demo de l'admin.
- Les fallbacks analytics/admin doivent rester explicites et non trompeurs.
- Ne pas transformer les donnees demo en promesses de production.

## Zones a ne pas modifier sans preuve
- Hero video et frames landing.
- Gating 3D/AR, Quick Look et `failed-real-device`.
- Middleware/proxy auth.
- Headers GLB/USDZ.
- Public assets lourds.
- Routes SEO publiques.

## Limites connues
- `/todos` est une route starter protegee et hors produit.
- Certains assets demo 3D publics sont lourds; ils ne doivent pas devenir des assets charges automatiquement.
- La preuve reelle iPhone/Android AR n'est pas automatisable completement dans le repo.
- Aucun projet Vercel local `.vercel` n'est present.
