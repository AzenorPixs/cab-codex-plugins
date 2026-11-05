## Context

/cab est une procédure Markdown distribuée. Le serveur web et son unité sont déjà indépendants et démarrent sans source amont. Le défaut concerne l'ordre et la couverture des chemins de lancement, pas le serveur HTTP.

## Goals / Non-Goals

Le contrôle du monitoring MUST précéder les dépendances PLLM/OpenCode/CAB après résolution du workspace. Il MUST couvrir démarrage, entrée pilotée, reprise et services réutilisés. La préparation SCM MUST NOT déclencher de service réel ni modifier les prompts consommateurs.

## Decisions

Un préambule explicite dans la commande, le skill et le protocole renvoie à une procédure unique monitor-service. Cette procédure MUST terminer sa tentative bornée et rapporter son résultat avant les prévols. Aucun chemin de réutilisation MUST contourner ce contrôle. Une instance conforme MUST rester intacte ; les divergences MUST être rapportées sans réaffectation. Un échec amont MUST NOT arrêter le moniteur. Les résultats CAB et monitoring restent distincts.

Les versions sources et les références courantes OpenSpec MUST être 1.6.3 ; les archives et le changelog historique MUST rester inchangés. Aucun schéma ou transport n'est modifié.

## Risks / Trade-offs

Le consommateur doit charger les nouvelles procédures distribuées. Les tests vérifient le contrat ordonné et le lancement autonome ; ils ne prouvent pas l'exécution future par un agent ni un déploiement utilisateur. Une unité active divergente reste en place avec diagnostic. Le repli source consiste à restituer les seuls fichiers concernés ; aucun retour de données n'est requis.

## Validation

Tests de contrat : contrôle avant santé/modèle/MCP et avant règle d'attente PLLM, présence des cas reprise/réutilisation, preuves requises et indépendance. Test fonctionnel du jeu installé isolé : HTTP et identité disponibles avec sources absentes, port occupé préservé. Suites Node/Python, vérifications syntaxiques, navigateurs Chromium/Firefox, unité systemd et OpenSpec strict. Aucun accès aux services réels pendant les tests.
