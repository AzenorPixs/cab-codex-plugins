# Collecte native CAB 3.0.1

Le service cab.service collecte dans PostgreSQL ; aucun daemon de plugin ni
moniteur direct séparé. Après cab_status et cab_contract, utiliser project_register
puis run_begin avec la vraie identité native, son mode et son cadrage résolu.
Pour Codex direct, appeler native_bind avec le fichier JSONL exact de la session ;
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
