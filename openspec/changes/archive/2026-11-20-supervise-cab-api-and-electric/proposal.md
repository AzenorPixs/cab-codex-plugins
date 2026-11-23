# Superviser Electric, l’API et le démon CAB

## Why
L’arrêt d’un enfant pouvait arrêter CAB ou déclencher des relances en boucle. Un démon arrêté a besoin d’un surveillant qui lui survive.

## What Changes
- Une tentative bornée et notifiée pour l’API et Electric.
- Une unité indépendante déclenchée par l’échec du service CAB.
- Admission explicite des suppressions locales vérifiées lors d’une livraison exhaustive.
