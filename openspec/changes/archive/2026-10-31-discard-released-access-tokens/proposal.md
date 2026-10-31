# Retirer les jetons des accès libérés

Code de lot non attribué ; attribution ACL ultérieure.

## Why

Un accès `RELEASED` conserve actuellement son jeton brut dans le registre et
dans la réponse HTTP. Un checkpoint de session peut ainsi conserver un ancien
jeton après clôture, alors qu’il n’autorise plus d’effet. La reprise idempotente
doit rester possible sans conserver cette capacité en clair.

## What Changes

Supprimer le jeton d’un accès dès qu’il est libéré par `locks/release` ou par
publication. La réponse et les lectures d’accès libérés ne renvoient plus ce
champ. La détection du rejeu identique utilise l’empreinte persistée de la
requête complète, qui lie le jeton fourni sans stocker sa valeur.

## Acceptance Criteria

- Un accès actif conserve le jeton requis pour ses opérations autorisées.
- Après `RELEASED`, le registre et les réponses ne contiennent plus le jeton.
- Le rejeu exact d’une libération reste idempotent après redémarrage.
- Une requête différente ne peut pas utiliser l’empreinte de libération pour
  muter l’accès.
- Une publication libère aussi l’accès sans persister son jeton.
- Les versions CAB/CABU et des composants communs sont alignées en `2.1.35`.

## Out of Scope

Aucune modification de RUN, bail, permission, réconciliation ou service actif ;
aucune lecture du checkpoint affecté ni de son contenu sensible ; aucun test
sur le runtime actif.
