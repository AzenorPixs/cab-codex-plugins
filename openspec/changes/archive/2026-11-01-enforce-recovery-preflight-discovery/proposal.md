# Réconcilier une discovery native en lecture seule dans un prévol historique consommé

## Why

Après une récupération RUN historique préparée avant le scellement de la
signature Code Mode, une unique discovery read-only ajoutée après `prepare`
peut faire refuser `complete`, même lorsque l'approbation, l'unique `once`,
`/usr/bin/true` et la readiness finale sont déjà prouvés. Rejouer le prévol
approuvé serait dangereux ; le job reste gelé tant que la preuve ne peut pas
être reconnue sans nouvel effet.

## What Changes

- Autoriser uniquement dans une récupération RUN héritée sans
  `requestValidationSignatureHash` une discovery `request_validation` exacte,
  native, unique, complète et non tronquée, parmi les outils post-prepare.
- Garder les autres outils inattendus bloquants et les preuves existantes
  d'approbation, once, commande, exit et readiness inchangées.
- Ne créer aucune demande, décision, permission, retry, session, job ou effet
  métier supplémentaire dans le RUN consommateur.

## Périmètre

Le correctif porte sur `complete` des récupérations RUN historiques dont le
prévol unique a déjà été approuvé et consommé. Les récupérations récentes avec
signature scellée continuent de refuser toute discovery après `prepare`.

## Hors périmètre

- aucune modification d'un projet consommateur, d'un checkpoint ou du RUN par écriture de fichier ;
- aucune autorisation de rejouer une décision ou permission `once` ;
- aucune modification de `ORCHESTRATED_CODING.md` ;
- aucune création de session ou job de remplacement.

## Critères d'acceptation

1. Une discovery native `request_validation` exacte et unique est ignorée
   comme observation sans effet dans un prévol hérité non signé.
2. `complete` ne réussit que si les preuves existantes établissent déjà
   approval, once consommée, `/usr/bin/true` avec exit 0 et readiness finale.
3. Une discovery supplémentaire, divergente, tronquée ou un outil différent
   conserve le gel et refuse `complete` sans mutation.
4. Les RUN modernes avec signature scellée conservent le refus strict des
   découvertes post-prepare.
