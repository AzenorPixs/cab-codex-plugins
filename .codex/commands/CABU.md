---
description: Mettre à jour CAB ; équivalent exact de /CAB update
version: 2.4.27
---

Réponds en français.

Argument reçu : `$ARGUMENTS`

Cette commande accepte uniquement une invocation sans argument. Si
`$ARGUMENTS` contient autre chose que des espaces, affiche `Syntaxe : /CABU`
et termine immédiatement, avant toute lecture réseau ou effet de maintenance.

Charge intégralement le fichier frère `CAB.md` depuis le même répertoire de
commandes que ce fichier. Utilise uniquement ce fichier local, sans recherche
globale ni téléchargement. Vérifie son frontmatter : `version: 2.4.15`.
S'il est absent, illisible ou d'une version différente, affiche
`CAB_COMMANDE_ALIAS_INDISPONIBLE` avec la cause et termine avant toute
opération réseau, installation ou maintenance.

Exécute réellement `/CAB update` dans ce même tour, en fixant l'argument de
la commande canonique à `update`. CABU est le point d'entrée de la mise à jour
et doit mener son exécution jusqu'au résultat terminal avec le rapport complet
`CAB_RÉSUMÉ_VERSIONS`. CAB.md et le skill portent la procédure détaillée.
La préparation, la bascule sélective, la continuité et le
repli sont définis uniquement par CAB ; n'ajoute aucune logique de maintenance
ici. Ne déclenche ni start, ni run, ni test, ni bootstrap du monitoring.

CAB applique l’accord permanent de récupération MCP bornée décrit dans son
skill, référence `mcp-pending-recovery.md` ; ne pas inventer de procédure ici.

L’accord permanent de restauration ASK bornée relève de
`references/native-permission-grants.md` du skill CAB : aucune sollicitation
répétée des sessions. Cette maintenance distincte ne se lance pas implicitement
avec CABU ; elle conserve son plan, ses gardes et son reçu exacts.
