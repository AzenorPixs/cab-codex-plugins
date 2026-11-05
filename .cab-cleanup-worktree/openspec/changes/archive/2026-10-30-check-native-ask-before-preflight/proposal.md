# Contrôle des permissions natives avant prévol

Code non attribué ; attribution ACL ultérieure. Mandat humain SCM avec incrément2.1.29, CABU puis information.

L’origine du deny est une action explicite du pilote pour une revue en lecture/propositions. Les empreintes des quatre règles sont identiques avant/aprèsCABU28. La reprise vérifiait modèle, inactivité et absence de demandes/accès, mais pas shell ask avant l’envoi du nouveau prévol. Le refus409 du contrôleur était correct. Le correctif doit empêcher cet envoi prématuré sans lever un deny automatiquement ni imputer la mutation au CABU.

Extraire le prédicat existant de contrôle ask dans un module partagé sans changer sa sémantique. Fournir une inspection client en lecture seule et une option structurée requiredNativeAsk sur prompt ; un refus intervient avant prompt, changement de modèle optionnel ou demandeMCP, sans PATCH/once. Les prompts historiques sans exigence restent utilisables sous deny pour lecture/propositions. Le contrôleur revérifie indépendamment avant admission/décision/once.

Le protocole impose le contrôle avant prévol et opération permissionnée, et une transition minimale explicite par le propriétaire après fin certaine de la revue, avec audit avant/après et préservation des autres deny. Aucun rétablissement global, allow, nouvelle autorité de permissions ou modification de template.

Fichiers : module de politique, client/contexte job, distribution updater, tests client/politique/natif ; skill/commandes/référence, cadrages et versions communes, OpenSpec, rapports et suivi ciblé.
