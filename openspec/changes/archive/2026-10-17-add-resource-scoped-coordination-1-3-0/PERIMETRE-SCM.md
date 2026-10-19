# Périmètre autonome SCM — validé

## Identification

- Projet réel : CAB, racine `/home/devops/datas/cab`. Les variables génériques Pixs du modèle SCM sont instanciées pour CAB, sans modifier PROMPTS/SCM.md.
- Session : `cab-1-3-0-resource-scoped-coordination`.
- Change unique : `add-resource-scoped-coordination-1-3-0`.
- Objectif : réaliser la coordination ciblée spécifiée dans ce dossier et aligner toutes les briques sources sur 1.3.0, jusqu'aux tests, à la documentation, à la synchronisation et à l'archive vérifiée.
- Statut : contrat et périmètre SCM explicitement validés par le développeur le 16 octobre 2026. Cycle complet autorisé jusqu’à l’archive et son rapport, sans Git, déploiement ni intervention sur les RUN actifs.

## Lots et fichiers prévus

| Lot | Fichiers et modification minimale | Dépendance / preuve |
|---|---|---|
| 1. Accès durables | `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs`, `cgpt-approval-bridge-registry-lock.py` ; périmètres, ensembles atomiques, promotions, générations, révisions et reçus | Base des lots suivants ; tests de registre, conflits et crash |
| 2. Mandats et effets | `src/cgpt_approval_bridge_server.py`, `cgpt_approval_bridge_router.py`, `cgpt_approval_bridge_journal.py`, scripts `cgpt-approval-bridge-controller.mjs`, `cgpt-approval-bridge-job-context.mjs` ; transport d'identité, vérifications, API et gates | Lot 1 ; tests broker, HTTP, permissions et fins natives simulées |
| 3. Publication | Registre, contrôleur et contexte précités ; validation/publication ciblées, réconciliation affectée et REPORT | Lots 1/2 ; tests de révisions, preuves, publication idempotente et rapport |
| 4. Exceptions et suivi | Scripts `cgpt-approval-bridge-supervisor.mjs`, `cgpt-approval-bridge-supervisor-context.mjs`, `cgpt-approval-bridge-opencode-sse-client.mjs`, `cgpt-approval-bridge-healthcheck.mjs`, `cgpt-approval-bridge-reset.py` ; quatre causes, ciblage, attente et refus de purge | Lots 1/2 ; tests de pause/arrêt, diagnostics et sécurité de purge |
| 5. Mesures et release | Scripts statistiques effectivement livrés, `cgpt-approval-bridge-prompts.py`, `pyproject.toml`, `.codex/commands/cab.md`, manifeste, catalogue et unités du plugin ; métriques et cohérence 1.3.0 | Lots 1 à 4 ; tests de statistiques, inventaire et négociation |
| 6. Contrats et documentation | Les huit deltas de ce dossier et leurs specs canoniques, PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md, ORCHESTRATED_CODING.md, skills/références/métadonnées du plugin | Mises à jour avec chaque lot ; revue documentaire et OpenSpec strict |
| 7. Qualification et archive | Tests Python/Node existants concernés et nouveaux tests ciblés ; archive de ce seul change et son STATISTIQUES.md | Tous les lots ; scénarios de design.md, tâches, validations et rapport réel |

Tous les scripts mentionnés sans chemin complet dans le tableau appartiennent à `plugins/cab-approval-bridge/scripts/`. Les nouveaux tests et éventuels modules de coordination nécessaires restent dans les répertoires de code/test déjà établis, sans nouvelle dépendance. Leur responsabilité et emplacement doivent être consignés avant leur création.

Les tests existants directement concernés comprennent `tests/concurrent-run-registry.test.mjs`, `tests/concurrent-controller.test.mjs`, `tests/concurrent-supervisor.test.mjs`, `tests/native-statistics.test.mjs`, `tests/controller-service-distribution.test.mjs` et `tests/test_concurrent_broker.py` ; les tests de persistance, permissions, purge et distribution nécessaires sont déterminés par recherche ciblée avant chaque lot.

## Comportements préservés et incompatibilités proposées

Conserver broker neutre, transport MCP local, décisions explicites, ask/once, un mandat par édition/commande, identité et exclusivité du change, persistance, reprise sans rejeu, gates et rapport d'archive. La sécurité, les contrôles natifs et les tests ne sont pas affaiblis.

