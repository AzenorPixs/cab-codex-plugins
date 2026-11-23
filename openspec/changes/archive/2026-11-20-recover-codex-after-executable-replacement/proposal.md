# Récupérer Codex après le remplacement de son exécutable

## Why
Le reçu CABU 3.2.27 identifie le moteur MCP mais Linux signale l’ancien exécutable graphique comme supprimé. Cette situation empêche l’admission de la reprise. Des observations laissées par d’anciens relais arrêtés peuvent aussi bloquer le redémarrage.

## What Changes
- Vérifier le binaire installé qui remplace l’ancien exécutable Codex.
- Ignorer les observations sans heartbeat uniquement après preuve de sortie des anciens processus, sauf les relais identifiés du moteur ciblé.
- Permettre à une nouvelle installation vérifiée du même demandeur de remplacer un reçu bloqué sans effet de redémarrage.

## Impact
Politique de reprise CABU, admission et qualification sur l’hôte.
