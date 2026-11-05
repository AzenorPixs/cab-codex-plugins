## Réalisation

- [x] 1. Spécifier autorité, preuves, diagnostic et extension compatible.
- [x] 2. Journaliser les refus natifs et tester crash/réponse ambiguë sans rejeu.
- [x] 3. Livrer diagnostic et annulation revue bornée par propriétaire.
- [x] 4. Livrer extension additive disjointe, CAS et reçus idempotents.
- [x] 4.1. Livrer une sonde native de quiescence et la réconciliation bornée d’un port quarantiné.
- [x] 5. Tester les refus de divergence, les effets protégés et la continuité.
- [x] 6. Aligner versions et documentation 2.2.4, qualifier et archiver.
- [x] 7. Produire les statistiques et préparer le commit SCM.

## Sous-lots normalisés

Code non attribué : repère provisoire fix-autonomous-scoped-recovery.
Unités : preuves/refus (tâches 1–3), extension compatible (1,4), qualification
et livraison (5–7). Les unités partagent le contrat et gardent des tests
indépendants. Prérequis : CAB 2.2.3 actif et mandat autonome explicite du
3 novembre. État QUALIFIÉ ; preuves VALIDATION.md. Aucun SL définitif attribué.
