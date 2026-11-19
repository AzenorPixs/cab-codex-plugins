---
name: cicd
description: Déclencher la CI/CD autorisée du projet via CAB avec une version, puis suivre le même reçu de livraison.
---

# CICD 3.2.21

Le moteur borne l'umask au seul subprocess de build DIU, sans changer celle du
service. Les données publiques du paquet restent lisibles ; CABU contrôle le.deb
avant installation. Un échec de prévol ne doit jamais être présenté comme une
activation réussie ou contourné par une réinstallation.

Utiliser ce skill pour une demande de livraison CI/CD par CAB. En session directe,
le LLM de codage choisit et transmet la nouvelle version avec discernement : lire
PROJECT_VERSION et les conventions du projet, puis adapter l'incrément au
périmètre validé. Ne pas demander systématiquement un numéro au développeur.
Une version explicitement imposée par le développeur prime sur ce choix.

En session pilotée, cette responsabilité appartient à l'orchestrateur : il
déclare son choix par `session_delivery_select_version(project_id,run_id,version)`
avant la livraison et le transmet au codeur. Le codeur utilise exactement cette
version ; CAB refuse une version choisie unilatéralement par le codeur piloté.
En direct, cette déclaration est possible et CAB la réalise aussi à l'admission
de `session_delivery_start`. `session_git_context` expose `version_policy` avec
version courante, format numérique et autorité. Le RUN et le projet proviennent
du rattachement natif vérifié ; ne pas inventer leur identité.

Vérifier que le catalogue MCP fournit `session_delivery_start` et `session_delivery_status`. Si ces outils manquent, signaler que le moteur ou le connecteur chargé ne propose pas encore ce parcours ; ne pas remplacer leur absence par des commandes Git ou un CI/CD DIU global.

Lancer `session_delivery_start(version)` pour la livraison autorisée. CAB met à jour PROJECT_VERSION, utilise l’index isolé de la session, crée le commit et son tag égal à la version, envoie aux forges et orchestre les builds et releases DIU activés. Le modèle n’exécute aucune opération Git et ne demande pas à DIU de les refaire.

Après admission, consulter `session_delivery_status(version)` jusqu’au résultat connu, en conservant la même version. Une interruption ou une réponse perdue impose cette consultation, sans nouvelle demande destinée à contourner l’incertitude. Les états UNKNOWN, PARTIAL et FAILED exigent de présenter l’étape et le reçu concernés ; ils ne prouvent pas une livraison réussie.

DIU travaille sur le répertoire habituel du projet dans son état au lancement. Les artefacts peuvent inclure des modifications postérieures au commit ; ne pas les présenter comme exclusivement issus de ce commit sans preuve.

Rapporter la version, le commit, les forges et les étapes effectivement confirmées. Distinguer publication et installation sur l’hôte : l’installation nécessite le parcours CABU et le mandat applicable. Ce skill ne crée pas une autorisation de livraison absente.

Les versions du projet et de release et leurs tags sont sans préfixe `v`.
Une version transmise détermine le tag ; à défaut de version transmise pour un
champ de tag par défaut, CAB utilise PROJECT_VERSION sans préfixe ajouté.
Une saisie nouvelle préfixée est refusée ; les lectures historiques restent
compatibles. Les anciennes références ne sont pas renommées automatiquement.

Après la livraison du code, la clôture CAB attend le commit des statistiques
finales et de BLOCKERS.md éventuel, puis ses envois confirmés. Une session
bloquée conserve son change ouvert et son code non livré. Lire le reçu terminal
avant de rendre la main ; FAILED et UNKNOWN ne sont pas des clôtures réussies.

Le moteur CAB déplace automatiquement le tag de version sans v sur le dernier
commit de clôture des statistiques et de BLOCKERS.md éventuel. La branche et
le tag sont envoyés atomiquement et vérifiés. Ce comportement est dans le code
CAB ; le LLM ne déplace pas le tag et ne réalise aucun commit ou push parallèle.
