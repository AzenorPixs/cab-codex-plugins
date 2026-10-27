---
name: cabu
description: Lance la mise à jour CAB lorsque le développeur invoque $CABU ou demande l'actualisation des briques Codex Approval Bridge.
---

# CABU

Ce skill est l'entrée directe CABU. Lorsqu'il est invoqué, exécute dans cette
conversation la commande CAB `/CAB update` jusqu'à son rapport terminal ; ne
te limite pas à présenter la commande ou à proposer de la lancer. La procédure
de maintenance reste définie par CAB et n'est pas dupliquée ici.

Avant toute opération, vérifie que la commande CAB compatible est disponible.
Si elle manque ou si sa version ne correspond pas à celle du plugin CAB
installé, termine en indiquant la dépendance exacte et n'entame aucune
opération réseau ou de maintenance.

N'exécute ni `/CAB start`, ni `/CAB run`, ni `/CAB test`, ni bootstrap du
monitoring. Restitue le rapport terminal de `/CAB update`, en séparant les
versions des fichiers des versions des processus réellement observés.
