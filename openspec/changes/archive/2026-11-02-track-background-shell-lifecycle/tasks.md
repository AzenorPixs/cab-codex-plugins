# Tâches

## Spécification

- [x] 1.1 Définir le start background corrélé, le verrou persistant et la fin native.
- [x] 1.2 Spécifier explicitement que les timeouts sans shellID restent protégés.

## Implémentation et validation

- [x] 2.1 Ajouter la lecture V2 filtrée de `Shell.Info` par shellID. Preuve locale du 2026-11-02 : Lecteur Shell.Info qualifié sur OpenCode 2.2.5 isolé.
- [x] 2.2 Persister le lifecycle background sans étendre le schéma des RUN. Preuve locale du 2026-11-02 : Sidecar privé testé en reprise, distinct du registre métier.
- [x] 2.3 Garder l’accès détenu jusqu’à une fin shell terminale exacte. Preuve locale du 2026-11-02 : Campagne native : start EXECUTING, fin corrélée puis libération explicite.
- [x] 2.4 Tester start, sortie, timeout, divergence, restart et protection de l’ancien -03. Preuve locale du 2026-11-02 : Tests shell-lifecycle et campagne native ; historique sans shellID préservé.
- [x] 2.5 Exécuter les suites applicables et OpenSpec strict. Preuve locale du 2026-11-02 : Suites globales et OpenSpec strict, détails dans VALIDATION.md.

## Livraison

- [x] 3.1 Vérifier le périmètre SCM, archiver le change et produire son rapport d’archive. Preuve du 2026-11-02 : archive effective, 27 exigences ajoutées/12 modifiées, rapport à six sections relu, spécifications canoniques strictes 19/19.

## Programme CAB 2.2.0

- [x] 4.1 Spécifier la continuité, la récupération, les cadences et CABU ; vérifier la cohérence des deltas avant le code. Preuve : `openspec validate track-background-shell-lifecycle --strict`, succès le 2 novembre 2026 ; aucune qualification d’implémentation déduite.
- [x] 4.2 Migrer le contrat vers des références modulaires et vérifier la couverture des obligations avant suppression locale. Preuve du 2026-11-02 : 77 segments contrôlés, 18 renvois partagés adaptés sur accord, fichier local retiré avec empreinte vérifiée.
- [x] 4.3 Modifier le template AGENTS puis propager uniquement vers CAB selon l’accord du développeur. Preuve locale du 2026-11-02 : Template 0.6 puis propagation CAB vérifiée, identité propre conservée.
- [x] 5.1 Persister les validations et décisions corrélées sans autoriser un rejeu de once. Preuves locales du 2 novembre 2026 : tests de communication privée et continuité HTTP ; la campagne globale reste en 9.1–9.2.
- [x] 5.2 Persister les observations et reprendre leurs curseurs avec détection des lacunes et doublons. Preuves locales du 2 novembre 2026 : reprise durable, fenêtre dépassée, curseur étranger et redémarrage HTTP.
- [x] 5.3 Certifier le transfert compatible des accès/baux et conserver le repli protégé après crash ou divergence. Preuves locales du 2 novembre 2026 : transfert HTTP, identité/registre divergents, expiration et reçu non réutilisable ; raccord CABU et qualification globale restent en 7 et 9.
- [x] 6.1 Fournir un aperçu de récupération typé par RUN et ressource, avec politique d’autonomie et contrôles propriétaires. Preuve locale du 2026-11-02 : Tests de politique et API HTTP par propriétaire, contexte et ressource.
- [x] 6.2 Relier les actions autorisées aux chemins de récupération qualifiés ; conserver les effets incertains et les décisions humaines nécessaires. Preuve locale du 2026-11-02 : Reçus, frontières, tokens filtrés, corruption locale et gardes natives testés.
- [x] 7.1 Éviter toute coupure CABU lorsque les artefacts et processus sont déjà conformes. Preuve locale du 2026-11-02 : Comparatif isolé 2.1.81/2.2.0 : deuxième invocation sans arrêt ni reconnexion.
- [x] 7.2 Préparer les composants hors coupure et basculer seulement les groupes nécessaires, avec reprise du même reçu. Preuve locale du 2026-11-02 : Suites CABU : groupes ciblés, même reçu, réponse perdue et annulation avant coupure.
- [x] 7.3 Vérifier après bascule les versions et la continuité sans invalider tous les RUN ; qualifier le retour arrière sans retour d’état métier. Preuve locale du 2026-11-02 : Rollback et pannes testés ; transfert natif réel avec deux RUN et bail disjoint.
- [x] 8.1 Appliquer les échanges différentiels et le pilotage événementiel avec repli borné. Preuve locale du 2026-11-02 : Mandats différentiels explicites, décision réveillée après engagement durable, références conditionnelles.
- [x] 8.2 Exposer les mesures natives INPUT/OUTPUT/cache et les coûts de coordination disponibles, N/A motivé sinon. Preuve locale du 2026-11-02 : Collecteur natif dédupliqué, zéros/absences/couverture et API réellement vérifiés.
- [x] 8.3 Mesurer les instructions chargées, échanges, latences et coupures avant/après sur des parcours comparables. Preuve locale du 2026-11-02 : Comparatif CABU, octets des anciennes sources concordantes et reprise native ; facturation N/A.
- [x] 9.1 Qualifier les familles de panne, les opérations en cours et plusieurs RUN sur OpenCode isolé. Preuve locale du 2026-11-02 : Campagne OpenCode isolée : deux RUN, bail conservé, commande en cours et reprise ; limites dans VALIDATION.md.
- [x] 9.2 Exécuter les suites globales finales, contrôler UTF-8/LF et la distribution 2.2.0 complète. Preuve locale du 2026-11-02 : 819 Node réussis/31 opt-in ignorés, 93 Python, campagne native réussie, 17 validations strict, syntaxe et UTF-8/LF.
- [x] 9.3 Vérifier la matrice documentaire et les amendements ciblés de cartographie et registre avant 3.1. Preuve du 2026-11-02 : matrice VALIDATION.md réconciliée, 18 renvois vérifiés, OpenSpec CAB et prompts stricts, liens et UTF-8/LF contrôlés.
- [x] 9.4 Vérifier les statistiques d’archive et globales applicables, puis préparer le commit et les publications SCM. Preuve du 2026-11-02 : rapport six sections vérifié, SGS recalculé depuis 135 archives admissibles, branche main et variables locales validées ; exécution Git attestée au bilan terminal.

