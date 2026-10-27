---
description: Alias de compatibilité de /CAB ; transmet les arguments inchangés
version: 1.10.6
---

Réponds en français.

Argument reçu : `$ARGUMENTS`

Charge intégralement le fichier frère `CAB.md` depuis le même répertoire de
commandes que ce fichier. Utilise uniquement ce fichier local, sans recherche
globale ni téléchargement. Vérifie son frontmatter : `version: 1.10.6`.
S'il est absent, illisible ou d'une version différente, affiche
`CAB_COMMANDE_ALIAS_INDISPONIBLE` avec la cause et termine avant toute
opération réseau, installation ou maintenance.

Exécute réellement la commande canonique `/CAB` dans ce même tour, en lui
transmettant `$ARGUMENTS` inchangé. Applique toutes ses validations et ses
résultats. Ne te limite pas à afficher la commande ou à proposer de la lancer.
