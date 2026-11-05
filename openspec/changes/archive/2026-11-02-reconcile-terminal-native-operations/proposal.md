# Réconcilier les fins natives terminales sans élargir le gel

Code de lot : non attribué.

## Problème

Après redémarrage, une opération déjà approuvée peut être absente de l’état
mémoire, alors que le transcript montre l’outil natif terminé et qu’aucune
permission n’est plus pendante. CAB 2.1.63 ne restaure une approbation que si
la permission d’origine est encore pendante ; le registre peut alors rester
`PREPARED` sans accès, ce qui ne protège pas la ressource. Une sortie absente,
ambiguë ou non structurée ne prouve toutefois pas `NO_EFFECT`.

## Objectif

Lire le journal natif durable de la session, relier ses événements terminaux
au même RUN, mandat et callID, puis enregistrer la frontière prouvée. Si le
journal ne fournit pas de fin native exploitable, restaurer l’opération en
`UNKNOWN` et protéger son seul ensemble de ressources. Les accès complets sans
recouvrement restent disponibles dans le même RUN ; les conflits attendent.

## Critères d’acceptation

1. CAB lit `GET /api/experimental/session/{sessionID}/log` en mode fini et
   exige son watermark `log.synced` avant d’utiliser une absence ou un résultat.
2. Une fin `session.tool.success` ou `session.tool.failed` est acceptée
   uniquement si sessionID, callID, operationId, demande, approval, empreinte,
   cible et révisions correspondent aux preuves durables existantes.
3. Une réussite native exacte ferme l’opération en `COMPLETED`. Une erreur
   n’est `NO_EFFECT` que si une preuve native reconnue l’atteste et si les
   révisions restent inchangées ; tout autre échec reste `UNKNOWN`.
4. Une permission absente, `executed=false`, un résultat libre ou l’absence
   d’événement avant watermark ne prouvent pas l’absence d’effet et ne
   déclenchent jamais de `once` ou de nouvelle permission.
5. Une opération sans frontière est persistée `UNKNOWN` avec son accès sur
   les ressources d’origine. Les écritures recouvrantes attendent.
6. Des opérations complètes distinctes d’un même RUN peuvent coexister lorsque
   leurs ensembles de ressources ne se recouvrent pas ; les ensembles
   recouvrants restent atomiquement en attente.
7. Les tests couvrent le watermark, l’absence d’événement, les fins réussies,
   les erreurs ambiguës, les callID divergents, le crash et les accès
   indépendants/recouvrants.
8. La version commune CAB/CABU passe à 2.1.64 ; documentation, archivage,
   statistiques, publication et activation restent vérifiés séparément.

## Hors périmètre

Aucune réponse à une permission passée ou actuelle, aucun rejeu de `once`,
aucune décision déduite du silence, d’un timeout, d’`executed=false` ou d’une
permission absente, aucun accès global, nouvelle demande de validation,
modification d’un autre RUN ou exposition de commande, chemin, contenu ou
credential.
