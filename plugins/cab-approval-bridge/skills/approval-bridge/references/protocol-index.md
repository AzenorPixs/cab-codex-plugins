# Index du protocole CAB 2.2.15

Le noyau protocol-core.md reste commun. Charger la branche utile, pas cet
ensemble intégral. La version distribuée est normative ; les versions citées
pour un incident ou une migration restent des faits historiques.

| Besoin | Contrat et détails |
|---|---|
| Autorité, permissions, durée, finalité | [protocol-core](protocol-core.md) |
| Démarrage et cadrages | [protocol-bootstrap](protocol-bootstrap.md), [technical-startup](technical-startup.md), [monitor-service](monitor-service.md) |
| Identités et propriétaires | [protocol-coordination](protocol-coordination.md), [concurrent-runs](concurrent-runs.md) |
| Modèle et raccord | [protocol-model](protocol-model.md), [model-policy](model-policy.md) |
| Mandat, preuves, clôture différée | [protocol-session](protocol-session.md), [technical-mandates](technical-mandates.md), [run-lifecycle](run-lifecycle.md) |
| API et persistance | [protocol-interfaces](protocol-interfaces.md), [transport-continuity](transport-continuity.md) |
| Shell durable | [shell-background](shell-background.md) |
| Unité approuvée avec accès HELD avant once | [retrait APPROVED/HELD](approved-held-retirement.md) ; clôture par le propriétaire dans son mandat |
| Récupération autorisée | [recovery-policy](recovery-policy.md), [protocol-recovery](protocol-recovery.md), [technical-recovery](technical-recovery.md) |
| Adaptations OpenCode V2 | [technical-native](technical-native.md) ; suivre ses références spécialisées uniquement selon l'incident |
| Attente et mesures | [protocol-cadences](protocol-cadences.md) |
| Contexte sous pression | [protocol-compaction](protocol-compaction.md) |
| Rapport d'archive et nettoyage | [protocol-lifecycle](protocol-lifecycle.md), [protocol-closure](protocol-closure.md), [technical-lifecycle](technical-lifecycle.md) |
| Mise à jour | [component-update](component-update.md), [command-update](command-update.md) |

Une lacune de distribution se diagnostique sans inventer d'autorité. L'aperçu
recovery indique les preuves et actions disponibles dans le mandat ; attendre
une décision réservée ne justifie pas le gel de ressources indépendantes.

Reprises dans le périmètre du change : [autonomous-recovery](autonomous-recovery.md), autorité de revue, reçus de refus, sondes de port et extension disjointe.

Avant une demande de correctif, appliquer le [triage des incidents](incident-triage.md). Un faux positif établi complète la référence canonique si nécessaire, sans nouvelle autorisation métier.

Changement de session de pilotage avec historique protégé : [session-handoff](session-handoff.md).
