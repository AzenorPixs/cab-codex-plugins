# Validation ciblée CAB3.2.5

- 13 tests PostgreSQL de finalisation réussis, dont correction autonome,
  idempotence, refus propriétaire/empreinte/gel/bail/UNKNOWN et revue pilotée.
- 9 tests purs réussis : invariants de révision et actions sans rejeu.
- Régression ciblée de réévaluation sans contrat réussie : adoption proposée
  sans migration implicite, parcours historique explicite conservé après effets.
- Parcours API réel en conteneur dédié : échec1, correction par son propriétaire,
  nouvelle exécution0, archivage puis CLOSED11 par CAB. Reçu échoué et SID/RUN/
  génération conservés ; aucune soumission ou clôture finale LLM.
- Syntaxe Python et modèle/migration vérifiés ; aucune migration manquante.
- TypeScript/Vite construits avec succès ; seule la version affichée change.
  Aucune interaction Web modifiée, pas de nouvelle campagne navigateur.
- OpenSpec ciblé strict réussi. Les logs sont dans output/scm/cab-3.0.0/
  autonomous-325-*.log, ignorés par Git. Aucun résultat production inventé.

## Cohérence documentaire
PROJECT/TECHNICAL/BUILD/README/CHANGELOG et documentation opérationnelle amendés.
Cartographie et registre raccordés sans attribution de code. DEVOPS et règles
linguistiques inchangés ; outils/dépendances conservés. Le fichier local
AGENT_INTEGRATIONS.md est absent ; seuls les templates d'intégration autorisés
sont modifiés, aucun profil utilisateur modifié manuellement.
Une contribution concurrente AGENTS.md est préservée et incluse par SCM ; les
directives explicites du développeur conservent la génération statistique par CAB.

## Livraison
Préparation de la release3.2.5 ; publication et activation restent distinctes.
Le RUN de livraison exige le même reçu CABU-SCM-AUTONOMOUS-325 et ne peut être
finalisé par CAB avant les preuves d'installation et disponibilité requises.

Correction ciblée supplémentaire : relocalisation autorisée en FINALIZATION_PENDING, sans réarmement ni changement d’identité ; test de régression dédié avant livraison.
