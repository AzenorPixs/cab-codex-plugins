# Alignement des briques CAB sur 1.1.0

## Why
Le développeur demande explicitement la version 1.1.0 pour toutes les briques
CAB et la vérification des fichiers de cadrage retouchés par le correctif.
Les exécutables sont encore en 1.0.2 et des clauses canoniques figent aussi
des versions antérieures. La préparation 1.1.0 doit rendre l'ensemble cohérent.

## What Changes
- Aligner projet, trois modules broker, scripts du plugin, deux unités systemd,
  manifeste et frontmatter de /cab sur 1.1.0, avec cachebuster neuf.
- Actualiser uniquement les clauses de version courante dans OpenSpec et les
  cadrages ; conserver références historiques et preuves des anciennes archives.
- Adapter les assertions de version et vérifier les cadrages déjà retouchés.

## Impact
Périmètre explicitement demandé : métadonnées de version et cohérence documentaire,
sans nouvelle fonctionnalité, dépendance, protocole MCP ni schéma de données.
Le registre 1/2 de l'optimisation précédente reste celui décrit par ses capacités.
AGENTS et DEVOPS restent inchangés. Aucun déploiement, service actif, cache installé,
projet consommateur ou Git modifié. Archivage de ce seul change et rapport SCM
compris dans la clôture du périmètre validé.
