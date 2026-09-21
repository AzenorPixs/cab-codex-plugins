# DEVOPS.md — Pixs

Version : 0.2


# Système d'exploitation

## Environnement conteneurisé

  * Alpine Linux v3.24

## Environnement non conteneurisé

  * Debian Linux v13


# Docker

## Environnement conteneurisé

  * 29.5.3

## Environnement non conteneurisé

  * 29.8.0


# Docker-Compose

## Environnement conteneurisé

  * 5.1.4

## Environnement non conteneurisé

  * 5.4.0


# Git

## Environnement conteneurisé

  * 2.54.0

## Environnement non conteneurisé

  * 2.47.3


# Go

## Environnement conteneurisé

  * 1.26.8
  * /usr/bin/go

## Environnement non conteneurisé

  * 1.27.1
  * /home/devops/go/current 


# Node

## Environnement conteneurisé

  * 24.18.1
  * /usr/bin/node

## Environnement non conteneurisé

  * 24.21.0
  * /home/devops/node/current/bin/node


# NPM

## Environnement conteneurisé

  * 11.12.1
  * /usr/bin/npm

## Environnement non conteneurisé

  * 11.19
  * /home/devops/node/current/bin/npm


# OpenSpec

## Environnement conteneurisé

  * v1.13
  * /opt/devops/npm/bin/openspec

## Environnement non conteneurisé

  * v1.13
  * /home/devops/.local/npm/bin/openspec


# OpenSSL

## Environnement conteneurisé

  * v3.5.8
  * /usr/bin/openssl

## Environnement non conteneurisé

  * v3.5.7
  * /usr/bin/openssl


# PostgreSQL Client

## Environnement conteneurisé

  * v17.11
  * /usr/bin/psql

## Environnement non conteneurisé

  * v17.11
  * /usr/bin/psql


# PostgreSQL Serveur

## Environnement conteneurisé

  * v16
  * 127.0.0.1:5432
  * Les variables PostgreSQL sont chargées depuis project.env
  * PG_DATABASE PG_USERNAME PG_PASSWORD

## Environnement non conteneurisé

  * v16
  * 127.0.0.1:5432
  * Les variables PostgreSQL sont chargées depuis project.env
  * PG_DATABASE PG_USERNAME PG_PASSWORD


# Python

## Environnement conteneurisé

  * v3.14.7
  * /usr/bin/python3
  * venv: disponible

## Environnement non conteneurisé

  * v3.14.7
  * /home/devops/python/current/bin/python3
  * venv: disponible


# Python -  Dépendances du projet

  * La source de vérité des dépendances Python est `pyproject.toml`

## Environnement conteneurisé

  * v3.3.5 --> /usr/bin/python3 -c "import psycopg; print(psycopg.__version__)"
  * psycopg  installé lors du démarrage du conteneur

## Environnement non conteneurisé

  * v3.3.5 --> /home/devops/python/current/bin/python3 -c "import psycopg; print(psycopg.__version__)"
  * psycopg


# Python - Gestionnaire de paquets

## Environnement conteneurisé

  * v26.1.2
  * /usr/bin/pip3

## Environnement non conteneurisé

  * v26.2.1
  * /home/devops/python/current/bin/pip3
