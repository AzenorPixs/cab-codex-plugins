# Grille de décision du pilotage — CAB 2.2.28

Cette grille couvre les dimensions de décision connues, pas une promesse de
connaître tout incident futur. Lire la ligne du cas, puis seulement sa référence.
Le noyau reste obligatoire ; ne pas concaténer toutes les références ou relire
le moteur pour appliquer une voie déjà qualifiée. Un code d’erreur et sa date
priment sur une interprétation d’un compteur agrégé.

## Lire les preuves au bon niveau

- `/runs/<run>/status` : résumé du RUN ; READY ne décide ni n’acquiert.
- `/decision/<requestId>/admission` : admission locale à cet instant, pas statut
  broker ni autorisation d’exécution ; owner/validation enregistrés ne décident pas.
- `/operations?operationId=...` : projection bornée. Un champ omis n’est pas une
  valeur null du registre ; notamment accessId/manifeste/digests peuvent manquer.
- Si nécessaire, traiter GET `/runs` localement, sélectionner uniquement le RUN
  et l’opération, puis restituer les champs non secrets utiles. Ne jamais afficher
  le ledger complet, les tokens ou tout l’historique des locks.
- Permission native, intention once, ACK, fin native, revue métier et libération
  d’accès sont des preuves distinctes. unmatchedNativePermissionCount n’est pas
  le nombre total de permissions OpenCode : zéro ne prouve pas leur absence.

## Identité, transport et soumission

| Observation | Preuve / décision propriétaire | Référence ciblée |
|---|---|---|
| Mauvais workspace/RUN/SID/version | Vérifier les identités chargées et la génération ; aucune mutation par déduction du titre | [triage](incident-triage.md) |
| Page demandant un appairage, API non testée | Vérifier le client authentifié et le même SID avant toute demande hôte | [reprise propriétaire](owner-reconciliation.md) |
| GET401 | Client CAB authentifié ; ne pas conclure à une session perdue | [interfaces](protocol-interfaces.md) |
| Outil absent du catalogue Codex | Vérifier le catalogue OpenCode du SID concerné ; ne pas lancer un shell pour découvrir un MCP | [native](technical-native.md) |
| Valeurs préparées, wrapper littéral qualifié running | Corrélation anticipée possible ; attendre l’admission et la décision effectives | [soumission](validation-submission.md) |
| SID occupé par request_validation ordinaire déjà admis | Revoir et décider sur les données exactes visibles ; ne pas attendre idle/fin du wrapper pour fournir la décision qu’il attend | [soumission](validation-submission.md) |
| UUID/digest/variables calculés dans execute, metadata vide | Opaque pendant running ; garder les identifiants, observer la même demande. Le timeout ne décide pas | [soumission](validation-submission.md) |
| Wrapper completed ou erreur MCP scellée | Vérifier le call unique, l’input exact, la troncature et la corrélation ; pas de nouvelle demande aveugle | [mandats](technical-mandates.md) |
| Notification FAILED ancienne, corrélation MATCHED actuelle | Comparer les dates ; poursuivre l’état courant, sans rejouer la notification comme un effet | [triage](incident-triage.md) |
| Readiness absente,503 transitoire | Conserver le même PENDING et ses identifiants ; observer la reprise de notification | [terminal et transition](not-admitted-retirement.md) |
| Contrat entrant ou broker explicitement incompatible,409 | Diagnostiquer version/schéma ; ne pas convertir une incompatibilité en autorisation | [triage](incident-triage.md) |
| Broker NOT_ADMITTED, préparation locale sans décision | Terminal natif conservé ; retrait local qualifié seulement, puis identifiants neufs | [retrait](not-admitted-retirement.md) |
| Broker APPROVED, décision locale absente après interruption | Restaurer uniquement sur demande/réponse natives exactes et preuves de la voie qualifiée ; pas d’accord reconstruit depuis READY | [reprise](technical-recovery.md) |
| APPROVED cité pour une autre unité du même RUN/SID | Relier requestId, approval_id et opération courante avant de conclure à une divergence ; ancien reçu sans autorité sur le nouveau shell | [soumission](validation-submission.md) |
| Broker REJECTED, opération locale PREPARED | Ne pas approuver ni acquérir pour clôturer ; qualifier le rejet natif par la voie existante. Si elle ne couvre pas ce cas, garder l’historique et signaler la lacune | [reprise autonome](autonomous-recovery.md) |
| Broker EXPIRED | L’expiration ne prouve pas l’absence d’effet ; croiser opération, accès et natif avant toute unité de remplacement | [reprise](technical-recovery.md) |
| Broker CANCELLED, préparation encore présente | Clôture locale seulement par preuve d’annulation native corrélée et voie qualifiée ; pas de réouverture ou décision fictive | [reprise autonome](autonomous-recovery.md) |
| Coordination retirée mais broker encore PENDING | Vérifier le reçu autoritaire de retrait, identités et absence d’effet ; annulation native seulement si encore PENDING selon le contrat, jamais sur APPROVED/REJECTED/EXPIRED | [retrait](approved-shell-retirement.md) |
| PREPARED sans contexte local, broker PENDING | Restaurer seulement sur preuve PENDING exacte/fraîche ; pas si déjà enregistré ou NOT_ADMITTED | [reprise autonome](autonomous-recovery.md) |

