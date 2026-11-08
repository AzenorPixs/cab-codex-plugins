# Retirer une préparation rejetée après clôture de son tour

## Why

Un tour peut se terminer après une validation PENDING, puis être rejeté avant le tour utilisateur suivant. Une confirmation REJECTED est parfois lue plus tard, après des appels indépendants. Le contrôleur ne reconnaît pas actuellement cette frontière et peut regrouper ces appels avec une autre opération.

## What Changes

Qualifier le retrait du seul tour terminé sans effet, lorsque le rejet durable est antérieur au tour suivant et qu’une observation native ultérieure confirme exactement la même identité. Conserver toutes les autres opérations et leurs protections ; ne rejouer ni permission ni effet.
