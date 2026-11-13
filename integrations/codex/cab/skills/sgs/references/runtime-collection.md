# Collecte native CAB 3.0.5

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

Consulter statistics pour les valeurs natives et leur couverture. Les absences
restent N/A ; ne pas additionner cache ou raisonnement à un total qui les contient.
Avant le rapport final, `cab call run.freeze` avec project_id et run_id sur stdin
fige la collecte après son dernier relevé. Utiliser ensuite `cab sgs CHANGE`,
puis DELTA pour le seul global existant. Aucune reconstruction implicite.

Après archivage réussi, `cab call run.close` reçoit project_id, run_id, branch
TERMINÉ, receipt_id stable, report relatif et sha256 du STATISTICS.md durable.
La branche BLOQUÉ exige le rapport et BLOCKERS.md ; elle n’est pas une acceptation
pour intégration. Les effets incertains et baux détenus empêchent la clôture.
Conserver le même reçu lors d’une reprise ; aucun effacement des pairs ni rejeu.

Un JSONL peut servir plusieurs RUN/changes de la même session native. Les
compteurs sont cumulatifs pour cette session, sans ventilation prouvée par
RUN/change ; ne pas les additionner comme des mesures disjointes.
