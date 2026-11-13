# Agents, connexions et adresses de projets — CAB 3.0.4

Code non attribué. Mandat SCM et CI/CD explicite du développeur.

## Why
Le cache OpenCode utilisait Latest et affichait la branche1 malgré un binaire2.
Les sockets Unix d’OpenCode ne sont pas reconnues par le détecteur de pipes. Les
processus Codex intégrés au bureau sont confondus avec le CLI distinct.

## What Changes
Page /agents après Administration dans le bandeau, retrait de la barre latérale
Administration avec compatibilité de l’ancien lien. Trois blocs : OpenCode,
Codex CLI et Codex intégré, versions et binaires distincts, profils partagés.
Détection des transports MCP pipes/sockets reliés au programme parent, sans lire
les flux ni déclencher de session. Releases OpenCode2.x sélectionnées explicitement.
Liens Projets par identifiant métier selon clarification, identités internes et
anciens liens préservés. Livraison corrective3.0.4, aucune session réarmée.
