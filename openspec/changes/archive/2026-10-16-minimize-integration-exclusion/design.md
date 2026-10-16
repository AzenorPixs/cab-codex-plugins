# Conception

## Fenêtre critique

Préparer analyses, validations locales, commandes et brouillon statistique avant
integration-request. Les pairs atteignent un jalon cohérent et validé, pas
nécessairement la fin du change. Sous barrière restent la base actuelle, la
quiescence, les validations combinées applicables, la synchronisation, l'archive
et la preuve de publication. Rapport, relevés finaux et gate restent après.
Un effet inconnu conserve la barrière ; aucune expiration ne vaut libération.

## Transition atomique

POST /runs/<runId>/integration conserve son contrat historique. Pour une
libération publiée, les champs optionnels combinés sont referenceVersion
(référence attendue avant publication) et completion { transactionId, reportFile }.
version et evidence restent obligatoires. La réponse ajoute completion, un reçu
stable avec runId, contextId, requestVersion, previousReferenceVersion,
referenceVersion, version, transactionId, reportFile et evidenceDigest.

Avant toute mutation : propriétaire, génération, référence, preuves non secrètes,
cible exacte d'archive, conflits, effets et quiescence sont contrôlés. Une seule
persistance publie la référence, réduit les ressources au rapport, incrémente la
génération, retire la file et libère la barrière. Le reçu persistant permet la
relecture du même résultat, même après reprise, livraison ou change suivant.
Réutiliser transactionId avec un autre contenu est refusé ; le reçu ne rejoue
aucune permission. Il ne vaut ni preuve métier approuvée par CAB ni gate terminal.

Le registre passe en schéma 3 uniquement lors de cette transition. Les opérations
historiques ne rétrogradent jamais un schéma déjà utilisé. Un retour arrière exige
une réconciliation explicite ; il n'est pas exécuté par cette session.

## Diagnostics et observations

GET /runs/<runId>/integration-status expose la tête FIFO, le propriétaire,
la référence et des obstacles par RUN : jalon absent, référence périmée,
mandat courant, validation indécise, effet non résolu, récupération,
session occupée ou permission native restante. Les contenus sont exclus.
Ce diagnostic ne donne aucune autorisation et ne juge pas les preuves locales.

Pour une acquisition ou une libération, fermer d'abord les admissions puis lire
une seule fois session/status et permission pour la cohorte, en parallèle des
identités natives. Recontrôler révision du registre, événements SSE pertinents,
sessions et effets avant transition. Toute divergence exige une nouvelle lecture,
sans cache de permission ni décision. Les interfaces historiques restent gardées.

## Vérification et limites

Tests en répertoires temporaires et ports éphémères, jamais sur les RUN actifs.
Couvrir transaction concurrente, reçu répété/divergent, reprise durable, ancienne
génération, mauvaise archive, persistance échouée, FIFO, diagnostics, observations
invalides ou modifiées et permissions once. Conserver les régressions existantes.
Les durées queueMs et integrationMs restent distinctes et peuvent se recouvrir ;
aucun gain réel ni durée causale totale n'est déduit des seuls tests synthétiques.
