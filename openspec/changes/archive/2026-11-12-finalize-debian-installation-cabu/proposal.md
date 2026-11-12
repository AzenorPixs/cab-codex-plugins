# Finalisation Debian CABU et présentation des agents — CAB3.0.3

Code non attribué ; normalisation ACL ultérieure, sans bloquer le mandat validé.

## Why
L’installation APT/DIU ne finalise pas les intégrations et le reçu CABU, qui
sont actuellement propres à cab update. Le développeur valide leur mutualisation,
les plugins/skills/commandes et la nouvelle présentation de la page Agents.

## What Changes
- Finalisation locale commune appelée par postinst et cab update, sans appel
récursif à APT, téléchargement ou réinstallation ; sérialisation et idempotence.
- Payload système commun et activation des seules intégrations par UID configuré,
root compris ; plugins CAB/CCAB/CABU, skills et commandes, tiers conservés.
- Installation neuve : initialisation Web toujours exclusive, finalisation différée.
- Agents en deux colonnes, noms colorés, processus et transport MCP observés,
chemins non éditables et versions installées/disponibles distinctes.
- Cache GitHub vérifié une fois par jour à horaire aléatoire dans cab.service.
- Retrait de la mention du fichier cab.json de toutes les sous-pages Administration.

## Impact
Backend Python, superviseur et API Agents, frontend TanStack, postinst, contrats,
versions et documentation de distribution ; aucune nouvelle dépendance ou table.
Tests minimaux unitaires, fixture Debian/CLI, navigateurs et preuves de sessions.
