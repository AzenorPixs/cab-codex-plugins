# DIS06 — Aligner les briques CAB sur 1.2.0

## Pourquoi

Le développeur demande la base 1.2.0 pour identifier les sources comprenant le
premier lot de réduction de l'exclusion. Les annonces exécutables, le plugin,
la commande et les cadrages doivent partager cette même version.

## Changements

- Aligner les 14 modules versionnés, pyproject, plugin avec cachebuster neuf,
  commande /cab et descriptions des unités systemd sur 1.2.0.
- Adapter les assertions de version et les cadrages actuels, sans réécrire
  les archives ni les références historiques.
- Synchroniser la spécification de distribution, tester et archiver localement.

## Périmètre

Suite SCM directe autorisée par la demande du développeur du 16 octobre 2026.
Aucun déploiement, cache installé, service actif, RUN, profil utilisateur,
configuration OpenCode, propagation inter-projets ou opération Git.
Les instantanés immuables restent hors périmètre. Les schémas, permissions et
contrats fonctionnels du premier lot restent inchangés.
