## Context

`handleValidation()` protège déjà le mode manuel. Le chemin
`POST /validation/reminder` appelle cependant `notifyOrchestrator()`, qui
crée un thread puis un tour Codex sans vérifier ce mode. L'incident observé
pendant Pixs montre une décision auxiliaire publiée puis consommée par une
permission native, avant une décision de l'orchestrateur principal.

## Goals / Non-Goals

- Protéger tous les appels à `notifyOrchestrator()` en mode manuel.
- Conserver les rappels corrélés et observables, la décision HTTP explicite
  et unique, les refus des relances terminales et le mode automatique.
- Livrer une version cohérente `0.86.6` pour les briques distribuées.
- Ne pas modifier le broker, les schémas ou les mécanismes de permissions,
  hors déclaration de version. Ne pas déployer la release.

## Decisions

1. Ajouter une garde au début de `notifyOrchestrator()`, avant
   `ensureThread()`. En mode manuel, actualiser le statut avec le
   `requestId` du rappel puis retourner sans appeler Codex App Server.
   Le traitement HTTP corrélé conserve sa réponse 202 et son événement
   de relance ; la demande demeure persistée par le broker. Le même point
   d'entrée protège un éventuel heartbeat sans ajouter de minuterie.
2. Renforcer le test HTTP existant avec un faux Codex qui enregistre les
   méthodes RPC reçues. Deux rappels manuels ne doivent produire aucun
   `thread/start` ni `turn/start`, et aucun `GET /decision` disponible.
   Une décision HTTP explicite doit ensuite être acceptée une seule fois.
3. Aligner les six déclarations de version existantes, les attentes des
   tests et les documents courants. Les helpers sans version propre sont
   distribués sous la version du plugin. Les versions entières des schémas
   restent inchangées. Le suffixe de cache du plugin reste distinct de sa
   version SemVer de base.

## Risks / Trade-offs

Le mode manuel cesse de solliciter le thread auxiliaire pour les rappels ;
l'orchestrateur principal doit continuer d'observer CAB. Cette suppression
est nécessaire à la protection de sa décision. Le mode automatique conserve
son chemin existant. Les tests utilisent uniquement des processus et ports
loopback contrôlés, avec les fichiers temporaires sous la racine CAB.

## Validation and rollback

Avant le code, valider ce change et les spécifications en mode strict.
Après le code, vérifier syntaxe, suites Node/Python, cohérence de version,
UTF-8/LF et conservation des trois changes préexistants. Synchroniser puis
archiver exclusivement ce change, et produire son rapport de statistiques.
La modification reste locale et revue ; aucun état utilisateur n'est migré.
Un retour à l'ancien code réintroduirait le défaut de décision et ne doit pas
être utilisé pour rétablir un pilotage manuel réputé sûr.
