# Collecte native CAB 3.0.7

Le service cab.service collecte dans PostgreSQL ; aucun daemon de plugin ni
moniteur direct séparé. Après cab_status et cab_contract, utiliser project_register
puis run_begin avec la vraie identité native, son mode et son cadrage résolu.
Pour Codex direct, native_locate ou `cab native-source --project-id <ID> --session-id <SID>`
résout en lecture seule le seul fichier de la session. native_bind peut omettre
source_file (ou passer une chaîne vide avec un client déjà chargé) ; le chemin
explicite reste compatible pour les stockages spécifiques. CODEX_HOME est
transmis par les clients CLI/MCP, codex_home peut être fourni au contrat API.
Le jour UUIDv7 et le SID exact bornent la recherche ; absence/ambiguïté sont refusées ;
le service vérifie compte, projet, SID et inode. Aucun scan de conversations et
aucun prompt ne sont exportés. La collecte quantitative est périodique, indépendante
du LLM. Une même identité d’agent peut héberger plusieurs RUN sans mélanger les
sources. OpenCode utilise le profil natif explicite du compte et le SID du RUN.

Avant la première tâche du RUN, ouvrir sa mesure avec statistics_begin
(project_id, run_id, request_id stable, from_coding_start=true). Le codeur
atteste ainsi que cette borne précède effectivement le codage. Une reprise
historique déjà engagée utilise false : aucune mesure rétroactive n’est inventée.
Un seul contexte est ouvert par SID ; commencer celui d’un autre change ferme
le précédent à la même frontière, sans suspendre les RUN ni demander d’aval.
Pour une pause, statistics_end ferme la période ; reprendre avec un nouveau
request_id de début. Répéter un même request_id lit son reçu, sans réouvrir.

statistics expose seulement les périodes bornées du RUN. statistics_change
agrège tous les RUN et SID du change et fournit sgs_evidence. Les anciens totaux
natifs de session sont des diagnostics et ne sont jamais des totaux du change.
Un RUN non mesuré depuis son entrée en codage empêche un total complet SGS ;
les mesures partielles restent inspectables. Source/compteur divergents ou
champ manquant restent N/A. Les écarts portent les observations natives entre
bornes ; aucun événement tardif ou requête chevauchante n’est découpé ou estimé.

Avant le rapport final, statistics_end ferme la dernière période. run.freeze
ferme aussi uniquement celle du RUN concerné avant de figer la collecte. Utiliser
sgs_evidence de statistics_change comme preuve structurée de CHANGE, puis DELTA
pour le seul global existant. Aucun total natif partagé n’est réinjecté à la main.
Les autres preuves (tests, syntaxe, tâches) ne deviennent pas zéro si la source
native ne les fournit pas : les documenter séparément dans le bilan final.

Après archivage réussi, cab call run.close reçoit project_id, run_id, branch
TERMINÉ, receipt_id stable, report relatif et sha256 du STATISTICS.md durable.
La branche BLOQUÉ exige rapport et BLOCKERS.md. Même SID/RUN et même reçu ;
aucun effacement des pairs ni rejeu. Un change peut regrouper plusieurs RUN et
plusieurs sessions ; seuls leurs écarts de périodes sont agrégés, une fois.

Après reprise Codex, native_locate consulte l’index natif pour le seul SID,
sans scanner les conversations. Si la liaison désigne l’ancien fichier, fermer
sa période puis native_bind(resume=true) : index courant vérifié, historique
conservé, même SID/RUN, aucun effet en cours ni gel. Recommencer la mesure avec
un nouveau request_id ; ne pas mélanger les compteurs des deux fichiers. Un
compteur non actualisé reste indisponible, jamais interprété comme zéro.

En piloté, le codeur gère les mêmes périodes en autonomie. Pour le CLI OpenCode
déjà chargé : CAB_AGENT=opencode cab call statistics.begin/end/change, avec le
profil du codeur. L’orchestrateur n’approuve pas les bascules.
