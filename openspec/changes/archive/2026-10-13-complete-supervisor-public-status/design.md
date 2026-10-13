## Context

La spécification demande un état local complet. Le superviseur conserve
jobId, sessionId, directory, dernière activité et dernière tentative, mais
/status sérialise un état dépourvu du jalon, du gate et du compteur.
Le contrôleur possède déjà le jalon et le gate dans son contrat de job.

## Goals / Non-Goals

Compléter l'observabilité sans changer l'admissibilité, la cadence, le message
ou les permissions d'une relance. Ne pas reconstruire des tentatives anciennes,
ajouter un ordonnanceur, modifier une décision CAB ou lever un gel.

## Contrat validé

- `lastProvenMilestone` et `terminalGate` reflètent le contrat effectivement
  observé du contrôleur. L'absence de job les rend indisponibles ; un échec de
  réconciliation garde son horodatage et sa cause visibles, sans inventer un
  état courant ni un gate validé.
- `resumeAttemptCount` compte, par job, les émissions de requêtes de reprise
  tentées. Une préparation abandonnée avant émission ne compte pas. Une erreur
  réseau après émission compte comme tentative, pas comme reprise réussie.
- Persister l'incrément avec la tentative avant l'émission ; si cette
  persistance échoue, ne pas émettre la requête. Ce choix ne redéfinit pas le
  traitement existant d'une tentative d'effet inconnu.
- Un job neuf commence à zéro. Le même job conserve son compteur lors d'un
  redémarrage ou d'un transfert de session. Un ancien état sans compteur
  présente une valeur inconnue, conservée tant que ce job reste surveillé ;
  aucune reconstruction depuis la dernière tentative.
- Le résultat existant de la dernière tentative reste distinct du compteur.
  Les identités de job et répertoire conditionnent les valeurs publiées.

## Critères d'acceptation

1. /status expose le jalon, le gate et le compteur attendus pour le bon job.
2. Succès et échec après émission augmentent le compteur ; refus technique,
   gel et préparation abandonnée ne l'augmentent pas.
3. Le redémarrage et le transfert de session conservent le compteur du même job.
4. Un autre job commence à zéro et ne reçoit pas le jalon ou gate précédent.
5. Un ancien état sans compteur reste lisible et signale une valeur inconnue.
6. Une panne de réconciliation ou de persistance ne produit aucune réussite
   fictive ni permission supplémentaire.

## Validation, risques et retour arrière

Compléter les tests HTTP simulés et de redémarrage de la suite superviseur.
Vérifier les clients existants et l'absence de secret dans les champs publiés.
Les nouveaux champs restent additifs. La portée et le traitement de l'inconnu
ont été validés par le développeur avant codage. Aucun fichier historique
n'est supprimé ou réécrit par la préparation de cette proposition.
