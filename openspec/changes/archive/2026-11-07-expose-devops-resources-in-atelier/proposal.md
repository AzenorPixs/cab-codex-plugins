# Ressources DevOps disponibles dans les ateliers

## Why
Le lanceur monte le runtime Node du contrôleur mais omet les préfixes Python/Go et bibliothèques déclarés dans DEVOPS.md. PA01 ne peut pas utiliser son venv et Cython. Le développeur demande une disponibilité générale des ressources déclarées.

## What Changes
- Inventaire local borné de DEVOPS.md, empreinte et actualisation avant chaque nouveau lancement.
- Outils, interpréteurs et bibliothèques déclarés montés RO avec leurs préfixes et cibles de liens ; PATH issu des binaires déclarés, sans variables/secrets hôte.
- Catalogue consultable par atelier_status et joint aux reçus, y compris indisponibilités.
- Docker/LXC, services, périphériques et sockets restent orientés vers les voies CAB/réservations existantes ; aucun accès web ou privilège implicite.
- Projet RO, atelier propre RW, pairs et secrets protégés ; résultats toujours validés par orchestrateur.

## Impact
Broker atelier, contrat distribué, cadrages, tests ciblés ; version2.4.4, CI/CD DIU puis CABU. Autorisation explicite du développeur dans ce chat. Aucun changement des projets consommateurs ni DEVOPS.md générés.
