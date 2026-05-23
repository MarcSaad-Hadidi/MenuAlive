# Vistaire client readiness v1

Objectif: onboarder un premier restaurant haut de gamme sans construire trop tot
un SaaS complet. Vistaire vend un menu QR premium, rapide, mobile, avec contenu
reel du restaurant, photos soignees, allergenes, fiches plats, 3D/AR selective
sur 1 plat signature approuve, et une lecture sobre des signaux anonymes.

## Score actuel

Readiness produit: 72 / 100.

Pret pour un pilote encadre: oui, si le premier client accepte un onboarding
manuel, 1 plat signature 3D/AR seulement au lancement, et une lecture
restaurateur geree par Vistaire.

Pas pret pour: dashboard client autonome, upload menu, multi-tenant SaaS,
ordering, paiement, POS, marketplace, ou pipeline 3D completement automatise.

## Frontieres produit

| Zone | Statut | Decision |
| --- | --- | --- |
| `/` | Public | Landing marketing Vistaire. Doit expliquer le menu QR premium et le pilote. |
| `/demo` | Public | Menu convive fictif Maison Elyse. Ne doit pas etre presente comme client reel. |
| `/demo/dishes/*` | Public noindex | Fiches plats fictives, utiles pour demo et QA 3D. |
| `/admin` | Public noindex | Apercu restaurateur de demonstration, donnees fictives Maison Elyse seulement. |
| `/owner` | Prive | Pilotage interne Vistaire protege par Clerk. Pas un dashboard client. |
| `/sign-in` | Public noindex | Acces interne Vistaire. |
| `/api/analytics/events` | Public contraint | Endpoint d'ingest public. Garder validation, origine et rate limit. |
| `/api/admin/assistant` | Public demo | Reponses locales uniquement pour la demo publique. Pas de LLM public. |
| `/api/restaurants` | Prive | Creation de fiche pilote interne seulement. |
| `/api/analytics/summary` | Prive | Resume analytique protege; pas suffisant pour dashboard client tant que l'ownership restaurant n'existe pas. |
| `/api/owner/*` | Prive | Donnees internes Vistaire. |

## Ce qui est demo Maison Elyse

- Restaurant, plats, prix, categories, photos et textes dans `lib/demoMenuData.ts`.
- Insights de demonstration dans `lib/demoAdminInsights.ts`.
- Assets publics sous `public/images/demo`, `public/models/demo` et les fixtures
  Maison Elyse.
- `/admin` doit rester un apercu demo fictif tant qu'il est public.

## Ce qui est owner interne Vistaire

- `/owner` et `components/owner`.
- Creation d'une fiche restaurant pilote: nom, slug, localisation, cuisine,
  contact et notes.
- Recommandations internes et suivi global des restaurants.
- Tout usage Supabase service-role et toute lecture multi-restaurant.

## Futur dashboard client

Non construit. A creer seulement apres:

- Routes restaurant reelles, par exemple `/r/[restaurantSlug]` ou domaine client.
- Modele de donnees menu/client stable.
- Auth et authorization par restaurant/org, pas seulement `auth.protect()`.
- Analytics filtrees au niveau base de donnees par restaurant.
- Fallback qui affiche `Non suivi`, jamais des chiffres demo pour un vrai client.

## MVP premier restaurant

Livrer:

- Menu QR mobile premium, brande pour le restaurant.
- Categories, plats, prix, descriptions, ingredients, allergenes, options,
  accompagnements et disponibilite.
- Photos optimisees et crops approuves mobile/detail.
- 1 plat signature 3D/AR approuve en vrai device; 2 a 3 seulement si le pipeline
  complet est termine.
- Lecture restaurateur geree par Vistaire: ouvertures menu, fiches plats,
  recherches, filtres, vues immersives, moments d'activite.
- Page preview restaurateur privee ou partagee par Vistaire, pas self-serve.

Ne pas livrer:

- Upload menu complet.
- Paiement, commande, reservation, POS.
- Marketplace.
- Client dashboard multi-utilisateur.
- Automatisation 3D bout en bout.
- Recommandations business sur ventes, revenus, ROI, satisfaction ou commandes.

## Onboarding restaurant

### Identite

- Nom legal et nom affiche.
- Slug restaurant.
- Adresse / ville / quartier.
- Type de cuisine.
- Tagline courte.
- Description courte.
- Devise.
- Contact principal: nom, email, telephone.
- Notes internes Vistaire.

### Branding

- Logo ou monogramme.
- Couleurs marque.
- Preference typographique.
- Image hero ou ambiance, si disponible.
- Validation que les libelles demo Maison Elyse sont remplaces.

### Menu

- Categories dans l'ordre d'affichage.
- Liste des plats par categorie.
- Prix.
- Disponibilite.
- Flags signature / recommande.
- Temps ou libelle de preparation si affiche.

### Contenu plat

- Nom du plat.
- Description courte.
- Description longue.
- Ingredients.
- Allergenes.
- Options ou substitutions.
- Accompagnements / supplements.
- Mot du chef ou accord.

### Photos

- Source photo par plat.
- Chemin public optimise.
- Crop carte mobile approuve.
- Crop fiche detail approuve.
- Validation que les photos ne ralentissent pas le premier chargement.

### 3D/AR

- Selectionner 1 a 3 plats signatures, mais publier 1 seul plat au lancement si
  les autres ne sont pas approuves.
- Conserver les sources hors public: `assets/3d/source/...`.
- Generer variantes web, mobile, AR-lite, iOS USDZ et poster.
- Ajouter manifest par plat avec bytes, SHA-256, dimensions, statut.
- Ne jamais activer `arUsdzUrl` restaurant sans `status` approved/published,
  `approvedAt` rempli et validation iPhone Safari reelle.
