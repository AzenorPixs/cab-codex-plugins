# Conception

La restauration accepte uniquement la demande native exacte déjà enregistrée,
suivie d’une lecture native `get_approval` ou `poll_approval` qui confirme
`CANCELLED` avec `cancelled_by=OC`. Les identités RUN, change, session,
opération, mandat et révisions restent concordantes.

Le contrôleur relit deux fois un transcript identique, vérifie une session
inactive, aucune permission ciblée, aucune opération native commencée et aucun
accès lié. Il persiste l’opération `CANCELLED` avec l’empreinte de la preuve,
sans champ de décision, puis retire la validation indécise du contexte. Un
rejeu est idempotent seulement avec le même transcript.
