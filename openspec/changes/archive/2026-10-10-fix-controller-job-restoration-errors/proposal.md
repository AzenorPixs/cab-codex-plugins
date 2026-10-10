## Why

CGP-05 constate que le contrôleur masque toutes les erreurs de lecture ou de
décodage de `controller-job.json`. Un contrat illisible devient ainsi un job
absent sans diagnostic, ce qui compromet la continuité de supervision.

## What Changes

- Conserver le démarrage sans job uniquement lorsque le fichier est absent.
- Refuser le démarrage sur un JSON invalide ou une autre erreur de lecture,
  avant toute interface HTTP ou connexion aux composants pilotés.
- Produire un diagnostic qui distingue décodage et lecture sans exposer le
  contenu persistant, le message brut de l'erreur ou une donnée sensible.
- Préserver les contrats valides et les fichiers en erreur sans réparation,
  suppression ou réinitialisation automatique.
- Ajouter des tests isolés et les précisions documentaires nécessaires.
- À la demande complémentaire du développeur, extraire le protocole des
  sessions pilotées dans `ORCHESTRATED_CODING.md` à la racine de chacun des
  huit projets possédant AGENTS.md, templates compris, et remplacer le bloc
  de protocole de leurs AGENTS.md par un renvoi obligatoire. Y documenter
  les détails techniques déjà validés du pilotage CAB et adapter les tests
  de distribution à cette référence dédiée.
- Le développeur précise que ce fichier est facultatif à l'échelle du projet
  et réservé aux projets nécessitant un pilotage par orchestrateur. Les huit
  AGENTS.md l'indiquent explicitement ; son absence ne bloque pas une session
  directe ou un projet sans besoin de pilotage.
- Après validation du correctif, aligner les artefacts versionnés sur
  `0.87.0`, selon la demande explicite du développeur.

## Capabilities

### Modified Capabilities

- `controller-transport` : restauration explicite du contrat de job et
  diagnostic sûr lors d'un refus de démarrage.
- `codex-integration-distribution` : version de base commune `0.87.0`.
- `codex-integration-distribution` : référence locale du protocole piloté et
  distinction explicite avec les sessions directes SCM.

## Impact

Contrôleur Node.js, tests de restauration et de distribution, documentation
technique et publique, changelog, références OpenSpec et versions distribuées.
Lot documentaire complémentaire autorisé : AGENTS.md et
ORCHESTRATED_CODING.md de cab, diu, pldap, pfd, pixs, tools-codex, template et
pixs-template. Aucun AGENTS.md n'a été trouvé dans AutoIt ou pixs-perl dans
l'inventaire ciblé ; leurs sources ne sont pas modifiées.
Le change est le seul traité et archivé par cette session SCM directe.
Aucune migration, dépendance, réparation de runtime, opération Git,
installation de profil ou intervention sur un service réel n'est incluse.
