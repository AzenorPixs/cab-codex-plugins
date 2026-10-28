# Fiabiliser la mise à jour CAB 2.1.3

## Why
Les trois services installés échouent avant Node.js avec 243/CREDENTIALS lorsque le fichier privé requis manque. Le prévol du paquet ne détecte pas cette dépendance. cab-source refuse aussi une installation dont les services utilisent des releases gérées, malgré un broker source ordinaire.

## What Changes
- Vérifier le credential avant la coupure ; proposer un raccord explicite de la seule variable OPENCODE_PASSWORD de project.env vers le credential privé, sans exposition ni remplacement d’un credential différent.
- Autoriser cab-source avec managed-release pour les seuls services et le Web ; conserver les trois modules broker source en fichiers ordinaires.
- Rapporter les échecs systemd par composant et conserver leur cause après repli.
- Distribuer la base 2.1.3 et documenter les limites.

## Capabilities
### Modified Capabilities
- active-component-update: prérequis de credential, installation mixte et diagnostics.
- codex-integration-distribution: alignement de la distribution 2.1.3.

- archive-session-statistics: nom canonique STATISTICS.md selon AGENTS.md et SCM.
- concurrent-run-coordination: même nom canonique dans la portée REPORT.

## Impact
Updater, helper de credential, tests de transaction et distribution, commandes et documentation. Aucun démarrage de RUN, changement de configuration OpenCode ou déploiement réel implicite. Les tests de raccord utilisent l’instance OpenCode démarrée par le développeur en lecture seule.
