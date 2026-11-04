---
name: CAB
description: Piloter et reprendre une session OpenCode via le protocole CAB, ses décisions unitaires et ses ressources ; installer ou vérifier ses composants lorsque demandé.
---

# CAB — Codex Approval Bridge

Contrat distribué 2.2.19. Pour un pilotage, lire [le noyau](references/protocol-core.md)
et [l'index](references/protocol-index.md), puis uniquement les références de
l'action en cours. Transmettre à l'agent de codage les obligations applicables
avant son mandat. AGENTS.md résout ce contrat ; aucun fichier local
ORCHESTRATED_CODING.md n'est nécessaire. Une session directe SCM n'active pas
ce skill par la seule présence du projet CAB.

Le développeur autorise le travail métier ; l'orchestrateur examine chaque
mandat et ses preuves. Le broker transporte, le contrôleur applique les
contrôles et le superviseur observe la même session. Aucun composant ne décide
à la place de l'orchestrateur. Conserver les identités et l'historique ; une
réponse réseau perdue ne permet ni nouvel effet ni rejeu de once.

| Action | Références à lire |
|---|---|
| Entrée/reprise de pilotage | [monitor-service](references/monitor-service.md) d'abord, puis [bootstrap](references/protocol-bootstrap.md), [préparation](references/technical-startup.md) ; [PLLM](references/protocol-model.md) au seul démarrage initial |
| Mandat et compte rendu | [session](references/protocol-session.md), [mandats](references/technical-mandates.md), [concurrence](references/concurrent-runs.md), [cycle](references/run-lifecycle.md) |
| Diagnostic ou faux positif présumé | [triage](references/incident-triage.md), puis la seule référence du cas |
| Retirer APPROVED avant once | [HELD](references/approved-held-retirement.md), [shell sans accès](references/approved-shell-retirement.md), [shell attaché refusé](references/approved-attached-shell-retirement.md) |
| Changer le SID dans le même RUN | [session-handoff](references/session-handoff.md), après triage ; conserver les effets historiques |
| Ressource ou incident natif | [récupération](references/protocol-recovery.md), [précisions](references/technical-recovery.md), [politique](references/recovery-policy.md), [reprise autonome](references/autonomous-recovery.md), [incidents](references/coding-incidents.md) selon le diagnostic |
| Outils natifs, lecture ou arguments | [adaptations natives](references/technical-native.md) et la référence spécialisée indiquée |
| Transport coupé ou réponse perdue | [continuité](references/transport-continuity.md) et [politique de récupération](references/recovery-policy.md) |
| Attente, contexte ou statistiques | [cadences](references/protocol-cadences.md), [compaction](references/protocol-compaction.md) seulement si nécessaire, [statistiques](references/protocol-lifecycle.md) à l'archivage/clôture |
| Mise à jour demandée | [component-update](references/component-update.md), [command-update](references/command-update.md) ; script `scripts/cgpt-approval-bridge-update.mjs` du plugin |
| Clôture | [closure](references/protocol-closure.md), [nettoyage](references/protocol-lifecycle.md), [précisions](references/technical-lifecycle.md) |

Les consultations `/CAB status`, `source` et `stats` suivent directement leur
référence de commande sans charger ce skill ni initialiser de session. Les
versions du paquet, des fichiers et des processus sont rapportées séparément.
Une indisponibilité de télémétrie ne prouve pas un effet métier. Une protection
pour effet incertain demeure jusqu'à preuve exacte ; les travaux disjoints
autorisés peuvent continuer.

Pour un mandat de codage, le contrôleur est seul à acquérir/lier l’accès,
transmettre once et persister intention/ACK. L’orchestrateur décide via CAB ;
il ne répond jamais once directement avec le client HTTP. Un ACK externe ne
devient pas un reçu CAB par déclaration ou copie après l’exécution.
