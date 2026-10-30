# Lire le statut de maintenance complet

## Why

Le statut réel du contrôleur mesure2327337octets, au-delà du plafond2Mio du lecteur CABU, alors que le service sert sa version. Cela empêche démarrage et rollback d’être confirmés. Le mandat humain de retrouver un état de développement normal autorise ce correctif ciblé nécessaire.

## What Changes

Exception bornée16Mio pour les GET exacts /status des services CAB, comme /runs ; toutes autres réponses conservent2Mio. Refus immédiat et diagnostic précis sur dépassement de cette borne. Tests réseau réels sous/à/au-dessus de la borne et maintien de la limite du moniteur. Le paquet2.1.15 encore non activé est complété avec un nouveau build+codex identifié : la base reste2.1.15 pour reprendre le journal existant avec les mêmes artefacts broker. Les commandes restent identiques ; aucune édition de cache installé, journal ou données métier. Après qualification, publication puis CABU sous le mandat humain.

## Impact

Updater, ses tests, référence détaillée de maintenance et cadrages techniques. Les seuils OpenCode des messages/catalogues restent inchangés. La récupération reprend le journal update-44f9925d-c49e-471b-8920-55abb73378be avant toute nouvelle transaction, sans modifier ses sauvegardes ni falsifier son état.
