## Why

CAB réserve les fichiers, les ressources d’opération et les bancs dans plusieurs registres. Les sessions doivent pouvoir traiter ces réservations selon le même protocole et les consulter en temps réel.

## What Changes

- Ajouter une table PostgreSQL des réservations de ressources actives et la publier via Electric.
- Le bail dure 300 secondes et doit être renouvelé à 240 secondes. CAB avertit la session propriétaire à 30 secondes de l’échéance et à la libération effective si elle est toujours active.
- Ajouter la page Projet Réservations et l’aperçu de fichier avec édition sous réservation et contrôle de version du contenu.

## Impact

Les opérations encore actives ou indéterminées restent protégées après expiration de leur bail. La migration conserve leurs reçus et les réservations existantes. Les verrous internes de transaction et les identités uniques de change ne sont pas des réservations de ressources de session.
