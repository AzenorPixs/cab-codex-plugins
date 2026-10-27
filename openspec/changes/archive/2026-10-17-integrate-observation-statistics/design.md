# Architecture

Un magasin privé d'observations complète SessionStatistics sans remplacer son snapshot historique. Il conserve des segments horodatés et des événements filtrés, ainsi que des jeux importés immuables identifiés par empreinte. Le contrôleur expose un import local explicite et une vue de consultation. Une CLI distribuée transforme les seuls artefacts d'audit autorisés en jeu filtré ; elle ne démarre aucun collecteur et ne lit aucun historique brut OpenCode.

# Attribution et fenêtres

L'identité principale est projet/runId/contextId ; changeId, sessionId et les bornes sont conservés. Chaque source reste indépendante dans la restitution : les temps recouvrants ne sont jamais additionnés entre sources. Les intervalles sont découpés aux bornes de la fenêtre ; source absente, scope changé, état natif absent ou couverture antérieure non mesurée restent inconnus. La collecte native conserve 30 jours de détails avec limites de taille ; une rétention/limite réduisant la couverture est visible.

Le courant correspond aux réservations actives du contexte ciblé, ou à tous les RUN actifs si aucun RUN n'est ciblé. Le dernier correspond à la dernière livraison observée et horodatée, jamais au contexte simplement le plus récemment consulté. À défaut de donnée native actuelle, un état importé est explicitement historique et daté. Les données cumulées héritées sans horodatage ne deviennent pas des compteurs de fenêtre.

# Confidentialité et neutralité

Le contrat d'import refuse les champs non prévus, chemins d'opérations, messages, commandes, arguments, URL, sorties et identifiants bruts de compte. Les preuves utilisent des identifiants opaques, empreintes et états ; les quotas restent partagés. Les fichiers sont ordinaires, sans liens symboliques/physiques, bornés et remplacés atomiquement en 0600. Une erreur de statistiques n'autorise, ne rejoue et ne bloque aucun effet métier.

# Compatibilité et repli

Le snapshot natif existant reste compatible. Les nouvelles données utilisent un fichier distinct ; les anciennes interfaces et les six sections du brouillon d'archive sont conservées. Une donnée invalide reste intacte et signale une dégradation. Le retrait des nouvelles sources n'efface aucun rapport ni état métier ; aucun déploiement ou migration de RUN actif n'est réalisé dans cette session.

# Vérification

Tests déterministes des fenêtres, changements de contexte et de portée, concurrence à deux/trois, événements en doublon, livraisons, secrets/champs interdits, import répété/divergent, restauration, liens, erreurs de persistance et intégration HTTP sans effet de permission. Comparaison hors ligne avec les données réelles du job arrêté et contrôle des cinq commandes/version 1.3.0. Régressions CAB Python/Node et validations OpenSpec strictes avant archivage.

# Réalisation source 1.3.0

Le magasin d'observations est au schéma 2 avec identité de projet persistée ; le bundle d'import reste au schéma 1. Un magasin sans identité compatible reste intact et signale sa limite. L'import JSONL est progressif (512 MiB par fichier, jusqu'à 32 fichiers ordonnés, 2 MiB par ligne) et refuse les sources liées ou modifiées pendant lecture. Les observations historiques sans file, réconciliation ou métriques de ressources restent inconnues sur ces dimensions. Les premiers/derniers relevés comparables du compte sont conservés sans attribution exclusive au RUN.
