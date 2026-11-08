# Diagnostiquer un effacement propriétaire figé

## Why

Une erreur générique de référence étrangère ne permet pas d’identifier la
règle qui refuse un reçu figé. Relancer le commit peut répéter un effet dont
l’issue est incertaine.

## What Changes

Fournir un diagnostic en lecture seule, exécuté par le propriétaire des
données, pour un reçu authentifié et un périmètre exact. Il restitue uniquement
la classe du contrôle en échec et des preuves non sensibles, sans contenu de
données privées ni modification de reçu ou de fichiers.
