---
name: CAB
description: Piloter les sessions CAB directes ou pilotées avec mandat autonome et revue finale.
---

# CAB 3.5.0

CAB réconcilie seul une publication statistique arrêtée sur preuves complètes
d'état avant fichier et index, sous verrous. FAILED_NO_CHANGE conserve l'UNKNOWN
original et ne constitue pas un succès ou un rejeu. Consulter la clôture normale ;
ne modifier ni statut SQL ni fichier pour fabriquer une preuve. Les divergences
et écrivains vivants restent protégés.

Une réussite ne mesurant aucun test ne devient pas une preuve valable par son
seul code0. Le codeur signale la preuve exacte ; l'administrateur peut utiliser
`finalization.contest_check` selon references/finalization.md. Les originaux sont
conservés, exclus de la sélection et une nouvelle exécution est obligatoire.
Ne pas élargir `finalization.revise_check` pour contourner un succès protégé.
Après `native.bind`, vérifier aussi `connector_bound` et `session_git_context` ;
`bound=true` seul atteste uniquement la liaison du journal natif.

Au cadrage d'un nouveau RUN, transmettre `finalization` à run_begin : nature,
checks (id, argv exact, critères couverts), preuves attendues et revue réservée.
Pour une livraison Git CAB, l'exigence de publication utilise le producteur
`delivery_producer` retourné par project_register ; CAB atteste le tag envoyé.
Une délégation administrative explicite peut conserver un producteur déjà
autorisé pour le RUN et sa version. Les releases différées restent distinctes.
Tous les critères doivent être couverts. Les autres essais autorisés restent
autonomes. Cadrer des chemins sources précis sans les dépendances régénérables.
Le service capture les reçus, assemble le dossier et clôture le RUN sans
submit, statistics_end ni run.close du LLM en fin de session. Le détail du RUN
fait foi pour les étapes des cycles historiques et du cycle Publication.
Un change OpenSpec actif interdit une clôture réussie. Archiver après résolution complète des tâches. Si une dépendance empêche de terminer, appeler `run_block` avec les dépendances concrètes. CAB produit `BLOCKERS.md` et enregistre `BLOCKED`. Les pauses explicites gardent leur parcours. En piloté le parent décide la revue.
Un outil natif hors CAB exige un producteur attestant explicitement autorisé ;
un journal de tokens ou une déclaration de l'agent ne prouve pas son exécution.
finalization_status expose les manques. finalization_configure autorise
l’adoption et la correction de prévol avant opération/preuve/modification de source/revue/gel ; aucun RUN ancien/importé migré implicitement.
Contrat et API indépendants des outils de publication, sans rejeu de travaux.

Le codeur direct ou piloté corrige seul un contrôle récupérable par
finalization_revise_check : request_id stable, expected_policy_digest courant,
check_id, nouvel argv et justification démontrée. Seul argv change ; critères,
producteurs, exigences et revue réservée restent fixes. CAB conserve versions
et reçus ; une preuve nouvelle est requise pour chaque nouvelle révision,
même après retour à un ancien argv. Un succès courant, effet indécis, bail,
gel, import ou revue/clôture interdit cette révision. Ne pas modifier SQL.
finalization_status expose next_actions et pending_operations : corriger ou
exécuter le seul contrôle affecté avec un nouvel identifiant, lire/réconcilier
un effet inconnu, attendre le producteur, l'archive ou la revue indiqués.
Ces actions sont des demandes précises, jamais des réexécutions automatiques.

Le service réévalue et clôture les RUN admissibles sur preuves, sans tour LLM.
`run_reevaluate` expose les motifs ; services sans preuve et effets inconnus
restent protégés. L'archivage de session `session_archive` exige CLOSED prouvé
et conserve RUN/SID/liens. Il est distinct de l'archive OpenSpec du change.

