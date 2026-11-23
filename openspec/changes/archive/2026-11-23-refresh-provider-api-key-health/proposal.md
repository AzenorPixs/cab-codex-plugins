# Actualiser l’état des fournisseurs et de leurs clés API

Code non attribué.

## Why

L’administration expose les catalogues et les clés associées. Les liens, le dernier résultat des catalogues et la validité ou les quotas des clés doivent être consultables depuis leurs tableaux respectifs.

## What Changes

- Liens des fournisseurs et aperçu du dernier essai de catalogue.
- Authentification du catalogue avec les clés valides du fournisseur et tirage au sort si plusieurs sont disponibles.
- Vérification manuelle et périodique des clés, avec état, détail, quotas disponibles et dernière réussite dans PostgreSQL et Electric.
- Qualification sur l’hôte avec OpenAI, puis report, archivage, CICD et CABU.
