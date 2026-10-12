## Context

SCM est exécuté directement par Codex. Cette évolution décrit le protocole des
futures sessions pilotées CAB ; elle ne lance pas un RUN OpenCode et n'invoque
pas le skill de statistiques réservé au pilotage SCMP. La collecte technique
et les fréquences internes existantes ne sont pas des cadences de pilotage.

## Goals / Non-Goals

Le périmètre validé fixe quatre obligations de l'orchestrateur et synchronise
la version distribuée à `0.86.8`. Les décisions unitaires, prévols, readiness,
transports et contrôles de reprise restent applicables. Aucune configuration
fournisseur, politique PLLM, infrastructure ou temporisation interne du
superviseur n'est modifiée.

## Decisions

1. Après un échec observé du benchmark PLLM, maintenir le même RUN en attente
   non terminale. Calculer la première échéance trente minutes après l'échec,
   puis la suivante trente minutes après chaque nouvel échec. Ne pas lancer
   deux tentatives simultanées. Conserver dans le checkpoint non secret le
   RUN, l'heure et la cause de chaque échec, le résultat et la prochaine
   échéance. Une interruption conserve cette échéance ; une tentative en cours
   ou d'effet inconnu est réconciliée avant toute nouvelle tentative.
2. Une réussite observée ne suffit pas à autoriser du travail : réconcilier les
   contextes, santé OpenCode, MCP, readiness réelle et permissions avant
   reprise. En cas de reprise non sûre, appliquer la récupération CAB sans
   transformer un benchmark réussi en approbation. Une attente PLLM seule ne
   clôt pas le RUN et ne ferme ni ne redémarre les processus.
3. Le SSE reste consommé en temps réel ; la boucle de l'orchestrateur contrôle
   demandes et rapports toutes les trois secondes. Les vérifications de
   progression pendant analyse/rédaction sont espacées de sept secondes fixes
   et ne bloquent pas cette boucle. Les délais techniques du superviseur,
   heartbeats et rappels du broker restent distincts.
4. Les sondes statistiques suivent des échéances de trente minutes sans
   arrêter le travail pour attendre un créneau. Les mesures manquées ou
   absentes restent visibles et ne sont pas reconstituées. Le traitement d'une
   sonde statistique échouée reste distinct des nouvelles tentatives illimitées
   du benchmark PLLM.

## Risks / Trade-offs

Une attente PLLM peut durer indéfiniment par choix explicite du développeur ;
la supervision reste active et l'arrêt explicite reste possible. Un contrôle
plus fréquent accroît le nombre de vérifications de l'orchestrateur. Les
cadences sont des obligations du protocole distribué ; aucun ordonnanceur
autonome n'est ajouté au broker ou au contrôleur. Les tests documentaires
prouvent la distribution de ces obligations, pas leur exécution en conditions
réelles. L'intégration dans une session pilotée reste une limite explicite.

## Validation and Rollback

Les deux tests Python d'initialisation MCP attendent encore `0.86.6` ; leurs
seules attentes de version sont alignées à `0.86.8` avec les contrôles Node
de distribution, sans changement des scénarios de test.

Valider les deltas avant modification du code/tests, puis les références
OpenSpec, les tests CAB, la syntaxe Python/JavaScript, les manifestes JSON,
les versions, UTF-8/LF et le périmètre. Contrôler les exigences distribuées
dans AGENTS, la commande et les skills. Archiver seulement après succès, puis
écrire et vérifier le rapport à six sections dans l'archive. Les changements
locaux sont réversibles par restauration des seuls passages concernés ; aucune
migration ou écriture externe n'est nécessaire.
