# Cycle Publication, statistiques gelées et détails temporels

## Why

Les opérations de livraison et leur suivi ne doivent pas augmenter les statistiques du codage. Le développeur valide un cycle à12 étapes : Initialisation et Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Statistiques, Publication, Clôture. Les anciens RUN gardent leur définition historique.

## What Changes

Geler les mesures après archivage et avant toute publication. PG mémorise étapes, sous-étapes, débuts/fins, durées cumulées et itérations. Chaque itération complète1→12 a sa propre durée. Vue session et Overview utilisent Electric, avec étapes cliquables et aucun contenu inventé lorsque les données sont absentes.

Corriger aussi le lien de preuve entre le paquet réellement publié et installé par CABU : une empreinte de tag Git ne représente pas l'empreinte du paquet Debian. La correction vérifie les assets réels et conserve les anciennes preuves.
