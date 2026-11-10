# Rendre les jobs d’atelier compatibles avec le groupe DevOps

## Why

DIU normalise les répertoires en 2770 et les fichiers en 0770. Le broker refuse actuellement les jobs d’atelier accessibles au groupe, empêchant les essais après normalisation.

## What Changes

Accepter les répertoires de jobs possédés par le compte broker et appartenant à son groupe autorisé, sans accès aux autres comptes ni lien ; créer les nouveaux reçus en 0770 et conserver les anciens reçus privés. Vérifier aussi l’identité et la sûreté de chaque reçu lu. Maintenir les identités, protections et reçus existants sans rejeu.

## Non-goals

Modifier DIU, ses règles générales ou les autres ateliers ; autoriser des groupes non qualifiés, des liens ou des droits pour les autres comptes.
