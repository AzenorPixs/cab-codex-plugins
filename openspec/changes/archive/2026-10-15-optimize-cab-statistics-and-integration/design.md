# Conception

## Collecte et confidentialité

Le contrôleur possède un agrégateur commun. Il reçoit les transitions du registre,
les demandes relayées par le broker, les décisions et permissions du job-context,
et les métadonnées des événements SSE déjà consommés. Aucun poll supplémentaire
par mandat, agent d'observation, benchmark ni appel LLM n'est nécessaire.
Le snapshot privé runtime est écrit atomiquement avec regroupement des écritures.
Une défaillance statistique est visible et ne produit jamais de permission.

L'attribution utilise runId et contextId, ainsi que la session native et requestId
pour les latences. Un nouveau change du même RUN crée un nouveau contexte.
Les doublons d'événements sont dédupliqués par identité native. Les quantiles
utilisent un échantillon borné dont la portée est affichée. Les périodes sans
source native ou contrôleur sont inconnues et restent distinctes de ZERO.
Les identifiants de fichiers, messages ou outils servent à dédupliquer ; les
corps, arguments, URL, chemins des opérations et sorties ne sont pas conservés.

GET /statistics expose les agrégats ; GET /runs/<id>/statistics avec contextId
optionnel expose un contexte y compris après livraison. format=markdown retourne
un brouillon à six sections. Le service n'écrit pas dans les archives et ne juge
pas les preuves. Les métriques indisponibles (quotas natifs, versions exactes,
sondes, liste complète des fichiers et URL) restent N/A. L'orchestrateur peut
compléter le brouillon à partir de sources autorisées avant mandat de publication.

## Intégration et ressources

POST /runs/<id>/integration-request avec version, evidence et cancel optionnel
gère une file FIFO durable, idempotente par contexte. Une demande ferme les
nouvelles admissions ; les RUN existants atteignent leur prochain jalon sûr.
Un RUN déclaré ready ne reçoit plus de nouveau mandat pendant le drainage.
Le premier de la file peut acquérir seulement après les gardes habituelles.
Les appels historiques sans file restent acceptés. La file ne vaut ni autorisation
ni acquisition ; elle ne libère rien par expiration. Annuler exige son propriétaire.
La réconciliation ne change pas la position de la demande du même contexte.

POST /runs/<id>/resources réduit les ressources après contrôle de quiescence,
preuves et version. Chaque ressource doit être couverte par l'ancienne portée,
sans escalade read vers write. La génération change et les anciennes permissions
sont invalides. L'obligation de publication survit à la réduction des écritures.
La lecture project:* des tests globaux reste disponible seulement sous barrière ;
elle n'a pas à devenir une réservation durable.

## Publication et rapport

Après validations combinées et archive autorisée, libérer /integration avec
published=true et preuves. POST /runs/<id>/closing, quiescent et hors barrière,
fige la publication et remplace la portée par l'unique STATISTIQUES.md de l'archive
du change. Cette phase est irréversible dans le même contexte : ni extension,
nouvelle intégration ni écriture de code n'est admise. Les pairs réconcilient la
référence et reprennent pendant la préparation documentaire. Une écriture native
du rapport en cours reste prise en compte par les gardes de quiescence ; toute
intégration active suspend aussi cette écriture. Les éditions du rapport ne
défont pas la publication métier. Une référence ultérieure ne nécessite pas de
revalider le code déjà publié pour une opération strictement documentaire.
La libération finale exige toujours rapport vérifié, gate TERMINÉ et désarmement.

## Validation et repli

Tests déterministes horloge/SSE synthétiques, persistance et reprise, refus des
liens et snapshots invalides, FIFO/cancellation, réduction sans contournement de
publication, closing limité à sa propre archive, compatibilité historique et
permissions once. Les suites existantes sont exécutées séparément. Aucun essai
sur les RUN vivants. Pas de revendication de gain avant une mesure comparable.
Le déploiement coordonné est hors de cette session ; aucune migration silencieuse
des états runtime ou des huit projets n'est appliquée.
