## Context

Voir `proposal.md`. La preuve manquante porte sur l'intégration OpenCode réelle
et ne peut pas être remplacée par les tests unitaires existants. Elle nécessite
un cycle de vie explicite du contrôleur local.

## Goals / Non-Goals

**Goals:**

- Obtenir une preuve E2E actuelle de la corrélation par `requestId`.
- Conserver l'archive historique inchangée et traçable.
- Installer le contrôleur uniquement lors d'un `/cab start` explicite.
- Ne jamais activer le service au login, à l'installation du plugin ou après
  `/cab stop`.

**Non-Goals:**

- Modifier le broker, le protocole MCP ou la décision métier.
- Créer une demande de validation si CAB n'est pas prêt.
- Installer un paquet système ou modifier la configuration système globale.

## Decisions

Le plugin distribue un modèle d'unité systemd utilisateur sans section
`[Install]`. `/cab start` copie le contrôleur dans un répertoire de données
stable du profil Codex, écrit une configuration non secrète portant le
workspace absolu, installe l'unité dans la configuration utilisateur, exécute
`systemctl --user daemon-reload`, puis exécute explicitement `start`. Il ne
doit jamais appeler `enable`.

L'unité lit cette configuration, écoute uniquement en boucle locale et utilise
`Restart=on-failure`. `/cab stop` supprime les ressources de session puis
exécute explicitement `systemctl --user stop`; l'unité reste installée mais
inactive et ne peut plus être relancée automatiquement.

Le change utilise `/cab test` uniquement après preuve que le MCP local est
connecté, que le service est actif et que `broker_readiness` est READY. Un
statut BLOCKED, HUMAN_REQUIRED ou une demande parasite arrête la validation
sans cocher la tâche.

## Risks / Trade-offs

- [OpenCode ou le broker ne sont pas disponibles] → le change reste actif avec
  la preuve du blocage ; aucune demande de remplacement n'est créée.
- [systemd utilisateur indisponible] → `/cab start` échoue explicitement sans
  créer de session OpenCode ni lancer de processus éphémère.
