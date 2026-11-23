# Builds natifs et livraison complète

## Why

CAB possède les constructeurs Debian et Docker de la Fabrique. La livraison doit les réutiliser et distinguer le périmètre du change de celui de tout le projet.

## What Changes

CICD livre le change. CICDF livre aussi les autres changements admissibles du projet. Les deux parcours utilisent le même moteur de livraison et délèguent la publication d’artefacts à DIU.
