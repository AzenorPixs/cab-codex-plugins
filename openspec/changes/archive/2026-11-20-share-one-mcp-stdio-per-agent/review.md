# Requalification SCM le 20 novembre 2026

Les contrôles exécutés sur hvp1 appartiennent au RUN `SCM-REQUALIFY-SHARED-MCP-20261120`. Ils complètent le dossier de l’étude. Les opérations du RUN d’origine conservent leurs propres reçus.

- `shared-replay-native-sharing` (opération 823) : les app-servers installés de Codex Desktop et Codex CLI ont été exécutés avec un profil temporaire et un serveur MCP de test. Dans deux dossiers différents, un dossier MCP fixe ramène le nombre de liaisons de deux à une par agent testé. Les deux contextes natifs correspondent aux sessions et la substitution tentée est rejetée.
- `shared-replay-worker-routing` (824) : dans une transaction PostgreSQL annulée, les deux RUN restent isolés et la reprise exige un seul remplaçant à la version attendue avec son catalogue.
- `shared-replay-shared-monitor` (825) : vérification du plafond, des tentatives de remédiation et des notifications de début et de convergence sur des événements de test.
- L’observation indépendante sur hvp1 confirme un connecteur READY par agent et les trois versions en 3.5.0. Les profils existants ont été conservés. OpenCode fonctionne ici sur son canal propre. Le rattachement partagé par contexte natif de CAB est qualifié pour Codex Desktop et l’app-server Codex CLI.

La spécification canonique comporte déjà les exigences de convergence et de rattachement du RUN sur canal partagé. Cet archivage constate la qualification sans recopier leur contenu ni déclencher de livraison.
