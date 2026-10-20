# Conception

## Lecture et présentation

Je conserve MONITOR et sa collecte SSE. STATS consulte une route dédiée du
contrôleur, relayée uniquement par des routes fixes du moniteur. La projection
exclut événements bruts, chemins, sessions, empreintes de comptes et preuves.
Les sources native/importées restent séparées. Les métriques temporelles sont
calculées par les vues existantes ; les latences et compteurs cumulatifs par
contexte portent un libellé distinct des fenêtres. Les listes sont bornées et
les troncatures visibles. Les versions réellement observées restent distinctes.

La navigation utilise des liens locaux avec sélection accessible et URL
fragmentaire. Le chargement statistique est borné, sans chevauchement, et
suspendu lorsque MONITOR est affiché. Une panne laisse la page disponible
avec la date du dernier succès et un état ancien explicite.

## Purge propriétaire

Le contrôleur détient les deux magasins controller-statistics.json et
controller-observations.json. La purge supprime seulement les anciens
contextes terminaux, tentatives anciennes non actives, événements et segments
historiques non protégés, et jeux importés entièrement anciens et inactifs.
Les segments mixtes et jeux contenant un contexte protégé sont conservés
entiers. Les contextes courants du registre, même terminaux, sont protégés
pour éviter leur recréation au prochain événement. Les contextes RESERVED
des magasins sont également protégés. Les agrégats globaux cumulatifs ne
sont pas soustractibles et restent conservés, avec cette limite visible.

La prévisualisation fixe une borne UTC stricte (date < borne), les nombres
par famille et une empreinte des candidats. Un jeton opaque expirant après
cinq minutes est nécessaire à la confirmation. Les candidats et protections
sont recontrôlés ; une dérive refuse la purge et exige une nouvelle
prévisualisation. Les demandes en mémoire et reçus sont bornés. Une répétition
du même jeton retourne le reçu existant sans nouvelle suppression.

La maintenance sérialise import et purge, suspend les nouveaux flush pendant
le drainage des écritures existantes, puis utilise des remplacements atomiques
privés synchrones par magasin. Cette courte section critique empêche les
collecteurs de modifier un snapshot entre son écriture et sa publication en
mémoire. Les callbacks métier ne sont pas modifiés. Chaque magasin est
validé et écrit séparément ; un échec partiel expose les seules suppressions
effectivement persistées et interdit une annonce de réussite globale.
Les lectures de fichiers refusent liens et fichiers non ordinaires.

Les nouvelles routes POST exigent JSON, en-tête dédié, Host loopback et
origine cohérente lorsqu'elle est présente ; le moniteur exige une origine
identique. Les corps, délais et réponses sont bornés ; aucune cible de fichier
ou route arbitraire n'est acceptée. Il n'existe aucune purge automatique.

## Compatibilité et repli

Les schémas persistants, routes existantes, permissions, décisions, RUN,
réservations et gates restent compatibles. La rétention native reste de
30 jours et 200000 éléments par famille ; 365 jours ne l'étend pas.
La purge confirmée est irréversible sans sauvegarde préalable. Annuler la
prévisualisation ne modifie rien. Le retour fonctionnel consiste à utiliser
MONITOR et les interfaces statistiques existantes ; aucun service installé
n'est modifié par cette préparation source.

## Validation

Tests déterministes des délais 1/3/7/30/365, borne exacte, protection,
idempotence, expiration, concurrence, liens, persistance et échec partiel.
Tests HTTP de projection, validation, indisponibilité et origine. Parcours
MONITOR/STATS/purge/annulation sur Chromium et Firefox headless, bureau et
mobile. Syntaxe Python/JS, versions, UTF-8/LF, OpenSpec strict et matrice
documentaire vérifiés avant synchronisation et archivage.
