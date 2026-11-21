# Gérer les politiques de version et mesurer les étapes d’un change

## Why

CAB accepte actuellement trois ou quatre composantes et confie le choix du
numéro aux agents. La progression des RUN ne permet pas de consulter la durée
d’une étape ni son cumul lorsqu’un change fait l’objet de plusieurs reprises.

## What Changes

- Déclarer et synchroniser `PROJECT_VERSION_POLICY` pour tous les projets.
- Proposer dans Overview la conversion de la version courante et des tags locaux.
- Distribuer le skill Version et imposer son accusé comme sixième étape du
  nouveau cycle à douze étapes.
- Conserver les étapes et leurs itérations sous le change, calculer leur durée
  dans CAB et les exposer dans Overview.
- Étendre la validation et la livraison aux sept politiques, avec conservation
  des reçus de livraison et des parcours historiques.
