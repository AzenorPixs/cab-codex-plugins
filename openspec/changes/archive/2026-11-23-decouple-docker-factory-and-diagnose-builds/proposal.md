# Découpler la Fabrique Docker et diagnostiquer les builds

Code non attribué.

## Constat

Un réglage de forge invalide peut faire refuser une construction Docker locale et interrompre l’inventaire. La Fabrique n’affiche alors que le code générique `artifact-build-config-changed`.

## Changement

- Qualifier la configuration locale nécessaire à la construction et à l’inventaire Docker indépendamment des réglages de forge.
- Construire la même image sous `latest` et sous la version du projet sans préfixe `v`. La publication native utilise l’identifiant de cette image et valide la destination choisie.
- Ouvrir l’Overview d’une demande manuelle refusée ou d’une construction en échec. Permettre de retrouver le diagnostic depuis la carte de l’artefact.