L'acceptation du périmètre comprend le remplacement de la barrière et file globales ordinaires, le refus des anciens appels mutables incompatibles, les nouveaux champs de protocole, le registre schéma 4 et le format broker compatible proposé dans design.md. Ces incompatibilités doivent être documentées et testées ; aucun runtime actif n'est converti par la session source.

Extension explicitement validée par le développeur pendant la session : intégrer aussi les fonctions et la clôture du change integrate-observation-statistics. Les deux changes sont réalisés dans le jeu source CAB 1.3.0, qualifiés puis archivés distinctement avec un rapport chacun. Le job d’observation arrêté reste arrêté ; aucune action sur les services ou RUN actifs n’est ajoutée.

## Critères et validations

| Critère | Vérification prévue |
|---|---|
| Fichiers indépendants utilisables simultanément | Tests à trois RUN sans ready de cohorte |
| Ensemble atomique, lectures compatibles et attente équitable | Tests de concurrence/ordre réel et absence d'attribution partielle |
| Fichier privé promu sans course | Tests d'arrivée d'un pair pendant effet et recouvrement parent |
| Décision exacte et once conservés | Tests d'identités, révisions périmées, jeton libéré et règle native divergente |
| Validations protégées sur leur périmètre | Test OpenSpec simulé en lecture avec édition indépendante ; invalidation de sous-arbre |
| Publication sans arrêt des pairs | Tests HTTP de publication/REPORT, révisions ciblées et reçus après crash |
| Global limité aux quatre exceptions | Tests de ciblage, drainage, quiescence, intégrité commune et refus des effets non cadrés |
| Reprise et migration sans perte | États synthétiques anciens/nouveaux, crash et retour arrière sans perte d'effets |
| Version et documentation cohérentes | Inventaire de toutes les briques, contrôles de distribution et matrice par document |
| Livraison source clôturée | Syntaxe, suites applicables, OpenSpec strict, archive unique et rapport vérifié |

La qualification sur un OpenCode vivant et les gains réels de productivité ne sont pas prouvés par les tests simulés : ils restent des limites explicites, sans déploiement implicite. Chaque validation sera rapportée comme réussie, échouée, non exécutée, non disponible ou non pertinente selon son résultat réel.

## Matrice documentaire initiale

| Document | Constat et traitement prévu |
|---|---|
| AGENTS.md | Règles générales compatibles ; inchangé, pas de nouvelle autorisation inventée |
| PROJECT.md | Version 1.2.1 et publication exclusive ; mise à jour architecture 1.3.0 |
| TECHNICAL.md | API, formats et barrières actuels ; mise à jour coordination/migration |
| BUILD.md | Distribution et retour arrière ; mise à jour paquet complet/capacités |
| DEVOPS.md | Inventaire DIU et chemin explicite OpenSpec ; inchangé en l'absence de changement d'environnement |
| README.md | Sections architecture/concurrence et version 1.2.1 ; mise à jour comportement public |
| CHANGELOG.md | Convention de préparation source existante ; entrée 1.3.0 sans annoncer déploiement/publication |
| ORCHESTRATED_CODING.md | Section concurrente et exemples sous barrière globale ; mise à jour protocole distribué |
| openspec/specs/ | Huit capacités modifiées selon les deltas ; synchronisation avant archive éligible |

## Hors périmètre et repli

Aucune inspection ni action Git pendant SCM ; aucun commit préparé/proposé, push, branche, tag ou release. Aucun déploiement, installation système, appel API aux services actifs, redémarrage, purge de runtime, migration de données active ou propagation vers un autre projet. PROMPTS/ et configurations locales restent inchangés. La compétence coding-session-statistics et les sondes pilotées ne sont pas utilisées.

La réalisation source conserve les états actifs et se vérifie dans des fixtures isolées. Le mécanisme de migration/retour arrière est implémenté et testé hors ligne ; son exécution réelle reste hors périmètre. Une modification concurrente inattendue est conservée et réexaminée sans écrasement. Aucun nettoyage large ou restauration Git n'est autorisé.

## Barrière SCM

Référence : PROMPTS/SCM.md, section 4 : « Avant toute modification, le développeur doit valider explicitement le périmètre autonome proposé ».

Après validation explicite de ce dossier et de ce périmètre, le cycle source, tests, documentation, synchronisation, archivage ciblé et rapport est autonome sans nouvelles validations intermédiaires, tant qu'aucun écart hors périmètre ne survient.
