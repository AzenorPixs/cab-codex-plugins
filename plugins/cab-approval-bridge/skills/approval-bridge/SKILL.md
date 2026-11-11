---
name: CAB
description: Piloter OpenCode par mandat autonome et revue finale ; reprendre les RUN et maintenir CAB sur demande.
---

# CAB — Codex Approval Bridge

Contrat 2.6.0 : lire [le noyau](references/protocol-core.md), [l'index](references/protocol-index.md)
et les références utiles. Transmettre les obligations au codeur avant son mandat.
AGENTS.md résout ce contrat.

Charger [autonomie et ateliers](references/autonomy-and-ateliers.md) au
démarrage/reprise/update. Vérifier les versions actives, dont SGS/CCAB.
Pour un incident, identifier le reçu avant toute récupération.

Avant codage, développeur et orchestrateur tranchent les choix nécessaires.
Toute nouvelle mission suit [le mandat autonome](references/autonomous-mandates.md) :
cadrage initial, réalisation sans validation intermédiaire, quatre exceptions et
revue finale du code et des tests. Les décisions unitaires restent historiques. Broker : transport ; contrôleur : contrôles ; superviseur : observation.
Conserver les preuves ; une réponse perdue ne permet aucun rejeu.

| Action | Références à lire |
|---|---|
| Atelier et visibilité SID | [autonomie et ateliers](references/autonomy-and-ateliers.md) ; bancs du cadrage initial |
| Statistiques natives ou CAB direct | Skill SGS du même paquet, référence `runtime-collection.md` ; direct uniquement sur demande explicite |
| Incident CAB | Skill/commande CCAB du même paquet ; déclaration autonome, traitement par l’orchestrateur désigné |
| Mandat write/edit | [arguments natifs et digest](references/native-input-guard.md) ; calculateur distribué et objet exact |
| Entrée/reprise | [monitor-service](references/monitor-service.md) d'abord, puis [bootstrap](references/protocol-bootstrap.md), [préparation](references/technical-startup.md) ; [PLLM](references/protocol-model.md) au seul démarrage initial |
| Mandat et compte rendu | [mission autonome](references/autonomous-mandates.md), [session](references/protocol-session.md), [soumission](references/validation-submission.md), [concurrence](references/concurrent-runs.md), [cycle](references/run-lifecycle.md) |
| Incident/reprise | [autonomie](references/owner-reconciliation.md), [grille](references/pilot-state-matrix.md) [triage](references/owner-diagnostics.md), [historique/infra](references/historical-owner-boundaries.md) |
| Ressource ou incident natif | [récupération](references/protocol-recovery.md), [politique](references/recovery-policy.md), [accord ASK permanent](references/native-permission-grants.md), [incidents](references/coding-incidents.md) selon le diagnostic |
| Mise à jour demandée | [component-update](references/component-update.md), [MCP](references/mcp-pending-recovery.md) ; script `scripts/cgpt-approval-bridge-update.mjs` du plugin |
| Clôture | [gate](references/protocol-closure.md), [OC](references/protocol-lifecycle.md), [purge CAB](references/change-erasure.md), [lots](references/retired-run-cleanup.md) |

Les consultations `/CAB status`, `source` et `stats` suivent directement leur
référence de commande sans charger ce skill ni initialiser de session. Les
versions du paquet, des fichiers et des processus sont rapportées séparément.
La télémétrie ne prouve pas un effet métier. Les effets incertains restent
protégés ; les travaux disjoints autorisés peuvent continuer.

Pour le profil historique ou une exception, l’orchestrateur demande l’accès au contrôleur (locks/acquire), sauf admission
exclusive prouvée. Le contrôleur seul lie l’accès, émet once et persiste INTENT/ACK.
APPROVED ne vaut pas HELD. Jamais de once directe par le client HTTP, ni d’ACK
externe transformé rétroactivement en reçu CAB.

Atelier : [ressources DEVOPS](references/devops-resources.md), outils RO et
catalogue actualisé ; accès externes par CAB, sans secrets ni socket hôte.
Les reprises spécialisées sont dans l’index.

Dépendances : [OpenSpec](references/dependency-authority.md).
