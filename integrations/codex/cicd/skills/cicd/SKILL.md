---
name: cicd
description: Déclencher la CI/CD autorisée du projet via CAB avec une version, puis suivre le même reçu de livraison.
---

# CICD 3.5.0

Le moteur borne l'umask au seul subprocess de construction CAB, sans changer celle du
service. Les données publiques du paquet restent lisibles ; CABU contrôle le.deb
avant installation. Un échec de prévol ne doit jamais être présenté comme une
activation réussie ou contourné par une réinstallation.

Utiliser ce skill pour une demande de livraison CI/CD par CAB. En session directe,
le LLM de codage choisit et transmet la nouvelle version avec discernement : lire
PROJECT_VERSION et les conventions du projet, puis adapter l'incrément au
périmètre validé. Ne pas demander systématiquement un numéro au développeur.
Une version explicitement imposée par le développeur prime sur ce choix.

Dans le cycle historique, en session pilotée, cette responsabilité appartient à l'orchestrateur : il
déclare son choix par `session_delivery_select_version(project_id,run_id,version)`
avant la livraison et le transmet au codeur. Le codeur utilise exactement cette
version ; CAB refuse une version choisie unilatéralement par le codeur piloté.
En direct, cette déclaration est possible et CAB la réalise aussi à l'admission
de `session_delivery_start`. `session_git_context` expose `version_policy` avec
version courante, format numérique et autorité. Le RUN et le projet proviennent
du rattachement natif vérifié ; ne pas inventer leur identité.

Vérifier que le catalogue MCP fournit `session_delivery_start` et `session_delivery_status`. Si ces outils manquent, signaler que le moteur ou le connecteur chargé ne propose pas encore ce parcours ; ne pas remplacer leur absence par des commandes Git ou un CI/CD DIU global.

Pour un RUN régi par le protocole des étapes, annoncer la Publication puis appeler `run_stage_begin` à l’étape 11 avec la version et `scope="change"`. Attendre ses résultats avec `run_stage_status` avant de valider le passage. Dans un RUN historique, lancer `session_delivery_start(version)`. CAB met à jour PROJECT_VERSION, utilise l’index isolé de la session, crée le commit et son tag égal à la version et envoie aux forges. CAB construit les artefacts activés et les publie par ses fonctions natives. Utiliser le parcours CICDF uniquement sur mandat explicite de livrer tous les fichiers admissibles du projet. Le modèle n’exécute aucune opération Git et ne demande pas à DIU de les refaire.

Après admission, consulter `session_delivery_status(version)` jusqu’au résultat connu, en conservant la même version. Une interruption ou une réponse perdue impose cette consultation, sans nouvelle demande destinée à contourner l’incertitude. Les états UNKNOWN, PARTIAL et FAILED exigent de présenter l’étape et le reçu concernés ; ils ne prouvent pas une livraison réussie.

CAB construit sur le répertoire habituel du projet dans son état au lancement. Les artefacts peuvent inclure des modifications postérieures au commit ; ne pas les présenter comme exclusivement issus de ce commit sans preuve.

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

Pour un RUN à douze étapes, appliquer le skill **Version** après la
spécification. Le codeur choisit puis appelle `version_propose` après
l’accusé du lecteur habilité. En piloté, l’orchestrateur déclare le
numéro choisi par le codeur. Les RUN historiques gardent leur parcours.

## Reprise administrative avant commit

Une livraison PARTIAL dont le commit a échoué avant déplacement des références
ne se relance pas avec un nouveau start, une nouvelle version ou un autre RUN.
Le moteur expose à l’administrateur système local les actions strictes
`inspect_precommit`, `resume_precommit` et `status_precommit` sous la commande
`session.delivery.policy`. Les champs habituels de politique de publication
restent inchangés quand aucune action de reprise n’est fournie.

L’inspection prend `project_id`, `run_id`, `delivery_id` et éventuellement
`resolutions` ; elle retourne `expected_state` et `effects_issued=false`.
La reprise ajoute un `request_id` stable, cet état exact et une justification.
Le statut relit le même identifiant ; une réponse perdue n’autorise aucun rejeu.
Seul le commit FAILED connu avant références est admissible ; version et
projection doivent déjà être COMPLETED et toute étape aval encore PENDING.
CLOSED/BLOCKED/FINALIZING, effet UNKNOWN, bail, gel ou source divergente protègent
la session. Le worker revérifie le CAS sous le verrou Git avant tout effet.

