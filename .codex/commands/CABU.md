---
description: Mettre à jour CAB ; équivalent exact de /CAB update
version: 1.10.7
---

Réponds en français.

Argument reçu : `$ARGUMENTS`

Cette commande accepte uniquement une invocation sans argument. Si
`$ARGUMENTS` contient autre chose que des espaces, affiche `Syntaxe : /CABU`
et termine immédiatement, avant toute lecture réseau ou effet de maintenance.

Charge intégralement le fichier frère `CAB.md` depuis le même répertoire de
commandes que ce fichier. Utilise uniquement ce fichier local, sans recherche
globale ni téléchargement. Vérifie son frontmatter : `version: 1.10.7`.
S'il est absent, illisible ou d'une version différente, affiche
`CAB_COMMANDE_ALIAS_INDISPONIBLE` avec la cause et termine avant toute
opération réseau, installation ou maintenance.

Exécute réellement `/CAB update` dans ce même tour, en fixant l'argument de
la commande canonique à `update`. Applique intégralement sa seule procédure
update, avec les mêmes gardes, maintenance partagée, sauvegardes, reprise et
bilan de versions. Ne déclenche ni start, ni run, ni test, ni bootstrap du
monitoring. Ne te limite pas à afficher la commande ou à proposer de la lancer.
