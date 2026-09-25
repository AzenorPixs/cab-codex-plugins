# Proposal

## Why

Un orchestrateur peut restituer prématurément alors que le job CAB conserve un
mandat actif ou qu'aucun état terminal n'est démontré. Le contrôleur doit
fournir un verrou technique de clôture, indépendant du respect du prompt.

## What Changes

- Ajouter au contrôleur un état de job local et une API de vérification du
  gate terminal.
- Refuser une clôture normale tant qu'une validation est active ou en attente,
  ou qu'aucun état terminal explicite n'a été enregistré.
- Exposer l'état du gate, sans secret, dans le statut de supervision.
- Faire exiger ce gate par `/cab stop` avant l'arrêt normal du contrôleur.
- Passer les versions distribuées du broker et du contrôleur de `0.84.3` à
  `0.84.4`.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `controller-transport`: ajout d'un contrat de clôture techniquement vérifié
  par le contrôleur local.

## Impact

Le contrôleur Node.js, son contrat HTTP et statut public, la commande `/cab`,
les tests de contrôleur et les versions distribuées broker/contrôleur sont
concernés. Le broker reste neutre et ne décide jamais de la clôture.
