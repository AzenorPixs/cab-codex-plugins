# DEVOPS.md — cab

Version : 0.8

Généré automatiquement par Debian Installeur Unifié (DIU).
Début du relevé (UTC) : 2026-11-19T21:41:35Z
Environnement d'exécution DIU : PROXMOX

## Configuration locale — project.env

Le fichier `project.env`, situé à la racine du projet, est une configuration
locale protégée. Sa consultation par les agents relève des sections 9 et 10
d’AGENTS.md.

Pour le travail autorisé, l’agent peut extraire localement les variables
non secrètes nécessaires, notamment `PROJECT_*`, `LOCAL_DEFAULT_BRANCH`,
`GIT_*` et `REMOTE_*`, sans limitation à ces familles. Seul un processus
local parcourt le fichier et restitue les noms et valeurs validés comme
non secrets.

La lecture brute, l’exécution du fichier et son chargement dans
l’environnement par l’agent sont interdits. L’agent ne doit ni créer,
ni modifier, ni régénérer ce fichier. Aucun secret ne doit être restitué,
affiché, journalisé ou transmis au modèle.

Les mentions de chargement de variables dans cet inventaire décrivent
leur utilisation par les outils locaux. Elles n’accordent aucun droit
supplémentaire de consultation à l’agent, notamment pour les variables
d’authentification SSH ou PostgreSQL.

Les sondes système concernent le contexte d'exécution DIU.
Les outils DevOps sont interrogés avec les binaires indiqués dans leurs rubriques.
Les dépendances Python sont recherchées en priorité dans les venv du projet, puis dans le Python DevOps en repli explicite.
Dans l’inventaire Python, la flèche indique le Python sondé ; Installation indique le chemin observé dans les métadonnées.
Les dépendances Python attendues proviennent de [project].dependencies dans pyproject.toml.
Les outils de compilation Python éventuellement affichés proviennent de [build-system].requires et sont recherchés uniquement dans les venv du projet.
Les dépendances JavaScript sont regroupées par manifeste et catégorie.
Leurs déclarations, versions verrouillées npm et métadonnées locales sont distinctes ; un verrou ne prouve pas une installation.
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

  * 29.10.0
  * /usr/bin/docker
  * /var/run/docker.sock
  * debian:stable-slim
  * Accès TPM OK
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

  * 5.7.1
  * /usr/local/bin/docker-compose


# Git

  * 2.47.3
  * /usr/bin/git


# Go

  * 1.27.4
  * /home/devops/go/current/bin/go


# Node

  * 24.22.3
  * /home/devops/node/current/bin/node


# NPM

  * 11.19.1
  * /home/devops/node/current/bin/npm


## Dépendances JavaScript du projet

  * Inventaire incomplet : limite d'entrées de découverte atteinte
  * Inventaire incomplet : sous-dossier inaccessible ou modifié pendant la découverte

## Dépendances OpenCode du projet

### .opencode/package.json

  * Manifeste : /home/devops/datas/cab/.opencode/package.json
  * Verrous présents : /home/devops/datas/cab/.opencode/package-lock.json
  * Verrou npm retenu : /home/devops/datas/cab/.opencode/package-lock.json

#### dependencies

  * @opencode-ai/plugin : déclarée 1.19.3 ; verrouillée (npm) 1.19.3 ; observée 1.19.3
    * Installation : /home/devops/datas/cab/.opencode/node\_modules/@opencode-ai/plugin# OpenSpec

  * 2.1.0
  * /home/devops/.local/npm/bin/openspec


# OpenSSL

  * 3.5.7
  * /usr/bin/openssl


# PostgreSQL Client

  * 17.12
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

  * Recherche ou sonde des venv du projet non vérifiable : inventaire partiel.
  * Django ==6.1.3 : 6.1.3 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * django-ninja ==1.7.1 : 1.7.1 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * uvicorn ==0.54.0 : 0.54.0 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * mcp ==2.3.0 : 2.3.0 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * httpx ==0.28.1 : 0.28.1 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * psycopg [binary]==3.3.6 : 3.3.6 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * asgiref ==3.12.1 : 3.12.1 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * sqlparse ==0.6.0 : 0.6.0 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * argon2-cffi ==25.1.0 : 25.1.0 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages
  * cryptography ==50.0.2 : 50.0.2 --> /home/devops/datas/cab/.cab-tests/DCAB/venv/bin/python3
    * Environnement : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Installation : /home/devops/datas/cab/.cab-tests/DCAB/venv/lib/python3.14/site-packages


# Python - Gestionnaire de paquets

  * 26.2.2
  * /home/devops/python/current/bin/pip3


# Python - Outils de compilation

  * Cython : installation non vérifiable
    * Environnement vérifié : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Déclaration : Cython ==3.3.0
    * Source : pyproject.toml — [build-system].requires
  * Nuitka : installation non vérifiable
    * Environnement vérifié : /home/devops/datas/cab/.cab-tests/DCAB/venv
    * Déclaration : Nuitka ==4.3.1
    * Source : pyproject.toml — [build-system].requires
    * Diagnostic : recherche ou sonde des venv non vérifiable, inventaire partiel


# Prompts

  * Dossier des prompts : /home/devops/datas/prompts
  * Index des prompts : /home/devops/datas/prompts/INDEX.md


# Tests navigateurs extérieurs en mode headless

La détection ne vérifie pas le fonctionnement du mode headless.

## Chromium

  * 156.0.8078.79
  * /usr/bin/chromium
  * Mode headless : --headless


## Firefox

  * 153.7.0esr
  * /usr/bin/firefox
  * Mode headless : --headless
