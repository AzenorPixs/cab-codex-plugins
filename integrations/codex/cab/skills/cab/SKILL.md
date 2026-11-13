---
name: CAB
description: Piloter les sessions CAB directes ou pilotées avec mandat autonome et revue finale.
---

# CAB 3.1.3

Historique : sur autorisation développeur explicite, `run_inspect_historical`
puis `run_close_historical` pour un RUN direct ancien archivé. Conserver digest,
receipt_id, référence d'autorisation et justification. Lire le reçu après une
réponse perdue ; aucun test inventé ou rejoué. CLOSED historique ne vaut pas
acceptation normale ni qualification courante de la livraison.

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
