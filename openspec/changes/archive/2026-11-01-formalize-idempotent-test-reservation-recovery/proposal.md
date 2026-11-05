# Reprise sûre d'un bail de test restauré sans jeton disponible

## Why

Après un redémarrage, CAB conserve le bail HELD, masque son jeton dans les
lectures GET et exige une réconciliation avant toute nouvelle opération. Le
contrôleur accepte déjà la répétition exacte du POST `acquire` avec le même
`transactionId` et le même payload ; il renvoie alors le bail existant au
demandeur. Ce chemin n'est pas explicite dans le protocole ni testé après
redémarrage.

Si le propriétaire a perdu le jeton et ne peut reconstruire le payload exact,
le bail peut rester détenu sans mécanisme sûr de restitution même lorsque la
preuve native établit qu'aucun effet ou commande de test n'a eu lieu. CAB doit
formaliser le replay exact et ajouter une voie de restitution sans effet qui
s'appuie sur le change déjà armé et validé, sans nouvelle permission.

## What Changes

- Formaliser le replay exact du POST `acquire` comme reprise idempotente du bail.
- Ajouter une prévisualisation native read-only sans jeton pour les baux restaurés.
- Autoriser la restitution sans ancien jeton uniquement pour un bail restauré,
  inutilisé et rattaché au même change/rôle déjà armé ; exiger l'attestation et
  la preuve native complètes.
- Conserver HELD et refuser la restitution si l'historique est incomplet,
  divergent, mutateur ou incertain.

## Out of Scope

Aucun accès LXC, nettoyage, commande métier, nouvelle réservation, décision ou
permission native n'est créé par la prévisualisation ou la restitution. La voie
sans jeton ne permet jamais de réconcilier ni de conserver un bail ayant une
opération ou un effet non résolu ; elle restitue uniquement un environnement
prouvé inutilisé.

## Acceptance Criteria

1. Le replay exact d'un POST `acquire` après redémarrage renvoie le bail existant
   au demandeur sans créer de réservation ni de permission ; GET reste sans
   jeton et `reconciliationRequired` reste vrai.
2. Une charge divergente sous le même `transactionId` reste refusée sans
   mutation.
3. Si le jeton et le payload d'acquisition sont perdus, un bail restauré peut
   être libéré sans nouvelle permission uniquement lorsque le RUN possède un
   job armé pour le même change, sa preview native est complète, son attestation
   établit l'absence d'effet et la frontière est quiescente.
4. Toute activité, permission, mutation, historique incomplet ou preuve
   divergente laisse le bail HELD et garde les commandes bloquées.
