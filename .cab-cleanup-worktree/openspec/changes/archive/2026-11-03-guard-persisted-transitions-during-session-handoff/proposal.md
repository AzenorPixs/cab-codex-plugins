# Garde des transitions persistées du handoff — CAB 2.2.14

Code non attribué ; correction SCM du périmètre de transfert déjà autorisé.

## Why
Une transition de recovery/modèle persistée doit rester opposable en dehors
de son appel inFlight et après redémarrage. Une candidate readonly préparée
avant une mise à jour doit pouvoir réobserver la readiness dans le même SID.

## What Changes
Refuser le handoff si job.recovery ou job.modelTransition est présent ;
conserver les anciennes observations readonly et qualifier seulement la
readiness la plus récente, liée au RUN et à la version courante. Aucun effet,
retrait, modèle ou protection historique changé. Publication/CABU distincts.
