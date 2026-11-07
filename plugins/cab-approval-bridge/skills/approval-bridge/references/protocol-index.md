# Index du protocole CAB 2.4.2

Avant une remontée, appliquer le [triage propriétaire autonome](owner-diagnostics.md) et sa seule référence de cas.

Pour choisir sans relecture globale : [grille de décision](pilot-state-matrix.md) ;
pour une unité ordinaire : [soumission, décision et acquisition](validation-submission.md).

Le noyau protocol-core.md reste commun. Charger la branche utile, pas cet
ensemble intégral. La version distribuée est normative ; les versions citées
pour un incident ou une migration restent des faits historiques.
Après le nettoyage OC : [effacement ciblé des briques](change-erasure.md).

| Besoin | Contrat et détails |
|---|---|
| Autorité, permissions, durée, finalité | [protocol-core](protocol-core.md) |
| Autonomie, ateliers, lectures et validation des résultats | [autonomie du change](autonomy-and-ateliers.md) |
| Collecte permanente SGS et session Codex directe | [collecte SGS](../../sgs/references/runtime-collection.md) |
| Déclaration et traitement des incidents | Skill/commande CCAB du même paquet ; FIFO et lots justifiés |
| Démarrage et cadrages | [protocol-bootstrap](protocol-bootstrap.md), [technical-startup](technical-startup.md), [monitor-service](monitor-service.md) |
| Identités et propriétaires | [protocol-coordination](protocol-coordination.md), [concurrent-runs](concurrent-runs.md) |
| Modèle et raccord | [protocol-model](protocol-model.md), [model-policy](model-policy.md) |
| Mandat, preuves, clôture différée | [protocol-session](protocol-session.md), [technical-mandates](technical-mandates.md), [run-lifecycle](run-lifecycle.md) |
| API et persistance | [protocol-interfaces](protocol-interfaces.md), [transport-continuity](transport-continuity.md) |
| Transition BUSY malgré STABLE, décision ou acquisition | [admission et reprise sur les mêmes identités](admission-state.md) |
| Shell durable | [shell-background](shell-background.md) |
| Shell approuvé refusé sans accès avant once | [shell approuvé sans accès](approved-shell-retirement.md) ; composition ordinaire conditionnelle par le propriétaire |
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

Shell ou edit refusé avant once attaché à un parent HELD : [retrait ciblé](approved-attached-shell-retirement.md). Conserver le parent et ses autres effets.

NOT_ADMITTED natif et préparation sans décision : [retrait qualifié](not-admitted-retirement.md). Une absence temporaire de readiness donne503, pas une incompatibilité de contrat.

Appairage navigateur ou accès restauré : suivre [la reprise propriétaire autonome](owner-reconciliation.md),
sans sollicitation humaine pour une procédure déjà mandatée.

Edit attaché refusé et historique CANCELLED d’ancien SID sans effet :
[retrait isolé](approved-attached-shell-retirement.md), sans libération du parent.

PENDING annulé nativement mais PREPARED local : [convergence qualifiée](autonomous-recovery.md),
sans rejeu du cancel ; mise en forme et diagnostics purs distingués.

ASK nominal sans permission réelle, grant sauvegardé ou terminal de lecture
sans once avec parent seulement référencé : suivre [le contrat ciblé](native-permission-grants.md).

Restauration ASK par révocation de grants protégés : l’accord permanent du
développeur couvre la maintenance partagée bornée selon
[native-permission-grants](native-permission-grants.md). Ne pas redemander
cet accord à chaque session ; une frontière active se coordonne sans forçage.

Edit ou shell refusé avant once avec parent HELD seulement référencé :
[retrait propriétaire isolé](approved-attached-shell-retirement.md), sans faux rattachement.

Notification stalled/FAILED sans lease : [qualifier le sous-état](technical-recovery.md#notification-bloquée--qualifier-le-sous-état) avant toute action ciblée.

Accès HELD non restauré, membres terminaux et token perdu : [libération owner](recovery-policy.md#libérer-un-accès-après-perte-de-token-par-compactage), sans restitution implicite des baux ou effets inconnus.

Token perdu, accès HELD dédié à un seul edit/shell refusé avant once :
[retrait puis libération propriétaire](approved-attached-shell-retirement.md#accès-dédié-à-un-seul-membre-refusé-avant-once), deux reçus et gardes conservées.

Write V2 refusé (permission edit), call/ACK masqués dans un ancien diagnostic :
[preuve et retrait qualifiés](approved-attached-shell-retirement.md#write-v2-refusé-sous-permission-edit), sans conversion ni exécution de l’input divergent.

Remédiation COMPLETED avec livraisonfalse : [distinguer exécution et résultat vérifié](technical-recovery.md#résultat-vérifié-dune-réconciliation-de-notification), sans consommer un nouveau budget à l’aveugle.

Frontières anciennes, corrélation des mandats et port après reboot : [historical-owner-boundaries](historical-owner-boundaries.md).
