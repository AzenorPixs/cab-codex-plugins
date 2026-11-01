# Réconcilier la fin native après un événement SSE terminal

## Problème

OpenCode 2.2.5 peut terminer une commande shell avec un code non nul et
enregistrer la partie finale dans l’historique natif, sans inclure cette partie
dans l’événement SSE terminal. Le contrôleur reçoit alors `session.idle` ou
`session.execution.failed`, mais laisse l’opération à `EXECUTING` malgré une
preuve native complète disponible.

## Changement

- À un événement terminal corrélé à une session contrôlée, relire le transcript
  natif seulement s’il existe une opération non résolue pour cette session.
- Appliquer exactement les gardes existantes de `nativePartProof` avant de
  terminer l’opération : session, tool, permission `once`, callID, cible,
  horodatages et fin native.
- Conserver l’issue et le code de sortie sans transformer un code non nul en
  succès métier ; sans preuve native concordante, garder les protections.
- Incrémenter la version commune CAB.

## Limites

Aucune lecture ou modification d’un RUN, bail ou runtime actif pendant ce SCM.
Aucun rejeu d’autorisation ou de commande. Aucun changement aux wrappers de test.

## Capacité

Exigence modifiée : `controller-transport`, fin native corrélée avant libération.
