## Why

OpenCode peut conserver dans le transcript un appel natif `request_validation`
en erreur après persistance de la demande, alors que le parseur du wrapper
CodeMode ne peut pas normaliser son code dynamique. Le contrôleur ne corrèle
alors pas la notification déjà reçue.

## What Changes

Autoriser une corrélation depuis le transcript natif brut uniquement si le
wrapper est non exécuté, complet et explicitement en erreur, si ses
métadonnées recensent exactement un `request_validation` final en erreur,
éventuellement précédé d'une seule recherche terminée, et si l'identité native
est identique au mandat reçu.

## Non-goals

La correction ne crée ni décision, permission ou `once`, ne réadmet pas une
demande `NOT_ADMITTED`, ne rejoue aucun appel et ne modifie pas les gardes de
RUN, session, révisions ou admission.