Historique : sur autorisation développeur explicite, `run_inspect_historical`
puis `run_close_historical` pour un RUN direct ancien archivé. Conserver digest,
receipt_id, référence d'autorisation et justification. Lire le reçu après une
réponse perdue ; aucun test inventé ou rejoué. CLOSED historique ne vaut pas
acceptation normale ni qualification courante de la livraison.

Les opérations Git des sessions passent exclusivement par CAB. Après le
rattachement natif, `session_git_context` identifie le RUN courant et
`session_git_inspect` fournit son état compact. Avant toute édition, réserver
les chemins exacts en un appel `session_git_reserve` ; un refus de réservation
interdit de modifier le fichier concerné. Après validation d'une étape, appeler
`session_git_stage` avec ses seuls chemins réservés et un request_id stable.
`session_git_status` relit le reçu ; ne pas rejouer un effet UNKNOWN. CAB possède
l'index isolé et les références internes qui conservent ses objets jusqu'à la
livraison confirmée. L'archive OpenSpec ne retire pas cet index. Le global
STATISTICS.md est écrit et indexé par CAB avant libération ; les agents ne le
réservent ni ne l'éditent.

Dans un RUN direct, le propriétaire peut inspecter puis admettre les
préexistants du mandat avec `session.git.inspect_preexisting` et
`session.git.authorize_preexisting` sous son identité CAB habituelle.
Dans un RUN piloté, l'orchestrateur désigné décide de cette admission et le
codeur réserve ensuite les fichiers sur son canal natif. Le mandat de
l'orchestrateur fixe le périmètre des écritures. CAB préserve la baseline
et les réservations des autres sessions. Un ancien dirty réellement propre
à HEAD est reconnu automatiquement.

Pour un travail demandé sans CI/CD ni livraison, après les derniers contrôles,
le report source et leur indexation, appeler `session_git_release` avant de
rendre la main. CAB exige que les fichiers correspondent à l'index validé et
ne libère que les réservations du RUN. L'index isolé et ses objets restent
conservés en état RELEASED ; aucun commit, tag ou push n'est créé. Un effet
incertain ou une livraison commencée interdit cette libération. Une reprise
d'écriture doit repasser par une nouvelle réservation ; un index libéré n'est
rouvert que si son snapshot conservé est inchangé. La clôture attend la
libération de toutes les réservations du RUN.

Pour obtenir CLOSED sans livraison, l'autorité administrative déclare
`finalization.host_completion` avec les empreintes de politique/cadrage attendues
et l'autorisation développeur. Seul un RUN direct de développement sans obligation
de publication/installation et avec index libéré est admis. Archiver OpenSpec,
exécuter les contrôles sur les sources courantes puis laisser CAB générer les
rapports et produire son reçu CLOSED livré=false, sans commit, tag ni push.
La déclaration seule ne clôture rien et ne dispense d'aucune preuve.
Un changement explicite de critères avant toute opération ou preuve passe par
`run.reframe_prequalification` ; il conserve l'ancien contrat et n'autorise
aucune modification de commandes, producteurs ou revue. Ce parcours ne remplace
pas la contestation d'une preuve existante.

Pour une CI/CD autorisée, charger le skill CICD. En direct, le codeur choisit
avec discernement une version cohérente avec le projet sans la redemander au
développeur ; une version explicitement imposée reste prioritaire. En piloté,
l'orchestrateur choisit et déclare la version par `session_delivery_select_version`
puis la transmet au codeur. CAB contrôle cette autorité dans son service.
Transmettre cette version à `session_delivery_start`, puis consulter `session_delivery_status`
sur cette même version. CAB met à jour PROJECT_VERSION, réalise commit, tag et
envois, puis les builds DIU activés sur le projet courant. Une décision de
report des releases appartient au RUN et à sa version, sans devenir un défaut
pour les autres projets. Les reçus distinguent livraison Git, build et release.
L'absence d'un outil sur un ancien connecteur n'autorise ni Git direct ni un
CI/CD DIU de substitution. Une capture initiale absente d'un RUN antérieur à
cette capacité reste signalée ; ne pas inventer un instantané historique.

