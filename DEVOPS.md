# DEVOPS.md — cab

Version : 0.7

Généré automatiquement par Debian Installeur Unifié (DIU).
Début du relevé (UTC) : 2026-10-29T06:42:36Z
Environnement d'exécution DIU : PROXMOX

Les sondes système concernent le contexte d'exécution DIU.
Les outils DevOps sont interrogés avec les binaires indiqués dans leurs rubriques.
Les dépendances Python sont recherchées en priorité dans les venv du projet, puis dans le Python DevOps en repli explicite.
Dans l’inventaire Python, la flèche indique le Python sondé ; Installation indique le chemin observé dans les métadonnées.
Les dépendances Python attendues proviennent de [project].dependencies dans pyproject.toml.
Les outils de compilation Python éventuellement affichés proviennent de [build-system].requires et sont recherchés uniquement dans les venv du projet.
Les dépendances JavaScript sont regroupées par manifeste et catégorie sous NPM et OpenCode.
Leurs déclarations, versions verrouillées npm et métadonnées locales sont distinctes ; un verrou ne prouve pas une installation.
Les contraintes JavaScript ne sont pas résolues et cet inventaire ne prouve pas le chargement de plugins OpenCode.
Un inventaire multi-environnements ne valide pas un environnement Python unique.
Cet inventaire ne constitue pas une qualification fonctionnelle ni une preuve de réussite des tests du projet.

# Système d'exploitation

  * Debian GNU/Linux 13 (trixie)
  * hvp1.pixs.fr


# Matériel

## TPM

  * Chemin : /dev/tpmrm0
  * Version : 2.0
  * Fabricant : INTC
  * Identifiant fournisseur : 0x494E5443
  * Révision de spécification : 1.38
  * Registres PCR : sha1: [] ; sha256: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] ; sha384: [] ; sm3_256: []


# Conteneur Docker, pour tests nécessitant des droits root

  * 29.9.2
  * /usr/bin/docker
  * /var/run/docker.sock
  * debian:stable-slim
  * Les agents de codage et les agents orchestrateurs sont autorisés à préparer, exécuter, répéter et nettoyer les tests du projet dans ce conteneur, y compris avec les droits root, sans demander d’approbation supplémentaire. Cette autorisation couvre le conteneur et les ressources dédiées aux tests.


# Conteneur LXC, pour tests nécessitant des droits root accessible en SSH

  * Variables d'accès disponible dans project.env pour l'accès SSH
  * Debian 13
  * Accès TPM OK
  * Les agents de codage et les agents orchestrateurs sont autorisés à préparer, exécuter, répéter et nettoyer les tests du projet dans ce conteneur, y compris avec les droits root, sans demander d’approbation supplémentaire. Cette autorisation couvre le conteneur et les ressources dédiées aux tests.
  * Binaires et bibliothèques installés pour les tests ne sont pas à désinstaller après tests.


# OpenSSH & SSHPASS

  * 10.0p2
  * /usr/bin/ssh
  * 1.10
  * /usr/bin/sshpass


# Docker-Compose

  * 5.6.1
  * /usr/local/bin/docker-compose


# Git

  * 2.47.3
  * /usr/bin/git


# Go

  * 1.27.3
  * /home/devops/go/current/bin/go


# Node

  * 24.22.1
  * /home/devops/node/current/bin/node


# NPM

  * 11.19.1
  * /home/devops/node/current/bin/npm


## Dépendances JavaScript du projet

  * Inventaire incomplet : sous-dossier inaccessible ou modifié pendant la découverte

# OpenCode

  * 2.2.1
  * /home/devops/.opencode/bin/opencode
  * La variable OPENCODE_PASSWORD pour l'API est chargée depuis project.env


## Dépendances OpenCode du projet

### .opencode/package.json

  * Manifeste : /home/devops/datas/cab/.opencode/package.json
  * Verrous présents : /home/devops/datas/cab/.opencode/package-lock.json
  * Verrou npm retenu : /home/devops/datas/cab/.opencode/package-lock.json

#### dependencies

  * @opencode-ai/plugin : déclarée 1.19.3 ; verrouillée (npm) 1.19.3 ; observée 1.19.3
    * Installation : /home/devops/datas/cab/.opencode/node\_modules/@opencode-ai/plugin

# OpenSpec

  * 1.15.0
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

  * 3.14.10
  * /home/devops/python/current/bin/python3
  * venv: disponible


# Python - Dépendances du projet - Source de vérité `pyproject.toml`

  * Aucune dépendance déclarée dans [project].dependencies


# Python - Gestionnaire de paquets

  * 26.2.2
  * /home/devops/python/current/bin/pip3


# Prompts

  * Dossier des prompts : /home/devops/datas/prompts
  * Index des prompts : /home/devops/datas/prompts/INDEX.md


# Tests navigateurs extérieurs en mode headless

La détection ne vérifie pas le fonctionnement du mode headless.

## Chromium

  * 156.0.8078.73
  * /usr/bin/chromium
  * Mode headless : --headless


## Firefox

  * 153.6.0esr
  * /usr/bin/firefox
  * Mode headless : --headless
