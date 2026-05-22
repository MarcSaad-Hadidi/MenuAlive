# AGENTS.md - Analytics Vistaire

- Les analytics ne doivent jamais bloquer le parcours client.
- Ne pas exposer de secrets ni enregistrer de donnees personnelles inutiles.
- Valider et borner les payloads avant insertion.
- Respecter l'anonymat: signaux de consultation, recherche, clic, immersion et viewport seulement si utiles.
- Garder les fallbacks demo/production explicites et non intrusifs.
- Ne pas ajouter tracking tiers ou profiling sans demande explicite et justification produit.
