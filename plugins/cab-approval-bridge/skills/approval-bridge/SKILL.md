---
name: CAB
description: Piloter OpenCode par mandat autonome et revue finale ; reprendre les RUN et maintenir CAB sur demande.
---

# CAB — Codex Approval Bridge

Contrat 2.7.3 : lire [le noyau](references/protocol-core.md), [l'index](references/protocol-index.md)
et les références utiles. Transmettre les obligations au codeur avant son mandat.
AGENTS.md résout ce contrat.

Charger [autonomie et ateliers](references/autonomy-and-ateliers.md) au
démarrage/reprise/update. Vérifier les versions actives, dont SGS/CCAB.
Pour un incident, identifier le reçu avant toute récupération.

À chaque invocation du skill, consulter la file CCAB et les sessions de codage
accessibles. Traiter les incidents selon le contrat CCAB : qualifier sur preuves,
réaliser les correctifs CAB par SCM et CI/CD, ou constater un faux positif ;
coordonner les déclarants, les aider à reprendre et purger les entrées résolues
après leur retour vérifié. Préserver les RUN et les effets incertains.
Lorsqu'une session de codage transmet directement une déclaration CCAB,
la prendre en charge sans attendre le contrôle périodique si aucun autre
correctif n'est en cours ; respecter la file et les réservations existantes.

Examiner les sessions de codage hors SCM et SCMP avant de conclure à un arrêt
injustifié. Une fin de session, une pause ou une dépendance insatisfaite est un
motif légitime. Pour une session arrêtée sans justification, inviter son
responsable à reprendre le travail déjà autorisé jusqu'à son achèvement, sans
dupliquer une session active ni contourner ses décisions ou protections. Une
invocation effectue ce contrôle ; elle ne crée pas de planification récurrente.

Avant codage, développeur et orchestrateur tranchent les choix nécessaires.
Toute nouvelle mission suit [le mandat autonome](references/autonomous-mandates.md) :
cadrage initial, réalisation sans validation intermédiaire, quatre exceptions et
revue finale du code et des tests. Les décisions unitaires restent historiques. Broker : transport ; contrôleur : contrôles ; superviseur : observation.
Conserver les preuves ; une réponse perdue ne permet aucun rejeu.

| Action | Références à lire |
|---|---|
| Mission/coordination | [mandat](references/autonomous-mandates.md), [codeurs](references/coder-coordination.md), [bancs](references/external-execution.md) |
| Atelier | [autonomie](references/autonomy-and-ateliers.md), [DevOps](references/devops-resources.md) |
| Statistiques/direct | Skill SGS et runtime-collection.md ; direct explicite |
| Entrée/reprise | [monitor](references/monitor-service.md), [bootstrap](references/protocol-bootstrap.md), [préparation](references/technical-startup.md), [PLLM initial](references/protocol-model.md) |
| Incident | Skill CCAB ; [triage](references/owner-diagnostics.md), [reprise](references/recovery-policy.md) |
| Unité historique | [soumission](references/validation-submission.md), [input exact](references/native-input-guard.md) |
| Mise à jour | [component-update](references/component-update.md), [MCP](references/mcp-pending-recovery.md), scripts/cgpt-approval-bridge-update.mjs |
| Clôture | [gate](references/protocol-closure.md), [OC](references/protocol-lifecycle.md), [purge](references/change-erasure.md), [lots](references/retired-run-cleanup.md) |

Les consultations `/CAB status`, `source` et `stats` suivent directement leur
référence de commande sans charger ce skill ni initialiser de session. Les
versions du paquet, des fichiers et des processus sont rapportées séparément.
La télémétrie ne prouve pas un effet métier. Les effets incertains restent
protégés ; les travaux disjoints autorisés peuvent continuer.

Historique : accès HELD ou exclusivité prouvée ; contrôleur seul pour once et
INTENT/ACK. APPROVED ne vaut pas HELD. Ni once directe ni ACK rétroactif ; détails : index.
Dépendances : [OpenSpec](references/dependency-authority.md).
