---
description: Entrée CAB système CAB
version: 3.55.0
---

Répondre en français. Charger le skill CAB distribué avec le plugin du même nom.
Utiliser le moteur `/usr/bin/cab` et son serveur MCP ; aucune logique de service
ni credentials dans la commande. Vérifier la version active et conserver les
reçus, SID/RUN et protections. Argument utilisateur : `$ARGUMENTS`.

Avant admission, consulter la référence finalization.md du skill : champs stricts,
critères exacts, IDs retournés par CAB et validation pure du contrat. Un refus
explicite se corrige ; UNKNOWN ne se rejoue pas. La publication native utilise
un producteur autorisé, pas une commande CI/CD dans l'atelier isolé.

Préparer les versions publiques avec `session_version_prepare` avant les tests
et le commit. Pour commits, constructions ou publications ponctuels/autorisés
ou de reprise, utiliser `session_effect` ; CAB porte effets, CAS, reçus et suivi.
Le LLM n'exécute pas Git. Une livraison partielle garde son identité/version ;
consulter le parcours open_recovery/resume du skill, sans nouveau start.

Réserver uniquement les sources à modifier immédiatement, puis utiliser
`session_git_finish_write` dès la fin de l’écriture. Les lectures sont sans bail.
Les essais et leurs fichiers restent sous /tmp ou dans le banc Debian 13 prescrit.
