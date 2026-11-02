---
name: CABU
description: Lance la mise à jour CAB lorsque le développeur invoque $CABU ou demande l'actualisation des briques Codex Approval Bridge.
---

# CABU

Ce skill est l'entrée directe CABU. Lorsqu'il est invoqué, exécute dans cette
conversation la commande CAB `/CAB update` jusqu'à son rapport terminal ; ne
te limite pas à présenter la commande ou à proposer de la lancer. La procédure
de maintenance reste définie par CAB et n'est pas dupliquée ici.

Vérifie d'abord que la commande CAB compatible est disponible ; si elle manque
ou si sa version diffère du plugin CAB installé, indique cette dépendance et
termine avant réseau ou maintenance. CAB résout la provenance GitHub et les
exceptions locales explicitement demandées, les destinations, la préparation,
la continuité et le repli. Ne duplique pas ces procédures ni les instructions
de credential dans ce skill.

N'exécute ni `/CAB start`, ni `/CAB run`, ni `/CAB test`, ni bootstrap du
monitoring. Restitue le résultat de `/CAB update`, avec versions des fichiers,
processus réellement observés, mesures de bascule et état du même reçu en cas
d'attente. Une préparation ou une copie de fichiers ne prouve pas l'activation.
