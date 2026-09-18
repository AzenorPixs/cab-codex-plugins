## MODIFIED Requirements

### Requirement: Plugin Codex structuré
Le plugin CAB SHALL être distribué depuis la racine du dépôt, avec une
marketplace dans `.agents/plugins/marketplace.json` et un plugin dans
`plugins/cab-approval-bridge/`. Ce plugin SHALL fournir un manifeste
`.codex-plugin/plugin.json`, la skill CAB, les scripts de contrôleur,
healthcheck et SSE, ainsi qu'un modèle d'unité systemd utilisateur dans une
arborescence distribuable cohérente.

#### Scenario: Validation du plugin
- **WHEN** le manifeste du plugin est soumis au validateur Codex
- **THEN** il est accepté et les chemins déclarés existent dans l'artefact

#### Scenario: Localisation du plugin
- **WHEN** une distribution CAB est préparée
- **THEN** la marketplace et le plugin sont pris depuis la racine du dépôt, sans déplacement sous `.codex/`

### Requirement: Commande de pilotage sûre
La commande Codex `/cab` SHALL être versionnée dans
`.codex/commands/cab.md` et proposer `start`, `test` et `stop`. Elle SHALL
orchestrer les ressources de communication CAB entre le broker MCP et l'agent
Codex, sans rendre de décision d'approbation ni modifier le projet piloté.
Elle SHALL préserver OpenCode et le broker MCP géré par OpenCode lors de
l'arrêt.

Avant de créer une session de codage, `/cab start` SHALL consulter `GET /mcp`
du serveur OpenCode et exiger que `cgpt-validation` soit `connected`. En cas
d'échec, elle MAY réinitialiser l'instance par `POST /instance/dispose`, puis
SHALL attendre un état sain ; elle SHALL ne jamais démarrer ni arrêter le
broker directement. Après ce contrôle, elle SHALL installer ou actualiser les
ressources utilisateur du contrôleur, sans appeler `systemctl --user enable`,
puis SHALL démarrer explicitement
`cgpt-approval-bridge-controller.service`. L'unité SHALL utiliser
`Restart=on-failure` pendant son exécution, sans démarrage au login. Après ce
contrôle, `/cab start` SHALL créer ou réutiliser une session OpenCode
persistante et SHALL transmettre les mandats par la messagerie native de cette
session.

`/cab stop` SHALL supprimer les ressources de session CAB et arrêter
explicitement ce seul service utilisateur. L'unité peut rester installée mais
doit rester inactive après l'arrêt.

#### Scenario: Installation inactive
- **WHEN** le plugin CAB est installé mais que `/cab start` n'a jamais été exécutée
- **THEN** le contrôleur n'est ni activé ni démarré par CAB

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée après un contrôle MCP sain
- **THEN** elle installe ou actualise l'unité sans l'activer, démarre explicitement le contrôleur, vérifie son état, initialise la supervision CAB, puis crée ou réutilise une session persistante sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/cab start` réinitialise seulement l'instance OpenCode, attend une preuve de connexion et échoue sans créer de session si cette preuve reste absente

#### Scenario: Test CAB
- **WHEN** `/cab test` est exécutée
- **THEN** elle vérifie le chemin de validation complet dans la session persistante, sans modifier le projet piloté

#### Scenario: Redémarrage en cours d'exécution
- **WHEN** le contrôleur démarré par `/cab start` se termine en échec
- **THEN** systemd le redémarre selon `Restart=on-failure` tant que `/cab stop` n'a pas été exécutée

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées, arrête explicitement le contrôleur, laisse l'unité inactive et ne ferme ni OpenCode ni le broker MCP géré par OpenCode
