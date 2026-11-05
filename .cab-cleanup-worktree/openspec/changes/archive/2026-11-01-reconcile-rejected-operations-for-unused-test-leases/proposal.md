# Réconcilier les opérations rejetées lors de la récupération d’un bail inutilisé

## Why

La récupération sans jeton d’un bail restauré n’est permise que si l’historique
complet prouve l’absence d’effet sur l’environnement. Après acquisition du bail,
le contrôleur inclut les opérations du même RUN dans la vérification. Une
opération de validation durablement rejetée reste `PREPARED` sans permission
native, mais la règle actuelle n’accepte que les opérations `CANCELLED` sans
preuve native ou les commandes Bash terminées avec `once` consommé. Elle refuse
donc des historiques où l’absence d’effet est prouvée.

Les appels Code Mode groupés vers les outils CAB en lecture seule peuvent aussi
rester présentés comme un wrapper `execute`. Le contrôleur ne les reconnaît pas
encore comme observations quand leurs métadonnées natives sont complètes.

## What Changes

- Reconnaître une opération de validation rejetée uniquement si la décision
  native courante ou son reçu durable `REJECTION_ONLY` correspond à l’opération,
  au RUN, à la session et au contexte, sans accès ni permission native.
- Vérifier les wrappers Code Mode à partir de leur historique natif complet et
  non tronqué ; accepter seulement une liste fermée d’appels CAB sans effet sur
  l’environnement, et refuser toute commande, écriture ou méthode inconnue.
- Rendre la prévisualisation GET diagnostique en cas de refus : exposer les
  états d’opération filtrés et le code de blocage, sans jeton ni donnée libre.
- Appliquer les mêmes classifications à l’attestation et à la restitution ;
  toute preuve incomplète, permission ou opération incertaine garde le bail
  `HELD`.

## Out of Scope

Aucune commande LXC, permission, nouvelle approbation ou décision n’est créée.
Les contrôles d’inactivité, de portée du change armé, d’historique natif,
d’intégrité et de fraîcheur restent requis. Les opérations inconnues ne sont
jamais interprétées comme sans effet.

## Acceptance Criteria

1. Une opération `REJECTION_ONLY` avec reçu durable concordant, ou une
   opération dont le rejet natif exact est retrouvé dans l’historique complet,
   est attestable comme sans effet sur l’environnement seulement sans accès ni
   permission native.
2. Les appels Code Mode ne sont admis que si leur historique complet et non
   tronqué établit une liste d’outils CAB autorisés, terminés et sans commande
   d’environnement ; toute méthode inconnue ou preuve manquante bloque.
3. La preview reste en lecture seule, ne révèle aucun jeton et décrit le
   blocage et les états filtrés lorsque la preuve est insuffisante.
4. Une activité, une opération Bash non attestée, `edit`/`write`, une permission
   native, un état non terminal ou une divergence conserve le bail `HELD`.
