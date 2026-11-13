# Qualification — 13 novembre 2026

## Contrat validé
Le développeur a autorisé le correctif3.2.1 puis demandé dans ce même change
CABU via MCP, l’orchestration autonome par CAB et le retour OK avec version.
Il a explicitement rejeté une liste de comptes : tout acteur CAB actif et
authentifié peut réclamer cette seule opération officielle. Il a ajouté le
contrôle GitHub asynchrone partagé24h, l’étiquette du bandeau et la page
/administration/update avec bouton permanent et contrôle forcé à l’ouverture.

Les RUN de cadrage antérieurs restent historiques. Le RUN courant
SCM-cabu-mcp-web-20261113 couvre frontend/src, sans node_modules, le backend,
le packaging, les tests et les documents nécessaires. Aucun ancien reçu
refusé n’est transformé en test réussi.

## Preuves de qualification des sources
- 7 tests de préparation : versions cohérentes, chaque manifeste et commande
  divergent, métadonnées Python/frontend, skill absent, version non exécutée
  et payload précédent préservé avant toute archive.
- 20 tests PostgreSQL réels de jobs et disponibilité : acteurs de comptes
  distincts, autorisation, idempotence, concurrence, admission bornée, unité
  fixe indépendante, worker unique, erreurs, UNKNOWN protégé, récupération
  du reçu durable et sonde tardive incapable d’écraser OK ; GitHub simulé,
  cache glissant24h, échéance aléatoire après expiration, contrôle admin forcé.
- 9 tests d’installateur avec APT simulé : SHA256, URL officielle, downgrade,
  postinst échoué, paquet demi-configuré, santé/version/finalisation divergentes
  et résolution de Latest pour le bouton manuel.
- 3 tests MCP : coupure/reconnexion sur le même job, admission incertaine et
  UNKNOWN sans nouvelle installation.
- 16 tests de non-régression PostgreSQL : métadonnées5, statistiques7, catalogue4.
- TypeScript/Vite réussis, compilation Python réussie, migration0012 appliquée
  en fixture et makemigrations --check sans delta ; OpenSpec strict réussi.
- Finalisation réelle3.2.1 en fixture, puis répétition : mêmes mtimes des profils,
  configurations tierces préservées, plugins/skills/commandes disponibles,
  transport MCP réel et état READY vérifiés.
- Chromium156 et Firefox153 réels sur fixture : page administrative, versions locale/en ligne,
  étiquette et bouton permanent, contrôle forcé à la réouverture, admission
  réelle d’un seul job puis navigation conservée. GitHub est volontairement
  simulé avec5s de latence et le dispatch installateur désactivé sur ce banc :
  ce parcours ne prétend pas à une installation réelle.

Journaux/projections non versionnés : output/scm/cab-3.0.0/self-update-*.json
et self-update-*.log. L’exécution réelle de l’unité, l’activation hôte et le
retour MCP OK sont contrôlés après publication, par les reçus distincts.
Le contrôle d’audit tests/self-update-evidence.py ne réinstalle aucun paquet.

## Matrice documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés, protections et absence de secret conservées. |
| PROJECT.md / README.md | Mise à jour autonome, comptes agnostiques, cache24h et page administrative décrits. |
| TECHNICAL.md | Job durable, case active unique, unité séparée et UNKNOWN documentés. |
| BUILD.md | Précontrôle, migration0012, unité et amorçage depuis un ancien paquet décrits. |
| DEVOPS.md | Inchangé, aucun outil/dépendance ajouté, runtimes et bancs prescrits utilisés. |
| DEVELOPMENT_MAP.md / openspec/BATCH_CODES.md | Entrée ciblée provisoire, code non attribué ; ACL ultérieur. |
| CHANGELOG.md | Entrée Unreleased sur correctif et comportements demandés. |
| OpenSpec system-platform | Delta cohérent validé strictement ; contrats historiques préservés. |
| Intégrations CAB/CCAB/CABU | Versions3.2.1 alignées ; CABU distribue le parcours MCP et le suivi du même reçu. |
| docs/platform-operations.md | Finalisation locale existante conservée, complément canonique dans BUILD/TECHNICAL. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; aucune configuration installée éditée manuellement. |

## Livraison et activation
Version cible3.2.1, sans remplacement de la release3.2.0. L’inventaire intègre
toutes les modifications du correctif et les rapports CAB générés dans cette
session. Seule DIU peut ajuster indirectement PROJECT_VERSION. Aucun secret
n’est ajouté ni nouvelle dépendance installée. Les états source, publication,
paquet installé, service actif, finalisation et retour MCP restent distincts.
