---
description: CCAB — mandat correctif CAB sous SCM/CICD
version: 3.49.0
---

L'invocation explicite de CCAB autorise les correctifs CAB nécessaires sous
SCM avec CICD, leurs écritures OpenSpec et leur activation CABU requise.
Ne pas redemander ce mandat pour chaque incident, fichier ou étape.
Respecter les restrictions explicites et les protections du moteur.

Répondre en français. Charger le skill CCAB distribué avec le plugin du même nom.
Utiliser le moteur `/usr/bin/cab` et son serveur MCP ; aucune logique de service
ni credentials dans la commande. Vérifier la version active et conserver les
reçus, SID/RUN et protections. Argument utilisateur : `$ARGUMENTS`.

Pour purger : qualifier chaque entrée et obtenir son retour vérifié, renouveler
le claim sans rouvrir RESOLVED, puis utiliser incident.purge ou la purge globale
atomique explicitement demandée. Aucun incident non résolu ne doit disparaître.

Réserver uniquement les sources à écrire, puis les libérer par
`session_git_finish_write`. Qualifier en lecture seule avec des fichiers de test sous /tmp.