Utiliser le serveur MCP `cab` installé par `/usr/bin/cab mcp`. Appeler `cab_status`
puis `cab_contract` avant cadrage ou reprise. Si CAB est non initialisé, le
parcours Web sur http://127.0.0.1:8790 appartient à l’administrateur ; ne lancer
aucun RUN ni créer la base hors de ce parcours.

En direct, enregistrer le projet et son RUN sans orchestrateur fictif. En
piloté, développeur et orchestrateur résolvent les choix avant `run_begin` et
transmettent chemins, critères, ressources et décisions au codeur. Le codeur
réalise, corrige, teste et coordonne en autonomie avec `atelier_execute`,
`external_execute` et `session_coordinate`. L’orchestrateur intervient seulement
sur les quatre exceptions ou à la revue finale. Aucune validation par commande.

Conserver SID/RUN/génération/request_id ; après réponse perdue, lire le même
reçu. UNKNOWN conserve ses protections et interdit tout rejeu. Les ateliers
pilotés sont sous /tmp et propres au projet ; les preuves durables restent en
base. Déclarer les incidents par `incident_report`, avec preuves, sans réparer
un autre change implicitement. Lire le mandat et ses critères avant reprise.

`autonomy_submit` lie code et reçus de tests ; `autonomy_review` accepte ou
redemande un travail. Publier seulement après acceptation finale applicable.
Les sources, qualification, livraison et activation sont des états distincts.

Le paquet fournit la logique métier, les clients et leurs dépendances ; ce
skill ne porte aucun contrôleur, stockage, script d’exécution ou secret.

Après transmission du mandat piloté, utiliser `wait_for_handoff` en conservant
son curseur : l’attente et les lectures sont mécaniques, sans tours LLM de suivi.
Le retour intervient pour exception ou revue finale ; ne pas demander de compte
rendu périodique au codeur. L’intégration Codex configure le délai du serveur
pour cette attente. Chaque agent utilise son profil privé distinct ; aucun
jeton SQL ou root n’est transmis au client.

Après archivage d’un RUN direct, utiliser `run_reconcile_archive` (ou
`cab call run.reconcile_archive`) avec l’archive exacte et le framing_digest
courant. Aucun effet non terminal ni bail détenu ; identités, gel et reçus
restent inchangés. Ne pas recréer la source ni utiliser run.adopt.

Pour un RUN régi par le protocole des étapes, le codeur direct ou
l’orchestrateur piloté annonce en texte « Début de l’étape N — nom » dans
la session, puis appelle `run_stage_begin`. Pour l’initialisation, annoncer
avant `run_begin` et enregistrer l’étape dès que le RUN existe. Reprendre le même identifiant si
la réponse est perdue. Pour une réitération, annoncer le retour et utiliser
un nouvel identifiant. Pour recommencer le passage courant après un échec
connu, préciser `restart=true`. CAB ouvre le passage et lance les tâches prévues.
Consulter `run_stage_status` pendant l’attente et transmettre les retours
utiles au développeur. Si un retour échoue, revenir à l’étape à reprendre.

Déclarer à `run_begin` les mandats effectivement autorisés sous forme de
liste, par exemple `["SCM","CICDF"]`. Si aucun mandat n’est nommé,
CAB expose son cadrage sous le nom `CAB`. Avant de terminer l’Initialisation,
vérifier cette liste, l’annoncer dans la session, puis la confirmer avec
`run_stage_action(action="mandats", mandates=[…])` et la tentative courante.
La confirmation consigne la liste sans changer les droits du RUN.

Pour une autre validation réellement effectuée, lire au besoin les actions
possibles avec `run_stage_action_catalogue` puis consigner l’action avec
`run_stage_action`. CAB journalise de lui-même les opérations et reçus connus.
L’Overview ne présente que les actions effectivement observées.

