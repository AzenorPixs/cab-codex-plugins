---
name: approval-bridge
description: Met en place, teste et supervise le dialogue OpenCode–Codex via broker MCP stdio, contrôleur local et SSE OpenCode, sans déléguer les décisions.
---

# Codex Approval Bridge

Utiliser ce skill lorsqu’un développeur demande de mettre en place, tester, superviser ou reprendre le pilotage d’OpenCode par Codex.

## Invariants

- `cgpt-validation` est un serveur MCP local `stdio` lancé par OpenCode.
- Le broker ne possède ni port MCP réseau ni serveur MCP HTTP exposé.
- Le broker relaie et persiste les demandes ; il ne décide jamais.
- Une demande porte un `requestId` stable et unique.
- Une deuxième décision pour le même `requestId` est refusée.
- Ne déclarer une étape validée qu’avec une preuve observée dans la session courante.
- `broker_readiness` est l’interface synthétique de supervision.
- `broker_health` reste réservé au diagnostic détaillé.
- Le contrôleur `../../scripts/cgpt-approval-bridge-controller.mjs` (chemin relatif à ce `SKILL.md`) s’exécute exclusivement hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1`. L’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté.
- Le contrôleur n’écoute que `127.0.0.1`.
- OpenCode est observé indépendamment via son SSE HTTP direct.
- Après reconnexion SSE ou divergence, réconcilier l’état réel par HTTP auprès d’OpenCode.
- Les validations normales passent par MCP stdio.
- L’état `GET /mcp` du serveur OpenCode est la source de vérité de connexion MCP pour les sessions persistantes ; une sortie CLI ne peut pas s’y substituer.
- Une session de codage persistante est créée ou réutilisée avec l’API native OpenCode après confirmation de `cgpt-validation: connected`. Tous les mandats passent par `POST /session/<id>/message` et restent observables dans OpenCode.
- Ne jamais lire, journaliser ou afficher de secret.

## Environnement Pixs / Devops

- Sur l’hôte Devops, OpenSpec est installé sous `/home/devops/.local/npm/bin/openspec`.
- Dans le conteneur OpenCode, ce répertoire peut être monté sous `/opt/devops/npm`.
- Utiliser les chemins explicites prévus par l’environnement au lieu de déduire l’absence d’OpenSpec depuis le seul `PATH`.

## Ordre de mise en place

1. Vérifier `GET /global/health` d’OpenCode.
2. Vérifier que `cgpt-validation` est déclaré comme MCP local `stdio`.
3. Vérifier `GET /mcp` et exiger `cgpt-validation: connected`.
4. Si ce statut est absent ou en échec, exécuter seulement la récupération contrôlée `POST /instance/dispose`, puis attendre `/global/health` et `/mcp` sains. Ne jamais tuer ou lancer directement le broker, qui appartient à OpenCode.
5. Démarrer ou réutiliser `../../scripts/cgpt-approval-bridge-controller.mjs` hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1` (ou l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1`).
6. Vérifier le statut local du contrôleur.
7. Démarrer ou maintenir le SSE direct OpenCode.
8. Créer ou réutiliser une session OpenCode persistante via `POST /session`, conserver son identifiant et adresser tous les mandats par `POST /session/<id>/message`.
9. Appeler `broker_readiness` dans cette session, sans accès au projet.
10. Interpréter `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`.
11. Réconcilier l’état OpenCode via HTTP après chaque reconnexion ou divergence, puis revalider `/mcp` avant tout mandat.
12. Vérifier qu’aucune approbation parasite n’est en attente.
13. Tester `request_validation` avec un `requestId` inédit dans la session persistante.
14. Rendre une décision Codex explicite unique.
15. Vérifier la réponse MCP corrélée reçue par OpenCode dans cette session.
16. Créer le heartbeat de trente secondes uniquement après validation complète.

## Readiness

`broker_readiness` doit être utilisé avant tout test actif.

Interprétation :

- `READY` : pilotage nominal.
- `DEGRADED` : pilotage potentiellement poursuivable si l’action reste sûre ; afficher la cause et l’action recommandée.
- `BLOCKED` : arrêter le test ou le pilotage actif concerné.
- `HUMAN_REQUIRED` : suspendre la partie concernée et demander l’intervention humaine requise.

Ne reconstruis pas toi-même une seconde logique de diagnostic si `broker_readiness` fournit déjà :
- `root_cause` ;
- `recommended_action` ;
- `controller_reachable` ;
- `pending_count` ;
- `stalled_count` ;
- `auto_recovery_available`.

## Restitution

Présenter chaque résultat sur une ligne :

`✅ étape — preuve`

ou

`⚠️ étape — cause précise`

Une connexion déclarée par une API ne suffit pas.
Le broker doit être interrogé par `broker_readiness`, puis le test MCP actif doit confirmer le chemin de bout en bout.

## Changement de modèle OC

Avant de modifier le modèle d’un agent OC :

1. Vérifier que le fournisseur et le modèle ciblés sont publiés par l’API OpenCode, sans lire de secret.
2. Exécuter une requête OC temporaire, sans outil ni accès aux fichiers.
3. N’appliquer le changement qu’après une réponse modèle observée.
4. Si le test échoue, ne pas modifier la configuration.
5. Après changement, vérifier le fournisseur, le modèle et le niveau de raisonnement réellement utilisés.

## Arrêt

- Supprimer les heartbeats et healthchecks créés par `/cab`.
- Fermer les clients SSE créés par `/cab`.
- Arrêter uniquement le contrôleur démarré par `/cab`.
- Ne pas arrêter directement `cgpt-validation` : il est géré par OpenCode.
- Ne pas fermer OpenCode ni son conteneur sans instruction explicite.