## Sous-lots normalisés

Code de lot non attribué : les repères ci-dessous sont provisoires, sans
allocation SL définitive. Les groupes et identifiants historiques restent
inchangés. La tâche 3.1 dépend de toutes les validations du programme 2.2.0.

| Repère provisoire | Tâches | Dépendances | Critère et preuve attendue | État au 2026-11-02 |
|---|---|---|---|---|
| Contrat et migration | 4.1–4.3 | Mandat SCM et accord de propagation | OpenSpec strict, correspondance des obligations et liens | QUALIFIÉ LOCAL, migration réalisée |
| Continuité | 5.1–5.3 | 4.1 | Tests de persistance, reprise, curseurs et reçus divergents | QUALIFIÉ LOCAL |
| Exécutions durables | 2.1–2.4 | 4.1 | Shell natif isolé, résultat terminal et accès protégés | QUALIFIÉ LOCAL |
| Récupération | 6.1–6.2 | Continuité et cycle natif | Tests HTTP de politique, preuves et isolation | QUALIFIÉ LOCAL |
| CABU court | 7.1–7.3 | Continuité | Pannes de bascule, processus conformes et mesures de coupure | QUALIFIÉ LOCAL |
| Efficacité | 8.1–8.3 | Contrat et observations durables | Mesures disponibles et tests d’événements | QUALIFIÉ LOCAL |
| Qualification et livraison | 2.5, 3.1, 9.1–9.4 | Tous les groupes précédents | Qualification, archive et rapports vérifiés ; publication SCM distincte | SOURCE QUALIFIÉE ET ARCHIVÉE |

## Ordre des postconditions de livraison

Les tâches 3.1 et 9.4 contiennent les postconditions administratives de la
livraison ; elles ne sont pas cochées par anticipation. Tous les prérequis
fonctionnels, documentaires et de qualification avant archivage sont prouvés.
Après l'archive effective, vérifier son rapport et la maintenance globale,
puis exécuter l'étape Git autonome SCM et vérifier ses destinations. Le bilan
de publication ne peut pas être inclus dans le SHA qu'il atteste ; ses preuves
terminales sont restituées séparément, sans falsifier les dates du rapport.

Le libellé initial de 9.4 était « Vérifier les statistiques d’archive et globales
applicables, puis le commit et les publications SCM ». Sa préparation et la
réalisation Git sont séparées pour éviter une postcondition autoréférente dans
le commit publié. Les opérations Git et leur vérification restent obligatoires
sous le mandat SCM ; elles sont attestées dans le bilan terminal distinct.
