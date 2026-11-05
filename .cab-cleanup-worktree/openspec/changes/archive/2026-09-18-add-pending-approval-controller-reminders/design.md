# Conception

## Contexte

Le broker exécute déjà son watchdog PENDING et publie une readiness toutes les
trente secondes. Il ne notifie toutefois le contrôleur qu'à la création ou à
la reprise technique d'une validation. Le contrôleur ne possède pas d'endpoint
de relance ni d'état durable associé.

## Objectifs et exclusions

**Objectifs :** relancer un mandat sans décision toutes les trente secondes,
réveiller l'orchestrateur par ordre de préférence et conserver une trace
durable de l'échec de réveil.

**Exclusions :** décider un mandat, répondre à une permission OpenCode,
transformer le mode manual en automatic, ou exposer une interface non locale.

## Décisions

Le broker déduit les relances de son watchdog existant afin de conserver un
cadencement unique et de réutiliser le magasin et le journal persistants. Une
relance appelle un endpoint distinct de `/validation/request` : elle ne peut
donc pas être confondue avec la création d'un mandat.

Le contrôleur conserve l'état de relance par `requestId`, corrélé aux
identifiants mémorisés lors de la demande initiale. Il utilise la tâche Codex
existante pour transmettre un événement structuré. En cas d'indisponibilité,
il planifie une nouvelle tentative liée à cette tâche ; si cette planification
échoue, il rend la notification en attente observable et la persistance du
broker garantit qu'elle sera reproposée au prochain intervalle.

## Risques et compromis

- [Relances dupliquées après redémarrage] → le broker journalise une relance
  par intervalle et le contrôleur déduplique par `requestId` et horodatage.
- [Tâche Codex indisponible] → aucune décision n'est créée ; l'état reste
  PENDING et la notification est rendue observable.
- [Bruit de supervision] → seuls les changements d'état et un rappel par
  intervalle sont publiés.
