## Context

Une seule procédure d'exploitation doit servir les trois entrées. Les fichiers
sont sensibles à la casse sous Debian ; leurs noms sont donc explicites.

## Decisions

- CAB.md conserve tout le corps actuel, avec les titres `/CAB` et la procédure
  de distribution des trois commandes. cab.md et CABU.md chargent seulement
  le fichier frère CAB.md de même version, et échouent avant effet s'il manque
  ou diverge. Aucun téléchargement implicite par un alias.
- cab transmet les arguments inchangés ; CABU accepte seulement une invocation
  sans argument et fixe l'argument à update. Tout argument supplémentaire
  est refusé avant lecture réseau ou effet de maintenance.
- La procédure update prépare les trois téléchargements de même version, vérifie
  les sources et versions puis publie les fichiers avec restauration des seules
  commandes sauvegardées en cas d'échec. Version égale : vérifier aussi la
  complétude, sans écraser un fichier local divergent ou plus récent.
- 1.10.5 est un incrément correctif compatible. Seules les constantes et
  attentes de version changent dans le runtime ; protocole et formats sont conservés.
  Les versions d'origine déjà admises par la preuve broker restent admises.

## Validation

Tests de distribution des noms/casse, chargement local et transmission des
arguments, absence de procédure update dupliquée, versions cohérentes ; suite
Node/Python applicable, syntaxe, OpenSpec strict, UTF-8/LF et contrôle des
fichiers contre baseline. Transition deux UID isolée depuis le jeu 1.10.4.
Aucune invocation des commandes sur le profil réel pendant cette préparation.
