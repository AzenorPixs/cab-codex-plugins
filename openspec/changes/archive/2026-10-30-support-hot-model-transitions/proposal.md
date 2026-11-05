# Changer le modèle et le fournisseur à chaud

## Why

Le développeur valide SCM puis CABU pour le raccord fournisseur V2 et la transition du choix dans le même job. Il précise : choix explicite libre de changer de fournisseur/modèle/raisonnement, sans contrainte de l’ancienne politique ; sans choix explicite, suivre la PLLM. Les gardes métier, confidentialité et coordination partagée restent applicables. Un seul change, code non attribué selon ACL, sans allocation.

## What Changes

Version commune2.1.19. Ajouter une transition explicite prepare/commit/cancel, sous frontière sûre, conservant RUN/job/session, historique et preuves, pour jobs historiques sans choix et jobs durables. L’armement ordinaire reste immuable. Un choix explicite ne dépend ni du catalogue ni de l’ancienne politique ; une sélection omise est recalculée par la PLLM actuelle. Ajouter un raccord par l’API native integration.connect.key, secret fourni par processus sécurisé et vérification de connexion sans lecture des credentials. Qualifier sur un banc privé2.2.0 exact et comparer au schéma du serveur vivant, sans extrapolation du CLI2.2.2.

## Impact

Client V2, politique modèle, job-context, contrôleur, superviseur et helper de raccord ; tests unitaires/HTTP/natifs privés, documentation et versions communes. Aucun template, source consommateur, décision native ou credential réel modifié par la qualification. Publication et CABU après succès SCM ; raccord réel partagé et adoption de chaque job restent des opérations corrélées des propriétaires. Aucun achat, redémarrage OpenCode, purge ou repli V1.

Concordance documentaire nécessaire : deux paragraphes de timeout déjà révisés dans le protocole local0.6 sont reportés vers concurrent-runs.md et la section de récupération skill/commande ; les contrôles de concordance sont conservés. Aucun template, protocole racine ou comportement de timeout ne change dans ce correctif.