La résolution automatique traite uniquement les scalaires de version déclarés
si les autres octets et données, ainsi que le mode, sont identiques à HEAD.
Pour un CICDF, une dérive de l’index partagé limitée aux rapports CAB attestés
suit le même reçu avec le plan de code figé. Toute divergence de code ou
preuve statistique manquante reste bloquante. Une résolution manuelle nécessite les
chemins réservés et leurs OID/modes HEAD et staged, le SHA256 de chaque diff,
ainsi que `resolution_approval` avec `paths_digest`, `owner_reference` et
`reviewer_reference`. Le propriétaire et le responsable doivent avoir relu ces
deltas exacts ; une référence libre ne constitue pas une preuve native nouvelle.
L’administrateur porte cette décision explicite et la conserve avec le CAS.
Aucun choix ours implicite ni modification du fichier de travail/index source
n’est effectué pour cette résolution ; seul l’index candidat reçoit les blobs
exactement approuvés. Toute divergence refuse l’admission ou son dispatch.

L’échec original et son reçu restent inchangés ; un événement immuable conserve
le snapshot de l’étape FAILED. La nouvelle tentative de commit est corrélée,
et la continuation reprend les seules étapes aval jamais émises. Le PID encore
vivant d’un service n’est pas une preuve d’activité d’un worker logiquement terminé.
Les opérations Git restent exclusivement exécutées par CAB.


## Effets de session et reprise après commit

Le moteur CAB réalise Git, la génération et la publication des artefacts. Le LLM
déclare l'intention et traite les exceptions ; il ne reproduit pas les commandes
Git, les empreintes ni les boucles de suivi du service.

Avant les tests finaux et tout start, appeler `session_version_prepare` avec la
version retenue et un request_id stable. CAB aligne ses versions publiques,
réserve les chemins nécessaires et exige une nouvelle qualification. Le prévol
refuse une version désalignée avant commit, tag ou envoi.

Pour une opération ponctuelle, `session_effect(action="authorize")` enregistre
l'autorisation explicite du développeur et la nature exacte : `commit`,
`build:debian`, `build:docker` ou `publish:FORGEJO`/`publish:GITHUB`/`publish:GITLAB`.
En direct, le propriétaire la porte ; en piloté, l'orchestrateur l'enregistre et
le codeur utilise son approval_id. Puis `action="request"`, `mode="requested"`,
avec cet approval_id, la version et un nouveau request_id. Un commit ponctuel
ne crée ni tag ni publication implicite. Les fichiers restent qualifiés/indexés.

Après un échec connu du parcours, `mode="recovery"` lie la nouvelle tentative
à la livraison et à son étape FAILED. CAB conserve l'ancien reçu. Après un
commit déjà publié, `action="open_recovery"` conserve delivery_id, RUN et version,
avec l'autorisation développeur et scope="project" seulement sous mandat CICDF.
Corriger et qualifier les sources ; `kind="resume"`, `mode="recovery"` reprend
ensuite cette même livraison avec un commit supplémentaire et des leases exactes.
Aucun nouveau start/version/RUN ne remplace une livraison partielle.

`request` capture lui-même le CAS et suit mécaniquement le résultat pendant une
attente bornée. `inspect` est facultatif, utile au diagnostic ; le LLM n'a pas à
transporter le snapshot. Si l'attente dépasse ce délai, `action="status"` relit
le même request_id. UNKNOWN reste protégé, sans rejeu. Une réussite technique
n'efface pas les échecs antérieurs et ne vaut pas activation CABU.


### Remédiation avant reprise

Un échec de build suit diagnostic → remédiation → qualification → reprise.
`session_effect(action="diagnose", args={delivery_id})` expose des causes et
remédiations structurées, sans sortie brute du processus. Après open_recovery,
`action="remediate"` prépare les versions publiques nécessaires et retourne
SOURCE_QUALIFICATION_REQUIRED. `request(kind="resume", mode="recovery")` déclenche
aussi cette préparation automatiquement si elle manque ; si elle modifie les
sources, il rend la main pour leur qualification, avant toute nouvelle tentative.
Un manque de dépendance ou un défaut de source non corrigé reste explicitement
à traiter. Le moteur n'installe pas de dépendance nouvelle ni ne rejoue UNKNOWN.
Le suivi natif constate aussi un arrêt du worker, avec reçu conservé.

Une reprise de build sans changement de source réutilise le commit existant.
Une reprise du commit FAILED est permise au propriétaire du RUN et conserve
les reçus de la tentative précédente. Les commandes Git restent dans CAB.
