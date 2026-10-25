# Reconnaissance du broker créé depuis un thread OpenCode

## Why
Après reconnexion native, le broker unique peut être enfant d'un thread secondaire du même processus OpenCode. Le lecteur limité aux enfants du thread principal refuse sa preuve et conserve HELD malgré quatre versions 1.10.1 et READY.

## What Changes
- Recenser les enfants de tous les threads du processus OpenCode, dédupliquer leurs PID et conserver les contrôles existants d'UID, parent, commande, identité et unicité.
- Refuser les erreurs de lecture autres que la disparition concurrente d'un thread ; recontrôler l'identité OpenCode après la découverte.
- Qualifier un broker créé depuis un thread, les refus et la maintenance à deux UID ; archiver puis poursuivre la mise à jour locale et reprendre les mêmes CISMP, sans fermer OpenCode.

## Capabilities
### Modified Capabilities
- active-component-update : preuve du broker enfant de tout thread du processus OpenCode déclaré.

## Impact
broker-artifact-proof.mjs, tests unitaires et banc deux UID, référence component-update.md, TECHNICAL.md, BUILD.md, PROJECT.md, README.md, CHANGELOG.md et cachebuster du plugin. Base 1.10.1 conservée. Aucun changement des données métier, des processus OpenCode, du lancement déclaré, des permissions ou des règles de réservation. Aucun Git. Validation explicite du développeur : « Je valide » après présentation du défaut, du correctif ciblé, des tests, de l'archivage et de la poursuite opérationnelle.
