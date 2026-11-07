# Nettoyage des historiques fermés par lot

## Why
Le développeur demande le nettoyage des briques CAB hors RUN/chats ouverts. Le prévol trouve43RUN fermés/88changes (8contextes conservés explicitement) ;57changes partagent des identifiantsRUN historiques et refusent l’effacement unitaire. Répéter les coupures par change serait inutile.

## What Changes
- Lot explicite de RUN fermés et de RUN protégés, inventaire signé de tous leurs contextes/aliases. Refuser RESERVED, accès/baux non soldés et SID partagés avec les pairs.
- Vérifier tous les jobs désarmés/gates terminaux validés, sans convertir leurs résultats métier ; métadonnées d’entretien distinctes.
- Réutiliser le même canal propriétaire, candidats/empreintes, réancrage, vérification/certificat et finalisation ; une seule bascule pour le lot.
- Conserver rapports/archives métier et statistiques historiques ; retirer états d’exécution, ateliers propres et checkpoints ciblés. Les contextes sans télémétrie native n’exigent pas de rapport statistique fictif.
- Réconcilier la preuve SGS de la fenêtre SCM244 exclue sans l’ajouter aux agrégats, puis purger officiellement les données figées après preuve durable.

## Impact
Version2.4.5 sous SCM/CI-CD puis CABU, tests vitaux et nettoyage opérationnel vérifié séparément. Aucun effacement du projet Pixs versionné, aucune suppression de chat Codex, aucune réinitialisation de permission.