Les mandats d’étape concernent le change. CABU est une mise à jour de l’hôte :
lancer cab update séparément après la clôture et l’archivage lorsque le
développeur l’a autorisée, puis annoncer le résultat du reçu système.

Après avoir produit un bilan de blocage, le déclarer dans le passage courant
avec `run_stage_action(action="blocage", blocker_path=…)` et sa tentative.
Utiliser le fichier `BLOCKERS.md` du change. CAB accepte aussi son ancien nom
`BLOCKER.md`. Lorsque CAB produit le fichier lui-même, son écriture est tracée
par le service.

Quand toutes les tâches CAB du passage sont réussies, l’agent confirme sa
part avec `run_stage_validate`, en donnant la tentative et les faits vérifiés.
Avancer après `validated=true`. Pour la Publication, transmettre à l’entrée
la version choisie et le périmètre autorisé (`project` sur mandat CICDF).
En Clôture, attendre toutes les preuves, puis valider cette dernière étape.
CAB établit le reçu final à partir des preuves et de cette validation.

Pour les RUN historiques, déclarer la position par `run_progress` (ou `cab call run.progress`), selon le
cycle indiqué dans le détail du RUN. Pour un nouveau cycle, l’Archivage est à
l’étape 9. CAB fige les mesures, exécute Statistiques et Publication en
parallèle et place la session en Clôture. Lire les reçus de la même demande
pendant cette attente. La phase Statistiques committe localement les seuls
rapports qu’elle modifie si le parcours du change prévoit un commit.
Une position peut reculer et ne valide aucune étape. `run_stage_substep`
déclare un début et une fin avec le même identifiant pour chaque tentative.
Les tâches du change sont observées depuis tasks.md et mémorisées en base ;
leurs cases ne remplacent ni les tests ni la revue finale.

Codex : prévol `cab native-source --project-id <ID> --session-id <SID>` ou
native_locate, puis native_bind avec source_file omis/vide. Résolution ciblée
au seul jour et SID ; chemin explicite compatible, aucune conversation exportée.

Statistiques : après liaison native et avant la première tâche, statistics_begin
avec request_id stable et from_coding_start=true. Pour une entrée tardive, false.
La bascule entre changes du même SID ferme le contexte précédent en autonomie ;
statistics_end pour la pause/fin, nouveau début pour reprendre. statistics_change consulte le fichier local maître via sa projection ; CAB
produit/amende les rapports et le global sans calcul ni rédaction du LLM.

Reprise Codex : l’index natif peut désigner un nouveau journal pour le même SID.
Fermer la période ouverte puis native_bind(resume=true), sans effet en cours
ni gel ; seule la source indexée vérifiée est admise, historique conservé.
Ancien compteur non actualisé : N/A. Aucun arrêt de client ni rejeu de test.

MCP : Codex utilise --agent codex ; Codex CLI utilise --agent codex-cli avec son
propre profil par compte. La présence d'un catalogue dans /mcp ne prouve pas un
heartbeat vivant. native_mcp_reload et native_mcp_reload_status conservent le même
request_id ; UNKNOWN interdit tout rejeu. CAB privilégie les API de l'instance
réelle avant les replis possédés. cab native-prepare prépare un socket fournisseur,
mais adoption_required exige encore un frontend réellement raccordé ; ne pas
présenter un daemon isolé comme la connexion de la session existante. Les accès
sont accordés par l'OS sans contrôle ni normalisation de modes POSIX existants.

Avant run_begin, lire [le contrat de finalisation](references/finalization.md).
Il donne les champs admis, les natures, la validation pure, les IDs canoniques,
les refus explicites et le parcours de publication native hors atelier.
Ne pas inventer de champ ou de commande de revue. Un refus de schéma sans RUN
créé n'est pas un effet UNKNOWN. Un mauvais ID ne prouve pas une panne de CAB.

