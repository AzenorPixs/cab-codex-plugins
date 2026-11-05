# Réconcilier un bail de test utilisé après redémarrage sans ancien token

## Why

Après un redémarrage du contrôleur, un bail de test `HELD` reste protégé et
reçoit `reconciliationRequired=true`. Pour un bail déjà utilisé, le protocole
actuel exige le token initial de l’acquisition. Ce token peut être absent du
checkpoint et de l’historique du propriétaire ; le bail reste alors bloqué
malgré des opérations natives terminales et une session inactive.

## What Changes

- Ajouter un prévol read-only qui scelle l’identité, les ressources et l’état
  natif terminal du bail restauré sans exposer son token.
- Ajouter une réconciliation liée au RUN et au reçu exact qui vérifie à nouveau
  les opérations natives, la quiescence et l’absence de permissions, renouvelle
  le token et le fencing, puis conserve le même bail `HELD`.
- Permettre à la récupération terminale exacte `NO_EFFECT` d’examiner et de
  clôturer son accès fichier disjoint malgré l’admission bloquée par le bail
  restauré, sans créer d’accès ni permission.
- Refuser les baux `WAITING`, les opérations incertaines, les sessions actives,
  les permissions, les révisions ou preuves divergentes ; ne jamais libérer,
  répéter une permission `once` ou lancer une commande métier.

## Out of Scope

- Libérer un bail utilisé ou prétendre qu’il était inutilisé.
- Réconcilier une opération métier `UNKNOWN`, notamment un shell avec effet
  possible.
- Restaurer ou modifier rétroactivement une réservation différente.
