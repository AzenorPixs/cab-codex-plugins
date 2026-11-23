# Afficher la dernière construction dans la Fabrique

Code non attribué.

## Why

La Fabrique n’affiche que les demandes manuelles. Un ancien échec peut rester affiché après une construction réussie par CICD ou CICDF.

## What Changes

- Rapprocher les reçus manuels et natifs Debian et Docker pour afficher la dernière construction par format.
- Rendre le détail accessible pour chaque état et indiquer l’origine du reçu.