## Décision, accès et permission

| Observation | Preuve / décision propriétaire | Référence ciblée |
|---|---|---|
| PENDING, aucune décision durable | Revue du mandat exact ; ne pas envoyer un effet avant décision | [session](protocol-session.md) |
| Décision refusée run-transition-in-flight malgré STABLE | Relire décision/admission ; même demande encore indécise et preuves valides après stabilisation, puis même décision | [admission](admission-state.md) |
| Acquisition refusée run-transition-in-flight | Lire l’accès exact ; HELD existant se poursuit, sinon même acquisition seulement après stabilisation et recontrôles | [admission](admission-state.md) |
| APPROVED, pas d’accès, exclusiveResources vide/non prouvée | Demander locks/acquire au contrôleur sur l’opération existante ; exiger HELD, puis le contrôleur seul émet once | [soumission](validation-submission.md) |
| APPROVED, admission exclusive prouvée | L’admission interne peut acquérir ; réservation seule ou absence de conflit observé ne prouve pas l’exclusivité | [concurrence](concurrent-runs.md) |
| Permission exacte pending, accès HELD | Recontrôles du contrôleur ; conserver la même permission, pas de réponse once directe ni nouvel appel edit/shell | [soumission](validation-submission.md) |
| Permission présente mais compteur unmatched à zéro | Lire l’opération, son accès et le natif ; une permission corrélée peut attendre HELD | [soumission](validation-submission.md) |
| Input/path/digest divergent | Garder la décision historique ; qualifier le refus natif et le retrait applicable, jamais réécrire le hash pour exécuter | [garde input](native-input-guard.md) |
| Reprise exigeant idle, SID cible encore actif | Ne pas déclarer la frontière de reprise idle ; observer l’appel exact sans nouvelle permission | [reprise](technical-recovery.md) |
| Permission appartenant à un autre SID/RUN | Ne pas la traiter ni l’attribuer au RUN courant ; un gel commun exige sa propre justification | [concurrence](concurrent-runs.md) |
| Accès WAITING | Attente de l’ensemble complet ; aucune acquisition partielle ni effet | [concurrence](concurrent-runs.md) |
| Accès STALE / révision changée | Relecture et nouvelle unité selon la procédure ; pas de substitution de révision dans une ancienne décision | [concurrence](concurrent-runs.md) |
| HELD restauré après interruption | Réconciliation propriétaire du seul accès nécessaire ; ne pas réacquérir ou modifier token/fencing à la main | [reprise autonome](owner-reconciliation.md) |
| APPROVED/HELD jamais commencé devenu obsolète | Clôture de coordination qualifiée ; vérifier toutes les opérations liées avant de libérer | [retrait HELD](approved-held-retirement.md) |
| Shell refusé sans accès | Diagnostic/retrait qualifié ; acquisition pour clôture seulement si ses conditions strictes restent satisfaites | [shell sans accès](approved-shell-retirement.md) |
| Sous-opération shell/edit refusée sur parent HELD protégé | Retirer seulement l’enfant ; parent et ses autres effets restent protégés | [retrait attaché](approved-attached-shell-retirement.md) |

## Effet, clôture et ressources partagées

