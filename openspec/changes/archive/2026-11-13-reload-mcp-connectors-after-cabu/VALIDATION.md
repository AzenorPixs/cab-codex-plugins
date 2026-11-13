# Qualification MCP — 13 novembre 2026

## Résultats exécutés
- 5 tests du relais : frontière sûre, demandes serveur, admission CABU unique,
  lectures de statut, admission incertaine, mort moteur sans rejeu et catalogue.
- 4 tests PostgreSQL : pair/propriété, génération et moteur, ancien client
  protégé, composition du reçu d'un ancien worker et stabilité terminale.
- 20 tests CABU de non-régression réussis.
- Deux profils stdio codex/opencode réellement lancés en fixture. La version
  installée est simulée par changement du seul en-tête dans le conteneur :
  pendant une opération réelle de4s, le moteur reste inchangé ; après son reçu,
  moteur remplacé, canal conservé, catalogue relu. Une seule Operation, même
  SID/RUN/génération et receipt_digest. Les applications natives GUI ne sont
  pas remplacées par ces clients de qualification protocolaire.
- CLI Codex native sur HOME isolé : intégration idempotente, option de catalogue
  activée si supportée, false littéral préservé et configurations tierces intactes.
- Chromium156/Firefox153 : reprise native requise visible, connecteurs affichés
  et bouton de nouvelle installation désactivé sur le même reçu. Fixture de
  statut uniquement, aucune installation artificielle déclarée en production.
- Migration additive0014 appliquée en fixture, makemigrations --check sans delta.
  Compilation Python et TypeScript/Vite réussies ; delta OpenSpec strict valide.
- Preuves non versionnées : output/scm/cab-3.0.0/mcp-323-*.

## Limite qualifiée
Les quatre anciens connecteurs Codex observés sur l'hôte sont des processus
chargés avant le relais. Leur propriétaire est un app-server stdio sans listener
public. Aucun signal ni injection dans ce canal privé n'est autorisé. CABU
conserve explicitement RELOAD_REQUIRED jusqu'à une reprise native observée.
Les connecteurs supervisés suivants utilisent le remplacement automatique.

## Cohérence documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés ; protections et preuves appliquées. |
| PROJECT.md / TECHNICAL.md | Version actualisée, architecture inchangée. |
| BUILD.md | Version actualisée ; livraison externe existante, aucune dépendance ajoutée. |
| DEVOPS.md | Inchangé ; Python, PostgreSQL, CLI natives et navigateurs prescrits. |
| DEVELOPMENT_MAP.md | Entrée ciblée sans code attribué ; ACL ultérieur. |
| openspec/BATCH_CODES.md | Aucune allocation ni consolidation. |
| README.md / CHANGELOG.md | Parcours et limite de première transition documentés. |
| docs/mcp-reload.md | Protocole, reçus, compatibilité et sources primaires documentés. |
| Skills CABU | Reconnexion en attente distincte d'un succès complet. |
| OpenSpec system-platform | Relais, preuve, CABU, anciens clients et option Codex spécifiés. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; intégration modifiée via son générateur sous mandat explicite. |

L'activation de la3.2.3 et la reconnexion réelle seront constatées par le job
système, sans anticiper leur réussite dans cette revue source.
