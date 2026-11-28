# Nettoyer les ressources du RUN à l’étape 10

## Why

Les RUN disposent d’un passage entre Archivage et Publication. CAB peut y restituer les ressources encore attribuées au RUN et présenter les résidus du projet avant la sélection des fichiers à publier.

## What Changes

- Activer l’étape Nettoyage pour les nouveaux RUN en conservant le profil enregistré des RUN antérieurs.
- Nettoyer l’atelier temporaire identifié et restituer les bancs et les verrous sur preuves, en conservant l’index Git de session.
- Présenter au codeur un inventaire Git filtré en lecture seule. Toute suppression d’un fichier du projet identifié comme hors périmètre requiert la validation explicite du développeur.

## Impact

- Capacités concernées : publication-cycle et system-platform.
- Publication et Clôture restent aux étapes 11 et 12. Les fichiers temporaires de production des artefacts restent gérés par la Publication.
