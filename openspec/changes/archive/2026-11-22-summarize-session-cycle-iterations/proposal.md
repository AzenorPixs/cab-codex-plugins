# Synthèse des itérations de session — code non attribué

## Why
Le détail de session ne distingue pas le cumul de toutes les itérations de la durée du dernier cycle et les actions n’affichent pas leur durée.

## What Changes
- Présenter Informations dans l’ordre demandé : mandat, étape, nombre d’itérations, bornes du dernier cycle, cumuls total/CAB/Agent(s)/Attente, demandes indécises, attente, blocages.
- Persister une synthèse du RUN dans PostgreSQL et la diffuser via le flux Electric autorisé du RUN.
- Dans Résumé, afficher « Durée totale de tous les cycles » sous les étapes et « Durée totale du dernier cycle » après une barre verticale à droite du titre.
- Ajouter Durée après Retour ou validation dans chaque tableau Actions · Itération, avec le format commun secondes/minutes/heures.

## Impact
Migration additive réversible, sans suppression d’historique. Tests PostgreSQL isolés, types et build frontend, Chromium et Firefox headless. Livraison CICDF puis CABU indépendant.
