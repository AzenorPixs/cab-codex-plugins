## Why

L'ACSM du 2026-10-13 constate que le chargement du contrôleur assimile `null`,
un booléen, un nombre ou une chaîne JSON à un job absent ; un tableau ou un
objet incomplet est accepté sans validation. La référence
`openspec/specs/controller-transport/spec.md`, exigence « Restauration explicite
du job au démarrage », réserve pourtant le démarrage sans job à ENOENT.
La reproduction porte sur le bloc de chargement isolé en mémoire, pas sur une
installation réelle.

## What Changes

- Vérifier le contrat décodé avant toute interface HTTP ou interaction externe.
- Refuser les racines JSON non objets, les tableaux et les contrats incomplets
  ou incompatibles avec les formats historiques effectivement supportés.
- Distinguer lecture impossible, JSON malformé et contrat invalide, sans
  divulguer de contenu, de chemin runtime ou d'exception brute.
- Préserver le fichier en erreur, les contrats valides et leurs métadonnées.
- Ajouter les régressions de restauration et de compatibilité correspondantes.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `controller-transport` : validation du contrat restauré et refus explicite
  d'un contenu JSON syntaxiquement valide mais impropre à la restauration.

## Impact

Contrôleur distribué, `tests/controller-job-restoration.test.mjs`, référence
`controller-transport`, `TECHNICAL.md` et `CHANGELOG.md` lors de l'implémentation.
Aucune nouvelle dépendance ou variable de configuration, migration, purge,
installation de profil, opération Git ou intervention sur un service réel.
ACSM en attente du périmètre d’analyse. Le prompt a été lu intégralement ; aucune écriture ni inspection Git effectuée.

PROMPTS/ACSM.md (line 50) impose : « Si ce périmètre est absent ou ambigu, limite-toi à expliquer les informations nécessaires et attends sa précision. »

Quel périmètre validez-vous pour CAB : toutes les spécifications et changes actifs avec leur cadrage, ou une capacité/change précis ? Indiquez également le problème signalé, s’il existe.

￼
￼
￼
￼
￼
7:30

## Validation et état du travail

Le développeur a validé cette proposition le 2026-10-13. Le travail est appliqué
aux sources et synchronisé avec les références ; les preuves sont consignées
dans tasks.md. Le change reste ouvert. Aucun archivage, incrément de version,
commit, push, déploiement ou installation de profil effectué.
