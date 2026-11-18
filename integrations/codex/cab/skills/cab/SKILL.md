---
name: CAB
description: Piloter les sessions CAB directes ou pilotées avec mandat autonome et revue finale.
---

# CAB 3.2.18

Au cadrage d'un nouveau RUN, transmettre `finalization` à run_begin : nature,
checks (id, argv exact, critères couverts), preuves attendues et revue réservée.
Pour une livraison Git CAB, l'exigence de publication utilise le producteur
`delivery_producer` retourné par project_register ; CAB atteste le tag envoyé.
Une délégation administrative explicite peut conserver un producteur déjà
autorisé pour le RUN et sa version. Les releases différées restent distinctes.
Tous les critères doivent être couverts. Les autres essais autorisés restent
autonomes. Cadrer des chemins sources précis sans les dépendances régénérables.
Le service capture les reçus, assemble le dossier et finalise périodes/stats
et CLOSED11 sans submit, statistics_end ou run.close du LLM en fin de session.
Les pauses explicites gardent leur parcours. En piloté le parent décide la revue.
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

Pour un travail demandé sans CI/CD ni livraison, après les derniers contrôles,
le report source et leur indexation, appeler `session_git_release` avant de
rendre la main. CAB exige que les fichiers correspondent à l'index validé et
ne libère que les réservations du RUN. L'index isolé et ses objets restent
conservés en état RELEASED ; aucun commit, tag ou push n'est créé. Un effet
incertain ou une livraison commencée interdit cette libération. Une reprise
d'écriture doit repasser par une nouvelle réservation dans un nouveau parcours.

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

Déclarer la position du cycle par `run_progress` (ou `cab call run.progress`),
étape1–11 et phase. Une position peut reculer et ne valide aucune étape ni gate.
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
