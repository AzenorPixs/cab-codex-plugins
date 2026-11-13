# Validation du mécanisme historique — 13 novembre 2026

## Réalisations et preuves
- 6 tests métier sur PostgreSQL isolé : succès, idempotence/conflit, identités et anciens reçus, preuves périmées, autorisation, archives incomplètes/ambiguës/liens, effets inconnus/baux, maintenance/période ouverte et autorité.
- 7 tests statistiques de non-régression réussis.
- Parcours public CLI/API réellement exécuté dans cab-300-package-test : CLOSED historique, reçu stable, SID/génération/mandat/gel conservés, zéro opération créée.
- Compilation des Python modifiés et validation stricte du delta réussies.
- Journaux : output/scm/cab-3.0.0/historical-313-{unit,public,statistics-regression}.log (non versionnés).
- Tests DIU historiques : non rejoués. Aucun résultat de test historique reconstruit.

## Cohérence documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés, règles transactionnelles, autorisations et tests appliqués. |
| PROJECT.md / TECHNICAL.md | Architecture inchangée, numéro de plateforme actualisé ; pas de nouveau service ni dépendance. |
| BUILD.md | Numéro de livraison actualisé ; DIU, paquet et CABU existants. |
| DEVOPS.md | Inchangé ; Python système, PostgreSQL fixture et OpenSpec prescrits. |
| DEVELOPMENT_MAP.md | Entrée ciblée, code non attribué ; attribution ultérieure par ACL. |
| openspec/BATCH_CODES.md | Aucun code alloué ; pas de consolidation globale. |
| README.md / CHANGELOG.md | Nouvelle capacité et limites historiques documentées. |
| docs/platform-operations.md | Commandes, preuves, protections et reprise documentées. |
| OpenSpec system-platform | Trois exigences et scénarios pour la clôture historique. |
| AGENT_INTEGRATIONS.md | Référence existante absente ; aucune configuration tierce modifiée. |

La préparation et la qualification source sont acquises. La livraison3.1.3,
CABU et les deux clôtures DIU seront prouvées par les reçus runtime distincts,
sans transformer cette revue en preuve anticipée de leur exécution.