| Observation | Preuve / décision propriétaire | Référence ciblée |
|---|---|---|
| once INTENT / réponse perdue | Issue incertaine ; jamais envoyer une deuxième once pour vérifier | [reprise](technical-recovery.md) |
| once ACK, pas de fin native | Protéger l’effet ; observer le même call/journal, pas de libération par timeout/idle | [cycle shell](shell-background.md) |
| Fin native réussie | Revue du contenu/résultat puis libération explicite appropriée ; COMPLETED n’est pas RELEASED | [concurrence](concurrent-runs.md) |
| Fin native non nulle / timeout | L’exécution peut être prouvée sans réussite métier ; garder exit et protections, compensation sous mandat neuf | [cycle shell](shell-background.md) |
| Effet ambigu, journal incomplet ou permission disparue | UNKNOWN et protection conservés jusqu’à preuve corrélée ; pas de NO_EFFECT inventé | [reprise](technical-recovery.md) |
| Shell background démarré avec shellID | Le démarrage n’est pas une fin ; observer le même Shell.Info et conserver l’accès jusqu’à la preuve terminale | [background](shell-background.md) |
| HTTP204 externe sans ACK durable CAB | Ne pas créer rétroactivement onceAcknowledged ; conserver l’incertitude et la voie de réconciliation applicable | [reprise](technical-recovery.md) |
| Ancien port foreground timeouté | Quarantaine/sondes qualifiées seulement ; ne pas tuer le processus ni rendre le port libre par supposition | [reprise autonome](autonomous-recovery.md) |
| Bail de test HELD indépendant | Le conserver ; une opération disjointe peut progresser, la libération du bail possède sa propre preuve | [concurrence](concurrent-runs.md) |
| Bail de test WAITING | Aucune réservation partielle ; attendre ou annuler cette attente selon son mandat | [concurrence](concurrent-runs.md) |
| Bail de test restauré ou token perdu | Reprendre le payload exact ou la réconciliation qualifiée ; ne jamais reconstruire un token ou libérer par absence de contexte | [concurrence](concurrent-runs.md) |
| Correction dans un accès déjà détenu | Nouvelle décision et locks/attach dans le même ensemble qualifié ; pas de nouvelle ressource dissimulée | [concurrence](concurrent-runs.md) |
| Supervisor WAITING ou RUN agrégé BLOCKED | Identifier la garde de l’opération exacte ; ne pas réconcilier tout l’historique pour effacer un résumé | [triage](incident-triage.md) |
| Archivage réussi mais statistiques absentes | Reprendre seulement le rapport sous son mandat, pas réarchiver ni déclarer terminé | [clôture](protocol-closure.md) |

## Mise à jour, session et autorité

| Observation | Preuve / décision propriétaire | Référence ciblée |
|---|---|---|
| Plugin installé / service actif | Vérifier les quatre versions, readiness, workspace et adoption ; source/paquet/processus sont distincts | [CABU](component-update.md) |
| Jeu CAB conforme | CABU idempotent, aucune bascule requise ; ne pas redémarrer pour produire une preuve | [CABU](component-update.md) |
| Coupure CABU ou réponse perdue | Relire le même reçu ; ne pas créer de transaction pour contourner une issue incertaine | [continuité](transport-continuity.md) |
| MCP_RECOVERY_REQUIRED | Diagnostic et même reçu ; récupération bornée sous accord permanent lié au reçu exact, jamais rejoué après intention | [MCP](mcp-pending-recovery.md) |
| Nouvelle identité PID/version inattendue | Requalifier la continuité ; ne pas fabriquer ADOPTED ou restaurer un ancien état métier | [continuité](transport-continuity.md) |
| Nouveau SID nécessaire dans le même RUN | Handoff explicite, candidate qualifiée et historique protégé ; pas un simple changement de champ | [handoff](session-handoff.md) |
| Transition modèle / recovery job | Respecter sa garde et son reçu propres ; ne pas remplacer fournisseur/modèle ou SID pour contourner une validation | [modèles](protocol-model.md) |
| Compactage ou métrique cache/tokens absente | Reprise par checkpoint et contrat applicable ; absence de télémétrie n’autorise aucun effet et ne prouve aucune économie | [compactage](protocol-compaction.md) |
| Décision hors périmètre du change | Présenter au développeur le besoin exact et son impact ; conserver les accords internes déjà acquis | [noyau](protocol-core.md) |

## Cas inconnu ou preuves contradictoires

Ne choisir aucune ligne par analogie si ses préconditions ne sont pas établies.
L’orchestrateur conserve les identités, états durables et effets incertains ;
il collecte localement un diagnostic borné (dates, versions, IDs, erreur,
preuve manquante) sans secret ni nouveau test à effet hors mandat. Les unités
indépendantes déjà autorisées continuent avec leurs propres gardes.

Un défaut technique est transmis au correcteur CAB selon le mandat de
coordination, sans modification concurrente du RUN par ce chat. Une extension
métier seule exige l’arbitrage du développeur. Ni incertitude technique ni
policy absente ne crée une nouvelle autorité. Toute nouvelle voie documentaire
ou fonctionnelle suit SCM, version, commit/publication puis CABU ; son écriture
ne prouve ni activation ni résolution du cas métier.

ASK nominal sans permission réelle, grant sauvegardé ou terminal de lecture
sans once avec parent seulement référencé : suivre [le contrat ciblé](native-permission-grants.md).