Utiliser finalization_validate avant admission ; cab_contract expose le schéma
strict et les types de preuves. La validation du schéma ne valide pas les accès
d’un atelier ni l’exécutabilité d’une commande.

Le superviseur réconcilie seul les tests locaux sandbox UNKNOWN/ProcessLookupError
admissibles quand leur arrêt est prouvé. Le statut CANCELLED et le constat séparé
stopped-result-unavailable ne valident pas le test : son reçu UNKNOWN et son hash
restent intacts. Attendre/consulter le même état ; aucun rejeu ni demande systématique
au parent. autonomous_recovery expose le motif si une preuve manque. Un processus
vivant, un atelier invérifiable, un test externe ou host_authorization garde ses
protections. La validation des sources actuelles reste distincte du résultat perdu.

Le moteur CAB déplace automatiquement le tag de version sans v sur le dernier
commit de clôture des statistiques et de BLOCKERS.md éventuel. La branche et
le tag sont envoyés atomiquement et vérifiés. Ce comportement est dans le code
CAB ; le LLM ne déplace pas le tag et ne réalise aucun commit ou push parallèle.

## Reprise nécessaire à CABU

Une demande CABU autorisée couvre aussi la reprise nécessaire de son instance
observée, pour le même demandeur, UID, request_id et version. Ne pas redemander
une confirmation pour cette seule reprise. Lire recovery_authorization dans
le même reçu ; AUTHORIZED est une autorité bornée, pas une preuve de reconnexion.
La préférence native reste prioritaire. Une reprise administrative contrôlée
du frontend n'est admise qu'en dernier recours RELOAD_REQUIRED, avec identité
kernel stable, frontière sûre de tous les acteurs du compte, PIDFD, reçu durable,
supervision indépendante et sortie prouvée avant relance. Aucun arrêt arbitraire
ni injection dans un canal privé. L'absence de mécanisme qualifié est un blocage
technique explicite, pas une raison de redemander l'autorisation déjà donnée.

Le propriétaire ou l'administrateur peut révoquer cette autorité par
`native.control.configure` avec `cabu_recovery_authorized=false` ; seule cette
préférence change, sans appel fournisseur ni nouvelle génération. Les reprises
en attente sont revérifiées sous verrou avant dispatch. Un effet UNKNOWN, une
instance divergente ou une révocation bloque sans rejeu. Un ancien reçu sans
observation kernel n'acquiert aucune autorité rétroactive par simple lecture.

Un commit de livraison FAILED avant références se traite avec CCAB et le
parcours administratif borné décrit dans le skill CICD. Conserver la même
livraison, version, RUN/SID et les reçus ; aucune relance start ni substitution
d’identité. L’inspection et le CAS ne sont pas une permission de choisir un
code divergent : seules les résolutions exactes explicitement revues sont admises.

## Plusieurs RUN directs dans un même Codex

Conserver le couple projet/RUN retourné par CAB pour chaque change et utiliser
le même SID natif vérifié. Rattacher chaque RUN avec `native_bind`. CAB maintient
sa liaison principale et accepte les autres RUN directs du même journal.
Dès qu’une cible implicite peut être ambiguë, transmettre `project_id` et
`run_id` à chaque opération Git ou de livraison, y compris les lectures de
reçus. Les réservations et les preuves restent propres au RUN ciblé.
La télémétrie native du SID conserve une période active à la fois.

Pour remplacer un cadrage jamais exécuté, indiquer `replaces_run_id` dans
`run_begin`. CAB vérifie et archive l’annulation dans la même transaction.
Ne pas utiliser STOP pour remplacer un RUN direct. Si le travail a commencé,
poursuivre le même RUN ou employer son parcours de clôture bloquée.
`run_cancel_replaced` régularise un ancien cadrage sur le reçu d’un
successeur livré et clôturé, sans réutiliser ses preuves pour le premier.


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
