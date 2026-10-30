---
name: CABU
description: Lance la mise à jour CAB lorsque le développeur invoque $CABU ou demande l'actualisation des briques Codex Approval Bridge.
---

# CABU

Ce skill est l'entrée directe CABU. Lorsqu'il est invoqué, exécute dans cette
conversation la commande CAB `/CAB update` jusqu'à son rapport terminal ; ne
te limite pas à présenter la commande ou à proposer de la lancer. La procédure
de maintenance reste définie par CAB et n'est pas dupliquée ici.

GitHub est la référence de version par défaut pour toutes les briques CAB
(broker, contrôleur, superviseur et Web), les plugins CAB/CABU et les commandes.
Applique la procédure distante de `/CAB update` depuis
`AzenorPixs/cab-codex-plugins`, branche `main`, même si une marketplace ou un
paquet local existe. La présence de sources locales n'autorise pas à sauter
la vérification GitHub. Une source distante indisponible ou incohérente arrête
la préparation avant toute maintenance ; aucun repli local implicite.
Une installation locale exige une demande explicite pour cette invocation.

Avant toute opération, vérifie que la commande CAB compatible est disponible.
Si elle manque ou si sa version ne correspond pas à celle du plugin CAB
installé, termine en indiquant la dépendance exacte et n'entame aucune
opération réseau ou de maintenance.

N'exécute ni `/CAB start`, ni `/CAB run`, ni `/CAB test`, ni bootstrap du
monitoring. Restitue le rapport terminal de `/CAB update`, en séparant les
versions des fichiers des versions des processus réellement observés.


### Permissions réappliquées par DIU

DIU peut remettre le répertoire `~/.config/cab-approval-bridge/` en `0770`. Dans CAB 2.1.25, la lecture du credential existant reste possible si `opencode.password` est un fichier ordinaire, sans lien, détenu par l’utilisateur du service et protégé en `0600`. Le passage du répertoire à `0770` ne prouve donc pas une panne de l’API OpenCode.

Le provisionnement d’un credential absent exige en revanche un répertoire détenu par l’utilisateur et non modifiable par le groupe ou les autres. Si DIU a remis `0770` et que le fichier manque, rétablir les permissions sûres du seul répertoire CAB, par exemple `0700`, avant le raccord explicitement autorisé à OPENCODE_PASSWORD. Préserver le credential et son mode lors des mises à jour DIU ; ne jamais afficher sa valeur. La variable reste facultative pour les projets qui n’utilisent pas OpenCode.
