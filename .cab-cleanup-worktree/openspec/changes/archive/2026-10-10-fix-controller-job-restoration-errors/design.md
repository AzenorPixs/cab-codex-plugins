## Context

Le contrôleur lit son contrat avant d'ouvrir son interface HTTP ou de lancer
Codex App Server. Son traitement actuel assimile toutes les exceptions à
l'absence normale d'un contrat. Les tests existants couvrent déjà la reprise
de contrats et de récupérations valides.

## Decisions

- Limiter la correction au chargement de `controller-job.json` : `ENOENT`
  reste le seul échec de lecture compatible avec un démarrage sans job.
- Un JSON malformé ou toute autre erreur de lecture provoque une erreur de
  démarrage non nulle avant les interactions externes du contrôleur.
- Le diagnostic utilise un texte constant par catégorie, sans reprendre le
  message de l'exception, son contenu JSON ni son chemin runtime.
- Conserver la représentation et la restauration actuelles des contrats
  valides. La validation complète de leur schéma, les rappels et l'état du
  superviseur restent hors du correctif.
- Utiliser des états synthétiques, des sous-processus et services simulés
  dans les tests. Les artefacts temporaires sont créés dans la racine CAB et
  nettoyés ; aucun état de production n'est lu.
- Après les tests du correctif, incrémenter de façon cohérente les versions
  de base de `0.86.9` à `0.87.0`. Le plugin reçoit un cachebuster neuf ; les
  numéros de schéma et de protocole restent inchangés. Les versions
  historiques des propositions, tâches et entrées de changelog sont conservées.
- Le développeur a remplacé le lot de complément AGENTS.md par une extraction
  explicite vers un document dédié, nommé en anglais ORCHESTRATED_CODING.md.
  Le protocole existant est conservé dans ce document, complété par les
  cadences, la récupération, les statistiques et les contrats techniques
  déjà définis par CAB. Les huit AGENTS.md restent centrés sur les règles
  générales et imposent la lecture de la référence locale pour le pilotage.
  Les tests contrôlent ce renvoi et appliquent leurs assertions de protocole
  au document dédié ; leurs attentes fonctionnelles ne sont pas affaiblies.
- À la dernière précision du développeur, AGENTS.md indique que ce document
  est facultatif et présent seulement lorsque le projet nécessite le pilotage.
  Une absence normale ne bloque pas un projet non piloté ou une session SCM
  directe. Si un besoin de pilotage apparaît sans document, sa création doit
  être validée avant ce pilotage.

## Risks / Trade-offs

Un contrat corrompu empêche désormais le démarrage au lieu d'être ignoré.
Les unités existantes peuvent retenter selon `Restart=on-failure` ; aucune
réparation ni action opérateur automatique n'est ajoutée. Le fichier reste
disponible pour une intervention autorisée. Le correctif ne modifie pas les
services installés. Aucun repli ni migration de données n'est nécessaire.

## Validation

Tests de fichier absent et valide, JSON malformé, erreur de lecture, diagnostic
sans fragment de contenu, conservation du fichier et absence d'interaction
avant refus. Suites Node de restauration, récupération et distribution,
vérifications syntaxiques des fichiers modifiés, cohérence des versions,
UTF-8/LF et validation stricte du change avant archivage.
Le référentiel global est contrôlé en modes standard et strict ; ses treize
avertissements historiques sont comparés à la référence initiale et signalés
sans présenter le strict global comme réussi ni les corriger hors périmètre.
