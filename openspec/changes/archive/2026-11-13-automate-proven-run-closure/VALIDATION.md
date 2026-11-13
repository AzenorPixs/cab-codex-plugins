# Validation — clôture autonome et archives

## Preuves du 13 novembre 2026
- 16 tests PostgreSQL : clôture directe/pilotée, acceptation et code courant,
  déplacement vers archive, idempotence, preuves périmées, autorité, imports
  intègres/divergents, services avec/sans preuve et conservation des protections.
- 7 tests statistiques de non-régression réussis.
- Parcours réel de fixture : exécution native réussie, revue acceptée puis
  déplacement du change ; le worker ferme sans commande de clôture du LLM.
- Chromium156 et Firefox153 : diagnostic, archivage, retrait de la liste Electric,
  page Archives et absence de débordement horizontal mobile. Chromium qualifie
  en plus le consentement explicite et la justification de clôture historique.
- Le prévol lecture seule des données réelles trouve 13 clôtures dans un snapshot
  chiffré intègre ; service-ccab (deux projets) n'a pas de preuve terminale.
- Migration additive0010 appliquée en fixture ; makemigrations --check ne trouve
  aucun delta. TypeScript/Vite et compilation Python réussis ; delta OpenSpec strict.
- Journaux non versionnés : output/scm/cab-3.0.0/lifecycle-314-*.
- Aucun travail DIU/Pixs historique rejoué ; aucun ancien reçu modifié.

## Matrice documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés ; contrôles de preuves, droits et validations conservés. |
| PROJECT.md / TECHNICAL.md | Version actualisée ; architecture unique CAB/Django/PG/Electric conservée. |
| BUILD.md | Version de livraison actualisée ; migration additive et CABU du paquet existants. |
| DEVOPS.md | Inchangé ; outils système, PostgreSQL dédié, OpenSpec et navigateurs prescrits. |
| DEVELOPMENT_MAP.md | Entrée ciblée, sans code attribué ; ACL ultérieur. |
| openspec/BATCH_CODES.md | Aucun code alloué ni consolidation globale. |
| README.md / CHANGELOG.md | Nouveaux parcours, limites et page Archives documentés. |
| docs/platform-operations.md | Règles de clôture, imports, services et table d'archives documentées. |
| OpenSpec system-platform | Worker, protections, commandes et archivage des sessions spécifiés. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; aucune configuration tierce modifiée manuellement. |

Les captures et reçus runtime distinguent qualification, livraison, activation
et changements effectifs des étapes importées. Les sessions ne sont archivées
que sur clic autorisé ; aucune archive automatique des sessions réelles.
