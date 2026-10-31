# Retirer l’alias minuscule de la commande CAB

Code de lot non attribué ; attribution ACL ultérieure.

## Why

La commande `/cab` duplique `/CAB` et crée une seconde entrée de découverte.
Le développeur confirme que seule la forme canonique `/CAB` est légitime.

## What Changes

Ne distribuer et ne maintenir que `.codex/commands/CAB.md` et
`.codex/commands/CABU.md`. Retirer le fichier source `cab.md`, les références
actives à l’alias et les tests qui l’exigent. Lors d’une mise à jour réussie,
installer atomiquement les deux commandes canoniques puis retirer l’ancienne
copie globale `cab.md` ; conserver la sauvegarde et restaurer le jeu précédent
si une étape échoue.

## Acceptance Criteria

- `/CAB` reste l’unique commande de pilotage ; `/CABU` reste l’entrée de mise à
  jour.
- Aucun fichier source ou profil `cab.md` n’est livré après synchronisation
  réussie.
- Les commandes, plugins, composants et cadrages de distribution annoncent la
  version commune `2.1.33`.
- Un échec de synchronisation restaure exactement le jeu global sauvegardé et
  signale l’échec sans annoncer que l’alias a été retiré.
- Les mentions historiques d’archives et d’anciennes versions restent intactes.

## Out of Scope

Aucun changement au broker, au contrôleur HTTP, aux décisions, aux permissions,
au transport MCP, aux services actifs, aux RUN ou aux leases.
