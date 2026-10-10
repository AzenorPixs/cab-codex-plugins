# DEVOPS.md — cab

Version : 0.5

Généré automatiquement par Debian Installeur Unifié (DIU).
Début du relevé (UTC) : 2026-10-10T13:22:51Z
Environnement d'exécution DIU : PROXMOX

Les sondes système concernent le contexte d'exécution DIU.
Les outils DevOps sont interrogés avec les binaires indiqués dans leurs rubriques.
Les dépendances Python sont recherchées en priorité dans les venv du projet, puis dans le Python DevOps en repli explicite.
Dans l’inventaire Python, la flèche indique le Python sondé ; Installation indique le chemin observé dans les métadonnées.
Les dépendances Python attendues proviennent de [project].dependencies dans pyproject.toml.
Les dépendances JavaScript sont regroupées par manifeste et catégorie sous NPM et OpenCode.
Leurs déclarations, versions verrouillées npm et métadonnées locales sont distinctes ; un verrou ne prouve pas une installation.
Les contraintes JavaScript ne sont pas résolues et cet inventaire ne prouve pas le chargement de plugins OpenCode.
Un inventaire multi-environnements ne valide pas un environnement Python unique.
Cet inventaire ne constitue pas une qualification fonctionnelle ni une preuve de réussite des tests du projet.

# Système d'exploitation

  * Debian GNU/Linux 13 (trixie)


# Docker

  * 29.9.0
  * /usr/bin/docker


# Docker-Compose

  * 5.6.0
  * /usr/local/bin/docker-compose


# Git

  * 2.47.3
  * /usr/bin/git


# Go

  * 1.27.2
  * /home/devops/go/current/bin/go


# Node

  * 24.21.0
  * /home/devops/node/current/bin/node


# NPM

  * 11.19.0
  * /home/devops/node/current/bin/npm


# OpenCode

  * 1.18.35
  * /home/devops/.opencode/bin/opencode


# OpenSpec

  * 1.14.1
  * /home/devops/.local/npm/bin/openspec


# OpenSSL

  * 3.5.7
  * /usr/bin/openssl


# PostgreSQL Client

  * 17.11
  * /usr/bin/psql


# PostgreSQL Serveur

  * indisponible (configuration absente ou invalide : PG_HOST ou PG_SERVER absent)
  * adresse non configurée
  * Les variables PostgreSQL sont chargées depuis project.env
  * PG_HOST PG_PORT PG_DATABASE PG_USERNAME PG_PASSWORD


# Python

  * 3.14.8
  * /home/devops/python/current/bin/python3
  * venv: disponible


# Python - Dépendances du projet - Source de vérité `pyproject.toml`

  * Aucune dépendance déclarée dans [project].dependencies


# Python - Gestionnaire de paquets

  * 26.2.1
  * /home/devops/python/current/bin/pip3


# Tests navigateurs extérieurs en mode headless

La détection ne vérifie pas le fonctionnement du mode headless.

## Chromium

  * 154.0.8037.92
  * /usr/bin/chromium
  * Mode headless : --headless


## Firefox

  * 153.4.0esr
  * /usr/bin/firefox
  * Mode headless : --headless
