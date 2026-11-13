# Collecte native CAB 3.1.4

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

statistics expose les périodes du RUN ; statistics_change consulte la projection
du STATISTICS.md local du change. Le service collecte les observations natives,
produit le fichier local puis le projette dans PG, sans rédaction par le LLM.

statistics_end ferme les périodes. À l’archivage et lors de run.close, CAB produit
ou amende le rapport, synchronise le catalogue et le global ; lire le reçu de
clôture, sans produire de preuves statistiques JSON à sa place. Les champs non
observés restent inconnus et les bornes tardives ne deviennent pas rétroactives.

Reprise Codex : native_bind(resume=true) conserve SID/RUN et historique après
fermeture de période et vérification du journal indexé courant. La synchronisation
statistique est événementielle et rattrapée aléatoirement dans les24heures.
