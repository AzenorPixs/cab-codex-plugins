# Documenter l’empreinte native write

## Why

Le protocole impose l’empreinte des arguments natifs exacts mais ne décrit pas explicitement les séparateurs JSON ni le schéma write V2 au point de consultation technique. Une empreinte reconstruite manuellement peut donc différer de l’objet soumis.

## What Changes

Préciser le contrat observé de `nativeToolInputDigest`, le schéma write et un vecteur reproductible ; orienter le skill et la commande vers cette référence et ajouter un test ciblé. Aucun changement des algorithmes ou autorisations.
