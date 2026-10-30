---
description: Mettre à jour CAB ; équivalent exact de /CAB update
version: 2.1.21
---

Réponds en français.

Argument reçu : `$ARGUMENTS`

Cette commande accepte uniquement une invocation sans argument. Si
`$ARGUMENTS` contient autre chose que des espaces, affiche `Syntaxe : /CABU`
et termine immédiatement, avant toute lecture réseau ou effet de maintenance.

Charge intégralement le fichier frère `CAB.md` depuis le même répertoire de
commandes que ce fichier. Utilise uniquement ce fichier local, sans recherche
globale ni téléchargement. Vérifie son frontmatter : `version: 2.1.21`.
S'il est absent, illisible ou d'une version différente, affiche
`CAB_COMMANDE_ALIAS_INDISPONIBLE` avec la cause et termine avant toute
opération réseau, installation ou maintenance.

Exécute réellement `/CAB update` dans ce même tour, en fixant l'argument de
la commande canonique à `update`. CABU est le point d'entrée de la mise à jour
et doit mener son exécution jusqu'au résultat terminal avec le rapport complet
`CAB_RÉSUMÉ_VERSIONS`. CAB.md et le skill portent la procédure détaillée : arrêt
systématique des trois unités systemd CAB, remplacement des fichiers des quatre
briques, redémarrage des unités et bilan des versions. L'absence d'OpenCode
rend le broker runtime `INDISPONIBLE`, mais ne bloque pas le remplacement de
ses fichiers ni la fin de l'update. N'ajoute pas de logique de maintenance
dupliquée dans cet alias. Ne déclenche ni start, ni run, ni test, ni bootstrap
du monitoring. Ne te limite pas à afficher la commande ou à proposer de la
lancer.
