## 1. Contrats V2

- [x] 1.1 Ajouter la capacité `opencode-v2-transport` avec OpenCode V2 obligatoire, authentification Basic protégée, schémas JSON stricts et refus fermé des réponses V1/HTML.
- [x] 1.2 Mettre à jour les exigences d'intégration, transport contrôleur, supervision et maintenance pour les routes V2 et préserver intégralement leurs scénarios existants.
- [x] 1.3 Incrémenter les métadonnées et constantes de toutes les briques CAB distribuées à `2.0.0`.

## 2. Client et briques CAB

- [x] 2.1 Ajouter le client V2 commun, la validation privée du fichier credential et les tests unitaires de transport/authentification.
- [x] 2.2 Migrer le contrôleur et le contexte de job : santé, sessions, messages, permissions, décisions `once`, model observations et recovery.
- [x] 2.3 Migrer le superviseur, son client SSE et le healthcheck : `/api/event`, activité de session et réconciliation après reconnexion.
- [x] 2.4 Migrer CAB Monitor : collecte V2, MCP list/reconnect, indicateurs de fraîcheur, version OpenCode réelle et erreurs d'authentification.
- [x] 2.5 Migrer mise à jour, maintenance, forward repair et métadonnées; refuser les versions OpenCode hors majeure 2.
- [x] 2.6 Ajouter `LoadCredential` aux unités utilisateur controller/supervisor/monitor et ajouter le client partagé au manifeste de release.

## 3. Documentation et qualification

- [x] 3.1 Mettre à jour PROJECT, TECHNICAL, BUILD, ORCHESTRATED_CODING, README, skill et références CAB pour supprimer les instructions V1 et documenter V2/auth.
- [x] 3.2 Vérifier DEVOPS.md généré par DIU : le relevé existant indique déjà OpenCode 2.2.0, confirmé par le test natif isolé; aucune édition manuelle. Une régénération a été tentée mais DIU a échoué avant écriture sur /root/diu/config/diu.env (Permission denied).
- [x] 3.3 Ajouter les fixtures/tests V2 et migrer les tests natifs/HTTP simulés sans test de permission implicite.
- [x] 3.4 Exécuter syntaxe, tests Node, tests Python, contrôles navigateur applicables et OpenSpec strict; documenter séparément que la sonde authentifiée du service actif n’a pas été exécutée faute de credential local (401 observé sans authentification), et que le test natif isolé V2.2.0 a réussi.
- [x] 3.5 Ajouter l'entrée de changelog pour CAB 2.0.0, puis valider les documents et préparer l'archivage du seul change.