- Capturer preuve QA: device, OS, navigateur, URL, commit/deploy, reviewer,
  date, resultat.

### Validation client

- Copie menu approuvee.
- Prix approuves.
- Allergenes et mentions legales approuves par le restaurant.
- Photos approuvees.
- 3D/AR approuvee sur devices reels.
- QR code teste sur table, WiFi client et reseau mobile.
- Go/no-go ecrit avant publication.

### Publish

- Checklist QA passee.
- Manifests en `approved` ou `published`.
- Dates `approvedAt` / `publishedAt` remplies.
- Headers GLB/USDZ/manifest verifies.
- Rollback documente.
- Demo Maison Elyse non confondue avec client reel.

## Metrics utiles

Utiles au restaurateur:

- Ouvertures du menu.
- Sessions anonymes estimees.
- Fiches plats ouvertes.
- Taux fiche plat depuis carte, quand les impressions existent.
- Recherches et recherches sans resultat.
- Filtres/allergenes utilises.
- Categories consultees.
- Temps moyen sur fiche plat.
- Taux 3D/AR par fiche plat, pas seulement le volume brut.
- Moments d'activite par service.
- Erreurs 3D/AR et fallback par device.

Vanity ou dangereux:

- Compteurs 3D/AR bruts sans denominator.
- `session_started` + `menu_opened` additionnes comme si c'etait deux audiences.
- `dashboard_demo_opened` comme metric restaurant.
- Ventes, revenus, ROI, commandes, satisfaction, avis ou reservations: non
  mesures par Vistaire aujourd'hui.

## Fallbacks a surveiller

- Demo analytics fallback peut masquer une absence de vraies donnees. Pour un
  client reel, afficher `Non suivi` plutot que chiffres fictifs.
- Supabase indisponible sur `/owner` peut afficher donnees de presentation.
  Garder la note visible.
- Inserts analytics renvoient parfois `persisted:false`; utile pour demo, mais a
  rendre visible en diagnostic production.
- Les assets 3D legacy ne prouvent pas qu'un asset restaurant est publie.
- Les manifests en `review` ne doivent pas activer un USDZ restaurant.

## QA avant presentation

Commandes:

```bash
npm run lint
npm run build
npm run demo:validate-assets
npm run test:e2e
```

Parcours:

- `/`: landing charge, proposition claire, pas de login public visible.
- `/demo`: menu mobile utilisable, recherche/filtres OK, Maison Elyse indiquee
  comme fictive.
- `/demo/dishes/homard-bisque`: fiche charge, bouton 3D lazy-load seulement
  apres intention.
- `/admin`: public noindex, donnees fictives, assistant local, pas de Supabase
  live ni Mistral public.
- `/owner`: redirection `/sign-in` hors session.
- APIs owner et summary: redirection hors session.
- Endpoint analytics: payload valide accepte, payload invalide refuse.

DevTools:

- Console sans erreur critique.
- Network stable, pas de boucle auth.
- Pas de GLB/USDZ au chargement initial de `/demo`.
- 3D charge seulement apres clic sur une fiche.
- Mobile viewport 390x844: pas d'overlap, recherche/filtres utilisables.
- `/admin` lisible sur mobile et desktop.

QA mobile reelle:

- iPhone Safari Quick Look sur HTTPS.
- Android Chrome Scene Viewer si disponible.
- Test WiFi restaurant et reseau mobile.
- Mode economie de donnees / reseau lent.
- Fallback visible si 3D ou AR echoue.

## Red team

Un restaurant peut-il comprendre l'offre?
Oui si Vistaire dit: "nous remplaçons votre PDF QR par une carte mobile premium
brandee, avec 1 signature 3D/AR approuvee et une lecture anonyme de l'attention".
Non si `/admin` ressemble a un vrai dashboard client autonome.

Peut-on livrer sans pipeline complet?
Oui avec onboarding manuel, spreadsheet, wiring repo, photos optimisees, et un
seul plat 3D/AR approuve. Non si 3 plats AR sont promis sans vraie QA device.

Ce qui ferait perdre confiance:

- Chiffres demo presentes comme chiffres client.
- Maison Elyse interpretee comme client reel.
- AR qui echoue en presentation.
- Dashboard client promis mais non construit.
- Assets 3D lourds sur mobile.
- Claims ventes/ROI/commandes non mesures.

Ce qui peut casser le jour J:

- Auth Clerk mal configuree pour `/owner`.
- Supabase manquant et fallback non explique.
- Mistral/API externe lent dans une surface publique.
- GLB/USDZ charge trop tot.
- Quick Look iPhone non teste sur le deploy exact.
- QR code pointant vers mauvais environnement.

Corrections de strategie:

- Garder `/admin` public uniquement comme demo fictive.
- Garder `/owner` interne.
- Presenter le premier client comme service pilote premium, pas SaaS.
- Rendre le publish 3D manuel et strict.
- Reporter les automatisations tant que le premier restaurant n'a pas valide le
  workflow.

## Confidence loop

La strategie devient factuellement "go" seulement quand:

- Les tests automatises passent.
- Le premier menu client est renseigne avec donnees reelles.
- Les photos et allergenes sont approuves par le restaurant.
- Le plat 3D/AR publie a une preuve device reelle.
- Aucun fallback demo n'est visible dans un parcours client reel.

Avant ces preuves, la bonne posture est: pret pour pilote encadre, pas pret pour
SaaS self-serve.
