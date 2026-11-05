## Context

`main()` appelle `recover_after_unclean_shutdown()` avant la lecture MCP.
`repair_journal_for_item()` recherche les événements de création et terminal
via `journal.read_events()`, qui charge tout le journal avant ses filtres.
Le développeur a validé la remédiation A et ce change, son cycle jusqu'à
l'archivage, ainsi que l'alignement de `pyproject.toml` sur `0.86.3`.

## Goals / Non-Goals

Réduire à une lecture initiale les recherches de présence dans la première
boucle de réparation post-crash. Préserver les appels existants sans index,
les payloads, les validations d'identifiants, les contrôles de cohérence,
l'intégrité SHA-256/HMAC et la gestion des erreurs.

Ne pas déplacer la récupération dans un thread, introduire de cache global,
modifier `read_events()` ou compacter le journal. Ne pas agir sur l'installation
globale, les processus utilisateur, Git ou les autres changes.

Le développeur a ensuite autorisé l'ajout de la règle documentaire de rapport
post-archivage dans `AGENTS.md` de CAB et de template, après l'échec du test de
distribution qui en vérifie la présence. Le même paragraphe est ajouté aux deux
fichiers ; aucune autre modification de template n'est incluse. La capacité
`archive-session-statistics` existante définit déjà cette obligation.

## Decisions

Un paramètre optionnel `event_index` transmet un ensemble de couples aux
fonctions existantes de réparation et de recherche. Sa valeur par défaut
`None` conserve le comportement actuel. La boucle initiale construit cet
ensemble depuis une lecture du journal, sous le verrou du magasin, après les
sauvegardes éventuellement nécessaires. Les identifiants suivent les mêmes
validations que `read_events()` avant une recherche indexée.

Une écriture continue de passer par `journal.append_event()`. Le couple est
ajouté à l'ensemble seulement après son succès. Les réparations ultérieures
de décisions reprises utilisent le chemin existant sans cet index périmé.

Pour un magasin déjà cohérent, les recherches passent de O(approbations ×
événements) à O(approbations + événements). Les écritures effectivement
nécessaires et les contrôles de cohérence restent susceptibles de relire le
journal ; le correctif ne promet donc pas une seule lecture pour tout le
démarrage, ni un délai fixe pour tout volume ou état.

## Risks / Trade-offs

L'ensemble utilise une mémoire proportionnelle au nombre de couples distincts.
Un index périmé ou alimenté avant une écriture réussie pourrait masquer un
événement manquant : l'index reste local à la boucle initiale et les tests
couvrent les échecs d'écriture. Les divergences continuent d'exiger une
intervention humaine. Aucun état persistant n'est converti : le repli consiste
à rétablir les sources antérieures, sans migration de données.

## Validation

Tests Python sur un état UNCLEAN synthétique : journal complet et partiellement
manquant, répétition idempotente, expiration, divergence et corruption,
validation d'identifiants et échec d'append. Comparaison déterministe du nombre
de lectures entre recherches existantes et indexées, et mesure indicative sur
694 approbations / 16 774 événements synthétiques. Sous-processus MCP isolé
avec `initialize` et version `0.86.3`. Syntaxe Python/JavaScript, suites Python
et Node existantes, cohérence de versions et validation OpenSpec stricte.
